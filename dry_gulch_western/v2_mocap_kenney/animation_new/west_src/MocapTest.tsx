import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { Character, Defs, mocapPose, clipDuration } from "./Rig";
import { CLIPS } from "./mocap_clips";
// Filmstrip still: one clip, N frames across the screen. props: {id, clip, legLen, scale, single}
export const MocapStrip: React.FC<{ id?: string; clip?: string; legLen?: number; scale?: number; single?: boolean }> = ({ id = "hare", clip = "walk", legLen = 146.8, scale = 2.2, single }) => {
  const dur = clipDuration(clip); const N = 8;
  return (
    <AbsoluteFill style={{ background: "#e9e9f2" }}>
      <svg width={1920} height={1080} viewBox="0 0 1920 1080"><Defs />
        <line x1={0} x2={1920} y1={980} y2={980} stroke="#999" />
        {Array.from({ length: N }, (_, i) => {
          const t = (i / N) * dur; const m = mocapPose(clip, t, { legLen, loop: false, single });
          return <Character key={i} id={id} st={{ x: 130 + i * 235, y: m.hipY * scale, facing: 1, scale, pose: m.pose }} ground={980} debug />;
        })}
        <text x={20} y={40} fontSize={28} fill="#333">{id} · {clip} ({CLIPS[clip].src}) · {CLIPS[clip].frames.length}f</text>
      </svg>
    </AbsoluteFill>
  );
};
// Moving demo: character crosses the screen using clip root motion.
export const MocapDemo: React.FC<{ id?: string; clip?: string; legLen?: number; scale?: number; single?: boolean; speed?: number }> = ({ id = "hare", clip = "walk", legLen = 146.8, scale = 2.2, single, speed = 1 }) => {
  const f = useCurrentFrame(); const { fps } = useVideoConfig(); const t = f / fps;
  const m = mocapPose(clip, t, { legLen, single, speed });
  return (
    <AbsoluteFill style={{ background: "#e9e9f2" }}>
      <svg width={1920} height={1080} viewBox="0 0 1920 1080"><Defs />
        <line x1={0} x2={1920} y1={980} y2={980} stroke="#999" />
        <Character id={id} st={{ x: 200 + m.travel * scale, y: m.hipY * scale, facing: 1, scale, pose: m.pose }} ground={980} />
        <text x={20} y={40} fontSize={28} fill="#333">{id} · {clip} · t={t.toFixed(2)} frame {m.frame.toFixed(0)}</text>
      </svg>
    </AbsoluteFill>
  );
};
