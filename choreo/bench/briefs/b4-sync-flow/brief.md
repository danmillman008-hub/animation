# B4 — sync-flow

A laptop→cloud sync explainer beat. Canvas **900x420**, background `#0f172a`.

## Required elements (must carry exactly these ids)

| id | what | look |
|---|---|---|
| `boxA` | rect ~160x90, centered at ≈(200, 230) | dark slate, stroked border, rounded |
| `boxB` | rect ~160x90, centered at ≈(700, 230) | dark slate, stroked border, rounded |
| `dot` | circle r≈10, starts at boxA's center | bright (#38bdf8) |
| `done` | text "Synced", above boxB (gap ≈16px) | green (#34d399), semibold, ~16px |

## Exact timeline (ms)

- 0–350: `boxA` pops in (scale 0.3→1 + fade)
- 200–550: `boxB` pops in (same)
- 600–750: `dot` fades in at boxA's center
- 800–1800: `dot` moves right ~500px, ending at boxB's center
- 1900–2300: `boxB` pulses (scale 1→~1.1→1)
- 2000–2400: `done` fades in
- nothing moves after 2400; scene duration 3600

## Acceptance checks (verified mechanically)

```json
[
  { "at": 0, "assert": ["hidden(boxA)", "hidden(dot)", "hidden(done)"] },
  { "at": 450, "assert": ["visible(boxA)"] },
  { "during": [200, 550], "assert": ["fadesIn(boxB)", "grows(boxB)"] },
  { "at": 700, "assert": ["leftOf(dot, boxB)", "overlaps(dot, boxA)"] },
  { "during": [800, 1800], "assert": ["movesRight(dot)"] },
  { "at": 2100, "assert": ["overlaps(dot, boxB)", "notOverlapping(dot, boxA)"] },
  { "during": [2000, 2400], "assert": ["fadesIn(done)"] },
  { "at": 2600, "assert": ["above(done, boxB)", "leftOf(boxA, boxB)"] },
  { "atEnd": true, "assert": ["visible(dot)", "fadedIn(done)", "settled(all)"] }
]
```
