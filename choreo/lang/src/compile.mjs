// Choreo compiler core — motion tree → timed instances → CSS.
//
// Every verb maps to CSS *individual transform properties* (translate/scale/
// rotate) plus opacity/stroke-dashoffset, so concurrent verbs on one entity
// never fight over a single `transform` string. All animations use
// `fill: forwards` with base (pre-entrance) styles on the element itself, so
// state before an animation's delay is the base state — which also makes the
// output deterministic under @choreo-oss/verify's seek mode.

import { parse, VERBS, EASINGS } from './parse.mjs';
import { solveLayout } from './layout.mjs';
import { STATE_PREDICATES, MOTION_PREDICATES, TRACE_PREDICATES } from '../../verify/src/predicates.mjs';

// ---------------------------------------------------------------------------
// timeline: motion tree → [{ entity, verb, start, dur, easing, ... }]

export function resolveTimeline(motion) {
  const instances = [];
  function walk(node, start) {
    switch (node.type) {
      case 'seq': {
        let t = start;
        for (const c of node.children) t = walk(c, t);
        return t;
      }
      case 'par': {
        let end = start;
        for (const c of node.children) end = Math.max(end, walk(c, start));
        return end;
      }
      case 'stagger': {
        let end = start;
        node.children.forEach((c, i) => { end = Math.max(end, walk(c, start + i * node.step)); });
        return end;
      }
      case 'wait': return start + node.dur;
      case 'verb': {
        instances.push({ ...node, start });
        return start + node.dur;
      }
      default: throw new Error(`unknown motion node type "${node.type}"`);
    }
  }
  const end = walk(motion, 0);
  instances.sort((a, b) => a.start - b.start);
  return { instances, end };
}

// ---------------------------------------------------------------------------
// verb semantics → keyframe property maps

const DIR_VEC = { top: [0, -1], bottom: [0, 1], left: [-1, 0], right: [1, 0] };

function trStr([x, y]) { return `${x}px ${y}px`; }

// Returns { frames: {from:{...}, to:{...}} | {'0%':..}, base?: {...} }
// `cum` is the entity's cumulative translate [x, y] before this instance.
function verbCss(inst, cum) {
  const v = inst.verb;
  switch (v) {
    case 'fadeIn': return { frames: { from: { opacity: 0 }, to: { opacity: 1 } }, entrance: { opacity: '0' } };
    case 'fadeOut': return { frames: { from: { opacity: 1 }, to: { opacity: 0 } } };
    case 'slideIn': {
      const [dx, dy] = DIR_VEC[inst.dir].map((n) => n * inst.dist);
      const fromT = [cum[0] + dx, cum[1] + dy];
      return {
        frames: { from: { opacity: 0, translate: trStr(fromT) }, to: { opacity: 1, translate: trStr(cum) } },
        entrance: { opacity: '0', translate: trStr(fromT) },
      };
    }
    case 'slideOut': {
      const [dx, dy] = DIR_VEC[inst.dir].map((n) => n * inst.dist);
      const toT = [cum[0] + dx, cum[1] + dy];
      return { frames: { from: { opacity: 1, translate: trStr(cum) }, to: { opacity: 0, translate: trStr(toT) } }, cumAfter: toT };
    }
    case 'pop': return {
      frames: { from: { opacity: 0, scale: '0.3' }, to: { opacity: 1, scale: '1' } },
      entrance: { opacity: '0', scale: '0.3' },
    };
    case 'grow': return { frames: { from: { scale: '1' }, to: { scale: String(inst.factor) } } };
    case 'shrink': return { frames: { from: { scale: '1' }, to: { scale: String(inst.factor) } } };
    case 'drawOn': return {
      frames: { from: { 'stroke-dashoffset': 1 }, to: { 'stroke-dashoffset': 0 } },
      entrance: { 'stroke-dasharray': '1', 'stroke-dashoffset': '1' },
      needsPathLength: true,
    };
    case 'move': {
      const toT = [cum[0] + inst.dx, cum[1] + inst.dy];
      return { frames: { from: { translate: trStr(cum) }, to: { translate: trStr(toT) } }, cumAfter: toT };
    }
    case 'spin': return { frames: { from: { rotate: '0deg' }, to: { rotate: `${inst.deg}deg` } } };
    case 'pulse': return { frames: { '0%': { scale: '1' }, '50%': { scale: '1.12' }, '100%': { scale: '1' } } };
    case 'wiggle': return { frames: { '0%': { rotate: '0deg' }, '25%': { rotate: '-6deg' }, '60%': { rotate: '6deg' }, '100%': { rotate: '0deg' } } };
    default: throw new Error(`no css mapping for verb "${v}"`);
  }
}

export function buildCss(instances, byName) {
  const perEntity = {}; // name -> { base: {}, anims: [], needsPathLength }
  const keyframes = [];
  const cum = {}; // cumulative translate per entity
  const counters = {};

  for (const inst of instances) {
    const name = inst.entity;
    perEntity[name] ??= { base: {}, anims: [], needsPathLength: false };
    cum[name] ??= [0, 0];
    const info = verbCss(inst, cum[name]);
    if (info.cumAfter) cum[name] = info.cumAfter;
    if (info.needsPathLength) perEntity[name].needsPathLength = true;

    // entrance base styles come from the entity's FIRST verb only
    const isFirst = !perEntity[name].anims.length;
    if (isFirst && info.entrance) Object.assign(perEntity[name].base, info.entrance);

    const kfName = `${name}-${inst.verb}-k${counters[name] = (counters[name] ?? 0) + 1}`;
    const stops = Object.entries(info.frames)
      .map(([stop, props]) => `  ${stop} { ${Object.entries(props).map(([k, v]) => `${k}: ${v}`).join('; ')} }`)
      .join('\n');
    keyframes.push(`@keyframes ${kfName} {\n${stops}\n}`);
    perEntity[name].anims.push(
      `${kfName} ${inst.dur}ms ${EASINGS[inst.easing]} ${inst.start}ms forwards`,
    );
  }

  const rules = Object.entries(perEntity).map(([name, info]) => {
    const decls = [
      'transform-box: fill-box',
      'transform-origin: center',
      ...Object.entries(info.base).map(([k, v]) => `${k}: ${v}`),
      `animation: ${info.anims.join(', ')}`,
    ];
    return `#${name} {\n  ${decls.join(';\n  ')};\n}`;
  });

  return { rules, keyframes, perEntity };
}

// ---------------------------------------------------------------------------
// checks validation (compile-time, against the verifier's own predicate tables)

export function validateChecks(checks) {
  const known = { ...STATE_PREDICATES, ...MOTION_PREDICATES, ...TRACE_PREDICATES };
  for (const c of checks) {
    for (const a of c.asserts) {
      const m = /^(\w+)\(([^)]*)\)$/.exec(a);
      if (!m) throw new Error(`line ${c.lineNo}: bad assertion "${a}"`);
      const name = m[1];
      if (!known[name]) {
        throw new Error(`line ${c.lineNo}: unknown predicate "${name}" (known: ${Object.keys(known).join(', ')})`);
      }
      if (MOTION_PREDICATES[name] && c.scope.at !== undefined) {
        throw new Error(`line ${c.lineNo}: motion predicate "${name}" needs a time window — use "during a..b", "always", or "at end", not "at t"`);
      }
      if (TRACE_PREDICATES[name] && !c.scope.trace) {
        throw new Error(`line ${c.lineNo}: trace predicate "${name}" needs the "trace :" scope`);
      }
      if (!TRACE_PREDICATES[name] && c.scope.trace) {
        throw new Error(`line ${c.lineNo}: scope "trace" only accepts trace predicates (${Object.keys(TRACE_PREDICATES).join(', ')})`);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// top-level compile

export function compile(source) {
  const ast = parse(source);
  const byName = solveLayout(ast);
  const { instances, end } = resolveTimeline(ast.motion);
  const duration = ast.scene.duration ?? Math.ceil(end / 100) * 100;
  validateChecks(ast.checks);
  const css = buildCss(instances, byName);
  return { ast, byName, instances, duration, css, timelineEnd: end };
}
