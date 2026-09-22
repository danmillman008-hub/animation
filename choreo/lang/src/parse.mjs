// Choreo parser — .choreo text → AST.
//
// A scene file has four sections (entities, layout, motion, checks) under a
// `scene` header line. Line-based, indentation-scoped (motion nests seq/par/
// stagger by indent). See AGENTS.md for the full grammar.

const DUR_RE = /^(\d+(?:\.\d+)?)(ms|s)?$/;

export function parseDuration(tok) {
  const m = DUR_RE.exec(tok);
  if (!m) return null;
  const n = parseFloat(m[1]);
  return m[2] === 's' ? n * 1000 : n;
}

function err(lineNo, msg) {
  const e = new Error(`line ${lineNo}: ${msg}`);
  e.choreo = true;
  return e;
}

// tokenize a line, keeping "quoted strings" intact
function tokens(line) {
  const out = [];
  const re = /"([^"]*)"|(\S+)/g;
  let m;
  while ((m = re.exec(line))) out.push(m[1] !== undefined ? { str: m[1] } : m[2]);
  return out;
}

const ENTITY_KINDS = ['rect', 'circle', 'ellipse', 'line', 'arrow', 'text', 'path'];

function parseEntity(toks, lineNo) {
  // name = kind primary [key value]*
  const name = toks[0];
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) throw err(lineNo, `bad entity name "${name}"`);
  if (toks[1] !== '=') throw err(lineNo, `expected "=" after entity name`);
  const kind = toks[2];
  if (!ENTITY_KINDS.includes(kind)) throw err(lineNo, `unknown entity kind "${kind}" (known: ${ENTITY_KINDS.join(', ')})`);
  const e = { name, kind, attrs: {} };
  let i = 3;

  const num = (t) => { const n = parseFloat(t); if (Number.isNaN(n)) throw err(lineNo, `expected number, got "${t}"`); return n; };
  const wh = (t) => {
    const m = /^(-?\d+(?:\.\d+)?)x(-?\d+(?:\.\d+)?)$/.exec(t);
    if (!m) throw err(lineNo, `expected WxH, got "${t}"`);
    return [parseFloat(m[1]), parseFloat(m[2])];
  };

  switch (kind) {
    case 'rect': { const [w, h] = wh(toks[i++]); e.w = w; e.h = h; break; }
    case 'circle': { const r = num(toks[i++]); e.r = r; e.w = 2 * r; e.h = 2 * r; break; }
    case 'ellipse': { const [rx, ry] = wh(toks[i++]); e.rx = rx; e.ry = ry; e.w = 2 * rx; e.h = 2 * ry; break; }
    case 'line': case 'arrow': { const len = num(toks[i++]); e.len = len; e.w = len; e.h = 4; break; }
    case 'text': {
      const t = toks[i++];
      if (typeof t !== 'object') throw err(lineNo, `text needs a "quoted string"`);
      e.text = t.str; e.fontSize = 16; break;
    }
    case 'path': {
      const t = toks[i++];
      if (typeof t !== 'object') throw err(lineNo, `path needs a "quoted d string"`);
      e.d = t.str; break;
    }
  }

  // key/value attributes
  while (i < toks.length) {
    const k = toks[i++];
    const v = toks[i++];
    if (v === undefined) throw err(lineNo, `attribute "${k}" needs a value`);
    const val = typeof v === 'object' ? v.str : v;
    switch (k) {
      case 'fill': case 'stroke': case 'color': case 'font': e.attrs[k] = val; break;
      case 'stroke-width': e.attrs.strokeWidth = parseFloat(val); break;
      case 'radius': e.attrs.radius = parseFloat(val); break;
      case 'size': {
        if (kind === 'text') e.fontSize = parseFloat(val);
        else if (kind === 'path') { const [w, h] = wh(val); e.w = w; e.h = h; }
        else throw err(lineNo, `"size" only applies to text and path`);
        break;
      }
      case 'weight': e.attrs.weight = val; break;
      case 'opacity': e.attrs.opacity = parseFloat(val); break;
      default: throw err(lineNo, `unknown attribute "${k}"`);
    }
  }
  if (kind === 'path' && (e.w === undefined)) throw err(lineNo, `path needs size WxH`);
  if (kind === 'text') {
    // heuristic text metrics; the verifier catches gross errors
    e.w = Math.max(10, Math.round(e.text.length * e.fontSize * 0.58));
    e.h = Math.round(e.fontSize * 1.25);
  }
  return e;
}

const LAYOUT_OPS = ['center', 'inside', 'below', 'above', 'leftOf', 'rightOf', 'at', 'offset'];

function parseLayout(toks, lineNo) {
  const op = toks[0];
  if (!LAYOUT_OPS.includes(op)) throw err(lineNo, `unknown layout op "${op}" (known: ${LAYOUT_OPS.join(', ')})`);
  const num = (t) => { const n = parseFloat(t); if (Number.isNaN(n)) throw err(lineNo, `expected number, got "${t}"`); return n; };
  switch (op) {
    case 'center': // center E [in F]
      return { op, e: toks[1], ref: toks[2] === 'in' ? toks[3] : null, lineNo };
    case 'inside': { // inside E F <top|bottom|left|right|center> [margin]
      const anchor = toks[3] ?? 'center';
      if (!['top', 'bottom', 'left', 'right', 'center'].includes(anchor)) throw err(lineNo, `inside anchor must be top|bottom|left|right|center`);
      return { op, e: toks[1], ref: toks[2], anchor, margin: toks[4] !== undefined ? num(toks[4]) : 0, lineNo };
    }
    case 'below': case 'above': case 'leftOf': case 'rightOf': { // below E F [gap N]
      let gap = 8;
      if (toks[3] === 'gap') gap = num(toks[4]);
      return { op, e: toks[1], ref: toks[2], gap, lineNo };
    }
    case 'at': return { op, e: toks[1], x: num(toks[2]), y: num(toks[3]), lineNo };
    case 'offset': return { op, e: toks[1], dx: num(toks[2]), dy: num(toks[3]), lineNo };
  }
}

export const VERBS = {
  fadeIn: { defDur: 400 }, fadeOut: { defDur: 400 },
  slideIn: { defDur: 400 }, slideOut: { defDur: 400 },
  pop: { defDur: 400, defEase: 'spring' },
  grow: { defDur: 400 }, shrink: { defDur: 400 },
  drawOn: { defDur: 600 },
  move: { defDur: 500 },
  spin: { defDur: 600 }, pulse: { defDur: 400 }, wiggle: { defDur: 500 },
};

export const EASINGS = {
  linear: 'linear', ease: 'ease', easeIn: 'ease-in', easeOut: 'ease-out',
  easeInOut: 'ease-in-out', spring: 'cubic-bezier(.34,1.56,.64,1)',
};

const DIRS = ['top', 'bottom', 'left', 'right'];

function parseVerb(toks, lineNo) {
  const verb = toks[0];
  if (!VERBS[verb]) throw err(lineNo, `unknown verb "${verb}" (known: ${Object.keys(VERBS).join(', ')}, wait)`);
  const v = { type: 'verb', verb, entity: toks[1], lineNo };
  let i = 2;
  const num = (t) => { const n = parseFloat(t); if (Number.isNaN(n)) throw err(lineNo, `expected number, got "${t}"`); return n; };

  if (verb === 'slideIn' || verb === 'slideOut') {
    const kw = verb === 'slideIn' ? 'from' : 'to';
    if (toks[i] !== kw) throw err(lineNo, `${verb} needs "${kw} <top|bottom|left|right> <distance>"`);
    i++;
    v.dir = toks[i++];
    if (!DIRS.includes(v.dir)) throw err(lineNo, `${verb} direction must be one of ${DIRS.join('|')}`);
    v.dist = num(toks[i++]);
  } else if (verb === 'move') {
    if (toks[i] !== 'by') throw err(lineNo, `move needs "by <dx> <dy>"`);
    i++;
    v.dx = num(toks[i++]); v.dy = num(toks[i++]);
  } else if (verb === 'spin') {
    v.deg = num(toks[i++]);
  } else if (verb === 'grow' || verb === 'shrink') {
    if (toks[i] === 'to') { i++; v.factor = num(toks[i++]); }
    else v.factor = verb === 'grow' ? 1.2 : 0.8;
  }

  // trailing: [duration] [easing]
  while (i < toks.length) {
    const t = toks[i++];
    const d = typeof t === 'string' ? parseDuration(t) : null;
    if (d !== null && /(ms|s)$/.test(t)) { v.dur = d; continue; }
    if (EASINGS[t]) { v.easing = t; continue; }
    throw err(lineNo, `unexpected token "${typeof t === 'object' ? t.str : t}" (expected duration like 400ms or easing: ${Object.keys(EASINGS).join(', ')})`);
  }
  v.dur = v.dur ?? VERBS[verb].defDur;
  v.easing = v.easing ?? VERBS[verb].defEase ?? 'ease';
  return v;
}

function parseChecks(line, lineNo) {
  const ci = line.indexOf(':');
  if (ci < 0) throw err(lineNo, `check needs "<scope> : <assertions>"`);
  const scopeStr = line.slice(0, ci).trim();
  const asserts = line.slice(ci + 1).split(/\s+and\s+/).map((s) => s.trim()).filter(Boolean);
  if (!asserts.length) throw err(lineNo, `check has no assertions`);

  let scope;
  let m;
  if (scopeStr === 'always') scope = { always: true };
  else if (scopeStr === 'trace') scope = { trace: true };
  else if (scopeStr === 'at end') scope = { atEnd: true };
  else if ((m = /^at\s+(\S+)$/.exec(scopeStr))) {
    const t = parseDuration(m[1]);
    if (t === null) throw err(lineNo, `bad time "${m[1]}"`);
    scope = { at: t };
  } else if ((m = /^during\s+(\S+)\s*\.\.\s*(\S+)$/.exec(scopeStr)) || (m = /^during\s+(\S+?)\.\.(\S+)$/.exec(scopeStr))) {
    const t1 = parseDuration(m[1]), t2 = parseDuration(m[2]);
    if (t1 === null || t2 === null) throw err(lineNo, `bad time range "${scopeStr}"`);
    scope = { during: [t1, t2] };
  } else throw err(lineNo, `bad check scope "${scopeStr}" (use: at <t>, during <t1>..<t2>, always, at end, trace)`);

  return { scope, asserts, lineNo };
}

export function parse(source) {
  const rawLines = source.split('\n');
  // strip comments + blanks, keep indent + line numbers
  const lines = [];
  rawLines.forEach((raw, idx) => {
    const noComment = raw.replace(/\/\/.*$/, '');
    if (!noComment.trim()) return;
    lines.push({ indent: noComment.match(/^\s*/)[0].length, text: noComment.trim(), lineNo: idx + 1 });
  });
  if (!lines.length) throw err(1, 'empty scene');

  // scene header
  const head = tokens(lines[0].text);
  if (head[0] !== 'scene') throw err(lines[0].lineNo, `file must start with: scene "name" size WxH [duration D] [background C]`);
  const scene = { name: 'scene', width: 800, height: 450, duration: null, background: '#0f172a' };
  for (let i = 1; i < head.length; i++) {
    const t = head[i];
    if (typeof t === 'object') { scene.name = t.str; continue; }
    if (t === 'size') { const m = /^(\d+)x(\d+)$/.exec(head[++i]); if (!m) throw err(lines[0].lineNo, 'size needs WxH'); scene.width = +m[1]; scene.height = +m[2]; continue; }
    if (t === 'duration') { scene.duration = parseDuration(head[++i]); continue; }
    if (t === 'background') { const b = head[++i]; scene.background = typeof b === 'object' ? b.str : b; continue; }
    throw err(lines[0].lineNo, `unexpected token "${t}" in scene header`);
  }

  const ast = { scene, entities: [], layout: [], motion: { type: 'seq', children: [] }, checks: [] };
  let section = null;
  // motion tree building with an indent stack
  let stack = null;

  for (let li = 1; li < lines.length; li++) {
    const { indent, text, lineNo } = lines[li];
    if (indent === 0 && ['entities', 'layout', 'motion', 'checks'].includes(text)) {
      section = text;
      if (section === 'motion') stack = [{ node: ast.motion, indent: 0 }];
      continue;
    }
    if (!section) throw err(lineNo, `expected a section header (entities/layout/motion/checks), got "${text}"`);

    if (section === 'entities') { ast.entities.push(parseEntity(tokens(text), lineNo)); continue; }
    if (section === 'layout') { ast.layout.push(parseLayout(tokens(text), lineNo)); continue; }
    if (section === 'checks') { ast.checks.push(parseChecks(text, lineNo)); continue; }

    // motion
    while (stack.length > 1 && indent <= stack[stack.length - 1].indent) stack.pop();
    const parent = stack[stack.length - 1].node;
    const toks = tokens(text);
    if (toks[0] === 'seq' || toks[0] === 'par') {
      const node = { type: toks[0], children: [], lineNo };
      parent.children.push(node);
      stack.push({ node, indent });
    } else if (toks[0] === 'stagger') {
      const step = parseDuration(toks[1]);
      if (step === null) throw err(lineNo, `stagger needs a step duration, e.g. "stagger 80ms"`);
      const node = { type: 'stagger', step, children: [], lineNo };
      parent.children.push(node);
      stack.push({ node, indent });
    } else if (toks[0] === 'wait') {
      const d = parseDuration(toks[1]);
      if (d === null) throw err(lineNo, `wait needs a duration`);
      parent.children.push({ type: 'wait', dur: d, lineNo });
    } else {
      parent.children.push(parseVerb(toks, lineNo));
    }
  }

  // semantic validation: entity refs
  const names = new Set(ast.entities.map((e) => e.name));
  const checkRef = (n, lineNo, what) => { if (!names.has(n)) throw err(lineNo, `${what} references unknown entity "${n}"`); };
  ast.layout.forEach((l) => { checkRef(l.e, l.lineNo, 'layout'); if (l.ref) checkRef(l.ref, l.lineNo, 'layout'); });
  (function walk(node) {
    if (node.type === 'verb') checkRef(node.entity, node.lineNo, `verb ${node.verb}`);
    (node.children ?? []).forEach(walk);
  })(ast.motion);
  ast.checks.forEach((c) => c.asserts.forEach((a) => {
    const m = /^\w+\(([^)]*)\)$/.exec(a);
    if (!m) throw err(c.lineNo, `bad assertion "${a}"`);
    m[1].split(',').map((s) => s.trim()).filter(Boolean).forEach((arg) => {
      if (arg !== 'all') checkRef(arg, c.lineNo, `check ${a}`);
    });
  }));

  return ast;
}
