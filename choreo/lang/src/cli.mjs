#!/usr/bin/env node
// choreoc <scene.choreo> [-o outdir] [--verify]
//
// Compiles a .choreo scene to:
//   <outdir>/<name>.html      self-contained SVG+CSS animation
//   <outdir>/<name>.spec.mjs  @choreo-oss/verify spec (the scene's checks block)
// --verify then runs the verifier on the generated spec (exit code passes through).

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { compile } from './compile.mjs';
import { generateHtml, generateSpec } from './codegen.mjs';

function main() {
  const args = process.argv.slice(2);
  const doVerify = args.includes('--verify');
  const rest = args.filter((a) => a !== '--verify');
  let outDir = null;
  const oi = rest.indexOf('-o');
  if (oi >= 0) { outDir = rest[oi + 1]; rest.splice(oi, 2); }
  if (rest.length !== 1) {
    console.error('usage: choreoc <scene.choreo> [-o outdir] [--verify]');
    process.exit(2);
  }
  const srcPath = path.resolve(rest[0]);
  outDir = path.resolve(outDir ?? path.dirname(srcPath));

  const source = fs.readFileSync(srcPath, 'utf8');
  let compiled;
  try {
    compiled = compile(source);
  } catch (e) {
    console.error(`choreoc: ${path.basename(srcPath)}: ${e.message}`);
    process.exit(2);
  }

  const name = compiled.ast.scene.name.replace(/[^A-Za-z0-9_-]+/g, '-');
  fs.mkdirSync(outDir, { recursive: true });
  const htmlFile = `${name}.html`;
  fs.writeFileSync(path.join(outDir, htmlFile), generateHtml(compiled));
  const specFile = path.join(outDir, `${name}.spec.mjs`);
  fs.writeFileSync(specFile, generateSpec(compiled, htmlFile));

  console.log(`choreoc: ${compiled.ast.entities.length} entities, ${compiled.instances.length} verb instances, ` +
    `timeline ${compiled.timelineEnd}ms (scene duration ${compiled.duration}ms), ${compiled.ast.checks.length} checks`);
  console.log(`  → ${path.join(outDir, htmlFile)}`);
  console.log(`  → ${specFile}`);

  if (doVerify) {
    // Resolve @choreo-oss/verify's CLI via package resolution first (works when
    // installed standalone from npm, incl. pnpm's symlinked layout); fall back to
    // the sibling path for the in-repo / monorepo layout.
    let verifyCli;
    try {
      verifyCli = fileURLToPath(import.meta.resolve('@choreo-oss/verify/cli'));
    } catch {
      verifyCli = fileURLToPath(new URL('../../verify/src/cli.mjs', import.meta.url));
    }
    const r = spawnSync('node', [verifyCli, specFile], { stdio: 'inherit' });
    process.exit(r.status ?? 2);
  }
}

main();
