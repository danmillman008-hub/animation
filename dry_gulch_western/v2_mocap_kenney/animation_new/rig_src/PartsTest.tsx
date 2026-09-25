import React from "react";
import { AbsoluteFill } from "remotion";
import { Character, Defs } from "./Rig";
// Shoulder inspection: torso + uarm_f + uarm_b for tort at large scale, with several candidate shoulder rotations.
export const PartsTest: React.FC = () => (
  <AbsoluteFill style={{ background: "#dde" }}><svg width={1920} height={1080} viewBox="0 0 1920 1080"><Defs />
    {[0, -60, -120, 40].map((r, i) => <Character key={i} id="tort" st={{ x: 250 + i * 470, y: 0, facing: 1, scale: 0.55, pose: { uarm_f: { rot: r }, uarm_b: { rot: -r * 0.6 }, larm_f: { rot: -30 } } }} ground={1400} only={["torso", "neck", "uarm_f", "larm_f", "uarm_b", "larm_b", "hair_back"]} debug />)}
  </svg></AbsoluteFill>
);
