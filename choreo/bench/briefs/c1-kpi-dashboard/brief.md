# C1 — kpi-dashboard (COMPLEX TIER: 13 elements, 5 phases)

A KPI dashboard reveal. Canvas **1000x600**, background `#0f172a`.

## Required elements (must carry exactly these ids)

| id | what | look |
|---|---|---|
| `header` | text "Q3 Performance", top area, centered | light (#e2e8f0), bold, ~28px |
| `card1` `card2` `card3` | rects ~280x120, in a row (gap ≈30px), row centered, tops ≈150 | dark slate (#1e293b), rounded, stroked |
| `val1` `val2` `val3` | value texts ("$1.2M", "+18%", "94%") centered inside their cards | bright accents, bold, ~30px |
| `rule` | horizontal line/rect ~840x2, centered, y ≈320 | #334155 |
| `barA` `barB` `barC` `barD` | rects ~120 wide, heights ≈140/180/220/160, in a row (gap ≈40px), row centered, **bottoms aligned at y≈560** | #38bdf8 #818cf8 #34d399 #f59e0b |
| `foot` | text "Source: internal analytics", below the bars | muted (#64748b), ~13px |

## Exact timeline (ms)

- 0–400: `header` fades in
- 500–850 / 700–1050 / 900–1250: `card1`/`card2`/`card3` fade in + rise ~10px
- 900–1200 / 1100–1400 / 1300–1600: `val1`/`val2`/`val3` fade in
- 1700–2100: `rule` fades in
- 2200–2600 / 2400–2800 / 2600–3000 / 2800–3200: `barA`–`barD` fade in + rise ~20px
- 3400–3800: `foot` fades in
- nothing moves after 3800; scene duration 4400

## Acceptance checks (mechanical)

```json
[
  { "at": 0, "assert": ["hidden(card1)", "hidden(val1)", "hidden(barA)", "hidden(foot)"] },
  { "during": [0, 400], "assert": ["fadesIn(header)"] },
  { "at": 600, "assert": ["visible(card1)", "hidden(card3)"] },
  { "during": [900, 1250], "assert": ["fadesIn(card3)"] },
  { "at": 1000, "assert": ["visible(card1)", "hidden(val3)"] },
  { "during": [1300, 1600], "assert": ["fadesIn(val3)"] },
  { "during": [1700, 2100], "assert": ["fadesIn(rule)"] },
  { "at": 2300, "assert": ["hidden(barC)"] },
  { "during": [2200, 2600], "assert": ["fadesIn(barA)", "movesUp(barA)"] },
  { "during": [2800, 3200], "assert": ["fadesIn(barD)", "movesUp(barD)"] },
  { "at": 3200, "assert": ["hidden(foot)"] },
  { "during": [3400, 3800], "assert": ["fadesIn(foot)"] },
  { "at": 4000, "assert": ["inside(val1, card1)", "inside(val2, card2)", "inside(val3, card3)", "leftOf(card1, card2)", "leftOf(card2, card3)", "leftOf(barA, barB)", "leftOf(barB, barC)", "leftOf(barC, barD)", "below(foot, barA)"] },
  { "atEnd": true, "assert": ["fadedIn(header)", "fadedIn(barD)", "fadedIn(foot)", "settled(all)"] }
]
```
