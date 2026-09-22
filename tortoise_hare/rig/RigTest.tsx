import React from "react";
import { AbsoluteFill } from "remotion";
import { Character, Defs, Pose } from "./Rig";
// Audit grid: rows = characters, cols = stress poses hitting each joint's extremes.
const P: Pose[] = [
  {},
  { uarm_f: { rot: -90 }, larm_f: { rot: -90 }, uarm_b: { rot: 40 }, larm_b: { rot: -20 } },
  { uarm_f: { rot: -170 }, larm_f: { rot: -20 }, uarm_b: { rot: -150 }, larm_b: { rot: -60 } },
  { uarm_f: { rot: 60 }, larm_f: { rot: -140 }, uarm_b: { rot: -30 }, larm_b: { rot: -120 } },
  { thigh_f: { rot: -90 }, shin_f: { rot: 100 }, thigh_b: { rot: 30 }, shin_b: { rot: 20 }, shoe_f: { rot: 20 } },
  { thigh_f: { rot: -40 }, shin_f: { rot: 10 }, thigh_b: { rot: 40 }, shin_b: { rot: 90 }, shoe_b: { rot: 30 } },
  { hips: { y: 90 }, torso: { rot: 20 }, thigh_f: { rot: -100 }, shin_f: { rot: 110 }, thigh_b: { rot: -95 }, shin_b: { rot: 105 } },
];
export const RigTest: React.FC<{ id?: "hare" | "tort" }> = ({ id = "hare" }) => (
  <AbsoluteFill style={{ background: "#e9e9f2" }}>
    <svg width={1920} height={1080} viewBox="0 0 1920 1080"><Defs />
      {P.map((p, i) => <Character key={i} id={id} st={{ x: 140 + i * 265, y: 0, facing: 1, scale: id === "hare" ? 2.9 : 0.66, pose: p }} ground={1010} />)}
    </svg>
  </AbsoluteFill>
);
