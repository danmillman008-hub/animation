import React from "react";
import { AbsoluteFill } from "remotion";
import { Character, Defs } from "./Rig";
import { CHARS } from "./characters";
export const PartsTest: React.FC = () => {
  const names = Object.keys(CHARS.hare.rig.parts);
  return (<AbsoluteFill style={{ background: "#dde" }}><svg width={1920} height={1080} viewBox="0 0 1920 1080"><Defs />
    {names.map((n, i) => <g key={n}><text x={60 + (i % 7) * 270} y={40 + Math.floor(i / 7) * 540} fontSize={24}>{n}</text><line x1={(i % 7) * 270} y1={520 + Math.floor(i / 7) * 540} x2={(i % 7) * 270 + 260} y2={520 + Math.floor(i / 7) * 540} stroke="#888" /><Character id="hare" st={{ x: 130 + (i % 7) * 270, y: 0, facing: 1, scale: 1.4, pose: {} }} ground={520 + Math.floor(i / 7) * 540} only={[n]} debug /></g>)}
  </svg></AbsoluteFill>);
};
