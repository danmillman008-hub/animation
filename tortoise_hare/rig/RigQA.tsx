import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Character, Defs, gait } from "./Rig";
// QA comp: one character, one part pair per frame-slot; used by rig_qa.py to verify parent/child contact under motion.
export const RigQA: React.FC<{ id: "hare" | "tort"; only: string[]; kind: string; phase: number; scale: number }> = ({ id, only, kind, phase, scale }) => {
  const g = (gait as any)(kind, phase, id === "hare" ? { thighF: "thigh_f", shinF: "shin_f", thighB: "thigh_b", shinB: "shin_b", uarmF: "uarm_f", larmF: "larm_f", uarmB: "uarm_b", larmB: "larm_b", shoeF: "shoe_f", shoeB: "shoe_b", head: "head", torso: "torso" } : { thighF: "thigh_f", shinF: "shin_f", thighB: "thigh_b", shinB: "shin_b", uarmF: "uarm_f", larmF: "larm_f", uarmB: "uarm_b", larmB: "larm_b", shoeF: "shoe_f", shoeB: "shoe_b", head: "head", torso: "torso" });
  return (
    <AbsoluteFill style={{ background: "#fff" }}>
      <svg width={1920} height={1080} viewBox="0 0 1920 1080"><Defs />
        <Character id={id} st={{ x: 960, y: 0, facing: 1, scale, pose: g.pose }} ground={1000} only={only} />
      </svg>
    </AbsoluteFill>
  );
};
