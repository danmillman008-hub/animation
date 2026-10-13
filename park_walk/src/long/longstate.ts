/** Extra (long-film) story state, tweened by longtimeline.ts alongside the base SceneState. */
export type Guest = {x: number; y: number; r: number; s: number; o: number};

export type LongX = {
  tod: number;          // 0 dawn → 1 night
  mist: number;         // prologue fog
  rain: number;         // 0..1 rain intensity
  cloudDark: number;    // storm cloud cover
  rainbow: number;      // 0..1
  lampOn: number;       // 0..1 lamp glow
  card: number[];       // act title card alphas (7)
  credit: number;       // epilogue credits alpha
  // guests & props
  turtle: Guest;
  ducks: Guest[];       // 3 pond ducks
  duckling: Guest;
  frog: Guest;
  frogHop: number;
  kite: Guest & {slack: number};
  ball: Guest & {spin: number};
  bone: Guest;
  bread: Guest;
  picnic: number;       // blanket+basket+food visibility 0..1
  butterfly2: Guest;    // the one that lands on the dog's nose
  birdPerch: Guest;
  shoot: number;        // shooting-star progress 0..1 (0 = off)
  snail: Guest;
};

export const g = (x: number, y: number, r = 0, s = 1, o = 0): Guest => ({x, y, r, s, o});

export function createLongX(): LongX {
  return {
    tod: 0,
    mist: 0.85,
    rain: 0,
    cloudDark: 0,
    rainbow: 0,
    lampOn: 0,
    card: [0, 0, 0, 0, 0, 0, 0],
    credit: 0,
    turtle: g(1780, 962, 0, 2.2, 0),
    ducks: [g(1760, 866, 0, 1.6, 0), g(1880, 884, 0, 1.35, 0), g(1660, 888, 0, 1.2, 0)],
    duckling: g(1800, 880, 0, 1.0, 0),
    frog: g(1720, 892, 0, 1.2, 0),
    frogHop: 0,
    kite: {...g(900, 300, 0, 2.2, 0), slack: 0.4},
    ball: {...g(1100, 880, 0, 1.6, 0), spin: 0},
    bone: g(0, 0, 0, 1.4, 0),
    bread: g(0, 0, 0, 1.2, 0),
    picnic: 0,
    butterfly2: g(0, 0, 0, 1.1, 0),
    birdPerch: g(0, 0, 0, 1.2, 0),
    shoot: 0,
    snail: g(500, 940, 0, 1.6, 0),
  };
}

/** Act start times (seconds) — the narrative map of the 10-minute film. */
export const ACT = {
  prologue: 0,
  arrival: 45,
  pond: 135,
  kite: 240,
  rain: 330,
  picnic: 420,
  dusk: 510,
  epilogue: 580,
  end: 600,
};

export const ACT_TITLES: Array<[number, string, string]> = [
  [ACT.prologue + 6, 'early morning', 'the park is still asleep'],
  [ACT.arrival + 4, 'chapter one', 'a girl and her dog'],
  [ACT.pond + 4, 'chapter two', 'the pond'],
  [ACT.kite + 4, 'chapter three', 'the wind'],
  [ACT.rain + 4, 'chapter four', 'the rain'],
  [ACT.picnic + 4, 'chapter five', 'a little feast'],
  [ACT.dusk + 4, 'chapter six', 'going home'],
];
