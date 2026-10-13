import {dogCollar, dogPaw, footContact, humanAnkleB, humanAnkleF, humanHandF} from '../src/motion/fk';
import {BEAT, CYCLE_D, CYCLE_H, DURATION_SEC, DURATION_FRAMES, FPS, STRIDE_H, sampleState, timelineDuration} from '../src/motion/timeline';
import {GROUND_Y} from '../src/scene/skeleton';

const fail: string[] = [];
const warn: string[] = [];
const ok = (label: string, value: string) => console.log(`  \u001b[32m✓\u001b[0m ${label}: ${value}`);
const bad = (label: string, value: string) => {
  console.log(`  \u001b[31m✗\u001b[0m ${label}: ${value}`);
  fail.push(label);
};
const mid = (label: string, value: string) => {
  console.log(`  \u001b[33m!\u001b[0m ${label}: ${value}`);
  warn.push(label);
};

console.log('\n=== Park Walk — gait & timeline QA ===\n');

/* 1. timeline shape ------------------------------------------------------ */
const dur = timelineDuration();
console.log('[timeline]');
if (Math.abs(dur - DURATION_SEC) < 0.05) ok('duration', `${dur.toFixed(3)}s (target ${DURATION_SEC}s)`);
else bad('duration', `${dur.toFixed(3)}s but composition is ${DURATION_SEC}s`);
ok('frames', `${DURATION_FRAMES} @ ${FPS}fps`);

/* 2. no NaN anywhere, on any frame --------------------------------------- */
console.log('\n[values]');
let nans = 0;
const walkNan = (o: Record<string, unknown>, pathStr: string, depth = 0) => {
  if (depth > 4) return;
  for (const k of Object.keys(o)) {
    if (k.startsWith('_')) continue; // GSAP's internal cache creates reference cycles
    const v = o[k];
    if (typeof v === 'number' && !Number.isFinite(v)) {
      nans++;
      if (nans < 4) bad('non-finite value', `${pathStr}.${k} = ${v}`);
    } else if (v && typeof v === 'object') {
      walkNan(v as Record<string, unknown>, `${pathStr}.${k}`, depth + 1);
    }
  }
};
for (let f = 0; f <= DURATION_FRAMES; f++) {
  walkNan(sampleState(f, FPS) as unknown as Record<string, unknown>, `frame${f}`);
}
if (nans === 0) ok('finite numbers', `${DURATION_FRAMES + 1} frames sampled, 0 NaN/Inf`);

/* 3. planted feet: measure slide during stance --------------------------- */
console.log('\n[foot planting]');
// A full-stride cycle deep inside the steady walk (gain = 1). Cycles start at
// BEAT.stepOff + k * CYCLE_H, so pick one that is not accelerating.
const cycleStart = BEAT.stepOff + 4 * CYCLE_H;
const sample = (phase: number) => {
  // phase may exceed 1: the next cycle continues the same curve, and `distance` must not wrap.
  const s = sampleState((cycleStart + phase * CYCLE_H) * FPS, FPS);
  return {
    nf: footContact(humanAnkleF(s.human)),
    nb: footContact(humanAnkleB(s.human)),
    dist: s.world.distance,
    thighF: s.human.thighF.r,
    shinF: s.human.shinF.r,
  };
};
const STANCE = 0.55; // stance occupies 55% of the cycle in the authored keys
const N = 60;

function slideReport(name: 'near' | 'far', phase0: number, phase1: number) {
  const get = (p: number) => {
    const s = sample(p);
    return name === 'near' ? s.nf : s.nb;
  };
  const a = get(phase0);
  const b = get(phase1);
  const footTravel = b.x - a.x;
  const groundTravel = (b as {dist?: number}).dist ?? 0;
  return {footTravel, groundTravel, a, b};
}

let worst = 0;
for (const [name, p0, p1] of [
  ['near', 0, STANCE],
  ['far', 0.5, 0.5 + STANCE],
] as Array<[string, number, number]>) {
  // ground travel across the window, straight from the timeline
  const g0 = sample(p0).dist;
  const g1 = sample(p1).dist;
  const {footTravel} = slideReport(name as 'near' | 'far', p0, p1);
  const ground = g1 - g0;
  const slide = footTravel + ground;
  const slidePerSec = Math.abs(slide) / (STANCE * CYCLE_H);
  const liftSamples: number[] = [];
  for (let i = 0; i <= N; i++) {
    const s = sample(i / N); // whole cycle: the lift happens in the swing half
    liftSamples.push(name === 'near' ? s.nf.y : s.nb.y);
  }
  const lowest = Math.min(...liftSamples);
  const deepest = Math.max(...liftSamples);
  const line = `foot back ${(-footTravel).toFixed(0)}px vs ground ${ground.toFixed(0)}px → slide ${slide >= 0 ? '+' : ''}${slide.toFixed(1)}px (${slidePerSec.toFixed(0)}px/s)`;
  if (slidePerSec < 25) ok(`${name} foot slide`, line);
  else bad(`${name} foot slide`, line);
  worst = Math.max(worst, slidePerSec);
  const lift = GROUND_Y - lowest;
  if (lift > 45 && lift < 160) ok(`${name} foot lift`, `${lift.toFixed(0)}px of clearance in swing`);
  else mid(`${name} foot lift`, `${lift.toFixed(0)}px — a swing should clear ~60-120px`);
  if (deepest < GROUND_Y + 14) ok(`${name} sole depth`, `deepest y=${deepest.toFixed(0)} (ground ${GROUND_Y})`);
  else mid(`${name} sole depth`, `sole sinks to y=${deepest.toFixed(0)} (ground ${GROUND_Y})`);
}

// The stride the planted foot implies — set STRIDE_H to this and the slide goes to zero.
const nearBack = -(sample(STANCE).nf.x - sample(0).nf.x);
const required = nearBack / STANCE;
console.log(`  · planted near foot implies STRIDE_H = ${required.toFixed(0)}px/cycle (current ${STRIDE_H})`);
if (Math.abs(required - STRIDE_H) > 8) mid('stride tuning', `set STRIDE_H = ${Math.round(required)}`);

/* 3b. the dog's paws must plant too ------------------------------------- */
console.log('\n[dog paw planting]');
const dogCycleStart = BEAT.stepOff + 4 * CYCLE_H; // aligned: CYCLE_D tiles CYCLE_H exactly
const dogSample = (phase: number) => {
  const st = sampleState((dogCycleStart + phase * CYCLE_D) * FPS, FPS);
  return {
    fl: dogPaw(st.dog, 'FL'),
    bl: dogPaw(st.dog, 'BL'),
    dist: st.world.distance,
  };
};
const DOG_STANCE = 0.55;
const dogGroundPerStance = STRIDE_H * (CYCLE_D / CYCLE_H) * DOG_STANCE;
for (const [name, p0] of [
  ['front-left', 0],
  ['back-left', 0.5],
] as Array<[string, number]>) {
  const key = name === 'front-left' ? 'fl' : 'bl';
  const a = dogSample(p0);
  const b = dogSample(p0 + DOG_STANCE);
  const footTravel = b[key].x - a[key].x;
  const ground = b.dist - a.dist;
  const slide = footTravel + ground;
  const slidePerSec = Math.abs(slide) / (DOG_STANCE * CYCLE_D);
  let lift = 0;
  for (let i = 0; i <= N; i++) {
    const s2 = dogSample(i / N);
    lift = Math.max(lift, GROUND_Y - s2[key].y);
  }
  const line = `paw back ${(-footTravel).toFixed(0)}px vs ground ${ground.toFixed(0)}px → slide ${slide >= 0 ? '+' : ''}${slide.toFixed(1)}px (${slidePerSec.toFixed(0)}px/s)`;
  if (slidePerSec < 40) ok(`${name} paw slide`, line);
  else bad(`${name} paw slide`, line);
  if (lift > 18 && lift < 90) ok(`${name} paw lift`, `${lift.toFixed(0)}px of clearance`);
  else mid(`${name} paw lift`, `${lift.toFixed(0)}px — a trot should clear ~25-60px`);
}
ok('dog cadence', `${(2 / CYCLE_D).toFixed(1)} steps/s (trot, 2 beats per ${CYCLE_D}s cycle)`);

/* 4. leash span ---------------------------------------------------------- */
console.log('\n[leash]');
let minSpan = Infinity;
let maxSpan = -Infinity;
for (let f = 0; f <= DURATION_FRAMES; f++) {
  const s = sampleState(f, FPS);
  const hand = humanHandF(s.human);
  const collar = dogCollar(s.dog);
  const span = Math.hypot(collar.x - hand.x, collar.y - hand.y);
  minSpan = Math.min(minSpan, span);
  maxSpan = Math.max(maxSpan, span);
}
// 85px minimum is the leap: the dog jumps right up to the hand, so the leash bunches.
if (minSpan > 15 && maxSpan < 900) ok('hand→collar span', `${minSpan.toFixed(0)}..${maxSpan.toFixed(0)}px`);
else mid('hand→collar span', `${minSpan.toFixed(0)}..${maxSpan.toFixed(0)}px — check the leash length constant`);

/* 5. characters stay inside the safe area -------------------------------- */
console.log('\n[framing]');
let minX = Infinity;
let maxX = -Infinity;
for (let f = 0; f <= DURATION_FRAMES; f += 3) {
  const s = sampleState(f, FPS);
  minX = Math.min(minX, s.human.x, s.dog.x);
  maxX = Math.max(maxX, s.human.x, s.dog.x);
}
if (minX > 300 && maxX < 1650) ok('character x-range', `${minX.toFixed(0)}..${maxX.toFixed(0)} (frame 1920 wide)`);
else mid('character x-range', `${minX.toFixed(0)}..${maxX.toFixed(0)}`);

console.log('');
if (fail.length === 0) console.log(`\u001b[32mQA PASS\u001b[0m — ${warn.length} warning(s)\n`);
else console.log(`\u001b[31mQA FAIL\u001b[0m — ${fail.length} failure(s), ${warn.length} warning(s)\n`);
