import React from 'react';
import {HUMAN} from './skeleton';
import {C} from './palette';
import type {Human as HumanState, J} from '../motion/state';

/** A nested joint: `translate(ox,oy) rotate(r) scale(s)` — exactly what fk.ts mirrors. */
const Joint: React.FC<{j: J; x?: number; y?: number; base?: number; children?: React.ReactNode}> = ({
  j,
  x = 0,
  y = 0,
  base = 0,
  children,
}) => (
  <g transform={`translate(${x + j.x} ${y + j.y}) rotate(${base + j.r}) scale(${j.s})`}>{children}</g>
);

const Shoe: React.FC<{shade?: boolean}> = ({shade}) => (
  <g>
    <path
      d="M -13 -6 Q -15 4 -9 8 L 24 8 Q 31 8 31 2 Q 31 -4 19 -6 L 5 -10 L -7 -10 Q -13 -10 -13 -6 Z"
      fill={shade ? C.shoeSole : C.shoe}
    />
    <rect x={-14} y={5} width={46} height={5} rx={2.5} fill={C.shoeSole} />
    <path d="M -4 -8 L 8 -4 M -4 -3 L 10 1" stroke={shade ? '#5a534c' : C.shoeSole} strokeWidth={2} strokeLinecap="round" opacity={0.55} />
  </g>
);

export const HumanFigure: React.FC<{h: HumanState}> = ({h}) => {
  const blinkScale = 1 - h.blink * 0.92;
  const mouthH = 3 + h.mouthOpen * 9;

  return (
    <g transform={`translate(${h.x} ${h.y + h.bob + h.bobBase}) scale(${h.scale}) rotate(${h.lean + h.hips.r})`}>
      {/* -------- far arm (behind the torso) -------- */}
      <Joint j={h.uarmB} x={HUMAN.shoulderX - 3} y={HUMAN.shoulderY}>
        <path d={`M 0 0 L 0 ${HUMAN.uarmLen}`} stroke={C.shirtShade} strokeWidth={17} strokeLinecap="round" />
        <Joint j={h.larmB} y={HUMAN.uarmLen}>
          <path d={`M 0 0 L 0 ${HUMAN.larmLen}`} stroke={C.skinShade} strokeWidth={13} strokeLinecap="round" />
          <circle cx={0} cy={HUMAN.larmLen + 2} r={9} fill={C.skinShade} />
        </Joint>
      </Joint>

      {/* -------- far leg -------- */}
      <Joint j={h.thighB} x={-HUMAN.hipX} y={0}>
        <path d={`M 0 -4 L 0 ${HUMAN.thighLen}`} stroke={C.pantsShade} strokeWidth={21} strokeLinecap="round" />
        <Joint j={h.shinB} y={HUMAN.thighLen}>
          <path d={`M 0 0 L 0 ${HUMAN.shinLen - 12}`} stroke={C.pantsShade} strokeWidth={17} strokeLinecap="round" />
          <path d={`M 0 ${HUMAN.shinLen - 16} L 0 ${HUMAN.shinLen}`} stroke={'#e8e3da'} strokeWidth={15} strokeLinecap="round" />
          <Joint j={h.footB} y={HUMAN.shinLen}>
            <Shoe shade />
          </Joint>
        </Joint>
      </Joint>

      {/* -------- torso -------- */}
      <g transform={`rotate(${h.torso.r}) scale(${h.torso.s})`}>
        <path d="M -26 -8 Q -30 12 0 15 Q 30 12 26 -8 Z" fill={C.pants} />
        <rect x={-26} y={-12} width={52} height={7} rx={3} fill={C.shoeSole} opacity={0.55} />
        <path
          d="M -27 -8 L -30 -84 Q -30 -96 -18 -96 L 18 -96 Q 30 -96 30 -84 L 27 -8 Q 0 0 -27 -8 Z"
          fill={C.shirt}
        />
        <path d="M 12 -96 L 27 -84 L 27 -8 Q 18 -4 10 -4 Z" fill={C.shirtShade} opacity={0.5} />
        <path d="M -12 -96 Q 0 -88 12 -96 L 8 -100 Q 0 -94 -8 -100 Z" fill={C.shirtShade} />
        {/* cel shading: shade side + sun rim on the shirt */}
        <path d="M -20 -86 Q -27 -44 -23 0 L -10 0 Q -16 -44 -11 -84 Z" fill={C.shirtShade} opacity={0.55} />
        <path d="M 17 -82 Q 23 -42 19 -2" stroke="#ffd9a0" strokeWidth={3.4} strokeLinecap="round" fill="none" opacity={0.4} />
        {/* scarf: a small neck band with one fluttering tail (follow-through) */}
        <g transform={`translate(0 ${-92})`}>
          <path d="M -13 -4 Q 0 6 13 -4 L 13 4 Q 0 12 -13 4 Z" fill={C.scarf} />
          <g transform={`translate(-11 4) rotate(${h.scarfA.r})`}>
            <path d="M 0 0 Q -8 10 -6 22 Q -4 28 2 24 Q 7 16 3 4 Z" fill={C.scarfShade} />
            <g transform={`translate(-4 22) rotate(${h.scarfB.r})`}>
              <path d="M 0 0 Q -7 8 -4 18 Q -2 22 3 19 Q 6 12 2 2 Z" fill={C.scarf} />
            </g>
          </g>
        </g>
      </g>

      {/* -------- near leg -------- */}
      <Joint j={h.thighF} x={HUMAN.hipX} y={0}>
        <path d={`M 0 -4 L 0 ${HUMAN.thighLen}`} stroke={C.pants} strokeWidth={22} strokeLinecap="round" />
        <Joint j={h.shinF} y={HUMAN.thighLen}>
          <path d={`M 0 0 L 0 ${HUMAN.shinLen - 12}`} stroke={C.pants} strokeWidth={18} strokeLinecap="round" />
          <path d={`M 0 ${HUMAN.shinLen - 16} L 0 ${HUMAN.shinLen}`} stroke={'#ffffff'} strokeWidth={16} strokeLinecap="round" />
          <Joint j={h.footF} y={HUMAN.shinLen}>
            <Shoe />
          </Joint>
        </Joint>
      </Joint>

      {/* -------- neck + head -------- */}
      <g transform={`rotate(${h.torso.r})`}>
        <path d={`M 0 ${-HUMAN.torsoLen + 4} L 0 ${-HUMAN.torsoLen - 10}`} stroke={C.skin} strokeWidth={14} strokeLinecap="round" />
        <Joint j={h.neck} x={0} y={-HUMAN.torsoLen} base={h.neckTurn}>
          <Joint j={h.head} y={-HUMAN.neckLen} base={h.headTurn}>
            {/* ponytail: two trailing segments, behind the skull */}
            <Joint j={h.hairA} x={-26} y={-44}>
              <path d="M 0 0 Q -8 16 -6 34" stroke={C.hair} strokeWidth={14} strokeLinecap="round" fill="none" />
              <Joint j={h.hairB} x={-6} y={34}>
                <path d="M 0 0 Q -8 14 -5 28" stroke={C.hair} strokeWidth={10} strokeLinecap="round" fill="none" />
                <circle cx={-5} cy={28} r={5.5} fill={C.hairLit} />
              </Joint>
            </Joint>
            {/* chin shadow falling on the neck */}
            <ellipse cx={-2} cy={26} rx={12} ry={5} fill={C.skinShade} opacity={0.4} />
            {/* sun rim on the hair */}
            <path d="M 8 -72 Q 30 -62 32 -42" stroke={C.hairLit} strokeWidth={4.5} strokeLinecap="round" fill="none" opacity={0.65} />
            {/* back hair */}
            <path d="M -34 -30 Q -40 -66 -6 -76 Q 26 -84 34 -56 Q 38 -42 32 -34 Q 20 -60 -6 -58 Q -28 -54 -26 -28 Z" fill={C.hair} />
            {/* head */}
            <ellipse cx={HUMAN.headCx} cy={HUMAN.headCy} rx={HUMAN.headRx} ry={HUMAN.headRy} fill={C.skin} />
            <ellipse cx={-14} cy={-30} rx={10} ry={12} fill={C.skinShade} opacity={0.35} />
            {/* ear */}
            <circle cx={-17} cy={-31} r={6.5} fill={C.skinShade} />
            <circle cx={-17} cy={-31} r={3} fill={C.skin} opacity={0.5} />
            {/* fringe */}
            <path d="M -33 -40 Q -34 -70 0 -74 Q 30 -76 35 -50 Q 36 -42 32 -40 Q 26 -60 2 -60 Q -18 -60 -24 -44 Q -28 -36 -33 -40 Z" fill={C.hair} />
            <path d="M 8 -72 Q 20 -70 26 -58" stroke={C.hairLit} strokeWidth={4} strokeLinecap="round" fill="none" opacity={0.8} />
            {/* brow */}
            <path
              d={`M 10 ${-54 - h.brow * 2} Q 17 ${-57 - h.brow * 2} 23 ${-53 - h.brow * 2}`}
              stroke={C.hair}
              strokeWidth={3.5}
              strokeLinecap="round"
              fill="none"
            />
            {/* eye */}
            <g transform={`translate(16 -42) scale(1 ${blinkScale})`}>
              <ellipse cx={0} cy={0} rx={5.6} ry={6.4} fill={C.eyeWhite} />
              <circle cx={1.7} cy={0.5} r={3.9} fill={C.eye} />
              <circle cx={3} cy={-1.2} r={1.3} fill="#ffffff" />
            </g>
            {/* nose */}
            <path d="M 32 -34 Q 37 -30 32 -26" stroke={C.skinShade} strokeWidth={3.5} strokeLinecap="round" fill="none" />
            {/* mouth */}
            <g transform={`translate(18 -18)`}>
              {h.mouthOpen > 0.15 ? (
                <ellipse cx={0} cy={0} rx={6} ry={mouthH * 0.5} fill="#8c4a44" />
              ) : (
                <path d={`M -6 0 Q 0 ${4 + h.smile * 4} 8 -1`} stroke="#8c4a44" strokeWidth={3.2} strokeLinecap="round" fill="none" />
              )}
            </g>
            <ellipse cx={12} cy={-26} rx={7} ry={4} fill={C.blush} opacity={0.45} />
          </Joint>
        </Joint>
      </g>

      {/* -------- near arm: the leash hand -------- */}
      <Joint j={h.uarmF} x={HUMAN.shoulderX + 3} y={HUMAN.shoulderY}>
        <path d={`M 0 0 L 0 ${HUMAN.uarmLen}`} stroke={C.shirt} strokeWidth={18} strokeLinecap="round" />
        <Joint j={h.larmF} y={HUMAN.uarmLen}>
          <path d={`M 0 0 L 0 ${HUMAN.larmLen}`} stroke={C.skin} strokeWidth={14} strokeLinecap="round" />
          <Joint j={h.handF} y={HUMAN.larmLen}>
            <circle cx={0} cy={3} r={9.5} fill={C.skin} />
            <path d="M 4 8 Q 10 8 11 3" stroke={C.skinShade} strokeWidth={3} strokeLinecap="round" fill="none" />
          </Joint>
        </Joint>
      </Joint>
    </g>
  );
};
