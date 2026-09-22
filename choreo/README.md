# Choreo

**An animation format an AI can author reliably — and that proves it matches the spec.**

Choreo is a small, semantic DSL for web animation. You describe *what* should
happen ("the badge pops as the checkmark draws on, then the label slides up"),
and Choreo compiles it to self-contained SVG + CSS. The catch that makes it
different: **every Choreo program carries its own spatio-temporal checks, and a
verifier proves the rendered animation actually satisfies them.**

Existing tools (GSAP, Motion, Lottie, Rive) are excellent at letting *humans*
author animation. Choreo targets a different problem:

- **Authorable by an agent, not a person.** A bounded grammar an LLM hits
  reliably from a spec — no timeline scrubbing, no coordinate math.
- **It checks itself.** The animation ships with assertions like
  `during 0..500 : fadesIn(card)` and `at end : settled(all)`, and
  [`@choreo-oss/verify`](verify/) confirms them against the *rendered trace* — the
  actual pixels over time, not the source.

That verification is the part nothing else does. Visual-regression tools
(Chromatic, Percy, Applitools) diff *screenshots*; they can tell you a frame
looks different, but not that "the toast still slides in **before** it fades and
settles by 1.2s." Choreo's verifier asserts motion *contracts*.

> **Why this matters for AI.** LLM animation synthesis is right ~59% of the time
> unaided; a formal verify-and-correct loop lifts it to ~94%
> ([MoVer, SIGGRAPH 2025](https://dl.acm.org/)). Choreo is that loop, packaged:
> a substrate an agent can generate *and* a checker that catches when it's wrong.

## A Choreo program

```choreo
scene "signup-success" size 800x450 duration 2600ms background #f1f5f9

entities
  card  = rect 320x220 fill #ffffff radius 12
  ring  = circle 30 stroke #16a34a stroke-width 4
  tick  = path "M8 16 L14 22 L24 10" size 32x32 stroke #16a34a stroke-width 4
  label = text "Account created" size 18 weight 600 color #0f172a

layout
  center card
  inside ring card top 36
  center tick in ring
  below label ring gap 18

motion
  seq
    fadeIn card 500ms easeOut
    par
      pop ring 400ms
      drawOn tick 450ms easeOut
    slideIn label from bottom 10 400ms easeOut

checks
  during 0..500   : fadesIn(card)
  during 500..900 : grows(ring) and fadesIn(ring)
  at 1800         : below(label, ring)
  always          : inside(ring, card) and inside(label, card)
  at end          : settled(all)
```

```bash
cd lang
node src/cli.mjs examples/signup-success.choreo -o out --verify
#  → out/signup-success.html      a self-contained animation
#  → out/signup-success.spec.mjs  the checks block, as a verifier spec
#  → runs @choreo-oss/verify: 19/19 checks passed
```

## Repository

| Package | What it is |
|---|---|
| [`lang/`](lang/) | The Choreo DSL — parser, compiler to SVG + CSS, `checks` → verifier spec |
| [`verify/`](verify/) | `@choreo-oss/verify` — samples a rendered animation trace (Playwright) and asserts spatio-temporal predicates. **Works on any web animation** — CSS, GSAP, Motion, Remotion renders — because it verifies traces, not source. |
| [`bench/`](bench/) | A cross-framework benchmark: can an LLM author a correct animation, and does the substrate matter? Same briefs, four conditions (raw CSS / WAAPI / GSAP / Choreo), judged by `@choreo-oss/verify` as a neutral referee. |

## The verifier, standalone

`@choreo-oss/verify` is useful on its own, against animations you didn't write in Choreo:

```js
export default {
  name: 'signup-flow',
  target: 'file:///…/signup-flow.html',   // any URL, file, or inline HTML
  duration: 2600,
  entities: { toast: '#toast', msg: '#msg' },
  checks: [
    { during: [0, 400], assert: ['movesLeft(toast)', 'fadesIn(toast)'] },
    { at: 1200,          assert: ['visible(toast)', 'inside(msg, toast)'] },
    { atEnd: true,       assert: ['fadedOut(toast)'] },
  ],
};
```

```bash
cd verify && npm install
npm run demo          # 19/19 checks pass on examples/signup-flow.html
npm run demo:broken   # 12/19 — catches 3 planted regressions, with frames, exit 1
```

## Status

Choreo is a **research artifact, released as-is** — it began as an internal
probe into whether a verifiable DSL is the right substrate for AI-generated
animation. It is not a supported product; there is no roadmap commitment and no
support SLA. Issues and PRs are welcome, but treat it as a foundation to build
on, not a maintained service.

## License

[MIT](LICENSE). Note the benchmark vendors GSAP under GreenSock's own license —
see [`NOTICE`](NOTICE).
