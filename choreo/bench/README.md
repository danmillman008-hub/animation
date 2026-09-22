# choreo/bench — the cross-framework LLM animation benchmark (Phase 2)

The eval that (per the verified Phase-0 research) did not exist: **can an LLM
agent author a correct web animation, and does the authoring substrate
matter?** Same briefs, same acceptance checks, four frameworks — judged by
[@choreo-oss/verify](../verify/) as a **framework-neutral referee**, since it
verifies rendered traces rather than source code.

## Design

- **5 briefs** (`briefs/`): badge-pop, stagger-list, toast-lifecycle,
  sync-flow, scene-switch. Each fixes required element ids, an exact ms
  timeline, and a shared `checks.json` (16–20 assertions each: entrance order,
  motion direction, layout invariants, settledness).
- **4 conditions** (`conditions/`): `raw` (hand-written CSS animations, no JS),
  `waapi` (`element.animate` only), `gsap` (GSAP 3.15 timeline, vendored),
  `choreo` (the Choreo DSL, AGENTS.md as sole reference).
- **Protocol**: one agent per cell (20 total), authoring **blind** — single
  pass, no execution, no iteration, may read only its brief + condition rules
  (+ AGENTS.md for choreo). The harness then compiles (choreo) and verifies
  every artifact against the brief's shared checks. Verification modes: seek
  (deterministic virtual-time) for raw/waapi/choreo; realtime for gsap (its
  ticker is not WAAPI), with the GSAP clock aligned to the sampling clock.

```bash
node harness.mjs all                 # verify all 20 artifacts, print table
node harness.mjs run b1-badge-pop choreo
```

## Results (2026-07-22, single frontier model, 1 attempt/cell)

| brief | raw | waapi | gsap | choreo |
|---|---|---|---|---|
| b1-badge-pop | ✅ 16/16 | ✅ 16/16 | ✅ 16/16 | ✅ 16/16 |
| b2-stagger-list | ✅ 17/17 | ✅ 17/17 | ✅ 17/17 | ✅ 17/17 |
| b3-toast-lifecycle | ✅ 14/14 | ✅ 14/14 | ✅ 14/14 | ✅ 14/14 |
| b4-sync-flow | ✅ 17/17 | ✅ 17/17 | ✅ 17/17 | ✅ 17/17 |
| b5-scene-switch | ✅ 20/20 | ✅ 20/20 | ✅ 20/20 | ✅ 20/20 |
| **first-pass green** | 5/5 | 5/5 | 5/5 | 5/5 |
| **checks passed** | 100% | 100% | 100% | 100% |
| **avg artifact size** | 2,259 B | 2,730 B | 2,268 B | **1,182 B** |

### Findings — reported honestly, including against our own thesis

1. **Correctness ceiling at this complexity.** With explicit timelines, ~5
   elements, and required ids, a frontier model authors *correct* animations
   in every framework — raw CSS included (84/84 checks first-pass across
   conditions after harness-fairness fixes). The "raw formats are hard for
   LLMs" gap documented by VGBench/SVGEditBench **did not manifest at this
   tier**. Correctness alone does not justify a DSL for short, precisely-
   specified scenes.
2. **Token economy is where the substrate separates.** Choreo artifacts
   average **1,182 bytes vs 2,259–2,730** for the alternatives — ~48% smaller
   than the next smallest, ~2.3× smaller than WAAPI — *while also carrying an
   embedded checks block the HTML conditions don't have*. For agent pipelines
   that generate/edit many animations, that is the operative cost axis
   (consistent with LottieGPT's keyframe-compression finding).
3. **Verifying JS-ticker frameworks is its own contribution.** Two real
   harness findings from making GSAP verifiable at all:
   - Returning a GSAP timeline from a Playwright `evaluate` **hangs forever**
     (cyclic, DOM-referencing serialization) — setup scripts must discard
     return values.
   - Realtime verification needs the framework clock restarted **atomically
     with the t=0 sample** (setup executed inside the sampling evaluate);
     a separate round-trip puts ~20–30ms of animation progress before the
     first sample, making t=0 assertions unfairly unsatisfiable.
   CSS/WAAPI/Choreo get deterministic verification free via
   `getAnimations()` seek; GSAP required both fixes. "Verifiable by
   construction" is a real platform property, not a slogan.
4. **Where to look for correctness separation (Phase 2b):** harder tiers —
   more elements (10–25), longer multi-scene timelines, *vague* briefs
   (no explicit ms schedule — the agent must design one that still satisfies
   ordering checks), and edit tasks on existing artifacts (where SVGEditBench
   found models make files worse). That is where the literature predicts raw
   formats degrade first.

## Phase 2b results (2026-07-22, same protocol — harder tiers)

Three new tiers targeting where the literature predicts raw formats degrade:
**vague** (v1, v2 — no timeline given; the agent designs a schedule satisfying
schedule-agnostic `trace` checks like `appearsBefore(a, b)`), **complex**
(c1 — 13 elements, 5 phases, 32 assertions), and **edit** (e1, e2 — modify a
Phase-2 base artifact per a change request; the SVGEditBench scenario).

| brief | raw | waapi | gsap | choreo |
|---|---|---|---|---|
| v1-onboarding (vague, 8 el) | ✅ 24/24 | ✅ 24/24 | ✅ 24/24 | ✅ 24/24 |
| v2-notify (vague, 6 el) | ✅ 20/20 | ✅ 20/20 | ✅ 20/20 | ✅ 20/20 |
| c1-kpi-dashboard (complex, 13 el) | ✅ 32/32 | ✅ 32/32 | ✅ 32/32 | ✅ 32/32 |
| e1-reorder (edit) | ✅ 16/16 | ✅ 16/16 | ✅ 16/16 | ✅ 16/16 |
| e2-exit-down (edit) | ✅ 13/13 | ✅ 13/13 | ✅ 13/13 | ✅ 13/13 |

**All-tier totals (10 briefs × 4 conditions): 40/40 green, 100% checks in
every condition.**

Average artifact size by tier:

| tier | raw | waapi | gsap | choreo | choreo vs next-smallest |
|---|---|---|---|---|---|
| phase 2 (timed) | 2,259B | 2,730B | 2,268B | 1,182B | −48% |
| vague | 3,156B | 3,515B | 3,030B | 1,677B | −45% |
| complex (c1) | 3,958B | 3,708B | 4,114B | 3,180B | −14% |
| **edit (result)** | 2,331B | 2,794B | 2,136B | **797B** | **−63%** |

### Phase 2b findings

5. **The correctness ceiling extends through every 2b tier.** Vague briefs,
   13-element scenes, and edit tasks — all authored blind, all 100% first
   pass, in every framework. Notably the **edit tier directly contradicts
   SVGEditBench's 2025 finding** (models making files worse on edits): with a
   current frontier model and clean, structured base artifacts, edits were
   flawless even in raw CSS. Correctness separation, if it exists, lives above
   this complexity band (50+ elements, multi-scene narratives) or below this
   model tier — likely both.
6. **The size gap is largest exactly where it matters for agents: edits.**
   A Choreo edit result is 797B vs 2,136–2,794B — ~63% smaller — because
   editing a semantic source preserves its compactness, while editing HTML/JS
   means regenerating the whole sprawl. On the complex brief the gap narrows
   (−14%) partly because the Choreo artifact *carries a 32-assertion checks
   block* the HTML conditions don't.
7. **`trace` predicates make schedule-free specification practical** —
   `appearsBefore`/`everVisible` let acceptance criteria bind to *intent*
   (ordering) rather than a specific timeline, which is what real briefs from
   humans look like. Added to @choreo-oss/verify and the Choreo `checks` grammar
   in this phase.

### Limitations

- n=1 attempt per cell, single model family, briefs+checks authored by the
  Choreo toolchain's authors (conflict of interest mitigated but not removed
  by the neutral trace-based referee and by reporting the null result in #1).
- gsap verified in realtime mode (non-deterministic sampling) vs seek for the
  others; after clock alignment no flakiness was observed, but the asymmetry
  remains.
- Size ≠ tokens exactly (bytes/4 ≈ tokens is a rough proxy); no measurement
  yet of *edit* cost, which is where small semantic sources should win big.
- Remotion is not included: its frame-render model needs a Player-based
  sampling adapter — future work.

## Layout

```
briefs/<b>/brief.md        the task given to agents
briefs/<b>/checks.json     shared acceptance spec (the referee's input)
conditions/<c>.md          per-framework authoring rules given to agents
runs/<b>/<c>/artifact.*    the 20 blind-authored artifacts (committed as evidence)
runs/results.json          verification results
harness.mjs                compile (choreo) + verify + report table
assets/gsap.min.js         GSAP 3.15.0 (vendored for hermetic runs)
```
