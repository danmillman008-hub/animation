/** Time-of-day palettes for the 10-minute film: dawn → morning → noon → golden → dusk → night.
 *  `tod` runs 0..1 across the film; colours are piecewise-lerped between these keys. */
export type SkySet = {
  skyTop: string; skyMid: string; skyLow: string; horizon: string;
  grass: string; grassDark: string; grassLit: string; path: string; pathShade: string;
  canopy: string; canopyDark: string; canopyLit: string;
  light: string;   // ambient tint overlay colour
  lightOp: number; // ambient tint strength
  night: number;   // 0..1 star/moon/lamp factor
};

const K: Array<[number, SkySet]> = [
  [0.0, { // dawn
    skyTop: '#2b3a67', skyMid: '#7a6ba8', skyLow: '#f2b28c', horizon: '#ffd9a0',
    grass: '#5d8f57', grassDark: '#43704a', grassLit: '#7fae6d', path: '#d9c39a', pathShade: '#b99f78',
    canopy: '#5f9e57', canopyDark: '#417a44', canopyLit: '#8cc474',
    light: '#ff9a5c', lightOp: 0.16, night: 0.55,
  }],
  [0.14, { // morning
    skyTop: '#59b7e8', skyMid: '#a5dcf5', skyLow: '#dff3fb', horizon: '#fff2d8',
    grass: '#69a844', grassDark: '#4c8a3d', grassLit: '#8cc474', path: '#e8d4ac', pathShade: '#c9b189',
    canopy: '#69b04f', canopyDark: '#4a8a3c', canopyLit: '#98d073',
    light: '#ffd9a0', lightOp: 0.06, night: 0,
  }],
  [0.42, { // noon
    skyTop: '#3fa9e8', skyMid: '#8ed4f5', skyLow: '#e8f7fb', horizon: '#fffbe8',
    grass: '#6fb04a', grassDark: '#529441', grassLit: '#93cc78', path: '#ecd8b0', pathShade: '#cdb58d',
    canopy: '#6fb853', canopyDark: '#4f9240', canopyLit: '#9ed878',
    light: '#ffffff', lightOp: 0.02, night: 0,
  }],
  [0.66, { // golden hour
    skyTop: '#4f8ecb', skyMid: '#f5b57a', skyLow: '#ffd9a0', horizon: '#ffe9c4',
    grass: '#7ba24b', grassDark: '#5b8039', grassLit: '#a3c46b', path: '#e8c896', pathShade: '#c4a276',
    canopy: '#7ba84f', canopyDark: '#588438', canopyLit: '#b3cc6b',
    light: '#ff9a3c', lightOp: 0.16, night: 0,
  }],
  [0.82, { // dusk
    skyTop: '#35406e', skyMid: '#8a6ba0', skyLow: '#e8927a', horizon: '#ffc48c',
    grass: '#567f4a', grassDark: '#3d6340', grassLit: '#74a061', path: '#cfae88', pathShade: '#a98d6c',
    canopy: '#55854d', canopyDark: '#3c6840', canopyLit: '#7bab66',
    light: '#ff7a4c', lightOp: 0.2, night: 0.35,
  }],
  [1.0, { // night
    skyTop: '#0b1026', skyMid: '#1b2440', skyLow: '#2e3a5c', horizon: '#46527a',
    grass: '#2e4a34', grassDark: '#1f3626', grassLit: '#3f5c40', path: '#8a7a5e', pathShade: '#6b5c46',
    canopy: '#2c4a34', canopyDark: '#1d3526', canopyLit: '#3c5c40',
    light: '#1b2440', lightOp: 0.3, night: 1,
  }],
];

const hx = (c: string): [number, number, number] => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
const mix = (a: string, b: string, t: number): string => {
  const A = hx(a), B = hx(b);
  const o = A.map((v, i) => Math.round(v + (B[i] - v) * t));
  return `#${o.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
};
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export function skyAt(tod: number): SkySet {
  const t = Math.min(1, Math.max(0, tod));
  for (let i = 0; i < K.length - 1; i++) {
    if (t <= K[i + 1][0]) {
      const [t0, a] = K[i];
      const [t1, b] = K[i + 1];
      const u = (t - t0) / (t1 - t0);
      const out = {} as SkySet;
      (Object.keys(a) as Array<keyof SkySet>).forEach((k) => {
        if (typeof a[k] === 'number') (out as any)[k] = lerp(a[k] as number, b[k] as number, u);
        else (out as any)[k] = mix(a[k] as string, b[k] as string, u);
      });
      return out;
    }
  }
  return K[K.length - 1][1];
}
