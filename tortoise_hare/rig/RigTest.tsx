import React from "react";
import { AbsoluteFill } from "remotion";
import { Character, Defs, Pose } from "./Rig";
export const RigTest: React.FC = () => {
  const g = 980;
  const arm = (u: number, l: number): Pose => ({ uarm_f: { rot: u }, larm_f: { rot: l }, hand_f: { rot: l * 0.2 }, uarm_b: { rot: 20 }, larm_b: { rot: -20 } });
  const leg = (t: number, s: number): Pose => ({ thigh_f: { rot: t }, shin_f: { rot: s }, shoe_f: { rot: 10 } });
  const tests: Pose[] = [arm(-40, -90), arm(-120, -120), arm(-170, -30), arm(30, -60), leg(-50, 90), leg(30, 40)];
  return (
    <AbsoluteFill style={{ background: "#dde" }}>
      <svg width={1920} height={1080} viewBox="0 0 1920 1080">
        <Defs />
        {tests.map((p, i) => <Character key={i} id="hare" st={{ x: 130 + i * 160, y: 0, facing: 1, scale: 2.9, pose: p }} ground={g} debug />)}
        {tests.map((p, i) => <Character key={"t" + i} id="tort" st={{ x: 1100 + i * 140, y: 0, facing: 1, scale: 0.36, pose: p }} ground={g} debug />)}
      </svg>
    </AbsoluteFill>
  );
};
