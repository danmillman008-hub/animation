#!/usr/bin/env node
// choreo-verify <spec.mjs> [--json]
//
// A spec file default-exports one verify() config or an array of them.
// Exit code 0 iff every check in every spec passes.

import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import { verify } from './index.mjs';

const GREEN = '\x1b[32m', RED = '\x1b[31m', DIM = '\x1b[2m', BOLD = '\x1b[1m', RESET = '\x1b[0m';

function printReport(r) {
  const badge = r.pass ? `${GREEN}PASS${RESET}` : `${RED}FAIL${RESET}`;
  console.log(`\n${BOLD}${r.name}${RESET} ${badge} ${DIM}(${r.mode} mode, ${r.animationsDetected} animations, ${r.samples} samples over ${r.duration}ms)${RESET}`);
  for (const c of r.checks) {
    if (c.pass) {
      console.log(`  ${GREEN}✓${RESET} ${DIM}[${c.scope}]${RESET} ${c.assertion}`);
    } else {
      console.log(`  ${RED}✗${RESET} ${DIM}[${c.scope}]${RESET} ${c.assertion}`);
      console.log(`      ${RED}actual:${RESET} ${c.actual}${c.at !== undefined ? ` ${DIM}(t=${c.at}ms)${RESET}` : ''}`);
      if (c.suggestion) console.log(`      ${DIM}fix: ${c.suggestion}${RESET}`);
      if (c.frame) console.log(`      ${DIM}frame: ${c.frame}${RESET}`);
    }
  }
}

async function main() {
  const args = process.argv.slice(2).filter((a) => a !== '--json');
  const asJson = process.argv.includes('--json');
  if (args.length !== 1) {
    console.error('usage: choreo-verify <spec.mjs> [--json]');
    process.exit(2);
  }
  const specPath = path.resolve(args[0]);
  const mod = await import(pathToFileURL(specPath).href);
  const specs = Array.isArray(mod.default) ? mod.default : [mod.default];

  const reports = [];
  for (const spec of specs) reports.push(await verify(spec));

  if (asJson) console.log(JSON.stringify(reports, null, 2));
  else reports.forEach(printReport);

  const ok = reports.every((r) => r.pass);
  if (!asJson) {
    const total = reports.reduce((n, r) => n + r.checks.length, 0);
    const failed = reports.reduce((n, r) => n + r.checks.filter((c) => !c.pass).length, 0);
    console.log(`\n${failed === 0 ? GREEN : RED}${BOLD}${total - failed}/${total} checks passed${RESET}\n`);
  }
  process.exit(ok ? 0 : 1);
}

main().catch((err) => { console.error(err); process.exit(2); });
