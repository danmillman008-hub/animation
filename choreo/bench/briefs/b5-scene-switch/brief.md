# B5 — scene-switch

A stat-hook crossfading into a bar panel. Canvas **800x450**, background `#0f172a`.

## Required elements (must carry exactly these ids)

| id | what | look |
|---|---|---|
| `bignum` | text "$48,200", large, centered-ish (slightly above center) | light (#e2e8f0), bold, ~64px |
| `subA` | text "lost last quarter", below bignum (gap ≈14px) | muted (#94a3b8), ~18px |
| `bar1` `bar2` `bar3` | three rects ~90 wide, heights ≈120/170/220, side by side (gap ≈24px), bottoms aligned at y≈360, group horizontally centered | blues/greens, e.g. #38bdf8 #818cf8 #34d399 |

## Exact timeline (ms)

- 0–500: `bignum` fades in
- 300–700: `subA` fades in
- 700–1500: hold
- 1500–2000: `bignum` and `subA` fade OUT
- 1600–2000: `bar1` rises ~20px + fades in
- 1800–2200: `bar2` same
- 2000–2400: `bar3` same
- nothing moves after 2400; scene duration 3400

## Acceptance checks (verified mechanically)

```json
[
  { "at": 0, "assert": ["hidden(subA)", "hidden(bar1)", "hidden(bar2)", "hidden(bar3)"] },
  { "during": [0, 500], "assert": ["fadesIn(bignum)"] },
  { "at": 1200, "assert": ["fadedIn(bignum)", "fadedIn(subA)", "hidden(bar2)"] },
  { "during": [1500, 2000], "assert": ["fadesOut(bignum)", "fadesOut(subA)"] },
  { "during": [1600, 2000], "assert": ["fadesIn(bar1)", "movesUp(bar1)"] },
  { "during": [2000, 2400], "assert": ["fadesIn(bar3)"] },
  { "at": 2800, "assert": ["fadedOut(bignum)", "visible(bar1)", "visible(bar2)", "visible(bar3)"] },
  { "at": 2800, "assert": ["leftOf(bar1, bar2)", "leftOf(bar2, bar3)"] },
  { "atEnd": true, "assert": ["settled(all)"] }
]
```
