# B3 — toast-lifecycle

A "Saved" toast: enters, lingers, exits. Canvas **640x360**, background `#f8fafc`.

## Required elements (must carry exactly these ids)

| id | what | look |
|---|---|---|
| `toast` | rect ~300x64, centered in canvas | dark (#0f172a), rounded 12 |
| `msg` | text "Saved", inside the toast (roughly centered) | light (#f1f5f9), semibold, ~15px |

## Exact timeline (ms)

- 0–400: `toast` and `msg` slide in together from the right ~60px + fade in
- 400–2200: hold (nothing moves)
- 2200–2600: both slide out together to the right ~60px + fade out
- scene duration 3200

## Acceptance checks (verified mechanically)

```json
[
  { "at": 0, "assert": ["hidden(toast)", "hidden(msg)"] },
  { "during": [0, 400], "assert": ["movesLeft(toast)", "fadesIn(toast)", "movesLeft(msg)"] },
  { "at": 1200, "assert": ["visible(toast)", "visible(msg)", "inside(msg, toast)"] },
  { "during": [900, 2000], "assert": ["stationary(toast)", "stationary(msg)"] },
  { "during": [2200, 2600], "assert": ["movesRight(toast)", "fadesOut(toast)"] },
  { "atEnd": true, "assert": ["fadedOut(toast)", "fadedOut(msg)"] }
]
```
