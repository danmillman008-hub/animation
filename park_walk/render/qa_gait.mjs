/**
 * Headless gait QA — runs the GSAP master timeline in Node (no browser, no DOM) and
 * checks the things you can only measure: planted feet, cycle timing, NaNs, leash span.
 *
 *   node render/qa_gait.mjs
 */
import {build} from 'esbuild';
import {pathToFileURL} from 'node:url';
import path from 'node:path';

const outfile = path.resolve('render/.build/qa_entry.mjs');

await build({
  entryPoints: ['render/qa_entry.ts'],
  outfile,
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node18',
  logLevel: 'warning',
});

await import(pathToFileURL(outfile).href);
