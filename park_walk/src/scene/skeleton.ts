/**
 * Skeleton proportions, in local art units.
 *
 * Human: origin (0,0) is the hip centre, +y is DOWN, the character faces +x (right).
 * Dog:   origin (0,0) is the chest centre, +y is DOWN, the dog faces +x (right).
 *
 * Every joint is nested `<g transform="translate(ox,oy) rotate(r)">`, so a segment is
 * always drawn from its own (0,0) down to (0, len). `fk.ts` mirrors this maths exactly
 * so the leash and the gait QA can read real world-space joint positions.
 */

export const HUMAN = {
  torsoLen: 96, // hip -> shoulder line
  neckLen: 12, // shoulder -> neck joint
  headLen: 30, // neck -> head pivot
  headCx: 2, //  head ellipse centre, in head space
  headCy: -34,
  headRx: 34,
  headRy: 38,
  shoulderX: 0,
  shoulderY: -90,
  uarmLen: 54,
  larmLen: 50,
  handR: 10,
  hipX: 5, // hip socket offset from centre (near/far legs)
  thighLen: 80,
  shinLen: 76,
  footLen: 30,
  scale: 1.22, // art units -> screen px
};

export const DOG = {
  bodyLen: 96, // chest -> hip
  bodyR: 34,
  neckLen: 26,
  headLen: 20,
  skullR: 21,
  muzzleLen: 30,
  shoulderX: 4,
  shoulderY: 8,
  hipX: -88,
  hipY: 6,
  flegUp: 34,
  flegLow: 32,
  blegUp: 38,
  blegLow: 34,
  pawLen: 15,
  tailSeg: [18, 16, 14],
  tailX: -94,
  tailY: -10,
  earX: 24,
  earY: -14,
  scale: 1.34,
};

/** Ground line (screen px) the characters stand on. */
export const GROUND_Y = 902;
export const HUMAN_X = 700;
export const DOG_X = 1190;

/** Vertical distance from a character's local origin to the ground, in art units. */
export const HUMAN_ORIGIN_Y = GROUND_Y - (HUMAN.thighLen + HUMAN.shinLen + 8) * HUMAN.scale;
export const DOG_ORIGIN_Y = GROUND_Y - (DOG.shoulderY + DOG.flegUp + DOG.flegLow + 6) * DOG.scale;
