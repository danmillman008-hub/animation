import React from "react";
import { Composition, registerRoot } from "remotion";
import { RigTest } from "./RigTest";
import { PartsTest } from "./PartsTest";
import { RigQA } from "./RigQA";
import { Main, Props } from "./Main";
const FPS = 30, DUR = 68.5;
export const Root: React.FC = () => (<>
  <Composition id="PartsTest" component={PartsTest} width={1920} height={1080} fps={30} durationInFrames={1} />
  <Composition id="RigQA" component={RigQA as any} width={1920} height={1080} fps={30} durationInFrames={1} defaultProps={{ id: "hare", only: ["uarm_f"], kind: "run", phase: 0, scale: 1.5 }} />
  <Composition id="RigTest" component={RigTest} width={1920} height={1080} fps={30} durationInFrames={1} />
  <Composition id="TortoiseHare3" component={Main} width={1920} height={1080} fps={FPS} durationInFrames={Math.ceil(DUR * FPS)} defaultProps={{ words: [], audio: "narration_full.wav" }}
    calculateMetadata={({ props }) => { const p = props as Props; const d = p.clip ? p.clip.end - p.clip.start : DUR; return { durationInFrames: Math.ceil(d * FPS) }; }} />
</>);
registerRoot(Root);
