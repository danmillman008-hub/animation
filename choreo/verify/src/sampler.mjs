// Playwright trace sampler for @choreo-oss/verify (Phase 0).
//
// Two modes:
//  - 'seek'    (default): pause every document animation (CSS Animations,
//               CSS Transitions, WAAPI — anything getAnimations() sees) and
//               step virtual time deterministically. Reproducible, and lets us
//               re-seek to any failing timestamp for a screenshot.
//  - 'realtime': wall-clock rAF sampling for JS-driven (non-WAAPI) animations.
//               Non-deterministic; failure frames unavailable.

import { chromium } from 'playwright';

const MEASURE_FN = `(entities) => {
  function effectiveOpacity(el) {
    let o = 1, n = el;
    while (n && n.nodeType === 1) {
      const cs = getComputedStyle(n);
      if (cs.display === 'none' || cs.visibility === 'hidden') return { o: 0, hidden: true };
      o *= parseFloat(cs.opacity || '1');
      n = n.parentElement;
    }
    return { o, hidden: false };
  }
  const out = {};
  for (const [name, selector] of Object.entries(entities)) {
    const el = document.querySelector(selector);
    if (!el) { out[name] = null; continue; }
    const r = el.getBoundingClientRect();
    const { o, hidden } = effectiveOpacity(el);
    out[name] = {
      x: r.x, y: r.y, w: r.width, h: r.height,
      cx: r.x + r.width / 2, cy: r.y + r.height / 2,
      area: r.width * r.height,
      opacity: hidden ? 0 : o,
      // one-dimensional geometry (SVG lines/arrows) has a zero-height bbox
      // but is still visible — require size on at least one axis
      visible: !hidden && (r.width > 0 || r.height > 0),
    };
  }
  return out;
}`;

export async function openTarget({ target, viewport = { w: 1280, h: 720 }, headless = true }) {
  const browser = await chromium.launch({ headless });
  const page = await browser.newPage({ viewport: { width: viewport.w, height: viewport.h } });
  if (typeof target === 'object' && target.html) {
    await page.setContent(target.html, { waitUntil: 'load' });
  } else {
    await page.goto(target, { waitUntil: 'load' });
  }
  await page.evaluate(() => document.fonts?.ready);
  return { browser, page };
}

async function pauseAllAnimations(page) {
  return page.evaluate(() => {
    const anims = document.getAnimations({ subtree: true });
    for (const a of anims) a.pause();
    return anims.length;
  });
}

async function seekTo(page, t) {
  await page.evaluate((time) => {
    for (const a of document.getAnimations({ subtree: true })) {
      a.pause();
      // Clamp within each animation's own active window so fill modes behave.
      try { a.currentTime = time; } catch { /* infinite/negative timelines */ }
    }
  }, t);
}

export async function sampleTrace(config) {
  const { entities, duration, fps = 30, mode = 'seek', viewport = { w: 1280, h: 720 }, setup } = config;
  const { browser, page } = await openTarget({ ...config, viewport });
  // Optional setup script: trigger the animation (beat APIs, steppers, clicks)
  // after load, before sampling. String of JS statements evaluated in page
  // context; may schedule later beats with setTimeout (realtime mode samples
  // wall-clock). Wrapped so the return value is discarded — library calls can
  // return huge cyclic objects (e.g. a GSAP timeline) whose serialization back
  // to Node would hang the evaluate forever.
  //
  // Seek mode runs setup here (before pausing). Realtime mode instead runs it
  // INSIDE the sampling evaluate, atomically with the t=0 sample — a separate
  // round-trip would put ~20-30ms of animation progress before the first
  // sample, making t=0 assertions unfairly unsatisfiable.
  if (setup && mode === 'seek') await page.evaluate(`(() => { ${setup}\n; return undefined; })()`);
  const dt = 1000 / fps;
  const times = [];
  for (let t = 0; t <= duration + 0.001; t += dt) times.push(Math.round(t * 100) / 100);
  if (times[times.length - 1] < duration) times.push(duration);

  let trace;
  let animCount = 0;
  try {
    if (mode === 'seek') {
      animCount = await pauseAllAnimations(page);
      trace = [];
      for (const t of times) {
        await seekTo(page, t);
        const entitiesAtT = await page.evaluate(`(${MEASURE_FN})(${JSON.stringify(entities)})`);
        trace.push({ t, entities: entitiesAtT, viewport });
      }
    } else {
      trace = await page.evaluate(
        ({ measureSrc, ents, times: ts, vp, setupSrc }) => new Promise((resolve) => {
          const measure = eval(measureSrc);
          if (setupSrc) new Function(setupSrc)();
          const out = [];
          const start = performance.now();
          // synchronous t=0 sample, atomically after setup — no rAF latency
          while (out.length < ts.length && ts[out.length] <= 0) {
            out.push({ t: ts[out.length], entities: measure(ents), viewport: vp });
          }
          function tick() {
            const elapsed = performance.now() - start;
            while (out.length < ts.length && ts[out.length] <= elapsed) {
              out.push({ t: ts[out.length], entities: measure(ents), viewport: vp });
            }
            if (out.length >= ts.length) return resolve(out);
            requestAnimationFrame(tick);
          }
          requestAnimationFrame(tick);
        }),
        { measureSrc: `(${MEASURE_FN})`, ents: entities, times, vp: viewport, setupSrc: setup ?? null },
      );
    }
  } finally {
    if (mode !== 'seek') await browser.close();
  }

  // In seek mode keep the session open so the caller can capture failure frames.
  return {
    trace,
    animCount,
    mode,
    captureFrame: mode === 'seek'
      ? async (t, path) => { await seekTo(page, t); await page.screenshot({ path }); }
      : null,
    close: async () => { await browser.close(); },
  };
}
