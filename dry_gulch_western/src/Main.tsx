import React from "react";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Character, CharState, Defs, Pose, addPose, blinkAt, ease, followThrough, gait, lerp, lerpPose, mix, noise, seq } from "./Rig";
import { Background, Bang, BgKind, Can, Crowd, Dust, Exclaim, GROUND, Pistol, SpeedLines, Zzz } from "./backgrounds";

const L = { thighF: "thigh_f", shinF: "shin_f", thighB: "thigh_b", shinB: "shin_b", uarmF: "uarm_f", larmF: "larm_f", uarmB: "uarm_b", larmB: "larm_b", shoeF: "shoe_f", shoeB: "shoe_b", head: "head", torso: "torso" };
const LT = { ...L };
const HS = 1.5, TS = 0.34;
// Western recast: hare rig = "Rusty" the young gunslinger, tort rig = Sheriff "June".

// ---------------- HARE poses (boy). Facing right: negative rot = forward/up for arms & thighs; positive knee = bend back.
const H = {
  idle: { uarm_f: { rot: -3 }, larm_f: { rot: -6 }, uarm_b: { rot: 3 }, larm_b: { rot: -5 }, thigh_f: { rot: -3 }, shin_f: { rot: 4 }, thigh_b: { rot: 4 }, shin_b: { rot: 3 } } as Pose,
  flex: { torso: { rot: -5 }, head: { rot: -8 }, uarm_f: { rot: -175 }, larm_f: { rot: -125 }, uarm_b: { rot: 170 }, larm_b: { rot: 125 }, thigh_f: { rot: -10 }, thigh_b: { rot: 10 }, shin_b: { rot: 6 } } as Pose,
  thumb: { torso: { rot: -4 }, head: { rot: -6 }, uarm_f: { rot: -85 }, larm_f: { rot: -80 }, uarm_b: { rot: 8 }, larm_b: { rot: -10 } } as Pose,
  point: { torso: { rot: -8 }, head: { rot: -6 }, uarm_f: { rot: -100 }, larm_f: { rot: -8 }, uarm_b: { rot: 35 }, larm_b: { rot: -50 }, thigh_f: { rot: -14 }, thigh_b: { rot: 12 }, shin_b: { rot: 8 } } as Pose,
  laugh: { hips: { y: 6 }, torso: { rot: 26 }, head: { rot: 14 }, uarm_f: { rot: -20 }, larm_f: { rot: -80 }, uarm_b: { rot: -5 }, larm_b: { rot: -85 }, thigh_f: { rot: -22 }, shin_f: { rot: 30 }, thigh_b: { rot: 14 }, shin_b: { rot: 22 } } as Pose,
  laughUp: { hips: { y: -4 }, torso: { rot: -10 }, head: { rot: -18 }, uarm_f: { rot: -30 }, larm_f: { rot: -95 }, uarm_b: { rot: -10 }, larm_b: { rot: -95 }, thigh_f: { rot: -6 }, shin_f: { rot: 8 }, thigh_b: { rot: 6 }, shin_b: { rot: 6 } } as Pose,
  handsHips: { torso: { rot: -5 }, head: { rot: -4 }, uarm_f: { rot: -50 }, larm_f: { rot: 100 }, uarm_b: { rot: 50 }, larm_b: { rot: -100 } } as Pose,
  crouch: { hips: { y: 42 }, torso: { rot: 40 }, head: { rot: -28 }, uarm_f: { rot: 25 }, larm_f: { rot: -60 }, uarm_b: { rot: -70 }, larm_b: { rot: -70 }, thigh_f: { rot: -80 }, shin_f: { rot: 105 }, thigh_b: { rot: 35 }, shin_b: { rot: 45 }, shoe_b: { rot: -25 } } as Pose,
  lookBack: { torso: { rot: 8 }, head: { rot: 16 }, uarm_f: { rot: -85 }, larm_f: { rot: -75 }, uarm_b: { rot: 12 }, larm_b: { rot: -20 }, thigh_f: { rot: -4 }, thigh_b: { rot: 6 } } as Pose,
  yawn: { torso: { rot: -12 }, head: { rot: -24 }, uarm_f: { rot: -170 }, larm_f: { rot: -35 }, uarm_b: { rot: 175 }, larm_b: { rot: 25 }, thigh_f: { rot: -2 }, thigh_b: { rot: 2 } } as Pose,
  stretch: { torso: { rot: -6 }, head: { rot: -10 }, uarm_f: { rot: -120 }, larm_f: { rot: -30 }, uarm_b: { rot: 120 }, larm_b: { rot: 30 } } as Pose,
  sit: { hips: { y: 96 }, torso: { rot: 4 }, head: { rot: -6 }, uarm_f: { rot: -40 }, larm_f: { rot: -55 }, uarm_b: { rot: -35 }, larm_b: { rot: -55 }, thigh_f: { rot: -96 }, shin_f: { rot: 108 }, thigh_b: { rot: -90 }, shin_b: { rot: 100 }, shoe_f: { rot: 12 }, shoe_b: { rot: 12 } } as Pose,
  lie: { hips: { y: 142 }, torso: { rot: -80 }, head: { rot: -22 }, uarm_f: { rot: 25 }, larm_f: { rot: -125 }, uarm_b: { rot: -25 }, larm_b: { rot: -115 }, thigh_f: { rot: -108 }, shin_f: { rot: 30 }, thigh_b: { rot: -100 }, shin_b: { rot: 22 }, shoe_f: { rot: 30 }, shoe_b: { rot: 30 } } as Pose,
  jolt: { hips: { y: 90 }, torso: { rot: -14 }, head: { rot: -16 }, uarm_f: { rot: -165 }, larm_f: { rot: -35 }, uarm_b: { rot: 165 }, larm_b: { rot: 35 }, thigh_f: { rot: -102 }, shin_f: { rot: 115 }, thigh_b: { rot: -92 }, shin_b: { rot: 105 } } as Pose,
  scratch: { torso: { rot: 3 }, head: { rot: 6 }, uarm_f: { rot: -180 }, larm_f: { rot: -125 }, uarm_b: { rot: 3 }, larm_b: { rot: -8 } } as Pose,
  slump: { torso: { rot: 14 }, head: { rot: 22 }, uarm_f: { rot: 4 }, larm_f: { rot: -2 }, uarm_b: { rot: 4 }, larm_b: { rot: -2 }, thigh_f: { rot: -6 }, shin_f: { rot: 10 } } as Pose,
  draw: { torso: { rot: -6 }, head: { rot: -4 }, uarm_f: { rot: -95 }, larm_f: { rot: -10 }, uarm_b: { rot: 30 }, larm_b: { rot: -30 }, thigh_f: { rot: -16 }, thigh_b: { rot: 14 }, shin_b: { rot: 10 } } as Pose,
  spin: { torso: { rot: -3 }, uarm_f: { rot: -80 }, larm_f: { rot: -100 }, uarm_b: { rot: 6 }, larm_b: { rot: -10 } } as Pose,
  holster: { torso: { rot: 4 }, head: { rot: 4 }, uarm_f: { rot: 10 }, larm_f: { rot: -50 }, uarm_b: { rot: 6 }, larm_b: { rot: -8 } } as Pose,
  hatTip: { torso: { rot: -3 }, head: { rot: -8 }, uarm_f: { rot: -175 }, larm_f: { rot: -115 }, uarm_b: { rot: 4 }, larm_b: { rot: -6 } } as Pose,
  napHat: { hips: { y: 110 }, torso: { rot: -20 }, head: { rot: 18 }, uarm_f: { rot: -150 }, larm_f: { rot: -125 }, uarm_b: { rot: -30 }, larm_b: { rot: -60 }, thigh_f: { rot: -80 }, shin_f: { rot: 60 }, thigh_b: { rot: -70 }, shin_b: { rot: 50 }, shoe_f: { rot: 20 } } as Pose,
  kneel: { hips: { y: 78 }, torso: { rot: 18 }, head: { rot: 22 }, uarm_f: { rot: -25 }, larm_f: { rot: -35 }, uarm_b: { rot: -20 }, larm_b: { rot: -35 }, thigh_f: { rot: -88 }, shin_f: { rot: 92 }, thigh_b: { rot: 6 }, shin_b: { rot: 128 }, shoe_b: { rot: 30 }, shoe_f: { rot: 5 } } as Pose,
};
// ---------------- TORTOISE poses (woman)
const T = {
  idle: { uarm_f: { rot: -2 }, larm_f: { rot: -5 }, uarm_b: { rot: 2 }, larm_b: { rot: -5 }, thigh_f: { rot: -4 }, shin_f: { rot: 4 }, thigh_b: { rot: 4 }, shin_b: { rot: 4 } } as Pose,
  nod: { head: { rot: 8 }, neck: { rot: 4 } } as Pose,
  talk: { torso: { rot: -3 }, uarm_f: { rot: -60 }, larm_f: { rot: -80 }, hand_f: { rot: -20 }, uarm_b: { rot: 6 }, larm_b: { rot: -10 } } as Pose,
  offer: { torso: { rot: -4 }, head: { rot: -6 }, uarm_f: { rot: -75 }, larm_f: { rot: -15 }, hand_f: { rot: -35 }, uarm_b: { rot: 6 }, larm_b: { rot: -12 } } as Pose,
  cheer: { hips: { y: -30 }, torso: { rot: -5 }, head: { rot: -10 }, uarm_f: { rot: -175 }, larm_f: { rot: -25 }, hand_f: { rot: -10 }, uarm_b: { rot: -165 }, larm_b: { rot: -20 }, thigh_f: { rot: -14 }, shin_f: { rot: 28 }, thigh_b: { rot: 12 }, shin_b: { rot: 26 } } as Pose,
  wave: { head: { rot: -5 }, uarm_f: { rot: -165 }, larm_f: { rot: -45 }, hand_f: { rot: -20 } } as Pose,
  hush: { torso: { rot: 4 }, head: { rot: 6 }, uarm_f: { rot: -30 }, larm_f: { rot: -130 }, hand_f: { rot: -40 } } as Pose,
  lean: { torso: { rot: -6 }, head: { rot: -8 }, uarm_f: { rot: -20 }, larm_f: { rot: -30 }, uarm_b: { rot: 15 }, larm_b: { rot: -20 } } as Pose,
  armsCrossed: { torso: { rot: -2 }, uarm_f: { rot: -25 }, larm_f: { rot: -95 }, hand_f: { rot: -30 }, uarm_b: { rot: -10 }, larm_b: { rot: -95 }, hand_b: { rot: -20 } } as Pose,
  shrug: { torso: { rot: -2 }, head: { rot: 6 }, neck: { rot: 3 }, uarm_f: { rot: -35 }, larm_f: { rot: -110 }, uarm_b: { rot: 30 }, larm_b: { rot: -110 } } as Pose,
  pointAhead: { torso: { rot: -6 }, head: { rot: -4 }, uarm_f: { rot: -95 }, larm_f: { rot: -5 }, uarm_b: { rot: 10 }, larm_b: { rot: -15 }, thigh_f: { rot: -8 }, thigh_b: { rot: 6 } } as Pose,
  chinTap: { torso: { rot: 2 }, head: { rot: 8 }, uarm_f: { rot: -20 }, larm_f: { rot: -140 }, uarm_b: { rot: 4 }, larm_b: { rot: -8 } } as Pose,
  aim: { torso: { rot: -8 }, head: { rot: -3 }, uarm_f: { rot: -92 }, larm_f: { rot: -2 }, uarm_b: { rot: -60 }, larm_b: { rot: -70 }, thigh_f: { rot: -12 }, thigh_b: { rot: 10 } } as Pose,
  aimRecoil: { torso: { rot: -4 }, head: { rot: -6 }, uarm_f: { rot: -108 }, larm_f: { rot: -18 }, uarm_b: { rot: -60 }, larm_b: { rot: -70 }, thigh_f: { rot: -12 }, thigh_b: { rot: 10 } } as Pose,
  tipHat: { torso: { rot: -2 }, head: { rot: -6 }, uarm_f: { rot: -170 }, larm_f: { rot: -120 }, uarm_b: { rot: 4 }, larm_b: { rot: -6 } } as Pose,
  ready: { torso: { rot: -8 }, head: { rot: -4 }, uarm_f: { rot: -30 }, larm_f: { rot: -60 }, uarm_b: { rot: 25 }, larm_b: { rot: -50 }, thigh_f: { rot: -20 }, shin_f: { rot: 20 }, thigh_b: { rot: 14 }, shin_b: { rot: 10 } } as Pose,
};

type Frame = { hare?: CharState; tort?: CharState; camX?: number; camY?: number; zoom?: number; fx?: React.ReactNode; fxBack?: React.ReactNode; cans?: boolean[] };
type Sc = { id: string; start: number; end: number; bg: BgKind; solve: (t: number) => Frame };
// follow-through wrappers: sample the sequence slightly earlier to derive velocity (overlapping action)
const DT = 1 / 30;
const FT_T = [{ part: "hair", parent: "head", k: 0.05, max: 9 }, { part: "hair_back", parent: "head", k: 0.08, max: 14 }, { part: "larm_f", parent: "uarm_f", k: 0.04, max: 12 }, { part: "larm_b", parent: "uarm_b", k: 0.04, max: 12 }];
const FT_H = [{ part: "larm_f", parent: "uarm_f", k: 0.04, max: 12 }, { part: "larm_b", parent: "uarm_b", k: 0.04, max: 12 }, { part: "head", parent: "torso", k: 0.03, max: 6 }];
const seqT = (t: number, keys: [number, Pose, any?][]) => followThrough(seq(t, keys), seq(t - DT, keys), DT, FT_T);
const seqH = (t: number, keys: [number, Pose, any?][]) => followThrough(seq(t, keys), seq(t - DT, keys), DT, FT_H);
const st = (x: number, facing: 1 | -1, scale: number, pose: Pose, extra: Partial<CharState> = {}): CharState => ({ x, y: 0, facing, scale, pose, ...extra });
const breathe = (t: number, k = 1, seed = 0): Pose => ({
  torso: { rot: noise(t * 0.9, seed) * 0.9 * k, y: Math.sin(t * 2.0 + seed) * 2.2 * k },
  head: { rot: noise(t * 0.7, seed + 3) * 1.8 * k, y: Math.sin(t * 2.0 + seed + 0.5) * 1.2 * k },
  uarm_f: { rot: noise(t * 0.6, seed + 5) * 1.5 * k }, uarm_b: { rot: noise(t * 0.6, seed + 7) * 1.5 * k },
});
const face = (t: number, keys: [number, string][]) => { let f = keys[0][1]; for (const [k, v] of keys) if (t >= k) f = v; return f; };
const HF = { smile: "f_smile", grin: "f_teeth", smirk: "f_smirk", sleep: "f_sleep", frown: "f_frown", wink: "f_wink", talk: "f_talk" };
const TF = { smile: "f_smile", oh: "f_oh", laugh: "f_laugh", sad: "f_sad", happy: "f_happy", neutral: "f_neutral" };

// June walk: slow, deliberate, heavy contact; small shoulder sway
const tortWalk = (t: number, speed = 0.55, kind: "slowwalk" | "walk" | "tiptoe" = "slowwalk") => gait(kind, (t * speed) % 1, LT);

// hand positions in artwork coords for the pistol (front hand of each rig, after FK). We approximate with pose-dependent offsets.

export const SCENES: Sc[] = [
  // 1 — Rusty struts down Main Street, spins pistol, brags (0–8.4)
  { id: "sc1", start: 0, end: 15.0, bg: "street", solve: (t) => {
    const walkK = 1 - mix(t, 6.8, 7.3, "inOut");
    const g = gait("walk", (t * 1.6) % 1, L);
    const x = lerp(-150, 760, mix(t, 0, 7.1, "linear"));
    const act = seqH(t, [[0, H.idle], [7.0, H.idle], [7.5, H.handsHips, "backOut"], [8.6, H.handsHips], [9.2, H.spin, "backOut"], [9.8, addPose(H.spin, { larm_f: { rot: -60 } })], [10.4, H.spin], [10.9, H.draw, "backOut"], [12.2, H.draw], [12.8, H.thumb, "inOut"], [13.8, H.thumb], [14.4, H.flex, "backOut"]]);
    const pose = addPose(lerpPose(act, g.pose, walkK), breathe(t));
    const hare = st(Math.max(x, 760), 1, HS, pose, { bob: g.bob * walkK, lean: g.lean * walkK, face: face(t, [[0, HF.smirk], [7.5, HF.talk], [9.2, HF.grin], [10.9, HF.wink], [12.2, HF.talk], [14.4, HF.grin]]), blink: blinkAt(t, 0.7) });
    const spinK = mix(t, 9.2, 9.3) * (1 - mix(t, 10.8, 11.0));
    return { hare, zoom: 1.03 + 0.05 * mix(t, 7.0, 7.8), fx: <>{spinK > 0 && <Pistol x={hare.x + 20} y={GROUND.street - 300} rot={(t * 1400) % 360} s={1.6} />}{t > 10.9 && t < 12.8 && <Pistol x={hare.x + 110} y={GROUND.street - 330} rot={-5} s={1.6} />}</> };
  } },
  // 2 — Sheriff June walks in, calm; Rusty watches (8.4–15.0)
  { id: "sc2", start: 15.0, end: 21.3, bg: "street", solve: (t) => {
    const w = tortWalk(t, 0.5); const tx = lerp(-160, 560, mix(t, 0, 6.2, "linear"));
    const stopK = 1 - mix(t, 5.6, 6.1, "inOut");
    const tp = addPose(lerpPose(addPose(T.idle, {}), w.pose, stopK), breathe(t, 0.5, 9));
    const hp = seqH(t, [[0, H.thumb], [1.0, H.thumb], [1.6, H.handsHips, "inOut"], [3.6, addPose(H.handsHips, { head: { rot: 8 }, torso: { rot: 3 } }), "out"], [5.2, addPose(H.handsHips, { head: { rot: 8 }, torso: { rot: 3 } })], [5.8, H.laughUp, "backOut"], [6.2, H.laugh, "in"]]);
    return { tort: st(Math.min(tx, 560), 1, TS, tp, { bob: w.bob * stopK, lean: w.lean * stopK, face: TF.neutral, blink: blinkAt(t, 1.1, 4.3) }),
      hare: st(1180, -1, HS, addPose(hp, breathe(t)), { face: face(t, [[0, HF.smirk], [3.6, HF.frown], [5.8, HF.grin]]), blink: blinkAt(t, 0.4) }), zoom: 1.02 };
  } },
  // 3 — Rusty mocks her: laugh, point; June unbothered (15.0–21.3)
  { id: "sc3", start: 21.3, end: 28.4, bg: "street", solve: (t) => {
    const shake = (a: number) => addPose(H.laugh, { torso: { rot: a }, head: { rot: a * 0.6 }, hips: { y: -a * 0.3 } });
    const hp = seqH(t, [[0, H.laugh], [0.2, shake(-6)], [0.4, shake(6)], [0.6, shake(-6)], [0.8, shake(5)], [1.1, H.laughUp, "out"], [1.5, H.point, "backOut"], [3.4, H.point], [3.9, H.laugh, "in"], [4.1, shake(-5)], [4.3, shake(5)], [4.6, H.laughUp, "out"], [5.2, H.handsHips, "inOut"]]);
    const tp = seqT(t, [[0, T.idle], [1.4, T.idle], [1.9, T.chinTap, "inOut"], [3.6, T.chinTap], [4.2, T.shrug, "inOut"], [5.4, T.shrug], [5.9, T.idle, "inOut"]]);
    return { tort: st(560, 1, TS, addPose(tp, breathe(t, 0.5, 9)), { face: face(t, [[0, TF.neutral], [1.9, TF.smile], [4.2, TF.happy]]), blink: blinkAt(t, 2.0, 4.1) }),
      hare: st(1180, -1, HS, addPose(hp, breathe(t)), { face: face(t, [[0, HF.grin], [1.5, HF.talk], [3.9, HF.grin], [5.2, HF.smirk]]), blink: blinkAt(t, 0.2) }), zoom: 1.03 };
  } },
  // 4 — June tips hat, points at fence with cans; Rusty draws, cocky (21.3–28.4)
  { id: "sc4", start: 28.4, end: 37.0, bg: "fence", solve: (t) => {
    const tp = seqT(t, [[0, T.idle], [0.4, T.tipHat, "backOutSoft"], [1.6, T.tipHat], [2.2, T.idle, "inOut"], [3.4, T.pointAhead, "inOut"], [5.4, T.pointAhead], [6.0, T.armsCrossed, "inOut"]]);
    const hp = seqH(t, [[0, H.handsHips], [2.6, H.handsHips], [3.2, H.lookBack, "inOut"], [4.6, H.lookBack], [5.2, H.draw, "backOut"], [6.2, H.draw], [6.7, H.spin, "backOut"]]);
    const crowdK = mix(t, 5.2, 6.2, "backOutSoft");
    return { tort: st(560, 1, TS, addPose(tp, breathe(t, 0.5, 9)), { face: face(t, [[0, TF.smile], [3.4, TF.neutral]]), blink: blinkAt(t, 2.0, 4.1) }),
      hare: st(900, 1, HS, addPose(hp, breathe(t)), { face: face(t, [[0, HF.smirk], [3.2, HF.frown], [5.2, HF.grin]]), blink: blinkAt(t, 0.2) }),
      zoom: 1.0, fxBack: <g opacity={crowdK} transform={`translate(0 ${(1 - crowdK) * 40})`}><Crowd x={80} g={GROUND.fence} t={t} cheer={0} /></g>,
      fx: <>{t > 5.2 && <Pistol x={900 + 118} y={GROUND.fence - 330} rot={-4} s={1.6} />}</> };
  } },
  // 5 — Rusty fires fast: 2 shots, 2 cans fly; whoops (28.4–37.0)
  { id: "sc5", start: 37.0, end: 44.1, bg: "fence", solve: (t) => {
    const s1 = 1.2, s2 = 2.0;
    const rec = (t0: number) => mix(t, t0, t0 + 0.05, "out") * (1 - mix(t, t0 + 0.05, t0 + 0.35, "out"));
    const recoil = Math.max(rec(s1), rec(s2));
    let hp = seqH(t, [[0, H.draw], [3.2, H.draw], [3.7, H.flex, "backOut"], [4.4, addPose(H.flex, { head: { rot: -14 } })], [5.0, H.flex], [5.6, H.holster, "inOut"], [6.4, H.holster], [7.0, H.thumb, "backOut"]]);
    hp = addPose(hp, { uarm_f: { rot: -14 * recoil }, larm_f: { rot: -10 * recoil }, torso: { rot: 5 * recoil }, head: { rot: -4 * recoil } });
    const cans = [t < s1, true, t < s2, true, true, true];
    const fly = (t0: number, i: number) => { const a = t - t0; if (a < 0 || a > 1.1) return null; return <Can x={1250 + i * 110 + 8 + a * 260} y={GROUND.fence - 125 - Math.sin(Math.min(1, a) * Math.PI) * 220 + a * a * 200} rot={a * 900} />; };
    const hop = (t > 3.7 && t < 5.0) ? Math.abs(Math.sin((t - 3.7) * 9)) * 26 : 0;
    const tp = seqT(t, [[0, T.armsCrossed], [4.0, T.armsCrossed], [4.5, T.nod, "out"], [5.2, T.idle]]);
    return { tort: st(560, 1, TS, addPose(tp, breathe(t, 0.5, 9)), { face: TF.neutral, blink: blinkAt(t, 1.4, 4.6) }),
      hare: st(900, 1, HS, addPose(hp, breathe(t)), { bob: -hop, face: face(t, [[0, HF.frown], [s1, HF.grin], [3.7, HF.grin], [5.6, HF.smirk]]), blink: blinkAt(t, 0.9) }),
      camX: recoil * 6 * Math.sin(t * 90), zoom: 1 + 0.03 * recoil,
      fxBack: <Crowd x={80} g={GROUND.fence} t={t} cheer={t > 3.6 && t < 5.2 ? 0.6 : 0} />,
      fx: <>{t < 5.6 && <Pistol x={900 + 118 + recoil * 6} y={GROUND.fence - 330 - recoil * 10} rot={-4 - recoil * 18} s={1.6} />}<Bang x={1065} y={GROUND.fence - 340} k={rec(s1) * 1.4} /><Bang x={1065} y={GROUND.fence - 340} k={rec(s2) * 1.4} />{fly(s1, 0)}{fly(s2, 2)}</>,
      cans };
  } },
  // 6 — Rusty holsters, saunters to the porch, sits, hat over eyes, sleeps (37.0–44.1)
  { id: "sc6", start: 44.1, end: 52.2, bg: "porch", solve: (t) => {
    const g = gait("walk", (t * 1.4) % 1, L);
    const walkK = mix(t, 0.2, 0.5) * (1 - mix(t, 2.6, 3.0, "inOut"));
    const x = lerp(1500, 520, mix(t, 0.2, 2.9, "inOut"));
    const act = seqH(t, [[0, H.holster], [2.8, H.idle], [3.4, H.stretch, "inOut"], [4.2, H.stretch], [4.8, H.sit, "inOut"], [5.6, H.sit], [6.2, H.napHat, "inOut"]]);
    const pose = addPose(lerpPose(act, g.pose, walkK), breathe(t, t > 6 ? 0.4 : 1));
    return { hare: st(x, -1, HS, pose, { bob: g.bob * walkK, lean: g.lean * walkK, face: face(t, [[0, HF.smirk], [3.4, HF.smile], [6.4, HF.sleep]]), blink: t > 6.2 ? 1 : blinkAt(t, 0.3) }),
      zoom: 1 + 0.06 * mix(t, 4.8, 7.0), fx: <>{t > 6.5 && <Zzz x={x - 40} y={GROUND.porch - 260} t={t} />}</> };
  } },
  // 7 — June takes her time: breathe, aim, fire; cans fall one by one (44.1–52.2)
  { id: "sc7", start: 52.2, end: 58.6, bg: "fence", solve: (t) => {
    const shots = [2.6, 3.6, 4.6, 5.6];
    const rec = (t0: number) => mix(t, t0, t0 + 0.05, "out") * (1 - mix(t, t0 + 0.05, t0 + 0.4, "out"));
    const recoil = Math.max(...shots.map(rec));
    let tp = seqT(t, [[0, T.idle], [0.6, T.aim, "inOut"], [6.6, T.aim], [7.2, T.tipHat, "backOutSoft"]]);
    tp = addPose(tp, { uarm_f: { rot: -12 * recoil }, larm_f: { rot: -12 * recoil }, torso: { rot: 4 * recoil } });
    const idx = [1, 3, 4, 5];
    const cans = [false, t < shots[0], false, t < shots[1], t < shots[2], t < shots[3]];
    const fly = (t0: number, i: number) => { const a = t - t0; if (a < 0 || a > 1.1) return null; return <Can x={1250 + i * 110 + 8 + a * 260} y={GROUND.fence - 125 - Math.sin(Math.min(1, a) * Math.PI) * 220 + a * a * 200} rot={a * 900} />; };
    const breathK = 0.6 + 0.4 * Math.sin(t * 2.2);
    const gun = { x: 560 + 122, y: GROUND.fence - 246 - recoil * 8 };
    const cheer = mix(t, 5.7, 6.2);
    return { tort: st(560, 1, TS, addPose(tp, breathe(t, breathK, 9)), { face: face(t, [[0, TF.neutral], [6.6, TF.smile], [7.2, TF.happy]]), blink: blinkAt(t, 0.6, 5.5) }),
      camX: recoil * 4 * Math.sin(t * 90), zoom: 1 + 0.04 * mix(t, 0.6, 2.4) - 0.04 * mix(t, 6.4, 7.2),
      fxBack: <Crowd x={80} g={GROUND.fence} t={t} cheer={cheer} />,
      fx: <>{t > 0.9 && t < 7.1 && <Pistol x={gun.x} y={gun.y} rot={-2 - recoil * 14} s={1.3} />}{shots.map((s, i) => <Bang key={i} x={gun.x + 90} y={gun.y - 20} k={rec(s) * 1.1} />)}{shots.map((s, i) => fly(s, idx[i]))}</>,
      cans };
  } },
  // 8 — Rusty wakes to cheering, jolts, runs to fence — too late (52.2–58.6)
  { id: "sc8", start: 58.6, end: 66.1, bg: "fence", solve: (t) => {
    const wake = 0.4, run = 1.6, arrive = 3.4;
    const g = gait("sprint", (t * 3.6) % 1, L);
    const runK = mix(t, run, run + 0.15, "out") * (1 - mix(t, arrive - 0.3, arrive, "inOut"));
    const x = lerp(-140, 900, mix(t, run, arrive, "out"));
    let hp = seqH(t, [[0, H.napHat], [wake, H.jolt, "backOut"], [wake + 0.5, H.jolt], [run - 0.2, addPose(H.crouch, { hips: { y: 30 } }), "out"], [run, H.idle, "out"], [arrive, H.idle], [arrive + 0.3, H.slump, "inOut"], [5.0, H.slump], [5.5, H.scratch, "inOut"]]);
    hp = lerpPose(hp, g.pose, runK);
    const tp = seqT(t, [[0, T.tipHat], [1.0, T.idle, "inOut"], [3.6, T.idle], [4.1, T.cheer, "backOut"], [4.7, addPose(T.cheer, { uarm_f: { rot: -160 }, uarm_b: { rot: -150 } })], [5.3, T.cheer], [5.9, T.idle, "inOut"]]);
    return { tort: st(560, 1, TS, addPose(tp, breathe(t, 0.5, 9)), { face: TF.happy, blink: blinkAt(t, 0.9, 4.4) }),
      hare: st(t < run ? -140 : x, 1, HS, addPose(hp, breathe(t)), { bob: g.bob * runK, lean: g.lean * runK, face: face(t, [[0, HF.sleep], [wake, HF.frown], [arrive + 0.3, HF.frown], [5.5, HF.smirk]]), blink: t < wake ? 1 : blinkAt(t, 0.2) }),
      zoom: 1.02, fxBack: <Crowd x={80} g={GROUND.fence} t={t} cheer={1} />,
      fx: <><Exclaim x={-140 + 60} y={GROUND.fence - 330} k={mix(t, wake, wake + 0.25, "backOut") * (1 - mix(t, run - 0.3, run))} />{runK > 0 && <SpeedLines x={x - 60} y={GROUND.fence - 220} dir={1} k={runK} />}<Dust x={-60} g={GROUND.fence} t={t} t0={run} /></>,
      cans: [false, false, false, false, false, false] };
  } },
  // 9 — Rusty grins, scratches head; June smiles; hat tip; sunset moral (58.6–77.6)
  { id: "sc9", start: 66.1, end: 77.6, bg: "sunset", solve: (t) => {
    const hp = seqH(t, [[0, H.scratch], [1.6, H.scratch], [2.2, H.slump, "inOut"], [3.6, H.slump], [4.2, H.thumb, "backOut"], [6.4, H.thumb], [7.4, H.hatTip, "inOut"], [8.8, H.hatTip], [9.6, H.thumb, "backOut"]]);
    const tp = seqT(t, [[0, T.idle], [4.6, T.idle], [5.2, T.talk, "inOut"], [6.8, T.talk], [7.4, T.tipHat, "backOutSoft"], [9.0, T.tipHat], [9.8, T.offer, "inOut"]]);
    return { tort: st(700, 1, TS, addPose(tp, breathe(t, 0.5, 9)), { face: face(t, [[0, TF.smile], [8.0, TF.laugh], [9.6, TF.happy]]), blink: blinkAt(t, 1.0, 4.4) }),
      hare: st(1080, -1, HS, addPose(hp, breathe(t)), { face: face(t, [[0, HF.smirk], [2.2, HF.frown], [4.2, HF.talk], [6.4, HF.grin], [8.0, HF.smile]]), blink: blinkAt(t, 0.3) }), zoom: 1 + 0.06 * mix(t, 0, 11.5, "linear") };
  } },
];
type Word = { word: string; start: number; end: number };
function chunkWords(words: Word[], max = 6) {
  const out: { start: number; end: number; words: Word[] }[] = []; let cur: Word[] = [];
  const flush = () => { if (cur.length) { out.push({ start: cur[0].start, end: cur[cur.length - 1].end + 0.25, words: cur }); cur = []; } };
  words.forEach((w) => { cur.push(w); if (cur.length >= max || /[.!?,]$/.test(w.word)) flush(); }); flush(); return out;
}
const Captions: React.FC<{ words: Word[]; t: number }> = ({ words, t }) => {
  const chunks = React.useMemo(() => chunkWords(words), [words]);
  const c = chunks.find((k) => t >= k.start - 0.1 && t < k.end); if (!c) return null;
  return (<div style={{ position: "absolute", left: 0, right: 0, bottom: 60, display: "flex", justifyContent: "center" }}>
    <div style={{ background: "rgba(20,28,40,0.78)", borderRadius: 14, padding: "12px 28px", fontFamily: "Georgia, serif", fontSize: 40, color: "#fff", display: "flex", gap: 14 }}>
      {c.words.map((w, i) => <span key={i} style={{ color: t >= w.start && t < w.end + 0.05 ? "#ffd54f" : t >= w.end ? "#fff" : "#c9d3e0" }}>{w.word}</span>)}
    </div></div>);
};
const Title: React.FC<{ t: number; t0: number; t1: number; big: string; small?: string }> = ({ t, t0, t1, big, small }) => {
  if (t < t0 || t > t1) return null;
  const k = mix(t, t0, t0 + 0.8, "backOut") * (1 - mix(t, t1 - 0.6, t1));
  return (<div style={{ position: "absolute", left: 0, right: 0, top: 140, display: "flex", justifyContent: "center", opacity: k, transform: `translateY(${(1 - k) * -30}px)` }}>
    <div style={{ background: "rgba(20,28,40,0.72)", borderRadius: 20, padding: "22px 60px", textAlign: "center", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
      <div style={{ fontFamily: "Georgia, serif", fontSize: 84, fontWeight: 700, color: "#ffe9a8" }}>{big}</div>
      {small && <div style={{ fontFamily: "Georgia, serif", fontSize: 36, color: "#e6eef8", marginTop: 8 }}>{small}</div>}
    </div></div>);
};

export type Props = { words: Word[]; audio: string; clip?: { start: number; end: number } };
export const Main: React.FC<Props> = ({ words, audio, clip }) => {
  const frame = useCurrentFrame(); const { fps } = useVideoConfig();
  const t = frame / fps + (clip?.start ?? 0);
  const sc = SCENES.find((s) => t >= s.start && t < s.end) ?? SCENES[SCENES.length - 1];
  const lt = t - sc.start; const f = sc.solve(lt); const g = GROUND[sc.bg];
  const fadeIn = mix(lt, 0, 0.35, "out"), fadeOut = 1 - mix(t, sc.end - 0.35, sc.end, "in");
  const zoom = f.zoom ?? 1, camX = f.camX ?? 0, camY = f.camY ?? 0; const W = 1920, H = 1080;
  const shadow = (c?: CharState, rx = 80) => c && <ellipse cx={c.x + (c.pose.hips?.y ?? 0) * 0.3 * c.facing} cy={g + 8} rx={rx + (c.pose.hips?.y ?? 0) * 0.4} ry={13} fill="rgba(0,0,0,0.22)" />;
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", left: 0, top: 0 }}>
        <Defs />
        <g transform={`translate(${W / 2} ${H / 2}) scale(${zoom}) translate(${-W / 2 - camX} ${-H / 2 - camY})`}>
          <Background kind={sc.bg} t={t} camX={camX} cans={(f as any).cans} />
          {f.fxBack}
          {shadow(f.tort, 70)}{shadow(f.hare, 75)}
          {f.tort && <Character id="tort" st={f.tort} ground={g} />}
          {f.hare && <Character id="hare" st={f.hare} ground={g} />}
          {f.fx}
        </g>
      </svg>
      <Title t={t} t0={0.2} t1={6.0} big="The Fastest Draw in Dry Gulch" small="A Western fable" />
      <Title t={t} t0={72.5} t1={77.4} big="Fast ain't the same as good." />
      <Captions words={words} t={t} />
      <AbsoluteFill style={{ background: "#000", opacity: 1 - Math.min(fadeIn, fadeOut), pointerEvents: "none" }} />
      {audio && <Audio src={staticFile(audio)} startFrom={Math.round((clip?.start ?? 0) * fps)} />}
    </AbsoluteFill>
  );
};
