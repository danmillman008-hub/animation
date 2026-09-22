# B1 — badge-pop

A payment-confirmation card animation. Canvas **800x450**, background `#f1f5f9`.

## Required elements (must carry exactly these ids)

| id | what | look |
|---|---|---|
| `card` | rect ~320x200, centered in canvas | white, rounded corners |
| `badge` | circle r≈28, inside the card near its top (≈36px margin) | green (#16a34a) |
| `label` | text "Payment received", below the badge (gap ≈18px) | dark (#0f172a), semibold, ~18px |

## Exact timeline (ms)

- 0–500: `card` fades in (opacity 0→1)
- 600–1000: `badge` pops in (scale 0.3→1 + opacity 0→1, springy overshoot ok)
- 1100–1500: `label` slides up ~10px + fades in (opacity 0→1)
- nothing moves after 1500; scene duration 2400

## Acceptance checks (verified mechanically against the rendered animation)

```json
[
  { "at": 0, "assert": ["hidden(badge)", "hidden(label)"] },
  { "during": [0, 500], "assert": ["fadesIn(card)"] },
  { "at": 560, "assert": ["fadedIn(card)"] },
  { "during": [600, 1000], "assert": ["fadesIn(badge)", "grows(badge)"] },
  { "at": 900, "assert": ["hidden(label)"] },
  { "during": [1100, 1500], "assert": ["fadesIn(label)", "movesUp(label)"] },
  { "at": 1800, "assert": ["below(label, badge)", "inside(badge, card)", "inside(label, card)"] },
  { "atEnd": true, "assert": ["fadedIn(card)", "fadedIn(badge)", "fadedIn(label)", "settled(all)"] }
]
```
