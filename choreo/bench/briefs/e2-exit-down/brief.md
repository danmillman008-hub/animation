# E2 — change the exit (EDIT TIER: modify the given base artifact)

You are given an existing, working animation (the Phase-2 `b3-toast-lifecycle`
artifact in your framework — see `base/<condition>/`). Apply this change
request, keeping everything else (entry animation, positions, sizes, colors,
canvas, 3200ms duration) identical:

## Change request

1. The `msg` text now fades out EARLIER and IN PLACE: opacity → 0 during
   **1800–2200ms**, with no movement at all.
2. The `toast` now exits DOWNWARD instead of to the right: during
   **2200–2600ms** it slides down ~60px while fading out.

## Acceptance checks (mechanical)

```json
[
  { "at": 0, "assert": ["hidden(toast)", "hidden(msg)"] },
  { "during": [0, 400], "assert": ["movesLeft(toast)", "fadesIn(toast)"] },
  { "at": 1200, "assert": ["visible(toast)", "visible(msg)", "inside(msg, toast)"] },
  { "during": [1800, 2200], "assert": ["fadesOut(msg)", "stationary(msg)"] },
  { "during": [2200, 2600], "assert": ["movesDown(toast)", "fadesOut(toast)"] },
  { "atEnd": true, "assert": ["fadedOut(toast)", "fadedOut(msg)"] }
]
```
