import gsap from 'gsap';
import {CustomEase} from 'gsap/CustomEase';
import {CustomWiggle} from 'gsap/CustomWiggle';
import {MotionPathPlugin} from 'gsap/MotionPathPlugin';

import type {Dog, Human, J, SceneState} from './state';
import {createState} from './state';

/**
 * GSAP only installs a plugin in a `window`-less environment if the plugin opts into
 * headless mode. CustomEase already does; CustomWiggle and MotionPathPlugin do not, so we
 * opt them in here. This is what lets the very same timeline be sampled in Node by the
 * gait QA (`render/qa_gait.mjs`) as well as in the browser during a Remotion render.
 */
type HeadlessPlugin = {headless?: boolean};
(CustomWiggle as unknown as HeadlessPlugin).headless = true;
(MotionPathPlugin as unknown as HeadlessPlugin).headless = true;
gsap.registerPlugin(CustomEase, CustomWiggle, MotionPathPlugin);

/* ------------------------------------------------------------------ *
 * Timing constants — the whole film is derived from these
 * ------------------------------------------------------------------ */

export const FPS = 30;
export const DURATION_SEC = 14;
export const DURATION_FRAMES = FPS * DURATION_SEC;

/** Human gait cycle: two steps, a relaxed 75 steps/min stroll. */
export const CYCLE_H = 1.0;
/** World px travelled per human cycle at full stride (QA-tuned, see render/qa_gait.mjs). */
export const STRIDE_H = 293;
/** Dog trot cycle — twice the cadence of the human. */
export const CYCLE_D = 0.5;

/** Story beats, in seconds. Everything below is placed with the position parameter. */
export const BEAT = {
  fadeIn: 0,
  tug: 0.45,
  stepOff: 1.3,
  walk: 1.7,
  sniff: 4.7,
  butterfly: 6.9,
  slow: 8.5,
  stop: 9.3,
  sit: 9.7,
  push: 10.2,
  pat: 11.1,
  outro: 12.9,
  end: DURATION_SEC,
};

/* ------------------------------------------------------------------ *
 * Keyframe helpers — GSAP tweens authored as [phase, value] curves
 * ------------------------------------------------------------------ */

export type Key = [number, number];

/** Author one property across a cycle: a `set` for the first key, then a tween per segment. */
function cycleProp(
  tl: gsap.core.Timeline,
  target: Record<string, number>,
  prop: string,
  keys: Key[],
  dur: number,
  ease = 'sine.inOut',
) {
  tl.set(target, {[prop]: keys[0][1]}, 0);
  for (let i = 1; i < keys.length; i++) {
    const [p0] = keys[i - 1];
    const [p1, v1] = keys[i];
    tl.to(target, {[prop]: v1, duration: (p1 - p0) * dur, ease}, p0 * dur);
  }
}

/** Absolute-time version of the same idea, for non-cyclic properties. */
function absProp(
  tl: gsap.core.Timeline,
  target: Record<string, number>,
  prop: string,
  keys: Key[],
  ease = 'sine.inOut',
) {
  tl.set(target, {[prop]: keys[0][1]}, keys[0][0]);
  for (let i = 1; i < keys.length; i++) {
    const [t0] = keys[i - 1];
    const [t1, v1] = keys[i];
    tl.to(target, {[prop]: v1, duration: t1 - t0, ease}, t0);
  }
}

/** Sample a cyclic curve — `sine.inOut` between keys, exactly like the tweens do. */
function sampleCurve(keys: Key[], p: number): number {
  const q = ((p % 1) + 1) % 1;
  for (let i = 0; i < keys.length - 1; i++) {
    const [p0, v0] = keys[i];
    const [p1, v1] = keys[i + 1];
    if (q >= p0 && q <= p1) {
      const u = (q - p0) / Math.max(1e-6, p1 - p0);
      return v0 + (v1 - v0) * (0.5 - 0.5 * Math.cos(Math.PI * u));
    }
  }
  return keys[keys.length - 1][1];
}

/**
 * Rotate a closed cyclic curve by `off` cycles for the contralateral limbs.
 * The key *shape* is preserved exactly (only the seam value is resampled), so the near and
 * far legs cover identical ground — which is what makes the planted foot check symmetric.
 */
export function shiftKeys(keys: Key[], off: number): Key[] {
  if (!off) return keys.map(([p, v]) => [p, v] as Key);
  const body = keys.slice(0, -1).map(([p, v]) => [(((p - off) % 1) + 1) % 1, v] as Key);
  body.sort((a, b) => a[0] - b[0]);
  const seam = sampleCurve(keys, off);
  return [[0, seam], ...body, [1, seam]];
}

/** Scale a curve's amplitude around a centre value (shorter steps when accelerating). */
export function scaleKeys(keys: Key[], centre: number, gain: number): Key[] {
  return keys.map(([p, v]) => [p, centre + (v - centre) * gain] as Key);
}

/* ------------------------------------------------------------------ *
 * Human gait cycle
 * ------------------------------------------------------------------ */

/**
 * Phase 0 = near-leg heel strike. Stance runs 0 -> 0.55, swing 0.55 -> 1.
 * Angles: the limbs hang down, so a NEGATIVE rotation swings them forward (+x).
 */
export const THIGH = {
  F: [
    [0, -20],
    [0.18, -10],
    [0.36, 0],
    [0.48, 9],
    [0.55, 14],
    [0.66, 6],
    [0.8, -9],
    [0.92, -18],
    [1, -20],
  ] as Key[],
};
THIGH.B = shiftKeys(THIGH.F, 0.5);

export const SHIN = {
  F: [
    [0, 5],
    [0.12, 12],
    [0.3, 4],
    [0.46, 10],
    [0.55, 26],
    [0.66, 54],
    [0.78, 36],
    [0.9, 13],
    [1, 5],
  ] as Key[],
};
SHIN.B = shiftKeys(SHIN.F, 0.5);

export const FOOT = {
  F: [
    [0, -6],
    [0.1, 0],
    [0.3, 4],
    [0.48, 10],
    [0.55, 17],
    [0.68, 5],
    [0.85, -8],
    [1, -6],
  ] as Key[],
};
FOOT.B = shiftKeys(FOOT.F, 0.5);

/** Hips drop at each heel strike, rise through the passing position: 2 bobs per cycle. */
export const BOB: Key[] = [
  [0, 5.5],
  [0.25, -4.5],
  [0.5, 5.5],
  [0.75, -4.5],
  [1, 5.5],
];

/** Pelvis rolls with the stride; torso and head counter-rotate to keep the eyeline level. */
/**
 * Pelvic roll. Kept deliberately tiny: it is added to BOTH legs, so any amplitude here shows
 * up as an asymmetry in the planted-foot check (the near and far feet would cover different
 * ground). Side view barely reads it anyway.
 */
export const HIPS_ROLL: Key[] = [
  [0, -0.9],
  [0.5, 0.9],
  [1, -0.9],
];
export const TORSO_ROLL: Key[] = [
  [0, 2.2],
  [0.25, 0],
  [0.5, -2.2],
  [0.75, 0],
  [1, 2.2],
];
export const HEAD_STAB: Key[] = [
  [0, -1.4],
  [0.25, 0.6],
  [0.5, 1.4],
  [0.75, -0.6],
  [1, -1.4],
];

/** Arms swing against the legs. The leash arm swings at 55% so the hand stays usable. */
export const UARM_FAR: Key[] = [
  [0, 20],
  [0.18, 12],
  [0.36, 0],
  [0.48, -12],
  [0.55, -19],
  [0.66, -10],
  [0.8, 8],
  [0.92, 18],
  [1, 20],
];
export const UARM_LEASH: Key[] = scaleKeys(UARM_FAR, 0, 0.55);
export const LARM_FAR: Key[] = [
  [0, -18],
  [0.25, -26],
  [0.5, -34],
  [0.75, -24],
  [1, -18],
];
export const LARM_LEASH: Key[] = [
  [0, -30],
  [0.25, -36],
  [0.5, -42],
  [0.75, -34],
  [1, -30],
];

/** Scarf and ponytail trail the bob — follow-through, driven by the same cycle. */
export const SCARF_A: Key[] = [
  [0, 14],
  [0.25, 2],
  [0.5, 14],
  [0.75, 4],
  [1, 14],
];
export const SCARF_B: Key[] = [
  [0, 20],
  [0.3, 6],
  [0.55, 20],
  [0.8, 8],
  [1, 20],
];
export const HAIR_A: Key[] = [
  [0, -8],
  [0.28, 4],
  [0.52, -8],
  [0.78, 4],
  [1, -8],
];
export const HAIR_B: Key[] = [
  [0, -12],
  [0.32, 6],
  [0.56, -12],
  [0.82, 6],
  [1, -12],
];

/**
 * One human gait cycle as its own timeline, so the master can drop copies of it at
 * absolute times (no `repeat: -1`, no relative `+=` tweens: seeking stays exact).
 */
export function humanGait(h: Human, dur: number, gain = 1): gsap.core.Timeline {
  const tl = gsap.timeline({defaults: {ease: 'sine.inOut'}});
  const g = (keys: Key[], centre = 0) => scaleKeys(keys, centre, gain);

  cycleProp(tl, h.thighF as unknown as Record<string, number>, 'r', g(THIGH.F, -3), dur);
  cycleProp(tl, h.thighB as unknown as Record<string, number>, 'r', g(THIGH.B, -3), dur);
  cycleProp(tl, h.shinF as unknown as Record<string, number>, 'r', g(SHIN.F, 20, ), dur, 'power1.inOut');
  cycleProp(tl, h.shinB as unknown as Record<string, number>, 'r', g(SHIN.B, 20), dur, 'power1.inOut');
  cycleProp(tl, h.footF as unknown as Record<string, number>, 'r', g(FOOT.F, 2), dur);
  cycleProp(tl, h.footB as unknown as Record<string, number>, 'r', g(FOOT.B, 2), dur);

  cycleProp(tl, h as unknown as Record<string, number>, 'bob', g(BOB, 0.5), dur);
  cycleProp(tl, h.hips as unknown as Record<string, number>, 'r', g(HIPS_ROLL), dur);
  cycleProp(tl, h.torso as unknown as Record<string, number>, 'r', g(TORSO_ROLL, 3), dur);
  cycleProp(tl, h.head as unknown as Record<string, number>, 'r', g(HEAD_STAB, -2), dur);
  cycleProp(tl, h.neck as unknown as Record<string, number>, 'r', g(HEAD_STAB, -1), dur);

  cycleProp(tl, h.uarmB as unknown as Record<string, number>, 'r', g(UARM_FAR), dur);
  cycleProp(tl, h.larmB as unknown as Record<string, number>, 'r', g(LARM_FAR, -26), dur);
  cycleProp(tl, h.uarmF as unknown as Record<string, number>, 'r', g(UARM_LEASH), dur);
  cycleProp(tl, h.larmF as unknown as Record<string, number>, 'r', g(LARM_LEASH, -36), dur);
  cycleProp(tl, h.handF as unknown as Record<string, number>, 'r', g(shiftKeys(LARM_LEASH, 0.06), -8), dur);

  cycleProp(tl, h.scarfA as unknown as Record<string, number>, 'r', g(SCARF_A, 12), dur);
  cycleProp(tl, h.scarfB as unknown as Record<string, number>, 'r', g(SCARF_B, 16), dur);
  cycleProp(tl, h.hairA as unknown as Record<string, number>, 'r', g(HAIR_A, -6), dur);
  cycleProp(tl, h.hairB as unknown as Record<string, number>, 'r', g(HAIR_B, -9), dur);

  return tl;
}

/* ------------------------------------------------------------------ *
 * Dog trot cycle
 * ------------------------------------------------------------------ */

/** Front leg: shoulder, elbow, paw. */
export const D_FHIP: Key[] = [
  [0, -21],
  [0.16, -12],
  [0.32, -2],
  [0.46, 10],
  [0.55, 19],
  [0.66, 10],
  [0.8, -7],
  [0.92, -18],
  [1, -21],
];
export const D_FKNEE: Key[] = [
  [0, 8],
  [0.14, 14],
  [0.3, 8],
  [0.46, 14],
  [0.55, 26],
  [0.68, 72],
  [0.8, 40],
  [0.92, 14],
  [1, 8],
];
export const D_FPAW: Key[] = [
  [0, -8],
  [0.3, 0],
  [0.55, 14],
  [0.72, 4],
  [1, -8],
];
/** Hind leg: the hock folds the opposite way to the front knee. */
/**
 * Hind leg: a zigzag (femur back, tibia forward, metatarsus back). The hock has to EXTEND
 * through stance so the paw travels back with the femur, then flex hard to lift it in swing.
 */
export const D_BHIP: Key[] = [
  [0, -13],
  [0.16, -3],
  [0.32, 9],
  [0.46, 24],
  [0.55, 37],
  [0.66, 26],
  [0.8, 6],
  [0.92, -10],
  [1, -13],
];
export const D_BKNEE: Key[] = [
  [0, -22],
  [0.16, -18],
  [0.32, -14],
  [0.46, -9],
  [0.55, -6],
  [0.66, -32],
  [0.78, -60],
  [0.9, -34],
  [1, -22],
];
export const D_BPAW: Key[] = [
  [0, 33],
  [0.16, 24],
  [0.32, 10],
  [0.46, -2],
  [0.55, -12],
  [0.7, 22],
  [0.85, 30],
  [1, 26],
];
/** Two bounces per cycle, like a trotting dog's spine. */
export const D_BOUNCE: Key[] = [
  [0, 3.5],
  [0.25, -3.5],
  [0.5, 3.5],
  [0.75, -3.5],
  [1, 3.5],
];
export const D_PITCH: Key[] = [
  [0, -2],
  [0.25, 1],
  [0.5, 2],
  [0.75, -1],
  [1, -2],
];
export const D_TAIL: Key[] = [
  [0, -18],
  [0.25, 18],
  [0.5, -18],
  [0.75, 18],
  [1, -18],
];
export const D_EAR: Key[] = [
  [0, -12],
  [0.3, 4],
  [0.55, -12],
  [0.8, 4],
  [1, -12],
];
export const D_HEAD: Key[] = [
  [0, 5],
  [0.25, 1],
  [0.5, -4],
  [0.75, 1],
  [1, 5],
];

type DogLegKeys = {hip: Key[]; knee: Key[]; paw: Key[]};
const frontLeg = (): DogLegKeys => ({hip: D_FHIP, knee: D_FKNEE, paw: D_FPAW});
const hindLeg = (): DogLegKeys => ({hip: D_BHIP, knee: D_BKNEE, paw: D_BPAW});

/**
 * Trot = diagonal pairs. FL + BR share a phase, FR + BL are half a cycle behind.
 */
export function dogGait(d: Dog, dur: number, gain = 1): gsap.core.Timeline {
  const tl = gsap.timeline({defaults: {ease: 'sine.inOut'}});
  const g = (keys: Key[], centre = 0) => scaleKeys(keys, centre, gain);

  const pairs: Array<[Dog['legFL'], DogLegKeys, number, boolean]> = [
    [d.legFL, frontLeg(), 0, true],
    [d.legBR, hindLeg(), 0, false],
    [d.legFR, frontLeg(), 0.5, true],
    [d.legBL, hindLeg(), 0.5, false],
  ];

  for (const [leg, keys, off, isFront] of pairs) {
    cycleProp(tl, leg.hip as unknown as Record<string, number>, 'r', g(shiftKeys(keys.hip, off), isFront ? -4 : 18), dur);
    cycleProp(
      tl,
      leg.knee as unknown as Record<string, number>,
      'r',
      g(shiftKeys(keys.knee, off), isFront ? 20 : -30),
      dur,
      'power1.inOut',
    );
    cycleProp(tl, leg.paw as unknown as Record<string, number>, 'r', g(shiftKeys(keys.paw, off), 0), dur);
  }

  cycleProp(tl, d as unknown as Record<string, number>, 'bounce', g(D_BOUNCE, 0), dur);
  cycleProp(tl, d as unknown as Record<string, number>, 'pitch', g(D_PITCH, 0), dur);
  cycleProp(tl, d.head as unknown as Record<string, number>, 'r', g(D_HEAD, 3), dur);
  cycleProp(tl, d.earF as unknown as Record<string, number>, 'r', g(D_EAR, -8), dur);
  cycleProp(tl, d.earB as unknown as Record<string, number>, 'r', g(shiftKeys(D_EAR, 0.12), -9), dur);
  cycleProp(tl, d.tail1 as unknown as Record<string, number>, 'r', g(D_TAIL, -20), dur);
  cycleProp(tl, d.tail2 as unknown as Record<string, number>, 'r', g(shiftKeys(D_TAIL, 0.08), -18), dur);
  cycleProp(tl, d.tail3 as unknown as Record<string, number>, 'r', g(shiftKeys(D_TAIL, 0.16), -14), dur);
  cycleProp(tl, d.neck as unknown as Record<string, number>, 'r', g(shiftKeys(D_HEAD, 0.5), -4), dur);

  return tl;
}

/* ------------------------------------------------------------------ *
 * Master timeline
 * ------------------------------------------------------------------ */

export function buildTimeline(s: SceneState): gsap.core.Timeline {
  const {world: w, human: h, dog: d, fx, leash} = s;

  // Eases authored as curves: the walking speed profile and the closing push-in.
  CustomEase.create('stroll', 'M0,0 C0.08,0.02 0.14,0.22 0.22,0.34 0.42,0.62 0.6,0.72 0.78,0.84 0.9,0.92 0.96,1 1,1');
  CustomEase.create('pushIn', 'M0,0 C0.3,0 0.42,0.42 0.58,0.66 0.74,0.9 0.86,1 1,1');
  CustomEase.create('settle', 'M0,0 C0.16,0.62 0.28,1.12 0.44,1.02 0.6,0.92 0.72,1 1,1');
  CustomWiggle.create('handheld', {wiggles: 3, type: 'easeInOut'});
  CustomWiggle.create('flutter', {wiggles: 12, type: 'uniform'});

  const tl = gsap.timeline({paused: true, defaults: {ease: 'sine.inOut'}});
  for (const [name, t] of Object.entries(BEAT)) {
    tl.addLabel(name, t);
  }

  /* ---------------- 1. grade, fade, vignette ---------------- */
  tl.fromTo(w, {fade: 1}, {fade: 0, duration: 0.85, ease: 'power2.out'}, 'fadeIn');
  tl.to(w, {fade: 1, duration: 1.05, ease: 'power2.in'}, 'outro');
  tl.to(w, {title: 1, duration: 0.85, ease: 'power2.out'}, 'outro+=0.15');
  tl.fromTo(w, {titleY: 30}, {titleY: 0, duration: 0.95, ease: 'power3.out'}, 'outro+=0.15');
  tl.fromTo(w, {rule: 0}, {rule: 1, duration: 0.7, ease: 'power2.inOut'}, 'outro+=0.3');
  absProp(tl, w as unknown as Record<string, number>, 'warm', [
    [0, 0.18],
    [4, 0.24],
    [9.3, 0.3],
    [12.5, 0.52],
    [DURATION_SEC, 0.62],
  ]);
  absProp(tl, w as unknown as Record<string, number>, 'vignette', [
    [0, 0.42],
    [1.2, 0.26],
    [10.2, 0.3],
    [12.6, 0.5],
    [DURATION_SEC, 0.62],
  ]);

  /* ---------------- 2. camera ---------------- */
  absProp(tl, w as unknown as Record<string, number>, 'camScale', [
    [0, 1.04],
    [BEAT.walk, 1.0],
    [BEAT.slow, 1.02],
    [BEAT.push, 1.05],
    [BEAT.outro, 1.13],
    [DURATION_SEC, 1.15],
  ], 'pushIn');
  absProp(tl, w as unknown as Record<string, number>, 'camY', [
    [0, -12],
    [BEAT.walk, 0],
    [BEAT.stop, 6],
    [BEAT.push, -18],
    [DURATION_SEC, -26],
  ]);
  absProp(tl, w as unknown as Record<string, number>, 'camX', [
    [0, 40],
    [BEAT.walk, 0],
    [BEAT.stop, -30],
    [BEAT.push, -90],
    [DURATION_SEC, -120],
  ]);
  // Handheld micro-drift on top of the authored move.
  tl.fromTo(w, {camRot: -0.16}, {camRot: 0.16, duration: DURATION_SEC, ease: 'handheld'}, 0);
  tl.fromTo(w, {sun: 0}, {sun: 1, duration: DURATION_SEC, ease: 'flutter'}, 0);

  /* ---------------- 3. the walk: gait cycles + ground distance ---------------- */
  const strideScale = [0.42, 0.76, 0.94, 1, 1, 1, 0.9, 0.6];
  let t = BEAT.stepOff;
  let cycleIndex = 0;
  let travelled = 0;
  const distanceKeys: Key[] = [
    [0, 0],
    [BEAT.stepOff, 0],
  ];
  while (t < BEAT.stop - 1e-6 && cycleIndex < strideScale.length) {
    const gain = strideScale[cycleIndex];
    const dur = Math.min(CYCLE_H, BEAT.stop - t);
    tl.add(humanGait(h, dur, gain), t);
    // Dog cadence is exactly twice the human's, so the pair never drifts apart.
    let dt = t;
    while (dt < t + dur - 1e-6) {
      const ddur = Math.min(CYCLE_D, t + dur - dt);
      tl.add(dogGait(d, ddur, gain), dt);
      dt += ddur;
    }
    travelled += STRIDE_H * gain * (dur / CYCLE_H);
    distanceKeys.push([t + dur, travelled]);
    // heel-strike dust, alternating feet
    const puff = fx.dust[cycleIndex % fx.dust.length];
    tl.fromTo(
      puff,
      {x: h.x + 34, y: 900, s: 0.25, o: 0.5},
      {x: h.x - 26, y: 872, s: 1.7, o: 0, duration: 0.5, ease: 'power2.out'},
      t + 0.02,
    );
    t += dur;
    cycleIndex++;
  }
  absProp(tl, w as unknown as Record<string, number>, 'distance', distanceKeys, 'none');
  // Clouds keep creeping regardless of the walk.
  tl.fromTo(w, {cloud: 0}, {cloud: 260, duration: DURATION_SEC, ease: 'none'}, 0);
  tl.fromTo(w, {wind: 0.15}, {wind: 0.6, duration: DURATION_SEC, ease: 'handheld'}, 0);

  /* ---------------- 4. lean: weight shifts with speed ---------------- */
  absProp(tl, h as unknown as Record<string, number>, 'lean', [
    [0, 1],
    [BEAT.tug, 4],
    [BEAT.stepOff, 9],
    [BEAT.walk, 7],
    [BEAT.sniff, 6],
    [BEAT.slow, 3],
    [BEAT.stop, -2],
    [BEAT.sit, 1],
    [BEAT.pat, 11],
    [DURATION_SEC, 9],
  ]);
  absProp(tl, h as unknown as Record<string, number>, 'bobBase', [
    [0, 3],
    [BEAT.tug, -3],
    [BEAT.stepOff, 5],
    [BEAT.stop, 3],
    [BEAT.sit, 0],
    [DURATION_SEC, 0],
  ]);

  /* ---------------- 5. the dog tugs ahead (anticipation) ---------------- */
  // The dog drifts closer as the walk winds down, so the finale happens in one frame.
  absProp(tl, d as unknown as Record<string, number>, 'x', [
    [0, 1190],
    [BEAT.tug, 1244],
    [BEAT.stepOff, 1268],
    [BEAT.walk, 1230],
    [BEAT.sniff, 1200],
    [BEAT.butterfly, 1240],
    [BEAT.slow, 1180],
    [BEAT.stop, 1080],
    [BEAT.sit, 1010],
  ]);
  // The human takes one small step in when stopping, then leans into the dog.
  absProp(tl, h as unknown as Record<string, number>, 'x', [
    [0, 700],
    [BEAT.stepOff, 703],
    [BEAT.stop, 718],
    [BEAT.sit, 738],
    [BEAT.pat, 750],
    [DURATION_SEC, 750],
  ]);
  absProp(tl, d as unknown as Record<string, number>, 'lean', [
    [0, 2],
    [BEAT.tug, 9],
    [BEAT.stepOff, 12],
    [BEAT.walk, 6],
    [BEAT.sniff, 2],
    [BEAT.butterfly, 8],
    [BEAT.stop, 0],
    [BEAT.sit, -3],
    [BEAT.pat, -6],
    [DURATION_SEC, -5],
  ]);
  absProp(tl, leash as unknown as Record<string, number>, 'slack', [
    [0, 0.4],
    [BEAT.tug, 0.06],
    [BEAT.stepOff, 0.14],
    [BEAT.walk, 0.42],
    [BEAT.sniff, 0.78],
    [BEAT.butterfly, 0.1],
    [BEAT.slow, 0.5],
    [BEAT.stop, 0.72],
    [BEAT.sit, 0.85],
    [BEAT.pat, 0.9],
    [DURATION_SEC, 0.9],
  ]);
  absProp(tl, leash as unknown as Record<string, number>, 'tension', [
    [0, 0],
    [BEAT.tug, 1],
    [BEAT.stepOff, 0.7],
    [BEAT.walk, 0.1],
    [BEAT.butterfly, 0.9],
    [BEAT.slow, 0.1],
    [BEAT.stop, 0],
    [DURATION_SEC, 0],
  ]);

  /* ---------------- 6. sniff beat: the dog drops its head ---------------- */
  tl.to(d as unknown as Record<string, number>, {neckTurn: 24, duration: 0.34, ease: 'power2.out'}, 'sniff');
  tl.to(d as unknown as Record<string, number>, {headTurn: 26, duration: 0.34, ease: 'power2.out'}, 'sniff');
  tl.to(d as unknown as Record<string, number>, {bounceAdd: 13, duration: 0.34, ease: 'power2.out'}, 'sniff');
  tl.to(d as unknown as Record<string, number>, {tongue: 0.1, duration: 0.3, ease: 'power2.out'}, 'sniff');
  // ... two sniffs, then the head pops back up with an overshoot.
  tl.to(d as unknown as Record<string, number>, {neckTurn: 15, duration: 0.22, ease: 'power2.inOut'}, 'sniff+=0.5');
  tl.to(d as unknown as Record<string, number>, {neckTurn: 26, duration: 0.22, ease: 'power2.inOut'}, 'sniff+=0.78');
  tl.to(d as unknown as Record<string, number>, {headTurn: 20, duration: 0.5, ease: 'power2.inOut'}, 'sniff+=0.5');
  tl.to(d as unknown as Record<string, number>, {neckTurn: -12, duration: 0.46, ease: 'back.out(2.4)'}, 'sniff+=1.06');
  tl.to(d as unknown as Record<string, number>, {headTurn: -8, duration: 0.5, ease: 'back.out(2.2)'}, 'sniff+=1.1');
  tl.to(d as unknown as Record<string, number>, {bounceAdd: -4, duration: 0.4, ease: 'back.out(2.6)'}, 'sniff+=1.06');
  tl.to(d as unknown as Record<string, number>, {tongue: 0.55, duration: 0.4, ease: 'power2.out'}, 'sniff+=1.1');

  /* ---------------- 7. butterfly beat: ears perk, head tracks it ---------------- */
  tl.to(d as unknown as Record<string, number>, {earPerk: -24, duration: 0.24, ease: 'back.out(3)'}, 'butterfly');
  tl.to(d as unknown as Record<string, number>, {headTurn: -16, duration: 0.4, ease: 'power2.out'}, 'butterfly+=0.06');
  tl.to(d as unknown as Record<string, number>, {neckTurn: -16, duration: 0.44, ease: 'power2.out'}, 'butterfly+=0.06');
  tl.to(h as unknown as Record<string, number>, {headTurn: -9, duration: 0.5, ease: 'power2.out'}, 'butterfly+=0.2');
  tl.to(h as unknown as Record<string, number>, {mouthOpen: 0.5, duration: 0.4, ease: 'power2.out'}, 'butterfly+=0.25');
  tl.to(h as unknown as Record<string, number>, {mouthOpen: 0, duration: 0.6, ease: 'power2.inOut'}, 'butterfly+=1.1');
  tl.to(h as unknown as Record<string, number>, {headTurn: 0, duration: 0.7, ease: 'power2.inOut'}, 'butterfly+=1.2');
  tl.to(d as unknown as Record<string, number>, {headTurn: 0, duration: 0.8, ease: 'power2.inOut'}, 'butterfly+=1.1');
  tl.to(d as unknown as Record<string, number>, {neckTurn: 0, duration: 0.8, ease: 'power2.inOut'}, 'butterfly+=1.1');
  tl.to(d as unknown as Record<string, number>, {earPerk: 0, duration: 0.6, ease: 'power2.inOut'}, 'butterfly+=1.2');

  /* ---------------- 8. the stop, then the sit ---------------- */
  // Weight settles back onto the heels with a small overshoot (follow-through).
  tl.to(h.torso as unknown as Record<string, number>, {r: -6, duration: 0.5, ease: 'settle'}, 'stop');
  tl.to(h.head as unknown as Record<string, number>, {r: 5, duration: 0.6, ease: 'settle'}, 'stop+=0.04');
  tl.to(h.thighF as unknown as Record<string, number>, {r: -6, duration: 0.55, ease: 'power2.out'}, 'stop');
  tl.to(h.thighB as unknown as Record<string, number>, {r: 8, duration: 0.55, ease: 'power2.out'}, 'stop');
  tl.to(h.shinF as unknown as Record<string, number>, {r: 10, duration: 0.55, ease: 'power2.out'}, 'stop');
  tl.to(h.shinB as unknown as Record<string, number>, {r: 6, duration: 0.55, ease: 'power2.out'}, 'stop');
  tl.to(h.footF as unknown as Record<string, number>, {r: -2, duration: 0.4, ease: 'power2.out'}, 'stop');
  tl.to(h.footB as unknown as Record<string, number>, {r: 2, duration: 0.4, ease: 'power2.out'}, 'stop');
  tl.to(h.uarmF as unknown as Record<string, number>, {r: -12, duration: 0.6, ease: 'power2.out'}, 'stop');
  tl.to(h.larmF as unknown as Record<string, number>, {r: -24, duration: 0.6, ease: 'power2.out'}, 'stop');
  tl.to(h.uarmB as unknown as Record<string, number>, {r: 10, duration: 0.6, ease: 'power2.out'}, 'stop');
  tl.to(h.larmB as unknown as Record<string, number>, {r: -20, duration: 0.6, ease: 'power2.out'}, 'stop');

  // Dog sits: anticipation dip, then the haunches fold under with a back-ease settle.
  tl.to(d as unknown as Record<string, number>, {pitch: -4, duration: 0.2, ease: 'power2.in'}, 'sit-=0.24');
  tl.to(d as unknown as Record<string, number>, {sit: 1, duration: 0.5, ease: 'power2.out'}, 'sit');
  tl.to(d as unknown as Record<string, number>, {pitch: 2, duration: 0.62, ease: 'back.out(1.8)'}, 'sit');
  tl.to(d as unknown as Record<string, number>, {bounceAdd: 4, duration: 0.5, ease: 'power2.out'}, 'sit');
  tl.to(d as unknown as Record<string, number>, {neckTurn: 2, duration: 0.55, ease: 'power2.inOut'}, 'sit');
  tl.to(d as unknown as Record<string, number>, {headTurn: -8, duration: 0.55, ease: 'power2.inOut'}, 'sit');
  tl.to(d.neck as unknown as Record<string, number>, {r: -14, duration: 0.6, ease: 'back.out(1.6)'}, 'sit+=0.06');
  tl.to(d.head as unknown as Record<string, number>, {r: -10, duration: 0.6, ease: 'back.out(1.6)'}, 'sit+=0.1');
  tl.to(d as unknown as Record<string, number>, {tongue: 0.85, duration: 0.5, ease: 'power2.out'}, 'sit+=0.2');
  // Happy fast wag once seated: 3 wags, decaying.
  tl.to(d.tail1 as unknown as Record<string, number>, {
    r: 24,
    duration: 0.18,
    ease: 'sine.inOut',
    yoyo: true,
    repeat: 9,
  }, 'sit+=0.3');
  tl.to(d.tail2 as unknown as Record<string, number>, {
    r: 20,
    duration: 0.18,
    ease: 'sine.inOut',
    yoyo: true,
    repeat: 9,
  }, 'sit+=0.34');
  tl.to(d.tail3 as unknown as Record<string, number>, {
    r: 16,
    duration: 0.18,
    ease: 'sine.inOut',
    yoyo: true,
    repeat: 9,
  }, 'sit+=0.38');

  tl.fromTo(fx.dust[2], {x: 946, y: 900, s: 0.3, o: 0.5}, {x: 896, y: 878, s: 1.7, o: 0, duration: 0.55, ease: 'power2.out'}, 'sit+=0.06');
  tl.fromTo(fx.dust[3], {x: 1046, y: 900, s: 0.3, o: 0.42}, {x: 1092, y: 880, s: 1.5, o: 0, duration: 0.55, ease: 'power2.out'}, 'sit+=0.1');
  tl.fromTo(fx.dust[4], {x: 918, y: 900, s: 0.3, o: 0.55}, {x: 862, y: 874, s: 1.9, o: 0, duration: 0.6, ease: 'power2.out'}, 'pat+=1.32');
  tl.fromTo(fx.dust[5], {x: 986, y: 900, s: 0.3, o: 0.5}, {x: 1040, y: 876, s: 1.7, o: 0, duration: 0.6, ease: 'power2.out'}, 'pat+=1.36');

  /* ---------------- 8b. settle to a neutral stand when the walk ends --------
     The cyclic gait freezes mid-stride; ease every limb back to neutral so the
     finale poses (sit, leap, pat) start from a clean body. */
  for (const leg of [d.legFL, d.legFR, d.legBL, d.legBR]) {
    for (const joint of [leg.hip, leg.knee, leg.paw]) {
      tl.to(joint as unknown as Record<string, number>, {r: 0, duration: 0.5, ease: 'power2.inOut'}, 'stop+=0.1');
    }
  }
  for (const joint of [h.thighF, h.shinF, h.footF, h.thighB, h.shinB, h.footB]) {
    tl.to(joint as unknown as Record<string, number>, {r: 0, duration: 0.5, ease: 'power2.inOut'}, 'stop+=0.1');
  }
  tl.to(h.uarmF as unknown as Record<string, number>, {r: -18, duration: 0.5, ease: 'power2.inOut'}, 'stop+=0.1');
  tl.to(h.larmF as unknown as Record<string, number>, {r: -10, duration: 0.5, ease: 'power2.inOut'}, 'stop+=0.1');
  tl.to(h.uarmB as unknown as Record<string, number>, {r: 8, duration: 0.5, ease: 'power2.inOut'}, 'stop+=0.1');
  tl.to(h.larmB as unknown as Record<string, number>, {r: 6, duration: 0.5, ease: 'power2.inOut'}, 'stop+=0.1');

  /* ---------------- 9. the pat: the dog leaps up into the hand ---------------- */
  tl.to(d as unknown as Record<string, number>, {bounceAdd: 16, duration: 0.3, ease: 'power2.in'}, 'pat-=0.32');
  tl.to(d as unknown as Record<string, number>, {earPerk: -8, duration: 0.3, ease: 'power2.in'}, 'pat-=0.32');
  tl.to(d as unknown as Record<string, number>, {earPerk: 14, duration: 0.34, ease: 'back.out(3)'}, 'pat');
  tl.to(d as unknown as Record<string, number>, {x: 906, duration: 0.42, ease: 'power2.out'}, 'pat');
  tl.to(d as unknown as Record<string, number>, {bounceAdd: -54, duration: 0.38, ease: 'power2.out'}, 'pat');
  tl.to(d as unknown as Record<string, number>, {neckTurn: -12, duration: 0.4, ease: 'power2.out'}, 'pat');
  tl.to(d as unknown as Record<string, number>, {headTurn: -14, duration: 0.4, ease: 'power2.out'}, 'pat');
  tl.to(d as unknown as Record<string, number>, {sit: 0.16, duration: 0.35, ease: 'power2.out'}, 'pat');
  // ...and drops back into the sit with a squash
  tl.to(d as unknown as Record<string, number>, {x: 952, duration: 0.55, ease: 'power2.inOut'}, 'pat+=0.95');
  tl.to(d as unknown as Record<string, number>, {bounceAdd: 10, duration: 0.4, ease: 'power2.in'}, 'pat+=0.95');
  tl.to(d as unknown as Record<string, number>, {bounceAdd: 4, duration: 0.35, ease: 'back.out(3)'}, 'pat+=1.35');
  tl.to(d as unknown as Record<string, number>, {sit: 1, duration: 0.5, ease: 'power2.inOut'}, 'pat+=0.95');
  tl.to(d as unknown as Record<string, number>, {neckTurn: 2, duration: 0.5, ease: 'power2.inOut'}, 'pat+=1.0');
  tl.to(d as unknown as Record<string, number>, {headTurn: -8, duration: 0.5, ease: 'power2.inOut'}, 'pat+=1.0');

  /* secondary action on both characters ---------------- */
  tl.to(h.torso as unknown as Record<string, number>, {r: 17, duration: 0.6, ease: 'power2.inOut'}, 'pat');
  tl.to(h.uarmF as unknown as Record<string, number>, {r: -84, duration: 0.55, ease: 'power2.out'}, 'pat');
  tl.to(h.larmF as unknown as Record<string, number>, {r: -20, duration: 0.55, ease: 'power2.out'}, 'pat');
  tl.to(h.handF as unknown as Record<string, number>, {r: -18, duration: 0.4, ease: 'power2.out'}, 'pat+=0.2');
  // two gentle pats
  tl.to(h.uarmF as unknown as Record<string, number>, {r: -38, duration: 0.22, ease: 'sine.inOut', yoyo: true, repeat: 3}, 'pat+=0.6');
  tl.to(h.larmF as unknown as Record<string, number>, {r: -22, duration: 0.22, ease: 'sine.inOut', yoyo: true, repeat: 3}, 'pat+=0.62');
  tl.to(h.head as unknown as Record<string, number>, {r: 12, duration: 0.6, ease: 'power2.inOut'}, 'pat');
  tl.to(h.neck as unknown as Record<string, number>, {r: 6, duration: 0.6, ease: 'power2.inOut'}, 'pat');
  tl.to(h as unknown as Record<string, number>, {smile: 1, duration: 0.5, ease: 'power2.out'}, 'pat');
  // dog leans into the hand, eyes close
  tl.to(d as unknown as Record<string, number>, {lean: -12, duration: 0.6, ease: 'power2.out'}, 'pat+=0.1');
  tl.to(d.head as unknown as Record<string, number>, {r: -22, duration: 0.6, ease: 'power2.out'}, 'pat+=0.1');
  tl.to(d.neck as unknown as Record<string, number>, {r: -20, duration: 0.6, ease: 'power2.out'}, 'pat+=0.1');
  tl.to(d as unknown as Record<string, number>, {blink: 1, duration: 0.35, ease: 'power2.out'}, 'pat+=0.3');
  tl.to(d.earF as unknown as Record<string, number>, {r: 8, duration: 0.5, ease: 'power2.out'}, 'pat+=0.2');
  tl.to(d.earB as unknown as Record<string, number>, {r: 6, duration: 0.5, ease: 'power2.out'}, 'pat+=0.2');

  /* ---------------- 10. idle life: breathing, blinks, ear twitches ---------------- */
  tl.to(h.torso as unknown as Record<string, number>, {
    s: 1.02,
    duration: 1.6,
    ease: 'sine.inOut',
    yoyo: true,
    repeat: 7,
  }, 0.4);
  const blinks: Array<[number, Record<string, number>]> = [
    [1.9, h as unknown as Record<string, number>],
    [3.4, h as unknown as Record<string, number>],
    [5.6, h as unknown as Record<string, number>],
    [8.1, h as unknown as Record<string, number>],
    [10.6, h as unknown as Record<string, number>],
    [12.4, h as unknown as Record<string, number>],
    [2.6, d as unknown as Record<string, number>],
    [6.2, d as unknown as Record<string, number>],
    [10.2, d as unknown as Record<string, number>],
  ];
  for (const [at, target] of blinks) {
    tl.to(target, {blink: 1, duration: 0.055, ease: 'power2.in', yoyo: true, repeat: 1}, at);
  }
  // Ear twitch while seated.
  tl.to(d.earF as unknown as Record<string, number>, {
    r: -6,
    duration: 0.12,
    ease: 'power2.out',
    yoyo: true,
    repeat: 1,
  }, 'sit+=1.9');

  /* ---------------- 11. leaves, butterflies, birds ---------------- */
  fx.leaves.forEach((leaf, i) => {
    const start = 0.7 + i * 1.1;
    tl.fromTo(
      leaf,
      {x: 2050 - i * 60, y: -90, o: 0},
      {
        duration: 5,
        ease: 'none',
        o: 0.95,
        motionPath: {
          path: [
            {x: 2050 - i * 60, y: -90},
            {x: 1650 - i * 40, y: 250},
            {x: 1250 - i * 20, y: 430},
            {x: 820 + i * 30, y: 640},
            {x: 380 + i * 40, y: 900},
            {x: 60, y: 1120},
          ],
          curviness: 1.6,
        },
      },
      start,
    );
    tl.to(leaf, {r: leaf.r + 540 + i * 90, duration: 5, ease: 'none'}, start);
    tl.to(leaf, {o: 0, duration: 0.8, ease: 'power2.in'}, start + 4.2);
  });

  fx.butterflies.forEach((b, i) => {
    const start = 5.2 + i * 1.7;
    tl.fromTo(
      b,
      {x: 2100, y: 430 + i * 120, o: 0},
      {
        duration: 4.2,
        ease: 'power1.inOut',
        o: 1,
        motionPath: {
          path: [
            {x: 2100, y: 430 + i * 120},
            {x: 1620, y: 380 + i * 90},
            {x: 1330, y: 620},
            {x: 1180, y: 560},
            {x: 900, y: 420 + i * 60},
            {x: 420, y: 300 + i * 110},
            {x: -120, y: 220 + i * 90},
          ],
          curviness: 2.1,
        },
      },
      start,
    );
    tl.to(b, {o: 0, duration: 0.6, ease: 'power2.in'}, start + 3.6);
    tl.to(b, {wing: 1, duration: 0.075, ease: 'sine.inOut', yoyo: true, repeat: 48}, start);
  });

  fx.birds.forEach((bird, i) => {
    const start = 2.2 + i * 1.35;
    tl.fromTo(
      bird,
      {x: 2250, y: 120 + i * 46, o: 0},
      {
        duration: 7.5,
        ease: 'none',
        o: 0.75,
        motionPath: {
          path: [
            {x: 2250, y: 120 + i * 46},
            {x: 1500, y: 90 + i * 60},
            {x: 760, y: 150 + i * 40},
            {x: -160, y: 100 + i * 70},
          ],
          curviness: 1.1,
        },
      },
      start,
    );
    tl.to(bird, {wing: 1, duration: 0.16, ease: 'sine.inOut', yoyo: true, repeat: 40}, start);
  });

  /* ---------------- 12. light ---------------- */
  tl.fromTo(w, {flare: 0}, {flare: 0.55, duration: 3.4, ease: 'power2.inOut'}, BEAT.push - 0.6);
  tl.to(w, {flare: 0, duration: 1.2, ease: 'power2.inOut'}, BEAT.outro - 0.1);

  tl.addLabel('tail', DURATION_SEC);
  return tl;
}

/* ------------------------------------------------------------------ *
 * Frame sampling — the only entry point the renderer needs
 * ------------------------------------------------------------------ */

let cache: {tl: gsap.core.Timeline; state: SceneState} | null = null;

export function getScene(): {tl: gsap.core.Timeline; state: SceneState} {
  if (!cache) {
    gsap.ticker.sleep();
    const state = createState();
    const tl = buildTimeline(state);
    tl.pause();
    tl.time(0);
    cache = {tl, state};
  }
  return cache;
}

/** Seek the master timeline to a frame and hand back the animated state. */
export function sampleState(frame: number, fps: number = FPS): SceneState {
  const {tl, state} = getScene();
  const t = Math.min(Math.max(frame / fps, 0), tl.duration());
  tl.time(t);
  return state;
}

export const timelineDuration = () => getScene().tl.duration();

export type {J, SceneState};
