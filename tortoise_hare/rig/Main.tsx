import React from "react";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Character, CharState, Defs, Pose, addPose, blinkAt, ease, gait, lerp, lerpPose, mix, noise, seq } from "./Rig";
import { Background, BgKind, Crowd, Dust, FinishLine, GROUND, SpeedLines, Zzz, Sweat, Exclaim } from "./backgrounds";

const L = { thighF: "thigh_f", shinF: "shin_f", thighB: "thigh_b", shinB: "shin_b", uarmF: "uarm_f", larmF: "larm_f", uarmB: "uarm_b", larmB: "larm_b", shoeF: "shoe_f", shoeB: "shoe_b", head: "head", torso: "torso" };
const LT = { ...L };
const HS = 1.5, TS = 0.34;

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
  ready: { torso: { rot: -8 }, head: { rot: -4 }, uarm_f: { rot: -30 }, larm_f: { rot: -60 }, uarm_b: { rot: 25 }, larm_b: { rot: -50 }, thigh_f: { rot: -20 }, shin_f: { rot: 20 }, thigh_b: { rot: 14 }, shin_b: { rot: 10 } } as Pose,
};

type Frame = { hare?: CharState; tort?: CharState; camX?: number; camY?: number; zoom?: number; fx?: React.ReactNode; fxBack?: React.ReactNode };
type Sc = { id: string; start: number; end: number; bg: BgKind; solve: (t: number) => Frame };
const st = (x: number, facing: 1 | -1, scale: number, pose: Pose, extra: Partial<CharState> = {}): CharState => ({ x, y: 0, facing, scale, pose, ...extra });
const breathe = (t: number, k = 1, seed = 0): Pose => ({
  torso: { rot: noise(t * 0.9, seed) * 0.9 * k, y: Math.sin(t * 2.0 + seed) * 2.2 * k },
  head: { rot: noise(t * 0.7, seed + 3) * 1.8 * k, y: Math.sin(t * 2.0 + seed + 0.5) * 1.2 * k },
  uarm_f: { rot: noise(t * 0.6, seed + 5) * 1.5 * k }, uarm_b: { rot: noise(t * 0.6, seed + 7) * 1.5 * k },
});
const face = (t: number, keys: [number, string][]) => { let f = keys[0][1]; for (const [k, v] of keys) if (t >= k) f = v; return f; };
const HF = { smile: "f_smile", grin: "f_teeth", smirk: "f_smirk", sleep: "f_sleep", frown: "f_frown", wink: "f_wink", talk: "f_talk" };
const TF = { smile: "f_smile", oh: "f_oh", laugh: "f_laugh", sad: "f_sad", happy: "f_happy", neutral: "f_neutral" };

// Tortoise-woman walk: slow, deliberate, heavy contact; small shoulder sway
const tortWalk = (t: number, speed = 0.55, kind: "slowwalk" | "walk" | "tiptoe" = "slowwalk") => gait(kind, (t * speed) % 1, LT);

export const SCENES: Sc[] = [
  // 1 — meadow: hare shows off (flex, run-in-place burst, thumbs)
  { id: "sc1", start: 0, end: 9.0, bg: "meadow", solve: (t) => {
    const g = gait("sprint", (t * 3.4) % 1, L);
    const runK = mix(t, 3.05, 3.3, "out") * (1 - mix(t, 5.2, 5.55));
    let pose = seq(t, [[0, H.idle], [1.0, H.idle], [1.5, H.flex, "backOut"], [2.6, H.flex], [3.0, H.idle, "out"], [5.6, H.idle], [6.1, H.thumb, "backOut"], [7.3, H.thumb], [8.0, H.handsHips, "backOut"]]);
    pose = addPose(pose, g.pose, runK); pose = addPose(pose, breathe(t), 1 - runK);
    // anticipation squash before burst, stretch during
    const squash = 0.12 * mix(t, 2.75, 3.0, "out") * (1 - mix(t, 3.0, 3.25, "out")) - 0.05 * runK;
    return { hare: st(900, 1, HS, pose, { bob: g.bob * runK, lean: g.lean * runK * 0.5, squash, face: face(t, [[0, HF.smile], [1.5, HF.grin], [3.0, HF.talk], [5.6, HF.grin], [6.1, HF.wink], [8.0, HF.smirk]]), blink: blinkAt(t, 0.3) }),
      zoom: 1 + 0.05 * mix(t, 0, 9, "linear"), fx: runK > 0 && <><Dust x={880} g={GROUND.meadow} t={t} t0={3.1} /><SpeedLines x={840} y={GROUND.meadow - 200} dir={1} k={runK} /></> };
  } },
  // 2 — tortoise plods in from left; hare notices, laughs, points
  { id: "sc2", start: 9.0, end: 18.1, bg: "meadow", solve: (t) => {
    const w = tortWalk(t, 0.55);
    const tx = lerp(-160, 640, mix(t, 0, 8.6, "linear"));
    const tort = st(tx, 1, TS, addPose(addPose(w.pose, T.idle), breathe(t, 0.5, 9)), { bob: w.bob, lean: w.lean, face: TF.neutral, blink: blinkAt(t, 1.1, 4.3) });
    const shake = (a: number) => addPose(H.laugh, { torso: { rot: a }, head: { rot: a * 0.6 }, hips: { y: -a * 0.3 } });
    const hp = seq(t, [[0, H.handsHips], [2.0, H.handsHips], [2.5, addPose(H.handsHips, { head: { rot: 10 }, torso: { rot: 4 } }), "out"], [3.6, addPose(H.handsHips, { head: { rot: 10 }, torso: { rot: 4 } })],
      [3.95, H.laughUp, "backOut"], [4.25, H.laugh, "in"], [4.45, shake(-6)], [4.65, shake(6)], [4.85, shake(-6)], [5.05, shake(5)], [5.3, H.laughUp, "out"], [5.6, H.laugh, "in"], [5.8, shake(-5)], [6.0, shake(5)],
      [6.4, H.point, "backOut"], [8.3, H.point], [8.9, H.handsHips, "inOut"]]);
    return { tort, hare: st(1250, -1, HS, addPose(hp, breathe(t)), { face: face(t, [[0, HF.smirk], [2.5, HF.frown], [3.95, HF.grin], [6.4, HF.talk], [7.6, HF.grin], [8.3, HF.smirk]]), blink: blinkAt(t, 0.7) }), zoom: 1.04 };
  } },
  // 3 — the challenge: tortoise calm "let us race"; crowd & finish line; hare crouches
  { id: "sc3", start: 18.1, end: 28.3, bg: "finish", solve: (t) => {
    const tp = seq(t, [[0, T.idle], [0.5, T.nod, "out"], [1.1, T.idle], [2.1, T.offer, "backOutSoft"], [4.3, T.offer], [4.9, T.armsCrossed, "inOut"], [7.2, T.armsCrossed], [7.8, T.ready, "inOut"]]);
    const hp = seq(t, [[0, H.handsHips], [2.4, H.handsHips], [3.1, H.thumb, "backOut"], [4.9, H.thumb], [5.4, H.stretch, "inOut"], [6.2, H.stretch], [6.8, H.crouch, "inOut"], [10.5, H.crouch]]);
    const crowdK = mix(t, 4.6, 5.6, "backOutSoft");
    return { tort: st(760, 1, TS, addPose(tp, breathe(t, 0.5, 9)), { face: face(t, [[0, TF.neutral], [2.1, TF.smile], [4.9, TF.happy]]), blink: blinkAt(t, 2.0, 4.1) }),
      hare: st(1080, 1, HS, addPose(hp, breathe(t)), { face: face(t, [[0, HF.smirk], [3.1, HF.grin], [6.8, HF.frown]]), blink: blinkAt(t, 0.2) }),
      zoom: 1.02, fxBack: <><g opacity={crowdK} transform={`translate(0 ${(1 - crowdK) * 40})`}><Crowd x={1500} g={GROUND.finish} t={t} cheer={0} /></g><FinishLine x={1750} g={GROUND.finish} ribbon={0} /></> };
  } },
  // 4 — READY SET GO: anticipation, explosive start, tortoise one step
  { id: "sc4", start: 28.3, end: 38.0, bg: "forest", solve: (t) => {
    const go = 1.75;
    const runK = mix(t, go, go + 0.12, "out");
    const dt = Math.max(0, t - go);
    const hx = 560 + Math.pow(dt, 1.5) * 1000;
    const g = gait("sprint", (t * 3.8) % 1, L);
    // anticipation: sink deeper then explode
    let hp = seq(t, [[0, H.crouch], [go - 0.5, H.crouch], [go - 0.15, addPose(H.crouch, { hips: { y: 14 }, torso: { rot: 6 } }), "inOut"], [go, addPose(H.crouch, { hips: { y: -40 }, torso: { rot: -20 } }), "out"]]);
    hp = lerpPose(hp, g.pose, runK);
    const squash = 0.14 * mix(t, go - 0.5, go - 0.15) * (1 - mix(t, go - 0.15, go + 0.05)) - 0.12 * mix(t, go - 0.1, go + 0.05) * (1 - mix(t, go + 0.05, go + 0.4));
    // tortoise: one deliberate step at 6.4 and another at 8.4
    const stepPh = t < 6.4 ? 0 : t < 7.4 ? mix(t, 6.4, 7.4, "inOut") * 0.5 : t < 8.4 ? 0.5 : t < 9.4 ? 0.5 + mix(t, 8.4, 9.4, "inOut") * 0.5 : 1;
    const tw = gait("slowwalk", stepPh % 1, LT);
    const tx = 330 + stepPh * 70;
    const tp = t < go ? addPose(T.ready, breathe(t, 0.5, 9)) : addPose(addPose(tw.pose, T.idle), breathe(t, 0.5, 9));
    const shake = t > go && t < go + 0.35 ? Math.sin(t * 95) * 7 * (1 - (t - go) / 0.35) : 0;
    return { tort: st(tx, 1, TS, tp, { bob: t < go ? 0 : tw.bob, lean: t < go ? 0 : tw.lean, face: t < go ? TF.neutral : TF.smile, blink: blinkAt(t, 0.5, 4.5) }),
      hare: st(hx, 1, HS, hp, { bob: g.bob * runK, lean: g.lean * runK, squash, face: t < go ? HF.frown : HF.grin, blink: blinkAt(t, 1.5) }),
      camX: shake, zoom: 1 + 0.08 * (1 - mix(t, go, go + 1.2)), fx: <><Dust x={600} g={GROUND.forest} t={t} t0={go} />{runK > 0 && hx < 2200 && <SpeedLines x={hx - 60} y={GROUND.forest - 220} dir={1} k={runK} />}</> };
  } },
  // 5 — far ahead: walk in, look back, yawn, sit, lie, sleep
  { id: "sc5", start: 38.0, end: 49.9, bg: "tree", solve: (t) => {
    const g = gait("walk", (t * 1.5) % 1, L);
    const walkK = 1 - mix(t, 1.7, 2.3);
    const hx = lerp(-120, 700, mix(t, 0, 2.3, "out"));
    let hp = seq(t, [[0, H.idle], [2.1, H.idle], [2.7, H.lookBack, "inOut"], [4.1, H.lookBack], [4.7, H.yawn, "inOut"], [5.7, addPose(H.yawn, { head: { rot: -32 } })], [6.4, H.stretch, "inOut"], [7.0, H.handsHips], [7.6, H.sit, "inOut"], [8.7, H.sit], [9.7, H.lie, "inOut"], [11.9, H.lie]]);
    hp = addPose(hp, g.pose, walkK); hp = addPose(hp, breathe(t, t > 9.7 ? 1.8 : 1));
    const asleep = t > 10.3;
    const facing: 1 | -1 = t > 2.7 && t < 4.4 ? -1 : 1;
    return { hare: st(hx, facing, HS, hp, { bob: g.bob * walkK, lean: g.lean * walkK, face: face(t, [[0, HF.grin], [2.7, HF.smirk], [4.1, HF.talk], [4.7, HF.sleep], [6.4, HF.talk], [7.6, HF.sleep]]), blink: asleep ? 1 : blinkAt(t, 0.4) }),
      zoom: 1 + 0.14 * mix(t, 7, 11.5), camY: 70 * mix(t, 7, 11.5), fx: asleep && <Zzz x={hx - 250} y={GROUND.tree - 110} t={t} /> };
  } },
  // 6 — tortoise tiptoes past, hushing
  { id: "sc6", start: 49.9, end: 57.2, bg: "tree", solve: (t) => {
    const tx = lerp(-160, 1500, mix(t, 0, 7.3, "linear"));
    const near = tx > 420 && tx < 1000;
    const w = tortWalk(t, near ? 0.7 : 0.6, near ? "tiptoe" : "slowwalk");
    const nearK = mix(tx, 380, 460) * (1 - mix(tx, 980, 1060));
    const tp = addPose(addPose(w.pose, lerpPose(T.idle, T.hush, nearK)), breathe(t, 0.5, 9));
    return { hare: st(700, 1, HS, addPose(H.lie, breathe(t, 1.8)), { face: HF.sleep, blink: 1 }),
      tort: st(tx, 1, TS, tp, { bob: w.bob, lean: w.lean, face: nearK > 0.5 ? TF.oh : TF.smile, blink: blinkAt(t, 0.9, 4.2) }), zoom: 1.04, fx: <Zzz x={450} y={GROUND.tree - 110} t={t} /> };
  } },
  // 7 — hare wakes (jolt), sprints, tortoise crosses, crowd cheers, hare slumps to knees
  { id: "sc7", start: 57.2, end: 64.5, bg: "finish", solve: (t) => {
    const wake = 0.3, run = 1.35, cross = 4.4;
    const g = gait("sprint", (t * 4.0) % 1, L);
    const runK = mix(t, run, run + 0.15, "out");
    const hxRaw = t < run ? 150 : 150 + (t - run) * 430;
    const stopX = 1480;
    const hx = Math.min(hxRaw, stopX);
    const arrived = hxRaw >= stopX;
    let hp = seq(t, [[0, H.lie], [wake, H.jolt, "backOut"], [wake + 0.45, H.jolt], [run - 0.2, addPose(H.crouch, { hips: { y: 30 } }), "out"], [run, H.idle, "out"]]);
    hp = lerpPose(hp, g.pose, runK);
    const slumpK = mix(t, cross + 0.35, cross + 1.0, "backOutSoft");
    hp = lerpPose(hp, H.kneel, arrived ? slumpK : 0);
    const tx = lerp(1200, 1870, mix(t, 0, cross + 0.35, "linear"));
    const crossed = t > cross;
    const w = tortWalk(t, 0.55);
    const tp = crossed ? addPose(T.cheer, { hips: { y: -16 * Math.abs(Math.sin(t * 6.5)) }, uarm_f: { rot: 10 * Math.sin(t * 9) }, uarm_b: { rot: -10 * Math.sin(t * 9) } }) : addPose(addPose(w.pose, T.idle), breathe(t, 0.5, 9));
    return { tort: st(tx, 1, TS, tp, { bob: crossed ? 0 : w.bob, lean: crossed ? 0 : w.lean, face: crossed ? TF.laugh : TF.smile, blink: blinkAt(t, 0.2, 3.9) }),
      hare: st(hx, 1, HS, hp, { bob: g.bob * runK * (1 - slumpK), lean: g.lean * runK * (arrived ? 1 - slumpK : 1), face: face(t, [[0, HF.sleep], [wake, HF.frown], [run, HF.talk], [cross + 0.35, HF.frown]]), blink: t < wake ? 1 : blinkAt(t, 0.6) }),
      fx: <>{t > wake && t < wake + 0.9 && <Exclaim x={150 + 70} y={GROUND.finish - 330} k={mix(t, wake, wake + 0.2, "backOut") * (1 - mix(t, wake + 0.7, wake + 0.9))} />}{runK > 0 && !arrived && <SpeedLines x={hx - 60} y={GROUND.finish - 220} dir={1} k={runK} />}<Dust x={240} g={GROUND.finish} t={t} t0={run} />{arrived && <Sweat x={hx + 40} y={GROUND.finish - 300} t={t} />}</>,
      fxBack: <><Crowd x={1450} g={GROUND.finish} t={t} cheer={crossed ? 1 : 0} /><FinishLine x={1750} g={GROUND.finish} ribbon={Math.min(1, Math.max(0, (t - cross) * 2))} /></> };
  } },
  // 8 — sunset moral: handshake-ish, wave
  { id: "sc8", start: 64.5, end: 68.5, bg: "sunset", solve: (t) => {
    const tp = seq(t, [[0, T.idle], [0.5, T.wave, "backOut"], [1.0, addPose(T.wave, { larm_f: { rot: -80 } })], [1.5, T.wave], [2.0, addPose(T.wave, { larm_f: { rot: -80 } })], [2.6, T.idle, "inOut"]]);
    const hp = seq(t, [[0, H.slump], [0.7, H.scratch, "inOut"], [2.2, H.scratch], [2.9, H.thumb, "backOut"]]);
    return { tort: st(760, 1, TS, addPose(tp, breathe(t, 0.5, 9)), { face: TF.happy, blink: blinkAt(t, 1.0, 4.4) }), hare: st(1090, -1, HS, addPose(hp, breathe(t)), { face: face(t, [[0, HF.frown], [0.7, HF.smirk], [2.9, HF.grin]]), blink: blinkAt(t, 0.3) }), zoom: 1 + 0.05 * mix(t, 0, 4, "linear") };
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
          <Background kind={sc.bg} t={t} camX={camX} />
          {f.fxBack}
          {shadow(f.tort, 70)}{shadow(f.hare, 75)}
          {f.tort && <Character id="tort" st={f.tort} ground={g} />}
          {f.hare && <Character id="hare" st={f.hare} ground={g} />}
          {f.fx}
        </g>
      </svg>
      <Title t={t} t0={0.2} t1={5.0} big="The Tortoise and the Hare" small="An Aesop fable" />
      <Title t={t} t0={64.8} t1={68.4} big="Slow and steady wins the race." />
      <Captions words={words} t={t} />
      <AbsoluteFill style={{ background: "#000", opacity: 1 - Math.min(fadeIn, fadeOut), pointerEvents: "none" }} />
      {audio && <Audio src={staticFile(audio)} startFrom={Math.round((clip?.start ?? 0) * fps)} />}
    </AbsoluteFill>
  );
};
