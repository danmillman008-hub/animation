# Choreo — agent authoring reference

Choreo is a declarative animation DSL. You write a `.choreo` scene; the compiler
emits a self-contained SVG+CSS HTML file **and** a verification spec compiled
from the scene's own `checks` block. You then run the verifier and fix anything
it flags — the failure report tells you what was wrong, where, and how to fix it.

## Workflow (always do all three steps)

```bash
# 1+2. compile and verify in one shot (from choreo/lang/):
node src/cli.mjs my-scene.choreo -o out --verify

# 3. if checks fail: read the report (actual values + fix suggestion + frame
#    PNG), fix the .choreo source, re-run. Repeat until green.
```

A failing check is *information*, not a dead end: it either means the motion is
wrong (fix the `motion`/`layout` block) or the assertion itself was mistaken
(fix the `checks` block — e.g. asserting `hidden(x)` at a time when x's
entrance has already begun).

## File structure

```
scene "name" size WxH [duration 2600ms] [background #f1f5f9]

entities
  <name> = <kind> <primary> [attr value]...

layout
  <one positioning statement per line, executed in order>

motion
  <timeline tree: seq / par / stagger blocks + verb lines, nested by indent>

checks
  <scope> : <assertion> [and <assertion>]...
```

- Comments: `//` to end of line. Blank lines ignored.
- Times: `400ms`, `0.6s`, or in `checks` bare numbers = ms.
- If `duration` is omitted it is computed from the timeline end. Declare it a
  bit longer than the timeline if you assert `settled(all)` `at end`.
- Names: `[A-Za-z_][A-Za-z0-9_]*`. Every entity becomes `id="<name>"` in the
  SVG, which is what checks refer to.

## Entities

| Kind | Form | Notes |
|---|---|---|
| rect | `card = rect 320x220 fill #fff radius 12` | |
| circle | `dot = circle 12 fill #34d399` | primary = radius |
| ellipse | `e = ellipse 40x24 fill #888` | primary = rx x ry |
| line | `rule = line 120 stroke #94a3b8 stroke-width 3` | horizontal, length 120 |
| arrow | `a1 = arrow 100 stroke #64748b` | line + arrowhead at right end |
| text | `label = text "Account created" size 18 weight 600 color #0f172a` | |
| path | `tick = path "M8 16 L14 22 L24 10" size 32x32 stroke #16a34a stroke-width 4` | `size WxH` required; d-coords live in a 0..W × 0..H local box |

Attributes: `fill`, `stroke`, `stroke-width`, `radius` (rect corner), `color`
(text), `size` (text font-size, or path WxH), `weight` (text), `font` (text),
`opacity`. Stroke-only circles: give `stroke` and no `fill` (fill defaults to
none when stroke is set on a circle).

Text sizes are estimated at compile time (~0.58 × font-size per char) — if a
containment check fails by a few px, adjust the layout gap/margins, not the text.

## Layout (statements run in order; later statements may reposition)

| Statement | Meaning |
|---|---|
| `center E` | center of scene |
| `center E in F` | center of F |
| `inside E F top 24` | inside F, anchored to top edge with 24px margin (`top/bottom/left/right/center`) |
| `below E F gap 12` | E below F, centers x-aligned (`above/leftOf/rightOf` similar; default gap 8) |
| `at E 120 80` | absolute center position |
| `offset E 0 30` | nudge after previous rules |

Everything defaults to scene center — always lay out every entity.
There are no groups/containers: moving a "card" does not move things laid out
on top of it; animate them together with `par`.

## Motion

Timeline tree. The `motion` section is an implicit `seq`. Blocks nest by
indentation:

```
motion
  seq
    fadeIn card 500ms easeOut
    par                      // children run simultaneously
      pop ring 400ms
      drawOn tick 450ms easeOut
    stagger 200ms            // like par, child i starts i*200ms late
      pop box1 350ms
      pop box2 350ms
    wait 300ms               // timing gap (seq only)
    fadeIn sub 400ms
```

### Verbs

| Verb | Form | Effect (CSS individual props → no transform conflicts) |
|---|---|---|
| fadeIn | `fadeIn E 400ms` | opacity 0→1; E starts hidden |
| fadeOut | `fadeOut E 400ms` | opacity 1→0 |
| slideIn | `slideIn E from bottom 10 400ms` | fade in + translate from offset (`top/bottom/left/right`, distance px); E starts hidden |
| slideOut | `slideOut E to right 60 350ms` | fade out + translate away |
| pop | `pop E 400ms` | scale .3→1 + fade in, springy default easing; E starts hidden |
| grow | `grow E to 1.3 400ms` | scale 1→factor (default 1.2) |
| shrink | `shrink E to 0.8 400ms` | scale 1→factor (default 0.8) |
| drawOn | `drawOn E 600ms` | stroke draws along its length (works on path/line/circle/rect with a stroke) |
| move | `move E by 40 -20 500ms` | translate by (dx, dy); consecutive moves accumulate |
| spin | `spin E 360 700ms` | rotate 0→deg |
| pulse | `pulse E 400ms` | scale 1→1.12→1 |
| wiggle | `wiggle E 500ms` | small rotate shake |

Easings: `linear ease easeIn easeOut easeInOut spring` (spring = overshoot).
Duration and easing are optional trailing tokens in either order.

An entity whose **first** verb is `fadeIn`/`slideIn`/`pop` is hidden until that
verb starts. An entity with no entrance verb is visible from t=0.
`drawOn` entities start with the stroke undrawn.

## Checks

```
checks
  at 0 : hidden(ring) and hidden(label)
  during 500..900 : grows(ring) and fadesIn(ring)
  at 1800 : below(label, ring)
  always : inside(ring, card)
  at end : fadedIn(card) and settled(all)
```

Scopes: `at <t>` (instant) · `during <t1>..<t2>` (window) · `always` (whole
scene) · `at end` · `trace` (whole-trace, schedule-agnostic). `and` chains
assertions.

**State predicates** (hold at an instant; under during/always must hold at
every sample): `visible hidden fadedIn fadedOut leftOf rightOf above below
inside overlaps notOverlapping onScreen`

**Motion predicates** (need a window — never use with `at <t>`; `at end` uses
the trailing 300ms): `movesRight movesLeft movesUp movesDown grows shrinks
fadesIn fadesOut settled stationary`

**Trace predicates** (only under the `trace :` scope; schedule-agnostic —
useful when no exact timeline is prescribed): `appearsBefore(a, b)` (a becomes
visible strictly before b) · `everVisible(a)`. Example:
`trace : appearsBefore(title, row1) and appearsBefore(row1, row2)`

`all` fans a single-arg predicate over every entity: `settled(all)`.

Authoring rules of thumb:
- `hidden(x)` only at times strictly before x's entrance **starts** — at `at 0`
  it is always safe for entrance entities; a few ms into a fade the opacity is
  already > 0.05 and `hidden` fails.
- Give `during` windows that match the verb's actual [start, start+dur].
  In a `seq`, starts accumulate: verb 3 starts at dur1+dur2.
- `settled(all)` at end requires the scene `duration` to extend ≥300ms past the
  last motion.
- Layout invariants (`inside`, `below`, `leftOf`) are cheap and catch the most
  bugs — always include a few.
- drawOn progress is invisible to the verifier (bbox+opacity only) — assert the
  stroke entity's `visible`/timing, not its draw progress.
- `line`/`arrow` bboxes are one-dimensional (zero height) — `visible`/`hidden`
  handle that, but area-based predicates (`grows`/`shrinks`) and `inside` are
  unreliable on them; prefer `leftOf`/`rightOf` positioning checks for arrows.

## Complete example (compiles and verifies 19/19)

```
scene "signup-success" size 800x450 duration 2600ms background #f1f5f9

entities
  card  = rect 320x220 fill #ffffff radius 12
  ring  = circle 30 stroke #16a34a stroke-width 4
  tick  = path "M8 16 L14 22 L24 10" size 32x32 stroke #16a34a stroke-width 4
  label = text "Account created" size 18 weight 600 color #0f172a
  sub   = text "Redirecting to your dashboard" size 13 color #64748b

layout
  center card
  inside ring card top 36
  center tick in ring
  below label ring gap 18
  below sub label gap 8

motion
  seq
    fadeIn card 500ms easeOut
    par
      pop ring 400ms
      drawOn tick 450ms easeOut
    slideIn label from bottom 10 400ms easeOut
    fadeIn sub 400ms

checks
  at 100 : hidden(ring) and hidden(label) and hidden(sub)
  during 0..500 : fadesIn(card)
  during 500..900 : grows(ring) and fadesIn(ring)
  at 850 : hidden(label)
  during 900..1300 : fadesIn(label) and movesUp(label)
  during 1300..1700 : fadesIn(sub)
  at 1800 : below(label, ring) and below(sub, label)
  always : inside(ring, card) and inside(label, card) and inside(sub, card)
  at end : fadedIn(card) and fadedIn(label) and fadedIn(sub) and settled(all)
```

## Common compile errors

- `unknown entity kind` — only the 7 kinds above exist (no group/image/icon).
- `motion predicate "X" needs a time window` — use `during`/`always`/`at end`.
- `<verb> references unknown entity` — every name in motion/checks must be
  declared in `entities`.
- Timeline math: `seq` children start when the previous ends; `par` children
  all start together; `stagger N` children start at i·N. Compute your `checks`
  windows from these starts.
