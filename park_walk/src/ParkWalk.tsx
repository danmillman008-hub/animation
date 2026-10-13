import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {FPS, sampleState} from './motion/timeline';
import {Background} from './scene/Background';
import {DogFigure} from './scene/Dog';
import {DustDefs, FxLayer, Leash, Shadows} from './scene/Fx';
import {HumanFigure} from './scene/Human';
import {C} from './scene/palette';

/**
 * The whole film, driven by one GSAP timeline sampled at the current frame.
 * `ParkWalkScene` takes the frame as a prop so it can also be rendered outside Remotion.
 */
export const ParkWalkScene: React.FC<{frame: number; fps?: number}> = ({frame, fps = FPS}) => {
  const s = sampleState(frame, fps);
  const w = s.world;

  const camera = [
    `translate(${960 + w.camX} ${540 + w.camY})`,
    `scale(${w.camScale})`,
    `rotate(${w.camRot})`,
    'translate(-960 -540)',
  ].join(' ');

  return (
    <AbsoluteFill style={{background: C.cream}}>
      <svg width="100%" height="100%" viewBox="0 0 1920 1080" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="vignette" cx="50%" cy="48%" r="72%">
            <stop offset="55%" stopColor="#000000" stopOpacity={0} />
            <stop offset="100%" stopColor="#3a2a12" stopOpacity={1} />
          </radialGradient>
          {DustDefs}
        </defs>

        <g transform={camera}>
          <Background distance={w.distance} cloud={w.cloud} wind={w.wind} sun={w.sun} warm={w.warm} />
          <Shadows s={s} />
          <DogFigure d={s.dog} />
          <Leash s={s} />
          <HumanFigure h={s.human} />
          <FxLayer s={s} />
        </g>

        {/* grade */}
        <rect width={1920} height={1080} fill="#ff9a3c" opacity={w.warm * 0.2} style={{mixBlendMode: 'overlay'}} />
        <rect width={1920} height={1080} fill="url(#vignette)" opacity={w.vignette} />
        <rect width={1920} height={1080} fill={C.cream} opacity={w.fade} />

        {/* end card */}
        <g opacity={w.title} fontFamily="'Trebuchet MS', 'DejaVu Sans', sans-serif" textAnchor="middle">
          <text x={960} y={486} fontSize={104} fontWeight={700} fill={C.ink} letterSpacing={2}>
            a walk in the park
          </text>
          <text x={960} y={560} fontSize={38} fill={C.ink} opacity={0.72} letterSpacing={6}>
            GSAP TIMELINE × REMOTION RENDER
          </text>
          <path d="M 760 606 L 1160 606" stroke={C.scarf} strokeWidth={6} strokeLinecap="round" />
        </g>
      </svg>
    </AbsoluteFill>
  );
};

export const ParkWalk: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return <ParkWalkScene frame={frame} fps={fps} />;
};
