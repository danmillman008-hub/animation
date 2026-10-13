# park_walk — "a walk in the park"

A 14-second, 1920×1080 @ 30 fps cartoon short: **a character walking their dog through a
park**, built as the integration test for the two installed skill packs —
[`greensock/gsap-skills`](https://github.com/greensock/gsap-skills) and
[`remotion-dev/skills`](https://github.com/remotion-dev/skills) (see `../.claude/skills/`).

- **GSAP** owns *time*: one paused master timeline animates a plain nested JS state object
  (gait cycles, story beats, camera, grading, follow-through).
- **Remotion** owns *frames*: each frame seeks the timeline deterministically
  (`sampleState(frame, fps)`) and renders pure SVG React components. No `useEffect`,
  no springs, no randomness at render time — frame N is always frame N.
- Final video: **`videos/park_walk.mp4`** (h264, crf 18, 12.5 MB).

## Render it yourself

```bash
npm install
node render/setup_chromium.mjs        # inflates @sparticuz/chromium into .cache/chromium
./render/render.sh ParkWalk videos/park_walk.mp4
```

`render.sh` wraps `npx remotion render` with the bundled Chromium executable and
`LD_LIBRARY_PATH` (the sandbox has no system Chrome). Still frames:

```bash
# single still (env vars as in render.sh):
LD_LIBRARY_PATH=$PWD/.cache/chromium/lib npx remotion still ParkWalk out/still.png \
  --frame=150 --browser-executable=$PWD/.cache/chromium/chromium
node render/qa_gait.mjs     # gait / timeline QA harness
```

## Story beat sheet (seconds)

| t | beat |
|---|------|
| 0.0 | fade in, title-less cold open; leash slack |
| 0.45 | dog tugs the leash (ear perk, tail wiggle) |
| 1.3 | step off — walk cycles begin (human 1.0 s, dog trot 0.5 s) |
| 4.7 | dog stops to sniff a flower patch (human turns to look) |
| 6.9 | a butterfly crosses; dog tracks it, human smiles |
| 8.5 | walk slows, camera pushes in |
| 9.3 | stop; dog sits (trunk pitches about the shoulder) |
| 11.1 | dog leaps up — human pats the head (2× pat bob) |
| 12.9 | settle, warm grade rises, fade to cream end-card |
| 13.1 | "a walk in the park — GSAP TIMELINE × REMOTION RENDER" |

## Architecture

```
src/motion/state.ts     typed SceneState + createState() + seeded rng
src/motion/timeline.ts  GSAP master timeline (labels per beat, cyclic gait keys,
                        CustomEase / CustomWiggle / MotionPath plugins, headless-safe)
src/motion/fk.ts        world-space forward kinematics (leash anchors, QA foot planting)
src/motion/skeleton.ts  proportions & ground line (shared by rig + FK)
src/scene/*.tsx         pure SVG components: Background (4 parallax layers),
                        Human, Dog, Fx (shadows, leash, leaves, butterflies, birds)
src/ParkWalk.tsx        composition: camera group → grade overlays → end-card
render/                 chromium bootstrap, render.sh, QA harness
```

Conventions that keep it deterministic and QA-able:

- Limbs are capsule strokes (`stroke-linecap="round"`) inside nested
  `translate → rotate → scale` joints; the SVG nesting is mirrored 1:1 by `fk.ts`,
  so the leash and the foot-planting QA measure the *real* rendered anchors.
- The gait owns cyclic properties; story beats only write additive layers
  (`bobBase`, `headTurn`, `neckTurn`, `bounceAdd`, `earPerk`, `sit`, `tongue`),
  so beats never fight the walk cycle.
- Every tween is absolutely positioned (labels / `label+=x`); no relative `+=`
  chains, no infinite repeats → `tl.duration()` is exactly 14.000 s.
- QA (`render/qa_gait.mjs`) checks: duration, NaN-sweep of all 421 frames,
  planted-foot slide/lift for both characters, dog cadence, leash span, framing.
  Current status: **PASS, 0 warnings**.

## Quality pass 2 — light, atmosphere, raster→vector

- **Camera**: handheld wiggle reduced to ±0.16° with a 3-wiggle `easeInOut` CustomWiggle —
  a calm drift instead of a shake.
- **Light & atmosphere**: 4-stop sky, god-ray shafts off the sun, horizon haze band,
  dappled light pools on the path, floating pollen motes, wind sway on every tuft,
  flower and tree (all pure functions of `t`, so still deterministic).
- **Depth of field**: `feGaussianBlur` on the far hills/treeline (1.4) and the foreground
  verge (2.6) — the eye stays on the characters.
- **Cel shading**: shade-side + sun-rim strokes on both characters, chin shadow,
  belly shadow and back rim on the dog; cast shadows under trees, bench, lamps, bushes.
- **Paper grain**: full-frame `feTurbulence` overlay at 6.5% (vector, seed-locked, no asset).
- **Raster → vector pipeline** (`tools/trace_vignette.py`): an AI-generated flat
  illustration (`assets/vignette_src.png`) is magenta-keyed, colour-quantised to 12
  layers, contour-extracted with OpenCV (holes included) and Douglas-Peucker-simplified
  into `src/scene/EndVignette.tsx` — 3 310 polygon points of pure SVG that ships as the
  end-card emblem. Re-run it with:
  `python3 tools/trace_vignette.py assets/vignette_src.png src/scene/EndVignette.tsx`
- **Finale staging**: anticipation crouch before the leap, dust puffs on sit & landing,
  title rise + draw-on rule on the end card.

## The long film — `LongWalk` (10 minutes)

`videos/day_in_the_park.mp4` (full-quality master, ~200 MB, kept out of git) and
`videos/day_in_the_park_web.mp4` (same film, CRF-30 web copy, ~36 MB, committed) —
600 s @ 24 fps (14 400 frames), one continuous GSAP
master timeline (1 279 child tweens/timelines, built in ~0.4 s), rendered by Remotion.

Story (original): *a day in the park* — dawn mist and a snail → a girl and her dog
arrive → the turtle crossing → the pond (ducks scatter, the duckling stays and joins
the conga) → the kite and the wind → the rain, the tree shelter and the rainbow →
a golden-hour picnic with a bone-toss catch and a butterfly on the nose → dusk,
lamps on, the walk home with the ball in the mouth → night, a shooting star, credits.

- `src/long/longtimeline.ts` — the 600 s master: cyclic gait segments (`walkSeg`),
  settle-to-neutral between beats, per-act story tweens, ambience (clouds, wind,
  leash slack) and the time-of-day curve.
- `src/long/paletteLong.ts` — dawn→morning→noon→golden→dusk→night palette keys,
  piecewise-lerped; drives sky gradient, ambient tint and night factor.
- `src/long/LongScene.tsx` — set pieces (hero tree, pond, picnic), weather (rain,
  storm cover, rainbow, mist), procedural stars/moon/fireflies/shooting star,
  act title cards and the credit roll.
- `src/scene/Emoji.tsx` — 24 vector guests/props converted from
  **microsoft/fluentui-emoji** (MIT) flat SVGs; see `assets/emoji/`.
- Asset provenance: hand-built SVG rig & world, fluentui-emoji props (MIT),
  traced AI vignette (end card), Kenney/vecteezy packs explored in-repo.

Render it:

```bash
./render/render.sh LongWalk videos/day_in_the_park.mp4     # ~2 h on 2 cores
node render/.build/qa_long.cjs                              # duration/NaN/beat sweep
```

## Skills used

Installed with `npx skills add greensock/gsap-skills` + `npx skills add remotion-dev/skills`
into `../.claude/skills/` (20 skills, `skills-lock.json` at repo root). The GSAP pack's
timeline/position-parameter and easing rules shape `timeline.ts`; the Remotion pack's
composition/render/reference rules shape `Root.tsx`, `ParkWalk.tsx` and `render.sh`.
