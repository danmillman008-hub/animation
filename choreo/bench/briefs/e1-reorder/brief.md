# E1 — reorder entrances (EDIT TIER: modify the given base artifact)

You are given an existing, working animation (the Phase-2 `b1-badge-pop`
artifact in your framework — see `base/<condition>/`). Apply this change
request, keeping everything else (positions, sizes, colors, canvas) identical:

## Change request

1. `card` no longer animates — it is fully visible from t=0.
2. `label` now enters FIRST: slides up ~10px + fades in during **100–500ms**.
3. `badge` now enters SECOND: pops in (scale+fade) during **600–1000ms**.
4. Scene duration stays 2400ms; nothing moves after 1000ms.

## Acceptance checks (mechanical)

```json
[
  { "at": 0, "assert": ["fadedIn(card)", "hidden(label)", "hidden(badge)"] },
  { "during": [100, 500], "assert": ["fadesIn(label)", "movesUp(label)"] },
  { "at": 550, "assert": ["visible(label)", "hidden(badge)"] },
  { "during": [600, 1000], "assert": ["fadesIn(badge)", "grows(badge)"] },
  { "at": 1300, "assert": ["below(label, badge)", "inside(badge, card)", "inside(label, card)"] },
  { "atEnd": true, "assert": ["fadedIn(card)", "fadedIn(badge)", "fadedIn(label)", "settled(all)"] }
]
```
