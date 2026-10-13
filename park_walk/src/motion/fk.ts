import {DOG, HUMAN} from '../scene/skeleton';
import type {Dog, Human, SceneState} from './state';

/**
 * Forward kinematics that mirrors the SVG nesting in the scene components:
 * every joint is `translate(ox, oy) rotate(r) scale(s)` inside its parent.
 * The leash needs real world-space anchors (hand -> collar) and the gait QA needs
 * the planted foot, so the maths lives here once instead of being eyeballed twice.
 */

export type Xf = {x: number; y: number; r: number; s: number};

export const xf = (x: number, y: number, r = 0, s = 1): Xf => ({x, y, r, s});

export function step(p: Xf, lx: number, ly: number, r = 0, s = 1): Xf {
  const rad = (p.r * Math.PI) / 180;
  const c = Math.cos(rad);
  const si = Math.sin(rad);
  return {
    x: p.x + (lx * c - ly * si) * p.s,
    y: p.y + (lx * si + ly * c) * p.s,
    r: p.r + r,
    s: p.s * s,
  };
}

export const humanRoot = (h: Human): Xf => xf(h.x, h.y + h.bob, h.lean + h.hips.r, h.scale);

export const humanTorso = (h: Human): Xf => step(humanRoot(h), 0, 0, h.torso.r);

/** Ankle of the near (front) leg, in screen space. */
export function humanAnkleF(h: Human): Xf {
  const thigh = step(humanRoot(h), HUMAN.hipX, 0, h.thighF.r);
  const knee = step(thigh, 0, HUMAN.thighLen, h.shinF.r);
  return step(knee, 0, HUMAN.shinLen, h.footF.r);
}

export function humanAnkleB(h: Human): Xf {
  const thigh = step(humanRoot(h), -HUMAN.hipX, 0, h.thighB.r);
  const knee = step(thigh, 0, HUMAN.thighLen, h.shinB.r);
  return step(knee, 0, HUMAN.shinLen, h.footB.r);
}

/** Sole contact point of a foot, given its ankle transform (toe is +x in foot space). */
export function footContact(ankle: Xf): {x: number; y: number} {
  const p = step(ankle, HUMAN.footLen * 0.42, 9);
  return {x: p.x, y: p.y};
}

/** Wrist of the near arm — where the leash is held. */
export function humanHandF(h: Human): Xf {
  const shoulder = step(humanTorso(h), HUMAN.shoulderX, HUMAN.shoulderY, h.uarmF.r);
  const elbow = step(shoulder, 0, HUMAN.uarmLen, h.larmF.r);
  return step(elbow, 0, HUMAN.larmLen, h.handF.r);
}

/** Sitting pitches the whole trunk (tail/body/neck/head/hind legs) up about the
 *  shoulder, so the chest lifts while the butt drops onto the ground. */
export const SIT_PITCH = -24;

const dogRoot = (d: Dog): Xf => xf(d.x, d.y + d.bounce + d.bounceAdd, d.lean + d.pitch, d.scale);

/** Map a trunk-local point through the sit rotation (about the shoulder). */
export function dogSitPoint(d: Dog, lx: number, ly: number): {x: number; y: number} {
  const a = (SIT_PITCH * d.sit * Math.PI) / 180;
  const c = Math.cos(a);
  const si = Math.sin(a);
  const dx = lx - DOG.shoulderX;
  const dy = ly - DOG.shoulderY;
  return {x: DOG.shoulderX + c * dx - si * dy, y: DOG.shoulderY + si * dx + c * dy};
}

export function dogBody(d: Dog): Xf {
  const q = dogSitPoint(d, 0, 0);
  return step(dogRoot(d), q.x, q.y, d.body.r);
}

/** Collar anchor, on the neck (matches Dog.tsx: neck joint at 10,-14 rotated 30°). */
export function dogCollar(d: Dog): {x: number; y: number} {
  const nb = dogSitPoint(d, 10, -14);
  const neck = step(dogBody(d), nb.x, nb.y, 30 + d.neck.r + d.neckTurn);
  const p = step(neck, 0, 2);
  return {x: p.x, y: p.y};
}

export function dogNose(d: Dog): {x: number; y: number} {
  const nb = dogSitPoint(d, 10, -14);
  const neck = step(dogBody(d), nb.x, nb.y, 30 + d.neck.r + d.neckTurn);
  const head = step(neck, 0, -DOG.neckLen, -30 + d.head.r + d.headTurn);
  const nose = step(head, 50, -12);
  return {x: nose.x, y: nose.y};
}

export function dogPaw(d: Dog, which: 'FL' | 'FR' | 'BL' | 'BR'): {x: number; y: number} {
  const front = which === 'FL' || which === 'FR';
  const leg = which === 'FL' ? d.legFL : which === 'FR' ? d.legFR : which === 'BL' ? d.legBL : d.legBR;
  const sit = d.sit;
  const baseX = front ? DOG.shoulderX : DOG.hipX;
  const baseY = front ? DOG.shoulderY : DOG.hipY;
  const up = front ? DOG.flegUp : DOG.blegUp;
  const low = front ? DOG.flegLow : DOG.blegLow;
  if (front) {
    // The front leg stays a straight vertical pillar (the pivot is the shoulder,
    // so it neither rises nor sinks as the trunk pitches).
    const hip = step(dogRoot(d), baseX, baseY, leg.hip.r);
    const knee = step(hip, 0, up, leg.knee.r);
    const paw = step(knee, 0, low, leg.paw.r);
    return step(paw, DOG.pawLen * 0.6, 4);
  }
  // The hind leg tucks: thigh and shin fold flat under the trunk, paw peeking fwd.
  const hb = dogSitPoint(d, baseX, baseY);
  const hip = step(dogRoot(d), hb.x, hb.y, leg.hip.r - 50 * sit);
  const knee = step(hip, 0, up, leg.knee.r - 40 * sit);
  const paw = step(knee, 0, low, leg.paw.r + 90 * sit);
  return step(paw, DOG.pawLen * 0.6, 4);
}
