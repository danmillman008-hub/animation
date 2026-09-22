# @choreo-oss/verify

Spatio-temporal verification for web animations. Sample an animation's rendered
trace with Playwright, assert first-order predicates over it, and get an
agent-readable failure report with captured frames.

**Why:** LLM animation synthesis is right ~59% of the time unaided; a formal
verify-and-correct loop lifts it to ~94% (MoVer, SIGGRAPH 2025). This is the
verifier half of that loop — and it works against **any** animation
(hand-written CSS, GSAP, Motion, Remotion renders), because it verifies
**rendered traces, not source code**. Screenshot-diff tools can tell you a frame
looks different; this tells you "the toast moved left *before* it faded and
settled by 1.2s."

## Quick start

```bash
cd verify && npm install
npx playwright install chromium
npm run demo          # 19/19 checks pass on examples/signup-flow.html
npm run demo:broken   # 12/19 — catches 3 planted regressions, exit 1
```

## Usage

A spec file default-exports a config (or array of configs):

```js
export default {
  name: 'signup-flow',
  target: 'file:///…/signup-flow.html',      // or http://…, or { html: '…' }
  entities: { card: '#card', check: '#check', label: '#label' },  // name → CSS selector
  duration: 2400,                             // ms of timeline to sample
  fps: 30,
  mode: 'seek',                               // 'seek' (default) | 'realtime'
  setup: `window.app.start();`,               // optional JS run after load,
                                              // before sampling — trigger any
                                              // beat API / stepper here
  checks: [
    { at: 100,             assert: ['hidden(check)', 'hidden(label)'] },
    { during: [600, 1000], assert: ['grows(check)', 'fadesIn(check)'] },
    { at: 1500,            assert: ['below(label, check)'] },
    { always: true,        assert: ['inside(check, card)'] },
    { atEnd: true,         assert: ['settled(all)'] },
  ],
};
```

```bash
node src/cli.mjs my.spec.mjs          # human-readable, exit 0/1
node src/cli.mjs my.spec.mjs --json   # full JSON report to stdout
```

Reports also land in `.choreo/<name>.report.json`; failing checks capture a PNG
frame at the failing timestamp in `.choreo/frames/` (seek mode only).

## Predicates

**State** (evaluated at a sampled instant; under `during`/`always` they must
hold at *every* sample):
`visible` `hidden` `fadedIn` `fadedOut` `leftOf` `rightOf` `above` `below`
`inside` `overlaps` `notOverlapping` `onScreen`

**Motion** (evaluated over a time window; require `during`/`always`/`atEnd`):
`movesRight` `movesLeft` `movesUp` `movesDown` `grows` `shrinks` `fadesIn`
`fadesOut` `settled` `stationary`

`all` fans a single-arg predicate over every declared entity: `settled(all)`.

Scopes: `{ at: t }`, `{ during: [t1, t2] }`, `{ always: true }` (whole
duration), `{ atEnd: true }` (last sample; motion predicates use the trailing
300ms window).

## Sampling modes

- **`seek`** — pauses everything `document.getAnimations({subtree:true})`
  returns (CSS Animations/Transitions + WAAPI) and steps virtual time.
  Deterministic; enables failure-frame capture by re-seeking.
- **`realtime`** — wall-clock rAF sampling for JS-driven animations
  (rAF tickers, GSAP-core without WAAPI). Non-deterministic; no frames.

## Known limitations

- Seek mode misses animations that *start later via JS* (only animations alive
  at pause time are controlled). Use `realtime` for those.
- Effective opacity multiplies ancestor computed opacities; filters, masks,
  clip-paths, and blend modes are not modeled (bbox + opacity only — no pixel
  diffing).
- SVG sub-element bboxes come from `getBoundingClientRect` (post-transform
  screen box) — fine for containment/motion, but stroke-only draw-on progress
  (dashoffset) is invisible to it.
- `settled` checks both per-frame and net-over-window deltas.
- One frame per failing check, at the first failing timestamp.

## Design notes

- Trace sampler + 20+ predicates.
- Catches planted regressions with agent-usable structured reports
  (`examples/demo-broken.spec.mjs`: timing, containment, and completion bugs all
  caught, each with actual values, a fix suggestion, and a frame).
- Substrate-independent: because it verifies the rendered trace, the same spec
  checks a hand-written CSS animation, a GSAP timeline, or a Choreo-compiled
  artifact — see [`../bench/`](../bench/), which uses this verifier as a
  framework-neutral referee across four authoring conditions.
