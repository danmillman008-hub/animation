import {longScene, sampleLong, LFPS, LDUR} from '../src/long/longtimeline';
const t0 = Date.now();
const {tl} = longScene();
console.log('build ms', Date.now() - t0, '| children', tl.getChildren(false, true, true).length);
console.log('duration', tl.duration().toFixed(2), 'target', LDUR);
let bad = 0;
const seen = new Set<object>();
const scan = (o: any, depth = 0): void => {
  if (!o || typeof o !== 'object' || depth > 6 || seen.has(o)) return;
  seen.add(o);
  for (const k of Object.keys(o)) {
    if (k.startsWith('_')) continue;
    const v = o[k];
    if (typeof v === 'number' && !Number.isFinite(v)) { bad++; console.log('NaN at', k); }
    else if (typeof v === 'object') scan(v, depth + 1);
  }
};
for (let f = 0; f <= LFPS * LDUR; f += 24) scan(sampleLong(f, LFPS));
console.log('nan sweep frames', Math.ceil((LFPS * LDUR) / 24), 'bad', bad);
for (const f of [10, 60, 120, 200, 300, 400, 500, 600, 700, 900, 1100, 1300, 1400, 2600, 3600, 4600, 5600, 7000, 8600, 10000, 12000, 13500, 14390]) {
  const {s, x} = sampleLong(f, LFPS);
  console.log(
    String(f).padStart(5), (f / LFPS).toFixed(1).padStart(6),
    'h', s.human.x.toFixed(0).padStart(5), s.human.y.toFixed(0),
    'd', s.dog.x.toFixed(0).padStart(5),
    'tod', x.tod.toFixed(2), 'rain', x.rain.toFixed(2), 'dist', s.world.distance.toFixed(0).padStart(5),
    'card', x.card.map((c) => c.toFixed(1)).join(''),
  );
}
