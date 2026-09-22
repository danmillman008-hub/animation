#!/usr/bin/env node
// Choreo bench harness — verify benchmark artifacts against each brief's
// shared checks.json using @choreo-oss/verify as the framework-neutral referee.
//
//   node harness.mjs run <brief> <condition>   verify one artifact
//   node harness.mjs all                        verify every artifact present,
//                                               write runs/results.json + report table
//
// Conditions: raw | waapi | gsap  (artifact.html, seek mode; gsap = realtime)
//             choreo              (artifact.choreo, compiled first, seek mode)

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { verify } from '../verify/src/index.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CONDITIONS = ['raw', 'waapi', 'gsap', 'choreo'];
const MODE = { raw: 'seek', waapi: 'seek', gsap: 'realtime', choreo: 'seek' };

function briefs() {
  return fs.readdirSync(path.join(HERE, 'briefs')).filter((d) => fs.existsSync(path.join(HERE, 'briefs', d, 'checks.json'))).sort();
}

function withTimeout(promise, ms, label) {
  let timer;
  return Promise.race([
    promise.finally(() => clearTimeout(timer)),
    new Promise((_, rej) => { timer = setTimeout(() => rej(new Error(`timeout after ${ms}ms: ${label}`)), ms); }),
  ]);
}

async function runOne(brief, cond) {
  const checksPath = path.join(HERE, 'briefs', brief, 'checks.json');
  const spec = JSON.parse(fs.readFileSync(checksPath, 'utf8'));
  const dir = path.join(HERE, 'runs', brief, cond);
  const result = { brief, cond, status: 'missing', passed: 0, total: spec.checks.reduce((n, c) => n + c.assert.length, 0), bytes: 0, failures: [] };

  let htmlPath;
  let srcPath;
  if (cond === 'choreo') {
    srcPath = path.join(dir, 'artifact.choreo');
    if (!fs.existsSync(srcPath)) return result;
    result.bytes = fs.statSync(srcPath).size;
    const cc = spawnSync('node', [path.join(HERE, '..', 'lang', 'src', 'cli.mjs'), srcPath, '-o', dir], { encoding: 'utf8' });
    if (cc.status !== 0) {
      result.status = 'compile-error';
      result.failures = [{ assertion: '(compile)', actual: (cc.stderr || cc.stdout || '').trim().slice(0, 400) }];
      return result;
    }
    const html = fs.readdirSync(dir).find((f) => f.endsWith('.html'));
    htmlPath = path.join(dir, html);
  } else {
    htmlPath = path.join(dir, 'artifact.html');
    srcPath = htmlPath;
    if (!fs.existsSync(htmlPath)) return result;
    result.bytes = fs.statSync(htmlPath).size;
  }

  const report = await withTimeout(verify({
    name: `${brief}-${cond}`,
    target: pathToFileURL(htmlPath).href,
    mode: MODE[cond],
    // GSAP's ticker starts at script execution, before the load event our
    // realtime clock starts from — restart its global timeline at sampling
    // start so t=0 aligns (the realtime analogue of seek-mode determinism).
    ...(cond === 'gsap' ? { setup: 'if (window.gsap) gsap.globalTimeline.play(0);' } : {}),
    viewport: spec.viewport,
    duration: spec.duration,
    fps: 30,
    entities: spec.entities,
    checks: spec.checks,
    outDir: path.join(dir, '.choreo'),
  }), 120000, `${brief}/${cond}`).catch((e) => ({ pass: false, checks: [], animationsDetected: -1, error: e.message }));
  if (report.error) {
    result.status = 'harness-error';
    result.failures = [{ assertion: '(harness)', actual: report.error }];
    return result;
  }
  result.status = report.pass ? 'green' : 'fail';
  result.passed = report.checks.filter((c) => c.pass).length;
  result.animationsDetected = report.animationsDetected;
  result.failures = report.checks.filter((c) => !c.pass).map((c) => ({
    scope: c.scope, assertion: c.assertion, actual: c.actual, at: c.at, suggestion: c.suggestion, frame: c.frame,
  }));
  return result;
}

function table(results) {
  const lines = ['| brief | ' + CONDITIONS.join(' | ') + ' |', '|---|' + CONDITIONS.map(() => '---').join('|') + '|'];
  for (const b of briefs()) {
    const cells = CONDITIONS.map((c) => {
      const r = results.find((x) => x.brief === b && x.cond === c);
      if (!r || r.status === 'missing') return '—';
      if (r.status === 'compile-error') return '✗ compile';
      return `${r.status === 'green' ? '✅' : '✗'} ${r.passed}/${r.total}`;
    });
    lines.push(`| ${b} | ${cells.join(' | ')} |`);
  }
  // per-condition totals
  const tot = CONDITIONS.map((c) => {
    const rs = results.filter((x) => x.cond === c && x.status !== 'missing');
    const p = rs.reduce((n, r) => n + r.passed, 0), t = rs.reduce((n, r) => n + r.total, 0);
    const green = rs.filter((r) => r.status === 'green').length;
    const bytes = rs.length ? Math.round(rs.reduce((n, r) => n + r.bytes, 0) / rs.length) : 0;
    return `${green}/${rs.length} green · ${t ? Math.round((p / t) * 1000) / 10 : 0}% checks · ~${bytes}B avg`;
  });
  lines.push(`| **totals** | ${tot.join(' | ')} |`);
  return lines.join('\n');
}

async function main() {
  const [cmd, brief, cond] = process.argv.slice(2);
  if (cmd === 'run') {
    const r = await runOne(brief, cond);
    console.log(JSON.stringify(r, null, 2));
    process.exit(r.status === 'green' ? 0 : 1);
  }
  if (cmd === 'all') {
    const results = [];
    for (const b of briefs()) {
      for (const c of CONDITIONS) {
        const r = await runOne(b, c);
        results.push(r);
        console.log(`${b} × ${c}: ${r.status} ${r.status !== 'missing' ? `${r.passed}/${r.total}` : ''}`);
      }
    }
    fs.mkdirSync(path.join(HERE, 'runs'), { recursive: true });
    fs.writeFileSync(path.join(HERE, 'runs', 'results.json'), JSON.stringify(results, null, 2));
    console.log('\n' + table(results));
    return;
  }
  console.error('usage: node harness.mjs run <brief> <condition> | node harness.mjs all');
  process.exit(2);
}

main().catch((e) => { console.error(e); process.exit(2); });
