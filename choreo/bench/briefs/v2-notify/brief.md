# V2 — notification-inbox (VAGUE TIER: no timeline given — you design it)

A notification-inbox reveal. Canvas **700x420**, background `#0f172a`.

## Required elements (must carry exactly these ids)

| id | what | look |
|---|---|---|
| `panel` | rect ~360x340, centered | dark slate (#1e293b), rounded, visible from the start |
| `bell` | circle r≈20, inside the panel near its top (≈28px margin) | amber (#f59e0b) |
| `badgeN` | small circle r≈9, overlapping the bell's top-right edge | red (#ef4444) |
| `card1` `card2` `card3` | rects ~300x64, stacked inside the panel below the bell (gap ≈12px) | slate (#334155), rounded |

## Requirements (design your own timeline)

- `panel` is static and visible from t=0 (no entrance).
- Reveal order: bell → badgeN → card1 → card2 → card3.
- After the cards have arrived, `badgeN` fades out ("notifications read").
- Everything settled by **5000ms**; cards never overlap; cards and bell stay
  inside the panel.

## Acceptance checks (mechanical)

```json
[
  { "trace": true, "assert": ["everVisible(panel)", "appearsBefore(bell, badgeN)", "appearsBefore(badgeN, card1)", "appearsBefore(card1, card2)", "appearsBefore(card2, card3)"] },
  { "atEnd": true, "assert": ["fadedOut(badgeN)", "fadedIn(bell)", "fadedIn(card1)", "fadedIn(card2)", "fadedIn(card3)", "settled(all)"] },
  { "atEnd": true, "assert": ["below(card2, card1)", "below(card3, card2)", "inside(card1, panel)", "inside(card2, panel)", "inside(card3, panel)", "inside(bell, panel)", "overlaps(badgeN, bell)"] },
  { "always": true, "assert": ["notOverlapping(card1, card2)", "notOverlapping(card2, card3)"] }
]
```
