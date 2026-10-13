import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {sampleLong, LFPS, LDUR} from './longtimeline';
import {ACT_TITLES} from './longstate';
import {skyAt} from './paletteLong';
import {Background} from '../scene/Background';
import {HumanFigure} from '../scene/Human';
import {DogFigure} from '../scene/Dog';
import {Shadows, Leash, DustDefs} from '../scene/Fx';
import {Emoji} from '../scene/Emoji';
import {EndVignette} from '../scene/EndVignette';
import {C} from '../scene/palette';
import {GROUND_Y} from '../scene/skeleton';
import {dogNose, humanHandF} from '../motion/fk';

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));

/** The hero tree the rain scene shelters under — a fixed set-piece. */
const HeroTree: React.FC = () => (
  <g transform="translate(1010 736) scale(1.5)">
    <ellipse cx={30} cy={8} rx={110} ry={15} fill={C.shadow} opacity={0.18} />
    <path d="M -16 4 L -10 -200 Q 0 -216 10 -200 L 16 4 Z" fill={C.trunk} />
    <path d="M 0 -110 L -58 -160" stroke={C.trunk} strokeWidth={13} strokeLinecap="round" fill="none" />
    <path d="M 0 -140 L 54 -184" stroke={C.trunk} strokeWidth={11} strokeLinecap="round" fill="none" />
    <path d="M -16 4 L -10 -200 Q -2 -212 0 -200 L 2 4 Z" fill={C.trunkDark} opacity={0.45} />
    <circle cx={-70} cy={-220} r={66} fill={C.canopyDark} />
    <circle cx={72} cy={-230} r={70} fill={C.canopyDark} />
    <circle cx={0} cy={-274} r={84} fill={C.canopy} />
    <circle cx={-46} cy={-262} r={60} fill={C.canopyMid} />
    <circle cx={52} cy={-278} r={56} fill={C.canopyMid} />
    <circle cx={-16} cy={-316} r={46} fill={C.canopyLit} />
    <circle cx={36} cy={-320} r={30} fill={C.canopyLit} opacity={0.85} />
    <path d="M 52 -332 Q 88 -304 90 -260" stroke="#e8f7c8" strokeWidth={10} strokeLinecap="round" fill="none" opacity={0.5} />
  </g>
);

const Pond: React.FC<{t: number}> = ({t}) => (
  <g>
    <ellipse cx={2060} cy={946} rx={600} ry={98} fill={C.pathShade} opacity={0.75} />
    <ellipse cx={2060} cy={940} rx={570} ry={88} fill="#2c5d84" />
    <ellipse cx={2060} cy={934} rx={545} ry={78} fill="#3f7fae" />
    <ellipse cx={2060} cy={928} rx={505} ry={64} fill="#5b9bc8" />
    <ellipse cx={2060} cy={924} rx={460} ry={52} fill="#7ab8dc" />
    {[0, 1, 2].map((i) => (
      <ellipse
        key={i}
        cx={1780 + i * 220 + Math.sin(t * 0.5 + i * 2) * 14}
        cy={916 + i * 14}
        rx={90 - i * 16}
        ry={7}
        fill="#cfe8f5"
        opacity={0.35 + 0.2 * Math.sin(t * 0.9 + i * 1.4)}
      />
    ))}
    {[1640, 1780, 2200, 2340].map((px, i) => (
      <ellipse key={`p${i}`} cx={px} cy={930 + (i % 2) * 14} rx={36} ry={11} fill="#4c8a3d" />
    ))}
    {[1550, 2470].map((rx, i) => (
      <g key={`r${i}`} transform={`translate(${rx} ${902})`}>
        {[-8, 0, 9].map((dx, k) => (
          <path key={k} d={`M ${dx} 0 Q ${dx + 4} -40 ${dx + 2} -74`} stroke="#3d6b34" strokeWidth={5} strokeLinecap="round" fill="none" />
        ))}
        <ellipse cx={2} cy={-80} r={0} fill="none" />
        <rect x={-2} y={-92} width={7} height={20} rx={3.5} fill="#6b4a2c" />
      </g>
    ))}
  </g>
);

const Picnic: React.FC<{o: number}> = ({o}) =>
  o < 0.01 ? null : (
    <g opacity={o}>
      <ellipse cx={1560} cy={922} rx={200} ry={48} fill="#d95f5f" />
      <path d="M 1380 916 Q 1560 880 1740 916" stroke="#f5f0e6" strokeWidth={10} fill="none" opacity={0.8} />
      <path d="M 1400 934 Q 1560 900 1720 934" stroke="#f5f0e6" strokeWidth={8} fill="none" opacity={0.6} />
      <Emoji kind="basket" x={1452} y={886} w={92} />
      <Emoji kind="sandwich" x={1560} y={906} w={62} />
      <Emoji kind="cup_with_straw" x={1626} y={898} w={56} />
      <Emoji kind="red_apple" x={1500} y={910} w={48} />
    </g>
  );

export const LongScene: React.FC<{frame: number; fps?: number}> = ({frame, fps = LFPS}) => {
  const {s, x} = sampleLong(frame, fps);
  const w = s.world;
  const t = frame / fps;
  const sky = skyAt(x.tod);
  const night = sky.night;
  const sunUp = clamp01((x.tod - 0.05) / 0.08) * clamp01(1 - (x.tod - 0.62) / 0.2);
  const hand = humanHandF(s.human);
  const nose = dogNose(s.dog);
  const rainN = Math.round(x.rain * 60);
  const fireN = night > 0.55 ? 14 : 0;

  return (
    <AbsoluteFill style={{backgroundColor: sky.skyTop}}>
      <svg viewBox="0 0 1920 1080" width="100%" height="100%">
        <defs>
          <radialGradient id="vignette">
            <stop offset="62%" stopColor="#000000" stopOpacity={0} />
            <stop offset="100%" stopColor="#20140a" stopOpacity={0.42} />
          </radialGradient>
          <linearGradient id="mistGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e8f0f5" stopOpacity={0} />
            <stop offset="55%" stopColor="#e8f0f5" stopOpacity={0.75} />
            <stop offset="100%" stopColor="#f5f8fa" stopOpacity={0.9} />
          </linearGradient>
          <filter id="grainL">
            <feTurbulence type="fractalNoise" baseFrequency="0.82" numOctaves={2} seed={7} stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          {DustDefs}
        </defs>

        <g transform={`translate(${960 + w.camX} ${540 + w.camY}) scale(${w.camScale}) rotate(${w.camRot}) translate(-960 -540)`}>
          <Background
            distance={w.distance}
            cloud={w.cloud}
            wind={w.wind}
            sun={w.sun}
            warm={Math.max(x.lampOn, night * 0.9)}
            t={t}
            sky={[sky.skyTop, sky.skyMid, sky.skyLow, sky.horizon]}
            sunUp={sunUp}
            moon={night}
            stars={night * 0.9}
          />

          {/* set pieces */}
          <HeroTree />
          <Pond t={t} />
          <Picnic o={x.picnic} />

          {/* verge crawlers */}
          {x.snail.o > 0.01 && <Emoji kind="snail" x={x.snail.x} y={x.snail.y} w={52 * x.snail.s} o={x.snail.o} flip />}
          {x.turtle.o > 0.01 && <Emoji kind="turtle" x={x.turtle.x} y={x.turtle.y} w={48 * x.turtle.s} o={x.turtle.o} flip />}

          {/* pond life */}
          {x.frog.o > 0.01 && <Emoji kind="frog" x={x.frog.x} y={x.frog.y} w={36 * x.frog.s} o={x.frog.o} flip />}
          {x.ducks.map((dk, i) =>
            dk.o > 0.01 ? <Emoji key={i} kind="duck" x={dk.x} y={dk.y + Math.sin(t * 2 + i * 2) * 4} w={32 * dk.s} o={dk.o} flip={dk.x > 1900} /> : null,
          )}

          {/* rainbow behind the cast */}
          {x.rainbow > 0.01 && <g opacity={x.rainbow * 0.55}><Emoji kind="rainbow" x={1560} y={1010} w={1500} /></g>}

          {/* the cast */}
          <Shadows s={s} />
          {x.duckling.o > 0.01 && (
            <Emoji kind="duck" x={x.duckling.x} y={x.duckling.y + Math.sin(t * 6) * 2} w={32 * x.duckling.s} o={x.duckling.o} flip />
          )}
          <DogFigure d={s.dog} />
          <Leash s={s} />
          <HumanFigure h={s.human} />
          {x.birdPerch.o > 0.01 && <Emoji kind="bird" x={x.birdPerch.x} y={x.birdPerch.y} w={34 * x.birdPerch.s} o={x.birdPerch.o} flip />}

          {/* props in flight / in play */}
          {x.kite.o > 0.01 && (
            <g>
              <path
                d={`M ${hand.x} ${hand.y} Q ${(hand.x + x.kite.x) / 2 + x.kite.slack * 60} ${(hand.y + x.kite.y) / 2 + x.kite.slack * 90} ${x.kite.x} ${x.kite.y + 44}`}
                stroke="#f5f0e6"
                strokeWidth={2.4}
                fill="none"
                opacity={0.8 * x.kite.o}
              />
              <Emoji kind="kite" x={x.kite.x} y={x.kite.y} w={40 * x.kite.s} r={x.kite.r} o={x.kite.o} />
            </g>
          )}
          {x.bread.o > 0.01 && <Emoji kind="red_apple" x={x.bread.x} y={x.bread.y} w={34 * x.bread.s} o={x.bread.o} r={t * 240} />}
          {x.bone.o > 0.01 && <Emoji kind="bone" x={x.bone.x} y={x.bone.y} w={40 * x.bone.s} o={x.bone.o} r={t * 300} />}
          {x.ball.o > 0.01 && <Emoji kind="soccer_ball" x={nose.x - 4} y={nose.y + 12} w={44} o={x.ball.o} r={s.dog.x * 0.6} />}
          {x.butterfly2.o > 0.01 && (
            <Emoji kind="butterfly" x={x.butterfly2.x} y={x.butterfly2.y + Math.sin(t * 3) * 5} w={34 * x.butterfly2.s} o={x.butterfly2.o} r={Math.sin(t * 2) * 8} />
          )}

          {/* rain */}
          {rainN > 0 && (
            <g opacity={0.7}>
              {Array.from({length: rainN}, (_, i) => {
                const rx = ((i * 173 + t * 160) % 2300) - 200;
                const ry = ((i * 97 + t * 1500) % 1180) - 80;
                return <path key={i} d={`M ${rx} ${ry} l ${-7 - w.wind * 5} 34`} stroke="#dceef8" strokeWidth={3.6} strokeLinecap="round" />;
              })}
              {Array.from({length: 10}, (_, i) => {
                const px = ((i * 271 + t * 90) % 2100) - 100;
                const ph = (t * 3 + i * 0.7) % 1;
                return <ellipse key={`s${i}`} cx={px} cy={GROUND_Y + 20 + (i % 3) * 30} rx={4 + ph * 16} ry={2 + ph * 4} fill="none" stroke="#cfe8f5" strokeWidth={2} opacity={(1 - ph) * 0.5} />;
              })}
            </g>
          )}

          {/* fireflies */}
          {fireN > 0 && (
            <g>
              {Array.from({length: fireN}, (_, i) => {
                const fx2 = 300 + ((i * 331) % 1500) + Math.sin(t * 0.6 + i * 1.8) * 60;
                const fy2 = 620 + ((i * 149) % 260) + Math.sin(t * 0.9 + i) * 40;
                const gl = 0.35 + 0.65 * Math.abs(Math.sin(t * 1.7 + i * 2.4));
                return <circle key={i} cx={fx2} cy={fy2} r={3.4} fill="#fff3a0" opacity={gl * (night - 0.5) * 2} />;
              })}
            </g>
          )}
        </g>

        {/* storm cover */}
        {x.cloudDark > 0.01 && (
          <g opacity={x.cloudDark}>
            <rect width={1920} height={1080} fill="#3a4454" opacity={0.22} style={{mixBlendMode: 'multiply'}} />
            {[180, 620, 1080, 1520, 1840].map((cx2, i) => (
              <g key={i} transform={`translate(${cx2 + Math.sin(t * 0.2 + i) * 30} ${90 + (i % 2) * 46}) scale(${1.5 + (i % 3) * 0.4})`} opacity={0.85}>
                <ellipse cx={0} cy={0} rx={150} ry={52} fill="#5d6a7d" />
                <ellipse cx={-90} cy={16} rx={110} ry={40} fill="#4e5a6c" />
                <ellipse cx={95} cy={14} rx={120} ry={42} fill="#525f70" />
              </g>
            ))}
          </g>
        )}

        {/* prologue mist */}
        {x.mist > 0.01 && (
          <g opacity={x.mist}>
            <rect x={0} y={430} width={1920} height={650} fill="url(#mistGrad)" />
            <ellipse cx={500 + Math.sin(t * 0.2) * 60} cy={820} rx={700} ry={90} fill="#f5f8fa" opacity={0.5} />
            <ellipse cx={1400 - Math.sin(t * 0.16) * 80} cy={880} rx={760} ry={100} fill="#f5f8fa" opacity={0.4} />
          </g>
        )}

        {/* grade */}
        <rect width={1920} height={1080} fill={sky.light} opacity={sky.lightOp} style={{mixBlendMode: 'overlay'}} />
        <rect width={1920} height={1080} fill="#0b1026" opacity={night * 0.5} style={{mixBlendMode: 'multiply'}} />
        <rect width={1920} height={1080} fill="url(#vignette)" />
        <rect width={1920} height={1080} filter="url(#grainL)" opacity={0.06} style={{mixBlendMode: 'overlay'}} />

        {/* shooting star */}
        {x.shoot > 0.01 && x.shoot < 1 && (
          <g opacity={Math.sin(x.shoot * Math.PI)}>
            <path d={`M ${1500 - x.shoot * 700} ${140 + x.shoot * 180} l 90 -26`} stroke="#fffbe8" strokeWidth={4} strokeLinecap="round" />
            <circle cx={1500 - x.shoot * 700} cy={140 + x.shoot * 180} r={5} fill="#fffbe8" />
          </g>
        )}

        {/* act title cards */}
        <g fontFamily="'Trebuchet MS', 'DejaVu Sans', sans-serif" textAnchor="middle">
          {ACT_TITLES.map(([at, title, sub], i) => (
            <g key={i} opacity={x.card[i]}>
              <text x={960} y={470} fontSize={i === 0 ? 96 : 64} fontWeight={700} fill={night > 0.4 ? '#f5f0e6' : C.ink} letterSpacing={3}>
                {title}
              </text>
              <text x={960} y={530} fontSize={34} fill={night > 0.4 ? '#f5f0e6' : C.ink} opacity={0.7} letterSpacing={5}>
                {sub}
              </text>
            </g>
          ))}
        </g>

        {/* end credits */}
        {x.credit > 0.01 && (
          <g opacity={x.credit} fontFamily="'Trebuchet MS', 'DejaVu Sans', sans-serif" textAnchor="middle">
            <EndVignette x={960 - 110} y={120} w={220} />
            <text x={960} y={470} fontSize={88} fontWeight={700} fill="#f5f0e6" letterSpacing={2}>
              a day in the park
            </text>
            <text x={960} y={530} fontSize={32} fill="#f5f0e6" opacity={0.75} letterSpacing={6}>
              A TEN-MINUTE CARTOON IN ONE CONTINUOUS TAKE
            </text>
            <path d="M 800 566 L 1120 566" stroke={C.scarf} strokeWidth={5} strokeLinecap="round" />
            {[
              'directed & animated by a coding agent',
              'motion: gsap timelines   ·   frames: remotion',
              'rig, world & light: hand-built svg',
              'props & guests: microsoft/fluentui-emoji (mit)',
              'end-card emblem: generated raster → traced vector',
            ].map((line, i) => (
              <text key={i} x={960} y={640 + i * 44} fontSize={27} fill="#f5f0e6" opacity={0.62} letterSpacing={2}>
                {line}
              </text>
            ))}
          </g>
        )}
      </svg>
    </AbsoluteFill>
  );
};

export const LongWalk: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return <LongScene frame={frame} fps={fps} />;
};

export const LONG_DURATION_FRAMES = LFPS * LDUR;
