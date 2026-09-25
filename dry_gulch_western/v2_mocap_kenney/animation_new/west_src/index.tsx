import React from "react";
import { Composition, registerRoot } from "remotion";
import { Main } from "./Main";
import { RigTest } from "./RigTest";
import { MocapStrip, MocapDemo } from "./MocapTest";
const Root: React.FC = () => (<>
  <Composition id="West" component={Main as any} width={1920} height={1080} fps={30} durationInFrames={Math.round(77.6 * 30)} defaultProps={{ words: [], audio: "narration_full.wav" }} />
  <Composition id="MocapStrip" component={MocapStrip as any} width={1920} height={1080} fps={30} durationInFrames={1} />
  <Composition id="MocapDemo" component={MocapDemo as any} width={1920} height={1080} fps={30} durationInFrames={150} />
  <Composition id="RigTest" component={RigTest as any} width={1920} height={1080} fps={30} durationInFrames={1} />
</>);
registerRoot(Root);
