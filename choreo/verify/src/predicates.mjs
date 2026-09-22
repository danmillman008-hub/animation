// Predicate library + parser for @choreo-oss/verify (Phase 0).
//
// A `sample` is { t, entities: { [name]: Box | null } } where
// Box = { x, y, w, h, cx, cy, area, opacity, visible }.
// State predicates evaluate one sample; motion predicates evaluate a window
// (array of samples). The evaluator (index.mjs) decides which samples/windows
// a check's scope maps to.

const EPS_PX = 1; // movement epsilon
const EPS_OPACITY = 0.05;
const EPS_AREA_RATIO = 0.05; // 5% area change counts as grow/shrink
const CONTAIN_TOLERANCE_PX = 1.5;

// ---------------------------------------------------------------------------
// helpers

function need(sample, name) {
  const box = sample.entities[name];
  if (box === undefined) throw new Error(`unknown entity "${name}"`);
  return box; // may be null (not in DOM)
}

function fmt(n) {
  return typeof n === 'number' ? Math.round(n * 100) / 100 : String(n);
}

function first(win, name) {
  for (const s of win) { const b = s.entities[name]; if (b) return { s, b }; }
  return null;
}
function last(win, name) {
  for (let i = win.length - 1; i >= 0; i--) { const b = win[i].entities[name]; if (b) return { s: win[i], b }; }
  return null;
}

function displacement(win, name, axis) {
  const a = first(win, name), z = last(win, name);
  if (!a || !z) return { ok: false, why: `entity "${name}" not present in window` };
  const d = axis === 'x' ? z.b.cx - a.b.cx : z.b.cy - a.b.cy;
  return { ok: true, d, from: a, to: z };
}

// ---------------------------------------------------------------------------
// state predicates — (sample, ...entityNames) -> { pass, actual, suggestion? }

export const STATE_PREDICATES = {
  visible(sample, a) {
    const b = need(sample, a);
    // size on at least one axis: SVG lines/arrows have zero-height bboxes
    const pass = !!b && b.visible && b.opacity > EPS_OPACITY && (b.w > 0 || b.h > 0);
    return {
      pass,
      actual: b ? `opacity(${a})=${fmt(b.opacity)}, bbox=${fmt(b.w)}x${fmt(b.h)}` : `${a} not in DOM`,
      suggestion: pass ? null : `expected "${a}" visible at t=${sample.t}ms — check its animation delay/fill or display/visibility`,
    };
  },
  hidden(sample, a) {
    const b = need(sample, a);
    const pass = !b || !b.visible || b.opacity <= EPS_OPACITY || (b.w <= 0 && b.h <= 0);
    return {
      pass,
      actual: b ? `opacity(${a})=${fmt(b.opacity)}` : `${a} not in DOM`,
      suggestion: pass ? null : `expected "${a}" hidden at t=${sample.t}ms — it is visible with opacity ${fmt(b.opacity)}; add an initial opacity:0 or delay its entrance`,
    };
  },
  fadedIn(sample, a) {
    const b = need(sample, a);
    const pass = !!b && b.visible && b.opacity >= 0.95;
    return { pass, actual: b ? `opacity(${a})=${fmt(b.opacity)}` : `${a} not in DOM`,
      suggestion: pass ? null : `expected "${a}" fully faded in (opacity>=0.95) at t=${sample.t}ms` };
  },
  fadedOut(sample, a) {
    const b = need(sample, a);
    const pass = !b || b.opacity <= EPS_OPACITY;
    return { pass, actual: b ? `opacity(${a})=${fmt(b.opacity)}` : `${a} not in DOM`,
      suggestion: pass ? null : `expected "${a}" faded out (opacity<=${EPS_OPACITY}) at t=${sample.t}ms` };
  },
  leftOf(sample, a, b) { return relPos(sample, a, b, 'leftOf'); },
  rightOf(sample, a, b) { return relPos(sample, a, b, 'rightOf'); },
  above(sample, a, b) { return relPos(sample, a, b, 'above'); },
  below(sample, a, b) { return relPos(sample, a, b, 'below'); },
  inside(sample, a, b) {
    const A = need(sample, a), B = need(sample, b);
    if (!A || !B) return { pass: false, actual: `${!A ? a : b} not in DOM` };
    const tol = CONTAIN_TOLERANCE_PX;
    const pass = A.x >= B.x - tol && A.y >= B.y - tol &&
      A.x + A.w <= B.x + B.w + tol && A.y + A.h <= B.y + B.h + tol;
    const overflow = [];
    if (A.x < B.x - tol) overflow.push(`left by ${fmt(B.x - A.x)}px`);
    if (A.y < B.y - tol) overflow.push(`top by ${fmt(B.y - A.y)}px`);
    if (A.x + A.w > B.x + B.w + tol) overflow.push(`right by ${fmt(A.x + A.w - B.x - B.w)}px`);
    if (A.y + A.h > B.y + B.h + tol) overflow.push(`bottom by ${fmt(A.y + A.h - B.y - B.h)}px`);
    return {
      pass,
      actual: pass ? `${a} within ${b}` : `${a} overflows ${b}: ${overflow.join(', ')}`,
      suggestion: pass ? null : `"${a}" escapes "${b}" at t=${sample.t}ms (${overflow.join(', ')}) — clamp its translate/scale or enlarge the container`,
    };
  },
  overlaps(sample, a, b) {
    const r = rectOverlap(sample, a, b);
    return { pass: r.overlap, actual: r.actual,
      suggestion: r.overlap ? null : `expected "${a}" and "${b}" to overlap at t=${sample.t}ms (gap ${r.actual})` };
  },
  notOverlapping(sample, a, b) {
    const r = rectOverlap(sample, a, b);
    return { pass: !r.overlap, actual: r.actual,
      suggestion: !r.overlap ? null : `"${a}" and "${b}" overlap at t=${sample.t}ms by ${r.actual} — separate their positions or stagger their timing` };
  },
  onScreen(sample, a) {
    const b = need(sample, a);
    const vp = sample.viewport;
    const pass = !!b && b.x + b.w > 0 && b.y + b.h > 0 && b.x < vp.w && b.y < vp.h;
    return { pass, actual: b ? `bbox(${a})=[${fmt(b.x)},${fmt(b.y)},${fmt(b.w)},${fmt(b.h)}] viewport=[${vp.w}x${vp.h}]` : `${a} not in DOM`,
      suggestion: pass ? null : `"${a}" is entirely off-screen at t=${sample.t}ms` };
  },
};

function relPos(sample, a, b, kind) {
  const A = need(sample, a), B = need(sample, b);
  if (!A || !B) return { pass: false, actual: `${!A ? a : b} not in DOM` };
  let pass, actual;
  switch (kind) {
    case 'leftOf': pass = A.x + A.w <= B.x + EPS_PX; actual = `${a}.right=${fmt(A.x + A.w)}, ${b}.left=${fmt(B.x)}`; break;
    case 'rightOf': pass = A.x >= B.x + B.w - EPS_PX; actual = `${a}.left=${fmt(A.x)}, ${b}.right=${fmt(B.x + B.w)}`; break;
    case 'above': pass = A.y + A.h <= B.y + EPS_PX; actual = `${a}.bottom=${fmt(A.y + A.h)}, ${b}.top=${fmt(B.y)}`; break;
    case 'below': pass = A.y >= B.y + B.h - EPS_PX; actual = `${a}.top=${fmt(A.y)}, ${b}.bottom=${fmt(B.y + B.h)}`; break;
  }
  return { pass, actual,
    suggestion: pass ? null : `expected ${kind}(${a}, ${b}) at t=${sample.t}ms but got ${actual} — adjust layout or the transform driving "${a}"` };
}

function rectOverlap(sample, a, b) {
  const A = need(sample, a), B = need(sample, b);
  if (!A || !B) return { overlap: false, actual: `${!A ? a : b} not in DOM` };
  const ox = Math.min(A.x + A.w, B.x + B.w) - Math.max(A.x, B.x);
  const oy = Math.min(A.y + A.h, B.y + B.h) - Math.max(A.y, B.y);
  const overlap = ox > 0 && oy > 0;
  return { overlap, actual: overlap ? `${fmt(ox)}x${fmt(oy)}px` : `dx=${fmt(-ox)}px, dy=${fmt(-oy)}px` };
}

// ---------------------------------------------------------------------------
// motion predicates — (window, ...entityNames) -> { pass, actual, suggestion? }

export const MOTION_PREDICATES = {
  movesRight(win, a) { return moves(win, a, 'x', +1, 'movesRight'); },
  movesLeft(win, a) { return moves(win, a, 'x', -1, 'movesLeft'); },
  movesDown(win, a) { return moves(win, a, 'y', +1, 'movesDown'); },
  movesUp(win, a) { return moves(win, a, 'y', -1, 'movesUp'); },
  grows(win, a) { return areaTrend(win, a, +1); },
  shrinks(win, a) { return areaTrend(win, a, -1); },
  fadesIn(win, a) { return opacityTrend(win, a, +1); },
  fadesOut(win, a) { return opacityTrend(win, a, -1); },
  settled(win, a) {
    const boxes = win.map((s) => s.entities[a]).filter(Boolean);
    if (boxes.length < 2) return { pass: false, actual: `entity "${a}" not present across window` };
    let maxMove = 0, maxDo = 0;
    for (let i = 1; i < boxes.length; i++) {
      maxMove = Math.max(maxMove, Math.abs(boxes[i].cx - boxes[i - 1].cx), Math.abs(boxes[i].cy - boxes[i - 1].cy));
      maxDo = Math.max(maxDo, Math.abs(boxes[i].opacity - boxes[i - 1].opacity));
    }
    // Net change over the whole window too — slow drifts (e.g. a 4s fade) can
    // slip under the per-frame epsilon while the entity is clearly not settled.
    const f = boxes[0], z = boxes[boxes.length - 1];
    const netMove = Math.max(Math.abs(z.cx - f.cx), Math.abs(z.cy - f.cy));
    const netDo = Math.abs(z.opacity - f.opacity);
    const pass = maxMove <= EPS_PX && maxDo <= EPS_OPACITY && netMove <= EPS_PX && netDo <= EPS_OPACITY;
    return { pass, actual: `frame-to-frame max: ${fmt(maxMove)}px / Δopacity ${fmt(maxDo)}; net over window: ${fmt(netMove)}px / Δopacity ${fmt(netDo)}`,
      suggestion: pass ? null : `"${a}" is still animating in [${win[0].t}..${win[win.length - 1].t}]ms — shorten its duration or extend the scene` };
  },
  stationary(win, a) {
    const d1 = displacement(win, a, 'x'), d2 = displacement(win, a, 'y');
    if (!d1.ok) return { pass: false, actual: d1.why };
    const pass = Math.abs(d1.d) <= EPS_PX && Math.abs(d2.d) <= EPS_PX;
    return { pass, actual: `net displacement dx=${fmt(d1.d)}px dy=${fmt(d2.d)}px`,
      suggestion: pass ? null : `"${a}" moved when it should stay put — check for unintended transforms` };
  },
};

function moves(win, a, axis, sign, name) {
  const r = displacement(win, a, axis);
  if (!r.ok) return { pass: false, actual: r.why };
  const pass = r.d * sign > EPS_PX;
  return { pass, actual: `net d${axis}=${fmt(r.d)}px over [${win[0].t}..${win[win.length - 1].t}]ms`,
    suggestion: pass ? null : `expected ${name}(${a}) but net d${axis}=${fmt(r.d)}px — the motion is absent, reversed, or outside this time window` };
}

function areaTrend(win, a, sign) {
  const f = first(win, a), z = last(win, a);
  if (!f || !z) return { pass: false, actual: `entity "${a}" not present in window` };
  const base = Math.max(f.b.area, 1);
  const ratio = (z.b.area - f.b.area) / base;
  const pass = ratio * sign > EPS_AREA_RATIO;
  return { pass, actual: `area ${fmt(f.b.area)} → ${fmt(z.b.area)} (${fmt(ratio * 100)}%)`,
    suggestion: pass ? null : `expected ${sign > 0 ? 'grows' : 'shrinks'}(${a}) but area changed ${fmt(ratio * 100)}% — check the scale keyframes/timing` };
}

function opacityTrend(win, a, sign) {
  const f = first(win, a), z = last(win, a);
  if (!f || !z) return { pass: false, actual: `entity "${a}" not present in window` };
  const d = z.b.opacity - f.b.opacity;
  const pass = d * sign > EPS_OPACITY;
  return { pass, actual: `opacity ${fmt(f.b.opacity)} → ${fmt(z.b.opacity)}`,
    suggestion: pass ? null : `expected ${sign > 0 ? 'fadesIn' : 'fadesOut'}(${a}) in [${win[0].t}..${win[win.length - 1].t}]ms but opacity went ${fmt(f.b.opacity)} → ${fmt(z.b.opacity)} — check the opacity keyframes/delay` };
}

// ---------------------------------------------------------------------------
// trace predicates — (trace, ...entityNames) -> { pass, actual, suggestion? }
// Evaluate over the WHOLE trace, schedule-agnostically (scope: trace).

function firstVisibleT(trace, name) {
  for (const s of trace) {
    const b = s.entities[name];
    if (b && b.visible && b.opacity > EPS_OPACITY && (b.w > 0 || b.h > 0)) return s.t;
  }
  return null;
}

export const TRACE_PREDICATES = {
  appearsBefore(trace, a, b) {
    const ta = firstVisibleT(trace, a), tb = firstVisibleT(trace, b);
    if (ta === null || tb === null) {
      return { pass: false, actual: `first-visible: ${a}=${ta ?? 'never'}, ${b}=${tb ?? 'never'}`,
        suggestion: `expected both "${a}" and "${b}" to become visible — ${ta === null ? a : b} never does` };
    }
    const pass = ta < tb;
    return { pass, actual: `first-visible: ${a}@${fmt(ta)}ms, ${b}@${fmt(tb)}ms`,
      suggestion: pass ? null : `expected "${a}" to appear before "${b}" — reorder their entrances` };
  },
  everVisible(trace, a) {
    const t = firstVisibleT(trace, a);
    return { pass: t !== null, actual: t !== null ? `first visible at ${fmt(t)}ms` : `never visible`,
      suggestion: t !== null ? null : `"${a}" never becomes visible — add or fix its entrance` };
  },
};

// ---------------------------------------------------------------------------
// parser: "pred(a, b)" -> { name, args, kind }

const CALL_RE = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*\(\s*([^)]*)\s*\)\s*$/;

export function parseAssertion(str) {
  const m = CALL_RE.exec(str);
  if (!m) throw new Error(`cannot parse assertion "${str}" — expected pred(entity[, entity])`);
  const name = m[1];
  const args = m[2].split(',').map((s) => s.trim()).filter(Boolean);
  const kind = STATE_PREDICATES[name] ? 'state' : MOTION_PREDICATES[name] ? 'motion' : TRACE_PREDICATES[name] ? 'trace' : null;
  if (!kind) {
    throw new Error(`unknown predicate "${name}". Known: ${[...Object.keys(STATE_PREDICATES), ...Object.keys(MOTION_PREDICATES), ...Object.keys(TRACE_PREDICATES)].join(', ')}`);
  }
  return { name, args, kind, source: str };
}
