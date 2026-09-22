# Condition: choreo — the Choreo DSL

Write ONE `.choreo` scene file implementing the brief.

Rules:
- Your ONLY language reference is `lang/AGENTS.md`
  — read it and follow it exactly.
- Name every required entity exactly as the brief's required id (entity names
  become element ids).
- Set the scene `size`, `background`, and `duration` from the brief; match the
  brief's timeline with your motion block (remember: `seq` starts accumulate,
  `par` starts together — use `wait` to hit exact start times).
- Include a `checks` section mirroring the brief's acceptance checks (same
  scopes and assertions, translated to Choreo's `checks` syntax).
- Do NOT run the compiler or verifier — author the scene blind.
