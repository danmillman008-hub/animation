import {sampleLong, LFPS} from '../src/long/longtimeline';
for (const f of [3700, 3900, 4200]) {
  const {x} = sampleLong(f, LFPS);
  console.log(f, 'ducks', x.ducks.map((d) => `${d.x.toFixed(0)},${d.y.toFixed(0)},o${d.o.toFixed(2)},s${d.s}`).join(' | '), 'duckling', x.duckling.x.toFixed(0), x.duckling.o.toFixed(2), 'frog', x.frog.x.toFixed(0), x.frog.o.toFixed(2), 'turtle', x.turtle.x.toFixed(0), x.turtle.o.toFixed(2));
}
