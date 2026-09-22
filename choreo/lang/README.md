# @choreo-oss/lang — Phase 1 MVP

Choreo: a semantic, keyframe-sparse animation DSL for agents (and humans) that
compiles to self-contained SVG + CSS — and whose programs **carry their own
spatio-temporal checks**, compiled straight into a [@choreo-oss/verify](../verify/)
spec. Phase 1 MVP.

## Why (each design choice is evidence-backed — see the concept doc)

- **Semantic entities + relations, not coordinates** — LLMs understand
  high-level DSLs ~17+ points better than raw SVG (VGBench), and the gap grows
  with document length.
- **Keyframe-sparse motion verbs** — keyframe encodings are ~63% more
  token-efficient than dense ones (LottieGPT).
- **Checks in the program, enforced by the toolchain** — a verify-and-correct
  loop lifts LLM animation synthesis from ~59% → ~94% correct (MoVer).
- **Compiles to boring platform CSS** — individual transform properties
  (`translate`/`scale`/`rotate`), so concurrent verbs never fight over one
  `transform` string; `pathLength="1"` makes draw-on math trivial; output is
  deterministic under the verifier's seek mode.

## Usage

```bash
cd choreo/lang
node src/cli.mjs examples/signup-success.choreo -o out --verify
#  → out/signup-success.html      (self-contained animation)
#  → out/signup-success.spec.mjs  (the checks block as a verifier spec)
#  → runs @choreo-oss/verify: 19/19 checks passed

npm run examples   # compile + verify all three examples
```

No dependencies. The verifier (which needs Playwright) lives in `../verify/`.

## The language

See **[AGENTS.md](AGENTS.md)** — the complete authoring reference (grammar,
7 entity kinds, 7 layout relations, 12 verbs + `wait`, `seq`/`par`/`stagger`,
checks scopes and the 22 predicates). It is written to be sufficient for an
LLM agent with no other context; that sufficiency is part of the eval below.

```
scene "signup-success" size 800x450 duration 2600ms background #f1f5f9

entities
  card  = rect 320x220 fill #ffffff radius 12
  ring  = circle 30 stroke #16a34a stroke-width 4
  label = text "Account created" size 18 weight 600 color #0f172a

layout
  center card
  inside ring card top 36
  below label ring gap 18

motion
  seq
    fadeIn card 500ms easeOut
    pop ring 400ms
    slideIn label from bottom 10 400ms easeOut

checks
  at 100 : hidden(ring) and hidden(label)
  during 500..900 : grows(ring) and fadesIn(ring)
  always : inside(ring, card) and inside(label, card)
  at end : settled(all)
```

## Architecture

```
.choreo ──parse──▶ AST ──layout──▶ positions ──timeline──▶ timed verb instances
                                                   │
                        ┌──────────────────────────┴─────────────┐
                        ▼                                        ▼
              <name>.html                              <name>.spec.mjs
              SVG + CSS @keyframes                     @choreo-oss/verify spec
              (individual transform props,             (checks block, predicate
               fill:forwards, base-state styles)        names validated at
                                                        compile time against
                                                        the verifier's tables)
```

- `src/parse.mjs` — line/indent parser → AST (entities, layout, motion tree, checks)
- `src/layout.mjs` — ordered relational layout (center/inside/below/… → centers)
- `src/compile.mjs` — timeline resolution (`seq`/`par`/`stagger`/`wait`),
  verb→CSS mapping, cumulative-translate tracking for `move`/`slideOut`,
  compile-time check validation (imports the verifier's own predicate tables)
- `src/codegen.mjs` — SVG + CSS emission, verify-spec emission
- `src/cli.mjs` — `choreoc <scene> [-o dir] [--verify]`

## Phase 1 exit criteria (from the concept doc)

1. ✅ Scene + motion layers: 7 entity kinds, 12 verbs (+`wait`),
   `seq`/`par`/`stagger` combinators, relational layout, compile to SVG+CSS.
2. ✅ Checks layer wired to the Phase-0 verifier — compile-time predicate
   validation, generated specs, one-command compile+verify loop.
3. ✅ Three examples compile + verify green (19/19, 19/19, 16/16) and render
   correctly (visually confirmed).
4. Agent eval (AGENTS.md-only authoring, ≥90% target) — results recorded below.

### Agent eval results (2026-07-22, n=4)

Four independent agents, each given **only AGENTS.md** (examples/, src/, and
the verifier source explicitly off-limits) and a distinct functional brief
(confirmation card · staggered feature list · state-swap toast · move-along
sync flow). Scenes preserved in `out-eval/agent*/scene.choreo`.

| Agent | Brief | Compile 1st try | Verify 1st try | Iterations to green | Final |
|---|---|---|---|---|---|
| 1 | upload-complete card | ok | 19/19 | 0 | 19/19 |
| 2 | feature-list stagger | ok | 37/37 | 0 | 37/37 |
| 3 | error-recovery state swap | ok | 32/32 | 0 | 32/32 |
| 4 | sync-flow with move | ok | 20/21 | 1 | 22/22 |

- **Scene-level first-pass: 3/4 (75%). Check-level first-pass: 108/109
  (99.1%). With the verify loop — which is the product — 4/4 green within ≤1
  iteration (exit target: ≥90%).**
- All 4 agents reported the verifier's failure reports were sufficient to
  diagnose issues without any other context.
- Agent 4's single failure exposed a real verifier bug (zero-height SVG
  line bboxes could never satisfy `visible`) — fixed in @choreo-oss/verify and
  documented in AGENTS.md the same day. The eval loop improving the toolchain
  is the intended dynamic.
- Caveat: n=4, single model family, briefs authored by the toolchain's author.
  The rigorous cross-framework version is Phase 2.

## Known limitations (Phase 1)

- No groups/containers: entities are laid out relative to each other but move
  independently — exits that should move a "card and its contents" need a
  `par` of slideOuts. (Groups are the top Phase-2 language feature.)
- Text metrics are heuristic (~0.58×font-size/char) — the verifier is the
  safety net for containment around text.
- One `transform-origin: center` for all verbs; no per-verb origins.
- `slideOut`+`move` compose via cumulative-translate tracking, but rotate/scale
  do not accumulate across verbs (each verb's keyframes are absolute).
- No path morphing, no motion paths (`offset-path`), no loops/`repeat`, no
  scroll/interaction triggers. Straight-line `move` only.
- Layout is ordered assignment, not constraint solving — no overlap avoidance.
