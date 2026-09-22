import { pathToFileURL } from 'node:url';
import path from 'node:path';

const here = path.dirname(new URL(import.meta.url).pathname);

const shared = {
  entities: {
    card: '#card',
    check: '#check',
    label: '#label',
    sub: '#sub',
  },
  duration: 2400,
  fps: 30,
  outDir: path.join(here, '..', '.choreo'),
  checks: [
    // entrance ordering
    { at: 100, assert: ['hidden(check)', 'hidden(label)', 'hidden(sub)'] },
    { during: [600, 1000], assert: ['grows(check)', 'fadesIn(check)'] },
    { at: 950, assert: ['hidden(label)'] }, // label must not lead the check
    { during: [1000, 1400], assert: ['fadesIn(label)', 'movesUp(label)'] },
    { during: [1400, 1800], assert: ['fadesIn(sub)'] },
    // layout invariants
    { at: 1500, assert: ['below(label, check)', 'below(sub, label)'] },
    { always: true, assert: ['inside(check, card)', 'inside(label, card)', 'inside(sub, card)'] },
    // completion
    { atEnd: true, assert: ['fadedIn(card)', 'fadedIn(check)', 'fadedIn(label)', 'fadedIn(sub)', 'settled(all)'] },
  ],
};

export default {
  ...shared,
  name: 'signup-flow',
  target: pathToFileURL(path.join(here, 'signup-flow.html')).href,
};

export const spec = shared;
