import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { spec } from './demo.spec.mjs';

const here = path.dirname(new URL(import.meta.url).pathname);

// Same checks, pointed at the regressed variant — this run is EXPECTED to fail
// (exit 1) and demonstrates the structured failure report + captured frames.
export default {
  ...spec,
  name: 'signup-flow-broken',
  target: pathToFileURL(path.join(here, 'signup-flow-broken.html')).href,
};
