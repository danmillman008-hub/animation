// Two-bone IK + spring-damper secondary motion for the Remotion FK rig (Rig.tsx).
// Everything is expressed in the rig's own units: pivots in artwork coordinates, rotations in degrees,
// so results plug straight into a Pose ({ part: { rot } }).

import type { Pose } from "./Rig";

const deg = (r: number) => (r * 180) / Math.PI;
const rad = (d: number) => (d * Math.PI) / 180;

export type Chain = {
  root: string;   // e.g. "thigh_f"  (rotates about hip)
  mid: string;    // e.g. "shin_f"   (rotates about knee)
  hip: [number, number];   // root pivot (artwork coords)
  knee: [number, number];  // mid pivot  (artwork coords, in rest pose)
  end: [number, number];   // end effector in rest pose (ankle / wrist)
  bendSign?: 1 | -1;       // +1 knee bends backward (legs), -1 elbow bends forward (arms)
  limits?: { root: [number, number]; mid: [number, number] };
};

/** Solve a planar two-bone chain so its end effector reaches `target` (artwork coords, same space as pivots).
 *  Returns root/mid rotations in degrees, relative to the rest pose, ready to put into a Pose.
 *  Clamps to reach and to joint limits; never produces NaN. */
export function twoBoneIK(c: Chain, target: [number, number]): { [part: string]: { rot: number } } {
  const l1 = Math.hypot(c.knee[0] - c.hip[0], c.knee[1] - c.hip[1]);
  const l2 = Math.hypot(c.end[0] - c.knee[0], c.end[1] - c.knee[1]);
  // rest-pose angles of the two bones
  const restA1 = Math.atan2(c.knee[1] - c.hip[1], c.knee[0] - c.hip[0]);
  const restA2 = Math.atan2(c.end[1] - c.knee[1], c.end[0] - c.knee[0]);
  const restBend = restA2 - restA1;
  const dx = target[0] - c.hip[0], dy = target[1] - c.hip[1];
  const d = Math.max(1e-3, Math.min(l1 + l2 - 1e-3, Math.hypot(dx, dy))); // clamp to reachable
  const sign = c.bendSign ?? 1;
  // law of cosines
  const cosMid = (l1 * l1 + l2 * l2 - d * d) / (2 * l1 * l2);
  const inner = Math.acos(Math.max(-1, Math.min(1, cosMid)));
  const bend = sign * (Math.PI - inner);                           // signed knee/elbow angle
  const cosRoot = (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d);
  const a1 = Math.atan2(dy, dx) - sign * Math.acos(Math.max(-1, Math.min(1, cosRoot)));
  let rootRot = deg(a1 - restA1);
  let midRot = deg(bend - restBend);
  // normalise to [-180,180]
  const norm = (a: number) => ((((a + 180) % 360) + 360) % 360) - 180;
  rootRot = norm(rootRot); midRot = norm(midRot);
  if (c.limits) {
    rootRot = Math.max(c.limits.root[0], Math.min(c.limits.root[1], rootRot));
    midRot = Math.max(c.limits.mid[0], Math.min(c.limits.mid[1], midRot));
  }
  return { [c.root]: { rot: rootRot }, [c.mid]: { rot: midRot } };
}

/** Forward-evaluate a chain to get the end-effector position for given rotations (for foot-lock checks). */
export function chainEnd(c: Chain, rootRot: number, midRot: number): [number, number] {
  const l1 = Math.hypot(c.knee[0] - c.hip[0], c.knee[1] - c.hip[1]);
  const l2 = Math.hypot(c.end[0] - c.knee[0], c.end[1] - c.knee[1]);
  const a1 = Math.atan2(c.knee[1] - c.hip[1], c.knee[0] - c.hip[0]) + rad(rootRot);
  const a2 = Math.atan2(c.end[1] - c.knee[1], c.end[0] - c.knee[0]) + rad(rootRot) + rad(midRot);
  return [c.hip[0] + Math.cos(a1) * l1 + Math.cos(a2) * l2, c.hip[1] + Math.sin(a1) * l1 + Math.sin(a2) * l2];
}

/** Foot lock: keep a planted foot at `plant` while hips move by (hipDx, hipDy). */
export function plantedLeg(c: Chain, plant: [number, number], hipDx: number, hipDy: number) {
  return twoBoneIK({ ...c, hip: [c.hip[0] + hipDx, c.hip[1] + hipDy] }, plant);
}

// ---------------- Spring-damper secondary motion (hair, scarf, robe...). Deterministic per frame:
// we re-simulate from t=0 with a fixed step so Remotion's random-access rendering stays reproducible.
export type SpringSpec = { part: string; parent: string; k?: number; damping?: number; gain?: number; max?: number };

export function springChain(
  sampleParentRot: (t: number, parent: string) => number,   // parent's world-ish rotation at time t (deg)
  specs: SpringSpec[], t: number, dt = 1 / 60, tStart = 0,
): Pose {
  const out: Pose = {};
  for (const s of specs) {
    const k = s.k ?? 120, c = s.damping ?? 9, gain = s.gain ?? 1, max = s.max ?? 25;
    let x = 0, v = 0, prev = sampleParentRot(tStart, s.parent);
    for (let tt = tStart + dt; tt <= t + 1e-9; tt += dt) {
      const cur = sampleParentRot(tt, s.parent);
      const drive = -(cur - prev) / dt * gain * 0.02; // parent angular velocity drags the child the opposite way
      const a = -k * x - c * v + drive;
      v += a * dt; x += v * dt; prev = cur;
    }
    out[s.part] = { rot: Math.max(-max, Math.min(max, x)) };
  }
  return out;
}
