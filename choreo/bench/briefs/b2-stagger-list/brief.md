# B2 — stagger-list

A report-rows reveal. Canvas **800x500**, background `#0f172a`.

## Required elements (must carry exactly these ids)

| id | what | look |
|---|---|---|
| `title` | text "Weekly report", upper area, horizontally centered | light (#e2e8f0), bold, ~24px |
| `row1` `row2` `row3` | three rects ~420x56, stacked vertically below the title (gap ≈16px), horizontally centered | dark slate (#1e293b), rounded |

## Exact timeline (ms)

- 0–400: `title` fades in
- 600–950: `row1` slides in from the left ~24px + fades in
- 850–1200: `row2` same
- 1100–1450: `row3` same
- nothing moves after 1450; scene duration 3000

## Acceptance checks (verified mechanically)

```json
[
  { "at": 0, "assert": ["hidden(row1)", "hidden(row2)", "hidden(row3)"] },
  { "during": [0, 400], "assert": ["fadesIn(title)"] },
  { "at": 780, "assert": ["visible(row1)", "hidden(row3)"] },
  { "during": [600, 950], "assert": ["movesRight(row1)"] },
  { "during": [1100, 1450], "assert": ["fadesIn(row3)"] },
  { "at": 2000, "assert": ["below(row1, title)", "below(row2, row1)", "below(row3, row2)"] },
  { "always": true, "assert": ["notOverlapping(row1, row2)", "notOverlapping(row2, row3)"] },
  { "atEnd": true, "assert": ["fadedIn(row1)", "fadedIn(row2)", "fadedIn(row3)", "settled(all)"] }
]
```
