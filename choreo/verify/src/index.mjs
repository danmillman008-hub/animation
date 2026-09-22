// @choreo-oss/verify — Phase 0 spike.
//
// verify(config) -> report
//
// config = {
//   name: 'signup-flow',
//   target: 'file:///...html' | 'http://...' | { html: '<...>' },
//   entities: { card: '#card', check: '.check', ... },       // name -> CSS selector
//   duration: 4000,                                          // ms
//   fps: 30,                                                 // sampling rate
//   mode: 'seek' | 'realtime',                               // see sampler.mjs
//   viewport: { w: 1280, h: 720 },
//   outDir: '.choreo',                                       // failure frames + report.json
//   checks: [
//     { at: 0,              assert: ['hidden(check)'] },
//     { during: [600,1000], assert: ['grows(check)', 'fadesIn(check)'] },
//     { always: true,       assert: ['inside(check, card)'] },
//     { atEnd: true,        assert: ['settled(all)'] },
//   ],
// }

import fs from 'node:fs';
import path from 'node:path';
import { sampleTrace } from './sampler.mjs';
import { STATE_PREDICATES, MOTION_PREDICATES, TRACE_PREDICATES, parseAssertion } from './predicates.mjs';

const SETTLE_WINDOW_MS = 300;

function nearestSample(trace, t) {
  let best = trace[0];
  for (const s of trace) if (Math.abs(s.t - t) < Math.abs(best.t - t)) best = s;
  return best;
}

function windowOf(trace, t1, t2) {
  const win = trace.filter((s) => s.t >= t1 - 0.001 && s.t <= t2 + 0.001);
  if (win.length === 0) throw new Error(`no samples in window [${t1}, ${t2}]ms`);
  return win;
}

function expandArgs(args, entityNames) {
  // `all` fans a single-arg predicate out over every entity.
  if (args.length === 1 && args[0] === 'all') return entityNames.map((n) => [n]);
  return [args];
}

function scopeOf(check, duration) {
  if (check.trace) return { kind: 'trace', label: 'trace' };
  if (check.at !== undefined) return { kind: 'at', t: check.at, label: `at ${check.at}ms` };
  if (check.during) return { kind: 'during', t1: check.during[0], t2: check.during[1], label: `during ${check.during[0]}..${check.during[1]}ms` };
  if (check.always) return { kind: 'during', t1: 0, t2: duration, label: 'always' };
  if (check.atEnd) return { kind: 'atEnd', t: duration, label: 'at end' };
  throw new Error(`check needs one of: at, during, always, atEnd — got ${JSON.stringify(check)}`);
}

function evalAssertion(parsed, scope, trace, duration, entityNames) {
  if (scope.kind === 'trace' && parsed.kind !== 'trace') {
    throw new Error(`"${parsed.name}" is a ${parsed.kind} predicate — scope "trace" only accepts trace predicates (${Object.keys(TRACE_PREDICATES).join(', ')})`);
  }
  const results = [];
  for (const args of expandArgs(parsed.args, entityNames)) {
    if (parsed.kind === 'trace') {
      const fn = TRACE_PREDICATES[parsed.name];
      if (scope.kind !== 'trace') throw new Error(`trace predicate "${parsed.name}" needs scope "trace" — ${parsed.source}`);
      results.push({ args, t: trace[trace.length - 1].t, ...fn(trace, ...args) });
    } else if (parsed.kind === 'state') {
      const fn = STATE_PREDICATES[parsed.name];
      if (scope.kind === 'at' || scope.kind === 'atEnd') {
        const s = nearestSample(trace, scope.t);
        results.push({ args, t: s.t, ...fn(s, ...args) });
      } else {
        // state predicate over a window: must hold at every sample; report worst failure
        let firstFail = null;
        for (const s of windowOf(trace, scope.t1, scope.t2)) {
          const r = fn(s, ...args);
          if (!r.pass) { firstFail = { args, t: s.t, ...r }; break; }
        }
        results.push(firstFail ?? { args, t: scope.t2, pass: true, actual: `held at every sample in [${scope.t1}..${scope.t2}]ms` });
      }
    } else {
      const fn = MOTION_PREDICATES[parsed.name];
      let win;
      if (scope.kind === 'during') win = windowOf(trace, scope.t1, scope.t2);
      else if (scope.kind === 'atEnd') win = windowOf(trace, Math.max(0, duration - SETTLE_WINDOW_MS), duration);
      else throw new Error(`motion predicate "${parsed.name}" needs a time window (during/always/atEnd), not "at" — ${parsed.source}`);
      const r = fn(win, ...args);
      results.push({ args, t: win[win.length - 1].t, ...r });
    }
  }
  // aggregate fan-out (`all`): fail if any target fails
  const failed = results.filter((r) => !r.pass);
  return {
    assertion: parsed.source,
    pass: failed.length === 0,
    results,
    failure: failed[0] ?? null,
  };
}

export async function verify(config) {
  const { checks, duration, entities, name = 'animation', outDir = '.choreo' } = config;
  const entityNames = Object.keys(entities);
  const session = await sampleTrace(config);
  const { trace } = session;

  const checkResults = [];
  try {
    for (const check of checks) {
      const scope = scopeOf(check, duration);
      for (const a of check.assert) {
        const parsed = parseAssertion(a);
        let r;
        try {
          r = evalAssertion(parsed, scope, trace, duration, entityNames);
        } catch (err) {
          r = { assertion: a, pass: false, results: [], failure: { actual: `evaluation error: ${err.message}` } };
        }
        checkResults.push({ scope: scope.label, ...r });
      }
    }

    // capture one frame per failing check (seek mode only)
    const failures = checkResults.filter((c) => !c.pass);
    if (failures.length && session.captureFrame) {
      fs.mkdirSync(path.join(outDir, 'frames'), { recursive: true });
      for (const f of failures) {
        const t = f.failure?.t ?? duration;
        const frame = path.join(outDir, 'frames', `${name}-${String(t).replace('.', '_')}ms.png`);
        try { await session.captureFrame(t, frame); f.frame = frame; } catch { /* best effort */ }
      }
    }
  } finally {
    await session.close();
  }

  const report = {
    name,
    mode: session.mode,
    animationsDetected: session.animCount,
    samples: trace.length,
    duration,
    pass: checkResults.every((c) => c.pass),
    checks: checkResults.map((c) => ({
      scope: c.scope,
      assertion: c.assertion,
      pass: c.pass,
      ...(c.pass ? {} : {
        actual: c.failure?.actual,
        at: c.failure?.t,
        suggestion: c.failure?.suggestion ?? null,
        frame: c.frame ?? null,
      }),
    })),
  };

  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, `${name}.report.json`), JSON.stringify(report, null, 2));
  return report;
}
