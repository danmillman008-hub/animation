import React from 'react';
import {DOG} from './skeleton';
import {SIT_PITCH} from '../motion/fk';
import {C} from './palette';
import type {Dog as DogState, DogLeg, J} from '../motion/state';

const Joint: React.FC<{j: J; x?: number; y?: number; base?: number; children?: React.ReactNode}> = ({
  j,
  x = 0,
  y = 0,
  base = 0,
  children,
}) => (
  <g transform={`translate(${x + j.x} ${y + j.y}) rotate(${base + j.r}) scale(${j.s})`}>{children}</g>
);

const Paw: React.FC<{cream?: boolean}> = ({cream}) => (
  <g>
    <ellipse cx={6} cy={3} rx={11.5} ry={6.5} fill={cream ? C.furCream : C.fur} />
    <path d="M 2 6 L 2 1 M 7 6 L 7 1" stroke={C.furShade} strokeWidth={1.6} opacity={0.5} />
  </g>
);

const Leg: React.FC<{leg: DogLeg; x: number; y: number; up: number; low: number; far?: boolean; hind?: boolean; sit?: number}> = ({
  leg,
  x,
  y,
  up,
  low,
  far,
  hind,
  sit = 0,
}) => {
  const fur = far ? C.furShade : C.fur;
  const wUp = hind ? (far ? 17 : 21) : far ? 13 : 16;
  const wLow = hind ? (far ? 9 : 11) : far ? 10 : 12;
  // fk.ts mirrors these: front legs lengthen, hind legs tuck flat under the trunk.
  const upLen = up;
  const hipRot = hind ? -50 * sit : 0;
  const kneeRot = hind ? -40 * sit : 0;
  const pawRot = hind ? 90 * sit : 0;
  return (
    <Joint j={leg.hip} x={x} y={y} base={hipRot}>
      <path d={`M 0 0 L 0 ${upLen}`} stroke={fur} strokeWidth={wUp} strokeLinecap="round" />
      <Joint j={leg.knee} y={upLen} base={kneeRot}>
        <path d={`M 0 0 L 0 ${low}`} stroke={fur} strokeWidth={wLow} strokeLinecap="round" />
        <Joint j={leg.paw} y={low} base={pawRot}>
          <Paw cream={!far} />
        </Joint>
      </Joint>
    </Joint>
  );
};

/** One floppy ear, drawn hanging down-back from its joint. */
const Ear: React.FC<{dark?: boolean; s?: number}> = ({dark, s = 1}) => (
  <g transform={`scale(${s})`}>
    <path d="M 0 0 Q -17 8 -16 33 Q -15 45 -2 42 Q 10 39 9 12 Q 8 2 0 0 Z" fill={dark ? C.furDark : C.furShade} />
    <path d="M -3 7 Q -10 16 -9 30" stroke={dark ? '#8a5a2c' : C.furDark} strokeWidth={2.4} fill="none" opacity={0.55} />
  </g>
);

export const DogFigure: React.FC<{d: DogState}> = ({d}) => {
  const blinkScale = 1 - d.blink * 0.92;
  // The trunk (hind legs, tail, body, neck, head) pitches about the shoulder when sitting.
  const sitRot = SIT_PITCH * d.sit;

  return (
    <g transform={`translate(${d.x} ${d.y + d.bounce + d.bounceAdd}) scale(${d.scale}) rotate(${d.lean + d.pitch})`}>
      {/* -------- far front leg (stays in world space) -------- */}
      <Leg leg={d.legFR} x={DOG.shoulderX} y={DOG.shoulderY} up={DOG.flegUp} low={DOG.flegLow} far sit={d.sit} />

      <g transform={`rotate(${sitRot} ${DOG.shoulderX} ${DOG.shoulderY})`}>
        {/* -------- far hind leg -------- */}
        <Leg leg={d.legBR} x={DOG.hipX} y={DOG.hipY} up={DOG.blegUp} low={DOG.blegLow} far hind sit={d.sit} />

        {/* -------- tail: a curved plume arcing up and back -------- */}
        <Joint j={d.tail1} x={DOG.tailX} y={DOG.tailY} base={-16}>
          <path d="M 0 6 Q -6 -6 -2 -18" stroke={C.fur} strokeWidth={14} strokeLinecap="round" fill="none" />
          <Joint j={d.tail2} x={-2} y={-18}>
            <path d="M 0 3 Q -7 -5 -4 -16" stroke={C.fur} strokeWidth={11} strokeLinecap="round" fill="none" />
            <Joint j={d.tail3} x={-4} y={-16}>
              <path d="M 0 3 Q -6 -4 -3 -14" stroke={C.furCream} strokeWidth={9} strokeLinecap="round" fill="none" />
              <circle cx={-3} cy={-14} r={5} fill={C.furCream} />
            </Joint>
          </Joint>
        </Joint>

        {/* -------- body -------- */}
        <g transform={`rotate(${d.body.r}) scale(${d.body.s})`}>
          <ellipse cx={-46} cy={2} rx={52} ry={30} fill={C.fur} />
          <circle cx={2} cy={-5} r={28} fill={C.fur} />
          <circle cx={-86} cy={4} r={30} fill={C.fur} />
          <path d="M -80 -24 Q -46 -36 -4 -26 Q -44 -30 -80 -24 Z" fill={C.furCream} opacity={0.5} />
          <ellipse cx={-46} cy={19} rx={26} ry={8} fill={C.furCream} opacity={0.65} />
          <circle cx={8} cy={8} r={14} fill={C.furCream} />
          {/* belly shadow + sun rim along the back */}
          <path d="M -72 26 Q -42 34 -14 25" stroke={C.furShade} strokeWidth={6} strokeLinecap="round" fill="none" opacity={0.3} />
          <path d="M -70 -28 Q -30 -38 6 -30" stroke="#ffe9c4" strokeWidth={4} strokeLinecap="round" fill="none" opacity={0.45} />
          {/* haunch crease: separates the thigh mass from the ribcage */}
          <path d="M -64 -22 Q -52 2 -62 26" stroke={C.furShade} strokeWidth={3.5} fill="none" opacity={0.5} />
          <path d="M -104 12 Q -88 26 -70 20" stroke={C.furShade} strokeWidth={3} fill="none" opacity={0.4} />
        </g>

        {/* -------- near hind leg -------- */}
        <Leg leg={d.legBL} x={DOG.hipX} y={DOG.hipY} up={DOG.blegUp} low={DOG.blegLow} hind sit={d.sit} />

        {/* -------- neck + collar + head -------- */}
        <Joint j={d.neck} x={10} y={-14} base={30 + d.neckTurn}>
          <circle cx={0} cy={6} r={17} fill={C.fur} />
          <path d={`M 0 10 L 0 ${-DOG.neckLen}`} stroke={C.fur} strokeWidth={30} strokeLinecap="round" />
          <path d={`M -9 4 L -7 ${-DOG.neckLen + 2}`} stroke={C.furCream} strokeWidth={7} strokeLinecap="round" opacity={0.6} />
          {/* collar sits on the neck */}
          <g transform="translate(0 2)">
            <rect x={-16} y={-5} width={32} height={11} rx={5.5} fill={C.collar} />
            <circle cx={2} cy={9} r={5} fill={C.collarTag} />
            <circle cx={2} cy={9} r={2} fill={C.benchWoodDark} opacity={0.5} />
          </g>
          <Joint j={d.head} y={-DOG.neckLen} base={-30 + d.headTurn}>
            {/* far ear, behind the skull */}
            <Joint j={d.earB} x={6} y={-22} base={d.earPerk}>
              <Ear dark s={0.92} />
            </Joint>
            {/* skull */}
            <circle cx={-4} cy={-8} r={19} fill={C.fur} />
            <circle cx={6} cy={-10} r={DOG.skullR} fill={C.fur} />
            {/* muzzle, level with the eye-line */}
            <rect x={14} y={-17} width={35} height={16} rx={8} fill={C.fur} />
            <rect x={16} y={-7} width={29} height={10} rx={5} fill={C.furCream} />
            <circle cx={50} cy={-12} r={5.5} fill={C.nose} />
            <path d="M 44 -5 Q 38 1 30 1" stroke={C.furDark} strokeWidth={2.4} fill="none" opacity={0.6} />
            {/* tongue */}
            <g transform={`translate(26 3) rotate(${d.jaw.r})`}>
              <ellipse cx={3} cy={5 + d.tongue * 6} rx={6.5} ry={4 + d.tongue * 7} fill={C.tongue} />
              <path d={`M 3 ${2 + d.tongue * 4} L 3 ${8 + d.tongue * 9}`} stroke="#d96a79" strokeWidth={1.8} strokeLinecap="round" />
            </g>
            {/* eye */}
            <g transform={`translate(16 -19) scale(1 ${blinkScale})`}>
              <ellipse cx={0} cy={0} rx={5.2} ry={5.8} fill={C.eyeWhite} />
              <circle cx={1.4} cy={0.4} r={3.1} fill={C.eye} />
              <circle cx={2.4} cy={-1} r={1.2} fill="#ffffff" />
            </g>
            <path d={`M 10 ${-28 - d.brow} Q 16 ${-31 - d.brow} 22 ${-28 - d.brow}`} stroke={C.furDark} strokeWidth={3} strokeLinecap="round" fill="none" />
            {/* sun rim on the skull + cheek shade */}
            <path d="M 10 -30 Q 24 -26 30 -14" stroke="#ffe9c4" strokeWidth={3.2} strokeLinecap="round" fill="none" opacity={0.5} />
            <path d="M 4 0 Q 12 7 22 5" stroke={C.furShade} strokeWidth={3} strokeLinecap="round" fill="none" opacity={0.3} />
            {/* top tuft */}
            <path d="M -6 -26 Q -2 -35 6 -31 Q 2 -28 4 -24 Z" fill={C.fur} />
            {/* near ear */}
            <Joint j={d.earF} x={13} y={-21} base={d.earPerk}>
              <Ear />
            </Joint>
          </Joint>
        </Joint>
      </g>

      {/* -------- near front leg (world space, drawn over the trunk) -------- */}
      <Leg leg={d.legFL} x={DOG.shoulderX} y={DOG.shoulderY} up={DOG.flegUp} low={DOG.flegLow} sit={d.sit} />
    </g>
  );
};
