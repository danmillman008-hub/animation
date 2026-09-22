# V1 — onboarding-checklist (VAGUE TIER: no timeline given — you design it)

An onboarding checklist reveal. Canvas **800x480**, background `#f8fafc`.

## Required elements (must carry exactly these ids)

| id | what | look |
|---|---|---|
| `title` | text "Getting started", upper area, centered | dark (#0f172a), bold, ~24px |
| `item1` `item2` `item3` | three rects ~400x60, stacked below the title (gap ≈14px), centered | white, rounded, subtle border |
| `tick1` `tick2` `tick3` | small green circles r≈12, inside the right end of their item (≈20px margin) | #16a34a |
| `cta` | text "You're all set →", below item3 (gap ≈20px) | #2563eb, semibold, ~16px |

## Requirements (design your own timeline)

- Reveal order: title first → items top-to-bottom in order → cta last.
- Each tick appears only after its own item is already visible.
- Everything must be fully revealed and **settled by 5000ms** (the scene is
  sampled for 5000ms; leave ≥300ms of stillness at the end).
- Items must never overlap; ticks stay inside their items.

## Acceptance checks (mechanical; schedule-agnostic where no times are given)

```json
[
  { "trace": true, "assert": ["appearsBefore(title, item1)", "appearsBefore(item1, item2)", "appearsBefore(item2, item3)", "appearsBefore(item3, cta)"] },
  { "trace": true, "assert": ["appearsBefore(item1, tick1)", "appearsBefore(item2, tick2)", "appearsBefore(item3, tick3)"] },
  { "atEnd": true, "assert": ["fadedIn(title)", "fadedIn(item1)", "fadedIn(item2)", "fadedIn(item3)", "fadedIn(tick1)", "fadedIn(tick2)", "fadedIn(tick3)", "fadedIn(cta)", "settled(all)"] },
  { "atEnd": true, "assert": ["below(item2, item1)", "below(item3, item2)", "below(cta, item3)", "inside(tick1, item1)", "inside(tick2, item2)", "inside(tick3, item3)"] },
  { "always": true, "assert": ["notOverlapping(item1, item2)", "notOverlapping(item2, item3)"] }
]
```
