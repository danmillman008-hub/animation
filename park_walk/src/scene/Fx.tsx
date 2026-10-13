import React from 'react';
import {dogCollar, humanHandF} from '../motion/fk';
import {GROUND_Y} from './skeleton';
import {C} from './palette';
import type {SceneState} from '../motion/state';

/** Soft contact shadows — drawn on the path, under the characters. */
export const Shadows: React.FC<{s: SceneState}> = ({s}) => {
  const {human: h, dog: d} = s;
  const hLift = -(h.bob + h.bobBase);
  const dLift = -(d.bounce + d.bounceAdd);
  return (
    <g>
      <ellipse cx={h.x + 4} cy={GROUND_Y + 10} rx={62 - hLift * 1.6} ry={11} fill="url(#softShadow)" opacity={0.68 - hLift * 0.014} />
      <ellipse cx={d.x - 34} cy={GROUND_Y + 8} rx={86 - dLift * 1.4} ry={12} fill="url(#softShadow)" opacity={0.62 - dLift * 0.012} />
    </g>
  );
};

/** The leash: a quadratic sag between the hand and the collar, taut when the dog pulls. */
export const Leash: React.FC<{s: SceneState}> = ({s}) => {
  const hand = humanHandF(s.human);
  const collar = dogCollar(s.dog);
  const sag = 8 + s.leash.slack * 118;
  const vibe = s.leash.tension * Math.sin(s.world.distance * 0.42) * 5;
  const mx = (hand.x + collar.x) / 2;
  const my = (hand.y + collar.y) / 2 + sag + vibe;
  return (
    <g>
      <path d={`M ${hand.x} ${hand.y} Q ${mx} ${my} ${collar.x} ${collar.y}`} stroke={C.leash} strokeWidth={4.5} fill="none" strokeLinecap="round" opacity={0.95} />
      <path d={`M ${hand.x} ${hand.y} Q ${mx} ${my} ${collar.x} ${collar.y}`} stroke="#a97b62" strokeWidth={1.6} fill="none" strokeLinecap="round" opacity={0.5} />
      <circle cx={hand.x} cy={hand.y} r={8} fill="none" stroke={C.leash} strokeWidth={3.5} />
      <circle cx={collar.x} cy={collar.y} r={4.5} fill="#c9ccd4" />
    </g>
  );
};

const Leaf: React.FC<{x: number; y: number; r: number; s: number; o: number; tint: number}> = ({x, y, r, s, o, tint}) => {
  const fill = tint < 0.34 ? C.leafA : tint < 0.67 ? C.leafB : C.leafC;
  return (
    <g transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`} opacity={o}>
      <path d="M 0 -11 Q 8 -3 0 11 Q -8 -3 0 -11 Z" fill={fill} />
      <path d="M 0 -9 L 0 9" stroke={C.trunkDark} strokeWidth={1.4} opacity={0.5} />
    </g>
  );
};

const Butterfly: React.FC<{x: number; y: number; r: number; s: number; o: number; wing: number; tint: number}> = ({x, y, r, s, o, wing, tint}) => {
  const flap = 0.25 + Math.abs(Math.sin(wing * Math.PI)) * 0.85;
  const col = tint < 0.5 ? C.butterflyA : C.butterflyB;
  return (
    <g transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`} opacity={o}>
      <g transform={`scale(1 ${flap})`}>
        <path d="M 0 0 Q -16 -18 -6 -24 Q 4 -28 2 -8 Z" fill={col} />
        <path d="M 0 0 Q -18 12 -8 20 Q 0 24 2 6 Z" fill={col} opacity={0.85} />
      </g>
      <ellipse cx={1} cy={0} rx={3} ry={10} fill={C.bird} />
      <path d="M 2 -9 L 7 -15 M 0 -9 L -4 -15" stroke={C.bird} strokeWidth={1.4} strokeLinecap="round" />
    </g>
  );
};

const Bird: React.FC<{x: number; y: number; s: number; o: number; wing: number}> = ({x, y, s, o, wing}) => {
  const flap = -0.5 + wing * 1.1;
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} opacity={o}>
      <path d={`M -18 0 Q -9 ${-12 * flap} 0 0 Q 9 ${-12 * flap} 18 0`} stroke={C.bird} strokeWidth={4} strokeLinecap="round" fill="none" />
    </g>
  );
};

export const FxLayer: React.FC<{s: SceneState}> = ({s}) => {
  const {leaves, butterflies, birds, dust} = s.fx;
  return (
    <g>
      {dust.map((p, i) =>
        p.o > 0.01 ? (
          <ellipse key={`d${i}`} cx={p.x} cy={p.y} rx={26 * p.s} ry={10 * p.s} fill="url(#dustGrad)" opacity={p.o} transform={`translate(0 ${-6 * p.s})`} />
        ) : null,
      )}
      {birds.map((b, i) => (b.o > 0.01 ? <Bird key={`b${i}`} {...b} /> : null))}
      {butterflies.map((b, i) => (b.o > 0.01 ? <Butterfly key={`f${i}`} {...b} /> : null))}
      {leaves.map((l, i) => (l.o > 0.01 ? <Leaf key={`l${i}`} {...l} /> : null))}
    </g>
  );
};

/** Dust should read as kicked-up path grit, not as a shadow. */
export const DustDefs = (
  <>
    <radialGradient id="softShadow">
      <stop offset="0%" stopColor={C.shadow} stopOpacity={0.85} />
      <stop offset="62%" stopColor={C.shadow} stopOpacity={0.4} />
      <stop offset="100%" stopColor={C.shadow} stopOpacity={0} />
    </radialGradient>
    <radialGradient id="dustGrad">
      <stop offset="0%" stopColor={C.dustColor} stopOpacity={0.9} />
      <stop offset="100%" stopColor={C.dustColor} stopOpacity={0} />
    </radialGradient>
  </>
);
