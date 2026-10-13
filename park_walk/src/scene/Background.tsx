import React from 'react';
import {C} from './palette';
import {rng} from '../motion/state';

/**
 * Parallax park. Every layer is a seamless tile that repeats, driven by one shared
 * `distance` value so the ratios stay locked to the characters' foot speed.
 * `t` (seconds) drives purely procedural life — sway, motes, dapples — which stays
 * deterministic because it is a pure function of time.
 */

export const LAYER = {
  cloud: 0.035,
  hill: 0.06,
  treeline: 0.17,
  mid: 0.46,
  path: 1,
  fore: 1.32,
};

const HORIZON = 596;
const GRASS_TOP = 636;
const PATH_TOP = 762;
const PATH_BOTTOM = 1012;

/** Tile x-offsets so a repeating layer always covers the frame, whatever the scroll. */
function tileOffsets(distance: number, factor: number, w: number, count = 3): number[] {
  const scroll = distance * factor;
  const base = -(((scroll % w) + w) % w);
  return Array.from({length: count}, (_, i) => base + i * w);
}

/* ------------------------------- pieces ------------------------------- */

const Cloud: React.FC<{x: number; y: number; s: number; seed: number}> = ({x, y, s, seed}) => {
  const r = rng(seed * 977 + 13);
  const puffs = [
    {cx: 0, cy: 0, r: 46},
    {cx: 44, cy: -12, r: 36},
    {cx: -46, cy: 4, r: 32},
    {cx: 22, cy: 14, r: 34},
    {cx: -22, cy: -18, r: 30 + r() * 10},
    {cx: 74, cy: 8, r: 24},
  ];
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} opacity={0.92}>
      {puffs.map((p, i) => (
        <circle key={i} cx={p.cx} cy={p.cy + 12} r={p.r} fill={C.cloudShade} opacity={0.55} />
      ))}
      {puffs.map((p, i) => (
        <circle key={`l${i}`} cx={p.cx} cy={p.cy} r={p.r} fill={C.cloudLit} />
      ))}
      <rect x={-78} y={6} width={160} height={26} rx={13} fill={C.cloudLit} />
      {/* warm sun-side rim */}
      <path d="M 30 -40 Q 62 -34 76 -6" stroke="#fff3d6" strokeWidth={7} strokeLinecap="round" fill="none" opacity={0.5} />
    </g>
  );
};

const Tree: React.FC<{x: number; y: number; s: number; variant: number; t?: number; i?: number}> = ({x, y, s, variant, t = 0, i = 0}) => {
  const lean = (variant % 3) - 1;
  const sway = Math.sin(t * 0.55 + i * 1.7) * 1.1;
  return (
    <g transform={`translate(${x} ${y}) scale(${s}) rotate(${lean * 2 + sway})`}>
      {/* cast shadow on the grass */}
      <ellipse cx={26} cy={6} rx={86} ry={13} fill={C.shadow} opacity={0.16} />
      <path d={`M -13 4 L -9 -176 Q 0 -190 9 -176 L 13 4 Z`} fill={C.trunk} />
      <path d={`M 0 -100 L -44 -142`} stroke={C.trunk} strokeWidth={11} strokeLinecap="round" fill="none" />
      <path d={`M 0 -128 L 40 -166`} stroke={C.trunk} strokeWidth={9} strokeLinecap="round" fill="none" />
      <path d={`M -13 4 L -9 -176 Q -2 -186 0 -176 L 2 4 Z`} fill={C.trunkDark} opacity={0.45} />
      <path d={`M 8 -20 L 10 -150`} stroke="#c98d5f" strokeWidth={3} strokeLinecap="round" opacity={0.5} />
      <circle cx={-56} cy={-196} r={58} fill={C.canopyDark} />
      <circle cx={58} cy={-204} r={62} fill={C.canopyDark} />
      <circle cx={0} cy={-244} r={74} fill={C.canopy} />
      <circle cx={-40} cy={-232} r={54} fill={C.canopyMid} />
      <circle cx={44} cy={-248} r={50} fill={C.canopyMid} />
      <circle cx={-14} cy={-282} r={40} fill={C.canopyLit} />
      <circle cx={30} cy={-286} r={26} fill={C.canopyLit} opacity={0.85} />
      {/* sun-side rim light + inner shade crescent */}
      <path d="M 44 -296 Q 76 -272 78 -232" stroke="#e8f7c8" strokeWidth={9} strokeLinecap="round" fill="none" opacity={0.55} />
      <path d="M -84 -224 Q -96 -188 -74 -160" stroke={C.canopyDark} strokeWidth={10} strokeLinecap="round" fill="none" opacity={0.5} />
    </g>
  );
};

const Bush: React.FC<{x: number; y: number; s: number; lit?: boolean}> = ({x, y, s, lit}) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <ellipse cx={6} cy={4} rx={62} ry={9} fill={C.shadow} opacity={0.14} />
    <circle cx={-30} cy={-12} r={26} fill={lit ? C.canopyMid : C.grassDark} />
    <circle cx={4} cy={-24} r={32} fill={lit ? C.canopy : C.grass} />
    <circle cx={36} cy={-12} r={24} fill={lit ? C.canopyMid : C.grassDark} />
    <circle cx={-6} cy={-34} r={16} fill={lit ? C.canopyLit : C.grassLit} opacity={0.8} />
    <path d="M 26 -30 Q 40 -22 42 -8" stroke="#e8f7c8" strokeWidth={5} strokeLinecap="round" fill="none" opacity={0.4} />
    <rect x={-56} y={-14} width={116} height={16} rx={8} fill={lit ? C.canopyDark : C.grassDark} />
  </g>
);

const Bench: React.FC<{x: number; y: number}> = ({x, y}) => (
  <g transform={`translate(${x} ${y})`}>
    <ellipse cx={0} cy={30} rx={102} ry={10} fill={C.shadow} opacity={0.16} />
    <rect x={-92} y={-64} width={184} height={10} rx={5} fill={C.benchWood} />
    <rect x={-92} y={-48} width={184} height={10} rx={5} fill={C.benchWoodDark} />
    <rect x={-96} y={-26} width={192} height={12} rx={6} fill={C.benchWood} />
    <rect x={-96} y={-10} width={192} height={10} rx={5} fill={C.benchWoodDark} />
    <rect x={-92} y={-64} width={184} height={3} rx={1.5} fill="#e8b98a" opacity={0.7} />
    <rect x={-96} y={-26} width={192} height={3} rx={1.5} fill="#e8b98a" opacity={0.6} />
    <rect x={-84} y={-64} width={9} height={66} rx={4} fill={C.benchMetal} />
    <rect x={75} y={-64} width={9} height={66} rx={4} fill={C.benchMetal} />
    <rect x={-80} y={2} width={10} height={26} rx={4} fill={C.benchMetal} />
    <rect x={70} y={2} width={10} height={26} rx={4} fill={C.benchMetal} />
  </g>
);

const Lamp: React.FC<{x: number; y: number; glow: number}> = ({x, y, glow}) => (
  <g transform={`translate(${x} ${y})`}>
    <ellipse cx={0} cy={-286} rx={70} ry={70} fill={`url(#lampGlow)`} opacity={0.25 + glow * 0.25} />
    <ellipse cx={8} cy={4} rx={26} ry={7} fill={C.shadow} opacity={0.16} />
    <rect x={-6} y={-268} width={12} height={270} rx={6} fill={C.lampPost} />
    <rect x={-2} y={-262} width={3} height={258} fill="#8b93a1" opacity={0.7} />
    <rect x={-16} y={-6} width={32} height={10} rx={4} fill={C.lampPost} />
    <path d="M -22 -268 L 22 -268 L 15 -292 L -15 -292 Z" fill={C.lampPost} />
    <circle cx={0} cy={-276} r={13} fill={C.lampGlow} opacity={0.85} />
    <path d="M -6 -300 L 6 -300 L 0 -312 Z" fill={C.lampPost} />
  </g>
);

const Flowers: React.FC<{x: number; y: number; seed: number; s?: number; t?: number}> = ({x, y, seed, s = 1, t = 0}) => {
  const r = rng(seed * 31 + 7);
  const colors = [C.flowerA, C.flowerB, C.flowerC];
  const blooms = Array.from({length: 5}, (_, i) => ({
    dx: (i - 2) * 15 + (r() - 0.5) * 12,
    h: 22 + r() * 22,
    c: colors[Math.floor(r() * colors.length)],
    rr: 5 + r() * 3,
    ph: r() * 6.28,
  }));
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      {blooms.map((b, i) => {
        const sway = Math.sin(t * 1.5 + b.ph) * 3.2;
        return (
          <g key={i} transform={`rotate(${sway} ${b.dx} 0)`}>
            <path d={`M ${b.dx} 0 Q ${b.dx + 3} ${-b.h / 2} ${b.dx} ${-b.h}`} stroke={C.flowerStem} strokeWidth={3} fill="none" strokeLinecap="round" />
            {[0, 72, 144, 216, 288].map((a) => (
              <circle
                key={a}
                cx={b.dx + Math.cos((a * Math.PI) / 180) * b.rr}
                cy={-b.h + Math.sin((a * Math.PI) / 180) * b.rr}
                r={b.rr * 0.78}
                fill={b.c}
              />
            ))}
            <circle cx={b.dx} cy={-b.h} r={b.rr * 0.5} fill={C.cream} />
          </g>
        );
      })}
    </g>
  );
};

const Tuft: React.FC<{x: number; y: number; s: number; wind: number; dark?: boolean; t?: number; ph?: number}> = ({x, y, s, wind, dark, t = 0, ph = 0}) => {
  const col = dark ? C.grassDark : C.grass;
  const bend = wind * 7 + Math.sin(t * 1.3 + ph) * 2.4;
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      {[-14, -7, 0, 7, 14].map((dx, i) => (
        <path
          key={i}
          d={`M ${dx} 0 Q ${dx + bend * 0.4} ${-16 - i * 2} ${dx + bend} ${-30 - (i % 3) * 7}`}
          stroke={i % 2 ? col : C.grassLit}
          strokeWidth={4.5}
          strokeLinecap="round"
          fill="none"
          opacity={i % 2 ? 1 : 0.75}
        />
      ))}
    </g>
  );
};

/* ------------------------------- layers ------------------------------- */

export const Background: React.FC<{
  distance: number;
  cloud: number;
  wind: number;
  sun: number;
  warm: number;
  t: number;
}> = ({distance, cloud, wind, sun, warm, t}) => {
  const clouds = tileOffsets(distance + cloud, LAYER.cloud, 2600, 2);
  const hills = tileOffsets(distance, LAYER.hill, 2400, 2);
  const treeline = tileOffsets(distance, LAYER.treeline, 1000, 3);
  const mid = tileOffsets(distance, LAYER.mid, 1400, 3);
  const pathD = tileOffsets(distance, LAYER.path, 640, 4);
  const fore = tileOffsets(distance, LAYER.fore, 520, 5);
  const sunX = 1560;
  const sunY = 208 + sun * 6;

  return (
    <g>
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={C.skyTop} />
          <stop offset="46%" stopColor={C.skyMid} />
          <stop offset="78%" stopColor={C.skyLow} />
          <stop offset="100%" stopColor="#ffe9c4" />
        </linearGradient>
        <radialGradient id="sunGlow">
          <stop offset="0%" stopColor={C.sunCore} stopOpacity={0.95} />
          <stop offset="38%" stopColor={C.sunGlow} stopOpacity={0.5} />
          <stop offset="100%" stopColor={C.sunGlow} stopOpacity={0} />
        </radialGradient>
        <radialGradient id="lampGlow">
          <stop offset="0%" stopColor={C.lampGlow} stopOpacity={0.9} />
          <stop offset="100%" stopColor={C.lampGlow} stopOpacity={0} />
        </radialGradient>
        <linearGradient id="pathGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={C.pathShade} />
          <stop offset="26%" stopColor={C.path} />
          <stop offset="100%" stopColor={C.path} />
        </linearGradient>
        <linearGradient id="grassGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={C.grassFar} />
          <stop offset="100%" stopColor={C.grass} />
        </linearGradient>
        <linearGradient id="ray" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff6dc" stopOpacity={0.55} />
          <stop offset="100%" stopColor="#fff6dc" stopOpacity={0} />
        </linearGradient>
        <linearGradient id="haze" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#eaf6ff" stopOpacity={0} />
          <stop offset="70%" stopColor="#eaf6ff" stopOpacity={0.55} />
          <stop offset="100%" stopColor="#fff2d8" stopOpacity={0.75} />
        </linearGradient>
        <radialGradient id="mote">
          <stop offset="0%" stopColor="#fffbe8" stopOpacity={0.9} />
          <stop offset="100%" stopColor="#fffbe8" stopOpacity={0} />
        </radialGradient>
        <radialGradient id="dapple">
          <stop offset="0%" stopColor="#fff3cf" stopOpacity={0.5} />
          <stop offset="100%" stopColor="#fff3cf" stopOpacity={0} />
        </radialGradient>
        <filter id="dofFar" x="-5%" y="-5%" width="110%" height="110%">
          <feGaussianBlur stdDeviation="1.4" />
        </filter>
        <filter id="dofFg" x="-5%" y="-5%" width="110%" height="110%">
          <feGaussianBlur stdDeviation="2.6" />
        </filter>
      </defs>

      {/* sky */}
      <rect x={-400} y={-300} width={2800} height={1800} fill="url(#sky)" />

      {/* sun + god rays */}
      <g transform={`translate(${sunX} ${sunY})`}>
        <circle r={300 + sun * 26} fill="url(#sunGlow)" opacity={0.75} />
        {[16, 33, 52].map((a, i) => (
          <g key={i} transform={`rotate(${a + 90 + Math.sin(t * 0.23 + i) * 1.6})`}>
            <rect x={-46 - i * 16} y={0} width={92 + i * 32} height={1250} fill="url(#ray)" opacity={0.1 + 0.05 * Math.sin(t * 0.6 + i * 2.1)} />
          </g>
        ))}
        <circle r={62} fill={C.sunCore} opacity={0.95} />
        <circle r={62} fill="none" stroke="#fffbe8" strokeWidth={5} opacity={0.5} />
      </g>

      {/* clouds */}
      {clouds.map((cx, i) => (
        <g key={i}>
          <Cloud x={cx + 320} y={150} s={1.15} seed={i * 3 + 1} />
          <Cloud x={cx + 1080} y={252} s={0.8} seed={i * 3 + 2} />
          <Cloud x={cx + 1780} y={122} s={1.4} seed={i * 3 + 3} />
          <Cloud x={cx + 2280} y={300} s={0.62} seed={i * 3 + 4} />
        </g>
      ))}

      {/* distant hills + far treeline (soft focus) */}
      <g filter="url(#dofFar)">
        {hills.map((hx, i) => (
          <g key={i}>
            <path
              d={`M ${hx} ${HORIZON + 30} Q ${hx + 300} ${HORIZON - 120} ${hx + 640} ${HORIZON + 12} Q ${hx + 980} ${HORIZON - 86} ${hx + 1340} ${HORIZON + 22} Q ${hx + 1780} ${HORIZON - 130} ${hx + 2160} ${HORIZON + 16} L ${hx + 2400} ${HORIZON + 30} L ${hx + 2400} ${HORIZON + 120} L ${hx} ${HORIZON + 120} Z`}
              fill={C.hillFar}
            />
            <path
              d={`M ${hx} ${HORIZON + 66} Q ${hx + 420} ${HORIZON - 30} ${hx + 820} ${HORIZON + 58} Q ${hx + 1240} ${HORIZON - 12} ${hx + 1660} ${HORIZON + 62} Q ${hx + 2040} ${HORIZON + 4} ${hx + 2400} ${HORIZON + 66} L ${hx + 2400} ${HORIZON + 140} L ${hx} ${HORIZON + 140} Z`}
              fill={C.hillNear}
            />
          </g>
        ))}
        {treeline.map((tx, i) => (
          <g key={i}>
            {[60, 190, 330, 470, 620, 760, 900].map((ox, k) => (
              <g key={k} transform={`translate(${tx + ox} ${HORIZON + 74})`}>
                <circle cx={0} cy={-30 - (k % 3) * 9} r={42 + (k % 4) * 9} fill={k % 2 ? C.treelineFar : C.treelineFarDark} />
                <circle cx={-26} cy={-12} r={28} fill={C.treelineFarDark} />
                <circle cx={28} cy={-14} r={26} fill={C.treelineFar} />
                <rect x={-5} y={-24} width={10} height={30} fill={C.treelineFarDark} opacity={0.6} />
              </g>
            ))}
          </g>
        ))}
      </g>
      {/* atmospheric haze over the distance */}
      <rect x={-400} y={HORIZON - 190} width={2800} height={330} fill="url(#haze)" opacity={0.5 + warm * 0.2} />

      {/* grass field behind the path */}
      <rect x={-400} y={GRASS_TOP} width={2800} height={PATH_TOP - GRASS_TOP + 40} fill="url(#grassGrad)" />

      {/* mid layer: trees, bench, lamp, flowers, bushes + floating motes */}
      {mid.map((mx, i) => (
        <g key={i}>
          <Tree x={mx + 190} y={GRASS_TOP + 96} s={1.02} variant={i} t={t} i={i} />
          <Bush x={mx + 420} y={GRASS_TOP + 92} s={1.05} />
          <Bench x={mx + 640} y={GRASS_TOP + 96} />
          <Flowers x={mx + 830} y={GRASS_TOP + 96} seed={i + 2} s={1.1} t={t} />
          <Lamp x={mx + 990} y={GRASS_TOP + 98} glow={warm} />
          <Tree x={mx + 1180} y={GRASS_TOP + 92} s={0.86} variant={i + 1} t={t} i={i + 3} />
          <Bush x={mx + 1330} y={GRASS_TOP + 90} s={0.9} lit />
          {[120, 520, 760, 900, 1100, 1290].map((ox, k) => (
            <Tuft key={k} x={mx + ox} y={GRASS_TOP + 98 + (k % 3) * 6} s={0.8} wind={wind} t={t} ph={k * 1.3 + i} />
          ))}
          {[210, 640, 1040].map((ox, k) => (
            <circle
              key={`m${k}`}
              cx={mx + ox + Math.sin(t * 0.34 + k * 2.4 + i) * 46}
              cy={GRASS_TOP - 40 - k * 66 + Math.sin(t * 0.8 + k * 1.7 + i * 2) * 22}
              r={3 + (k % 2) * 1.6}
              fill="url(#mote)"
              opacity={0.3 + 0.22 * Math.sin(t * 1.1 + k * 2 + i)}
            />
          ))}
        </g>
      ))}

      {/* path + dappled light */}
      <rect x={-400} y={PATH_TOP} width={2800} height={PATH_BOTTOM - PATH_TOP} fill="url(#pathGrad)" />
      <rect x={-400} y={PATH_TOP} width={2800} height={9} fill={C.pathEdge} opacity={0.55} />
      <rect x={-400} y={PATH_BOTTOM - 8} width={2800} height={8} fill={C.pathEdge} opacity={0.4} />
      {pathD.map((px, i) => (
        <g key={i}>
          {[40, 150, 268, 372, 486, 590].map((ox, k) => (
            <ellipse
              key={k}
              cx={px + ox}
              cy={PATH_TOP + 40 + ((k * 53) % (PATH_BOTTOM - PATH_TOP - 90))}
              rx={7 + (k % 3) * 5}
              ry={4 + (k % 2) * 2}
              fill={C.pebble}
              opacity={0.6}
            />
          ))}
          <rect x={px + 90} y={PATH_TOP + 118} width={90} height={5} rx={2.5} fill={C.pathShade} opacity={0.32} />
          <rect x={px + 330} y={PATH_TOP + 176} width={110} height={5} rx={2.5} fill={C.pathShade} opacity={0.26} />
          {[120, 400].map((ox, k) => (
            <ellipse
              key={`d${k}`}
              cx={px + ox + Math.sin(t * 0.26 + k * 3 + i) * 26}
              cy={PATH_TOP + 90 + k * 90}
              rx={120}
              ry={34}
              fill="url(#dapple)"
              opacity={0.5 + 0.3 * Math.sin(t * 0.5 + k * 2.2 + i)}
            />
          ))}
        </g>
      ))}

      {/* foreground verge (soft focus) */}
      <g filter="url(#dofFg)">
        <path
          d={`M -400 ${PATH_BOTTOM} L 2400 ${PATH_BOTTOM} L 2400 1400 L -400 1400 Z`}
          fill={C.grassDark}
        />
        {fore.map((fx, i) => (
          <g key={i}>
            {[30, 110, 196, 268, 350, 430, 492].map((ox, k) => (
              <Tuft key={k} x={fx + ox} y={PATH_BOTTOM + 26 + (k % 3) * 16} s={1.5 + (k % 2) * 0.5} wind={wind} dark={k % 3 === 0} t={t} ph={k * 0.9 + i * 2} />
            ))}
            <Flowers x={fx + 150} y={PATH_BOTTOM + 46} seed={i + 11} s={1.5} t={t} />
            <Bush x={fx + 400} y={PATH_BOTTOM + 54} s={1.5} />
          </g>
        ))}
      </g>
    </g>
  );
};
