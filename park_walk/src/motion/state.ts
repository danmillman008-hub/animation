import {DOG, DOG_ORIGIN_Y, DOG_X, GROUND_Y, HUMAN, HUMAN_ORIGIN_Y, HUMAN_X} from '../scene/skeleton';

/**
 * The single mutable state object that GSAP animates.
 *
 * GSAP never touches the DOM here — it tweens plain numbers on this tree. That keeps the
 * animation deterministic and lets one state drive both the Remotion React tree and the
 * headless gait QA (`render/qa_gait.mjs`).
 */

/** A joint: rotation in degrees plus optional translate / uniform scale (squash & stretch). */
export type J = {r: number; x: number; y: number; s: number};

export const j = (r = 0): J => ({r, x: 0, y: 0, s: 1});

export type Human = {
  x: number;
  y: number;
  scale: number;
  lean: number; // whole-body forward lean, degrees
  bob: number; // hip vertical offset — owned by the gait cycle (2 peaks per cycle)
  bobBase: number; // additive layer: story beats (anticipation, settle)
  headTurn: number; // additive layer on head rotation
  neckTurn: number; // additive layer on neck rotation
  hips: J;
  torso: J;
  neck: J;
  head: J;
  jaw: J;
  hairA: J; // follow-through segments
  hairB: J;
  scarfA: J;
  scarfB: J;
  uarmB: J; // far arm
  larmB: J;
  handB: J;
  uarmF: J; // near arm — the leash hand
  larmF: J;
  handF: J;
  thighB: J; // far leg
  shinB: J;
  footB: J;
  thighF: J; // near leg
  shinF: J;
  footF: J;
  blink: number; // 0 open .. 1 closed
  brow: number;
  mouthOpen: number;
  smile: number;
  shadow: number;
};

export type DogLeg = {hip: J; knee: J; paw: J};
const leg = (hip = 0, knee = 0): DogLeg => ({hip: j(hip), knee: j(knee), paw: j()});

export type Dog = {
  x: number;
  y: number;
  scale: number;
  lean: number;
  bounce: number; // owned by the trot cycle
  bounceAdd: number; // additive layer: sniff dip, sit drop
  headTurn: number;
  neckTurn: number;
  earPerk: number;
  pitch: number;
  body: J;
  neck: J;
  head: J;
  jaw: J;
  earB: J;
  earF: J;
  tail1: J;
  tail2: J;
  tail3: J;
  legFL: DogLeg;
  legFR: DogLeg;
  legBL: DogLeg;
  legBR: DogLeg;
  tongue: number;
  blink: number;
  brow: number;
  sit: number; // 0 standing .. 1 sitting
  shadow: number;
};

export type World = {
  distance: number; // ground travelled in px — every parallax layer derives from this
  camX: number;
  camY: number;
  camScale: number;
  camRot: number;
  cloud: number;
  sun: number;
  flare: number;
  vignette: number;
  fade: number; // 1 = faded out to warm cream
  warm: number; // golden-hour grade strength
  wind: number;
  title: number;
};

export type Leaf = {x: number; y: number; r: number; s: number; o: number; tint: number};
export type Butterfly = {x: number; y: number; r: number; s: number; o: number; wing: number; tint: number};
export type Bird = {x: number; y: number; s: number; o: number; wing: number};
export type Dust = {x: number; y: number; s: number; o: number};

export type Fx = {
  leaves: Leaf[];
  butterflies: Butterfly[];
  birds: Bird[];
  dust: Dust[];
};

export type Leash = {slack: number; tension: number};

export type SceneState = {
  world: World;
  human: Human;
  dog: Dog;
  fx: Fx;
  leash: Leash;
};

/** Deterministic PRNG: every render of every frame is bit-identical. */
export function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export const DUST_Y = GROUND_Y - 6;

export function createState(): SceneState {
  const rand = rng(20261013);

  const leaves: Leaf[] = Array.from({length: 7}, (_, i) => ({
    x: 1500 + i * 210,
    y: -100 - i * 150,
    r: rand() * 360,
    s: 0.7 + rand() * 0.9,
    o: 0,
    tint: rand(),
  }));

  const butterflies: Butterfly[] = Array.from({length: 3}, (_, i) => ({
    x: 2150 + i * 340,
    y: 520 + i * 80,
    r: 0,
    s: 0.85 + i * 0.15,
    o: 0,
    wing: 0,
    tint: rand(),
  }));

  const birds: Bird[] = Array.from({length: 4}, (_, i) => ({
    x: 2300 + i * 280,
    y: 140 + (i % 2) * 95 + rand() * 45,
    s: 0.5 + rand() * 0.55,
    o: 0,
    wing: 0,
  }));

  const dust: Dust[] = Array.from({length: 8}, () => ({x: 0, y: DUST_Y, s: 0.2, o: 0}));

  return {
    world: {
      distance: 0,
      camX: 0,
      camY: 0,
      camScale: 1,
      camRot: 0,
      cloud: 0,
      sun: 0,
      flare: 0,
      vignette: 0.3,
      fade: 1,
      warm: 0.22,
      wind: 0.2,
      title: 0,
      rule: 0,
      titleY: 30,
    },
    human: {
      x: HUMAN_X,
      y: HUMAN_ORIGIN_Y,
      scale: HUMAN.scale,
      lean: 0,
      bob: 0,
      bobBase: 0,
      headTurn: 0,
      neckTurn: 0,
      hips: j(),
      torso: j(3),
      neck: j(-1),
      head: j(-2),
      jaw: j(),
      hairA: j(-6),
      hairB: j(-9),
      scarfA: j(12),
      scarfB: j(16),
      uarmB: j(9),
      larmB: j(-16),
      handB: j(),
      uarmF: j(-7),
      larmF: j(-20),
      handF: j(),
      thighB: j(-3),
      shinB: j(5),
      footB: j(),
      thighF: j(3),
      shinF: j(4),
      footF: j(),
      blink: 0,
      brow: 0,
      mouthOpen: 0,
      smile: 0.75,
      shadow: 1,
    },
    dog: {
      x: DOG_X,
      y: DOG_ORIGIN_Y,
      scale: DOG.scale,
      lean: 0,
      bounce: 0,
      bounceAdd: 0,
      headTurn: 0,
      neckTurn: 0,
      earPerk: 0,
      pitch: 0,
      body: j(),
      neck: j(-6),
      head: j(4),
      jaw: j(7),
      earB: j(-9),
      earF: j(-7),
      tail1: j(-34),
      tail2: j(-26),
      tail3: j(-20),
      legFL: leg(-6, 8),
      legFR: leg(4, 6),
      legBL: leg(6, -10),
      legBR: leg(-4, -8),
      tongue: 0.35,
      blink: 0,
      brow: 0,
      sit: 0,
      shadow: 1,
    },
    fx: {leaves, butterflies, birds, dust},
    leash: {slack: 0.45, tension: 0},
  };
}
