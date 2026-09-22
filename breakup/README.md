# جدایی — The Separation

A romantic breakup animated in [Choreo](https://github.com/JieGouAI/choreo) —
a semantic animation DSL that compiles to self-contained SVG + CSS and
**proves** the animation matches its spec with built-in spatio-temporal checks.

![poster](frame_2000.png)

## The story (8.6s)

1. **Night falls** — moon, stars, a bench under a dark sky (0–0.7s)
2. **Two figures appear** on the bench, springy pop (0.75–1.2s)
3. **A red heart pulses** between them — twice (1.3–2.3s)
4. **A crack draws itself** down the middle of the heart (2.3–2.8s)
5. **The heart splits** — halves drift apart, tumble, and fade (2.8–3.8s)
6. **They slide away from each other** to opposite ends of the bench,
   as rain begins to fall (3.8–5.3s)
7. **The title fades in** — «جدایی» *(The Separation)* — with a quiet
   subtitle, and the rain stops (6–8.6s)

## Files

| File | What it is |
|---|---|
| `the-separation.html` | **The animation** — self-contained SVG+CSS, open in any browser |
| `the-separation.choreo` | The Choreo source (scene / entities / layout / motion / checks) |
| `the-separation.spec.mjs` | The `checks` block compiled to a verifier spec |
| `frame_*.png` | Stills: the pulse, the crack, the drifting apart, the title |

## Rebuild / re-verify

```bash
# from the choreo/lang package (see ../choreo in this repo)
cd choreo/lang
npm install
node src/cli.mjs ../../breakup/the-separation.choreo -o ../../breakup --verify
# → 45/45 checks passed
```

The verifier (Playwright) renders the animation, samples the real pixel trace,
and asserts every claim in the `checks` block — layout invariants
(`leftOf(him, her)`, `onScreen(...)`), motion contracts
(`movesLeft(heart_l)` during the split, `movesDown(drop1)` during the rain),
fade schedules, ordering (`appearsBefore(her, drop1)`), and
`settled(all)` at the end.

## Notes

- Characters are original silhouettes drawn as Choreo `path` entities
  (the DSL has no image element by design — everything is vector geometry
  an agent can reason about).
- The Persian title «جدایی» renders via the browser's system font.
