import React from "react";
import { CHARS } from "./characters";

export type Joint = { rot?: number; x?: number; y?: number; sx?: number; sy?: number };
export type Pose = Record<string, Joint>;
export type CharState = {
  x: number; y: number; facing: 1 | -1; scale: number;
  pose: Pose; face?: string; blink?: number; lean?: number; bob?: number; opacity?: number; squash?: number;
};

export const ease = {
  linear: (p: number) => p,
  inOut: (p: number) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2),
  out: (p: number) => 1 - Math.pow(1 - p, 3),
  outQuint: (p: number) => 1 - Math.pow(1 - p, 5),
  in: (p: number) => p * p * p,
  backOut: (p: number) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2); },
  backOutSoft: (p: number) => { const c = 0.9; return 1 + (c + 1) * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2); },
  elastic: (p: number) => p === 0 ? 0 : p === 1 ? 1 : Math.pow(2, -10 * p) * Math.sin((p * 10 - 0.75) * (2 * Math.PI) / 3) + 1,
  bounce: (p: number) => { const n = 7.5625, d = 2.75; if (p < 1 / d) return n * p * p; if (p < 2 / d) return n * (p -= 1.5 / d) * p + 0.75; if (p < 2.5 / d) return n * (p -= 2.25 / d) * p + 0.9375; return n * (p -= 2.625 / d) * p + 0.984375; },
};
export type EaseName = keyof typeof ease;
export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
export const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
export const mix = (t: number, t0: number, t1: number, e: EaseName = "inOut") => ease[e](clamp01((t - t0) / Math.max(1e-6, t1 - t0)));

export function lerpPose(a: Pose, b: Pose, p: number): Pose {
  const out: Pose = {};
  new Set([...Object.keys(a), ...Object.keys(b)]).forEach((k) => {
    const ja = a[k] || {}, jb = b[k] || {};
    out[k] = { rot: lerp(ja.rot ?? 0, jb.rot ?? 0, p), x: lerp(ja.x ?? 0, jb.x ?? 0, p), y: lerp(ja.y ?? 0, jb.y ?? 0, p), sx: lerp(ja.sx ?? 1, jb.sx ?? 1, p), sy: lerp(ja.sy ?? 1, jb.sy ?? 1, p) };
  });
  return out;
}
export function addPose(a: Pose, b: Pose, w = 1): Pose {
  const out: Pose = { ...a };
  Object.keys(b).forEach((k) => {
    const ja = a[k] || {}, jb = b[k];
    out[k] = { rot: (ja.rot ?? 0) + (jb.rot ?? 0) * w, x: (ja.x ?? 0) + (jb.x ?? 0) * w, y: (ja.y ?? 0) + (jb.y ?? 0) * w, sx: ja.sx ?? 1, sy: ja.sy ?? 1 };
  });
  return out;
}
// blend a sequence of keyed poses.
// Motion-quality upgrade (12 principles): every transition gets
//   anticipation  – a short move *against* the direction of travel before the main move,
//   overshoot     – the main move passes the target slightly and settles back (follow-through),
//   slow-in/out   – cubic ease on the main move.
// The amounts scale with how big the pose change is (measured in degrees of max joint delta), so small
// adjustments stay subtle and big gestures feel snappy. Eases named in the key are still honoured.
export const poseDelta = (a: Pose, b: Pose) => { let m = 0; new Set([...Object.keys(a), ...Object.keys(b)]).forEach((k) => { m = Math.max(m, Math.abs(((b[k] || {}).rot ?? 0) - ((a[k] || {}).rot ?? 0))); }); return m; };
export function seq(t: number, keys: [number, Pose, EaseName?][], opts: { antic?: number; over?: number } = {}): Pose {
  const antic = opts.antic ?? 0.08, over = opts.over ?? 0.06;
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) {
    const [t0, p0] = keys[i]; const [t1, p1, e] = keys[i + 1];
    if (t < t1) {
      const u = (t - t0) / (t1 - t0);
      const big = Math.min(1, poseDelta(p0, p1) / 60); // 0..1 how large the move is
      if (e === "linear" || e === "elastic" || e === "bounce" || big < 0.05) return lerpPose(p0, p1, ease[e ?? "inOut"](u));
      const aA = antic * big, oA = over * big;
      // phase 1 (0..0.2): anticipation dip to -aA ; phase 2 (0.2..0.8): main move to 1+oA ; phase 3 (0.8..1): settle to 1
      let p: number;
      if (u < 0.2) p = -aA * ease.out(u / 0.2);
      else if (u < 0.8) p = lerp(-aA, 1 + oA, ease[e === "backOut" || e === "backOutSoft" ? "inOut" : (e ?? "inOut")]((u - 0.2) / 0.6));
      else p = lerp(1 + oA, 1, ease.inOut((u - 0.8) / 0.2));
      return lerpPose(p0, p1, p);
    }
  }
  return keys[keys.length - 1][1];
}
// Secondary motion / overlapping action: given a pose sampled at t and t-dt, add lag to trailing parts
// (hair, forearms) proportional to the angular velocity of their parent. Keeps motion from feeling "all at once".
export function followThrough(now: Pose, before: Pose, dt: number, spec: { part: string; parent: string; k: number; max: number }[]): Pose {
  const out: Pose = { ...now };
  for (const s of spec) {
    const v = (((now[s.parent] || {}).rot ?? 0) - ((before[s.parent] || {}).rot ?? 0)) / Math.max(1e-3, dt); // deg/s
    const lag = Math.max(-s.max, Math.min(s.max, -v * s.k));
    const j = now[s.part] || {};
    out[s.part] = { ...j, rot: (j.rot ?? 0) + lag };
  }
  return out;
}

// ---------- Gait generator. Side-view bipedal cycle with proper phase relationships:
// stance leg pushes back, swing leg lifts (knee flexes strongly mid-swing), heel-strike ankle, arm counter-swing with elbow flex,
// hip bob twice per cycle, forward lean scaled by speed, and a "double-bounce" for runs.
export type LimbNames = { thighF: string; shinF: string; thighB: string; shinB: string; uarmF: string; larmF: string; uarmB: string; larmB: string; shoeF?: string; shoeB?: string; handF?: string; handB?: string; head?: string; torso?: string };
export function gait(kind: "walk" | "run" | "slowwalk" | "tiptoe" | "sprint", phase: number, n: LimbNames) {
  const tau = Math.PI * 2;
  const s = (ph: number) => Math.sin(tau * ph);
  const cfg = {
    slowwalk: { thigh: 17, knee: 30, arm: 12, elbow: 14, bob: 4, lean: 2, ankle: 12, head: 1.5, torso: 1 },
    walk: { thigh: 27, knee: 45, arm: 24, elbow: 22, bob: 6, lean: 4, ankle: 16, head: 2, torso: 2 },
    tiptoe: { thigh: 24, knee: 55, arm: 8, elbow: 40, bob: 3, lean: 8, ankle: 20, head: 1, torso: 3 },
    run: { thigh: 52, knee: 100, arm: 55, elbow: 75, bob: 14, lean: 15, ankle: 24, head: 3, torso: 4 },
    sprint: { thigh: 62, knee: 115, arm: 65, elbow: 85, bob: 18, lean: 22, ankle: 28, head: 4, torso: 5 },
  }[kind];
  const running = kind === "run" || kind === "sprint";
  const leg = (ph: number) => {
    const thigh = -cfg.thigh * s(ph);
    const swing = Math.max(0, Math.sin(tau * (ph + 0.22)));
    const knee = cfg.knee * Math.pow(swing, 1.5) + (running ? 15 : 3);
    const heel = Math.max(0, Math.sin(tau * (ph - 0.05)));
    const toeOff = Math.max(0, -s(ph + 0.1));
    const ankle = -cfg.ankle * 0.5 * heel + cfg.ankle * toeOff;
    return { thigh, knee, ankle };
  };
  const lf = leg(phase), lb = leg(phase + 0.5);
  const arm = (ph: number) => ({ up: cfg.arm * s(ph), el: -(cfg.elbow * 0.45 + cfg.elbow * 0.55 * Math.max(0, -s(ph - 0.1))) });
  const af = arm(phase + 0.5), ab = arm(phase);
  const p: Pose = {
    [n.thighF]: { rot: lf.thigh }, [n.shinF]: { rot: lf.knee }, [n.thighB]: { rot: lb.thigh }, [n.shinB]: { rot: lb.knee },
    [n.uarmF]: { rot: af.up }, [n.larmF]: { rot: af.el }, [n.uarmB]: { rot: ab.up }, [n.larmB]: { rot: ab.el },
  };
  if (n.shoeF) p[n.shoeF] = { rot: lf.ankle };
  if (n.shoeB) p[n.shoeB] = { rot: lb.ankle };
  if (n.handF) p[n.handF] = { rot: -af.el * 0.25 };
  if (n.handB) p[n.handB] = { rot: -ab.el * 0.25 };
  const bobSig = Math.sin(tau * phase * 2 - Math.PI / 2); // 2 bounces per cycle, low at contact
  const bob = -cfg.bob * (0.5 + 0.5 * bobSig);
  if (n.head) p[n.head] = { rot: -cfg.head * bobSig, y: -cfg.head * 1.5 * bobSig };
  if (n.torso) p[n.torso] = { rot: -cfg.torso * s(phase) };
  return { pose: p, bob, lean: cfg.lean };
}

// ---------- Joint safety: anatomical rotation limits (degrees, facing right, +rot = clockwise)
// Keys are part prefixes; every pose passes through here so no scene can hyper-extend a joint.
const JOINT_LIMITS: Record<string, [number, number]> = {
  larm: [-150, 8],   // elbow only bends forward (never backwards past straight)
  uarm: [-185, 80],  // shoulder
  shin: [-8, 145],   // knee only bends backwards
  thigh: [-120, 70], // hip
  shoe: [-40, 45],   // ankle
  hand: [-60, 60],   // wrist
  head: [-35, 35], neck: [-25, 25], torso: [-45, 45], hips: [-30, 30],
};
export const clampJoint = (name: string, rot: number, partLimits?: [number, number]): number => {
  const lim = partLimits || JOINT_LIMITS[name.split("_")[0]];
  if (!lim || !Number.isFinite(rot)) return Number.isFinite(rot) ? rot : 0;
  return Math.min(lim[1], Math.max(lim[0], rot));
};
// Attachment check (dev only): every non-root part must reference an existing parent and have a numeric pivot.
export const validateRig = (id: string) => {
  const parts = CHARS[id].rig.parts as Record<string, any>;
  for (const [n, p] of Object.entries(parts)) {
    if (p.parent && !parts[p.parent]) throw new Error(`rig ${id}: part ${n} attached to missing parent ${p.parent}`);
    if (!Array.isArray(p.pivot) || p.pivot.some((v: number) => !Number.isFinite(v))) throw new Error(`rig ${id}: part ${n} has invalid pivot`);
    if (p.parent && !CHARS[id].parts[n]) throw new Error(`rig ${id}: part ${n} has no artwork`);
    if (p.parent && !(Array.isArray(p.rotation) && p.rotation[0] < p.rotation[1])) throw new Error(`rig ${id}: part ${n} has no rotation constraint`);
  }
};
validateRig("hare"); validateRig("tort");

// ---------- Character renderer with composed FK transforms
export const Character: React.FC<{ id: string; st: CharState; ground: number; debug?: boolean; only?: string[] }> = ({ id, st, ground, debug, only }) => {
  const C = CHARS[id];
  const parts: Record<string, any> = C.rig.parts;
  const rest: Pose = C.rig.rest || {};
  const local = (name: string) => {
    const j = st.pose[name] || {}; const r = rest[name] || {};
    const [px, py] = parts[name].pivot;
    const rot = clampJoint(name, (j.rot ?? 0) + (r.rot ?? 0), parts[name].rotation);
    return `translate(${px + (j.x ?? 0) + (r.x ?? 0)} ${py + (j.y ?? 0) + (r.y ?? 0)}) rotate(${rot}) scale(${j.sx ?? 1} ${j.sy ?? 1}) translate(${-px} ${-py})`;
  };
  const world = (name: string): string => { const chain: string[] = []; let n: string | null = name; while (n) { chain.unshift(local(n)); n = parts[n].parent; } return chain.join(" "); };
  const order = Object.keys(parts).filter((k) => !only || only.includes(k)).sort((a, b) => parts[a].z - parts[b].z);
  const [fx, fy] = C.rig.foot;
  const s = st.scale; const sq = st.squash ?? 0; // squash>0 = squashed, <0 stretched
  const faceMarkup = st.face && C.faces[st.face] ? C.faces[st.face] : null;
  const blink = st.blink ?? 0;
  return (
    <g opacity={st.opacity ?? 1} transform={`translate(${st.x} ${ground + st.y + (st.bob ?? 0)}) scale(${s * st.facing * (1 + sq * 0.5)} ${s * (1 - sq)}) rotate(${st.lean ?? 0}) translate(${-fx} ${-fy})`}>
      {order.filter((n) => parts[n].cap && parts[n].capUnderParent).map((name) => (
        <g key={"cap-" + name} transform={world(name)}><circle cx={parts[name].pivot[0]} cy={parts[name].pivot[1]} r={parts[name].cap.r} fill={parts[name].cap.fill} /></g>
      ))}
      {order.map((name) => (
        <g key={name} transform={world(name)}>
          {parts[name].cap && !parts[name].capUnderParent && <circle cx={parts[name].pivot[0]} cy={parts[name].pivot[1]} r={parts[name].cap.r} fill={parts[name].cap.fill} />}
          <g dangerouslySetInnerHTML={{ __html: C.parts[name] }} />
          {name === "head" && faceMarkup && <g transform={faceMarkup.transform} dangerouslySetInnerHTML={{ __html: faceMarkup.markup }} />}
          {name === "head" && blink > 0.05 && C.eyes.map((e: number[], i: number) => (
            <ellipse key={i} cx={e[0]} cy={e[1]} rx={e[2] * 1.7} ry={e[2] * 1.4 * blink} fill={C.skin} />
          ))}
          {debug && <circle cx={parts[name].pivot[0]} cy={parts[name].pivot[1]} r={4 / s} fill="red" stroke="#fff" strokeWidth={1.5 / s} />}
        </g>
      ))}
    </g>
  );
};

export const Defs: React.FC = () => (
  <defs>
    <g dangerouslySetInnerHTML={{ __html: CHARS.hare.defs }} />
    <g dangerouslySetInnerHTML={{ __html: CHARS.tort.defs }} />
  </defs>
);

export const blinkAt = (t: number, seed = 0, period = 3.7) => {
  const ph = ((t + seed) % period) / period; const w = 0.13 / period;
  if (ph > 0.5 && ph < 0.5 + w) return Math.sin(((ph - 0.5) / w) * Math.PI);
  return 0;
};
// small procedural noise for "alive" idles
export const noise = (t: number, seed = 0) => Math.sin(t * 1.7 + seed) * 0.6 + Math.sin(t * 2.9 + seed * 1.3) * 0.3 + Math.sin(t * 0.7 + seed * 2.1) * 0.4;

// ---------- Mocap playback (CMU BVH retargeted to rig-relative rotations; see mocap_clips.ts)
import { CLIPS } from "./mocap_clips";
export type MocapOpts = { speed?: number; loop?: boolean; start?: number; end?: number; amp?: number; legLen?: number; single?: boolean; armAmp?: number };
/** Sample a mocap clip at time t (s). Returns a Pose plus hip height / forward travel (leg-length units → px via legLen). */
export function mocapPose(clip: string, t: number, o: MocapOpts = {}): { pose: Pose; hipY: number; travel: number; frame: number } {
  const c = CLIPS[clip]; const fr = c.frames as any[]; const n = fr.length;
  const s = o.start ?? Math.min(2, n - 2), e = o.end ?? n - 1; const span = Math.max(1, e - s);
  let f = s + t * c.fps * (o.speed ?? 1);
  let laps = 0;
  if (o.loop !== false) { laps = Math.floor((f - s) / span); f = s + ((f - s) % span + span) % span; } else f = Math.min(e, Math.max(s, f));
  const i0 = Math.floor(f), i1 = Math.min(e, i0 + 1), p = f - i0;
  const L = (k: string) => { const a = fr[i0][k] ?? 0, b = fr[i1][k] ?? 0; let d = b - a; if (d > 180) d -= 360; if (d < -180) d += 360; return a + d * p; };
  const amp = o.amp ?? 1, aa = o.armAmp ?? amp;
  const pose: Pose = o.single
    ? { torso: { rot: L("torso") * amp }, head: { rot: L("head") * amp }, uarm_f: { rot: L("arm_f") * aa }, uarm_b: { rot: L("arm_b") * aa }, thigh_f: { rot: L("leg_f") * amp }, thigh_b: { rot: L("leg_b") * amp } }
    : { torso: { rot: L("torso") * amp }, head: { rot: L("head") * amp }, uarm_f: { rot: L("uarm_f") * aa }, larm_f: { rot: L("larm_f") * aa }, uarm_b: { rot: L("uarm_b") * aa }, larm_b: { rot: L("larm_b") * aa },
        thigh_f: { rot: L("thigh_f") * amp }, shin_f: { rot: L("shin_f") * amp }, shoe_f: { rot: L("shoe_f") * amp }, thigh_b: { rot: L("thigh_b") * amp }, shin_b: { rot: L("shin_b") * amp }, shoe_b: { rot: L("shoe_b") * amp } };
  const legLen = o.legLen ?? 1;
  const hipY = ((c.hipStand ?? 1.06) - L("hipH")) * legLen; // + = lower than standing (foot-contact locked)
  const travel = ((L("x") - fr[s].x) + laps * (fr[e].x - fr[s].x)) * legLen;
  return { pose, hipY, travel, frame: f };
}
export const clipDuration = (clip: string, speed = 1) => CLIPS[clip].frames.length / CLIPS[clip].fps / speed;
