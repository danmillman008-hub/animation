# Contributing to Choreo

Thanks for looking. Choreo is a small research artifact released as-is, so keep
contributions focused and the surface small.

## Layout

- `lang/` — the DSL: `src/parse.mjs` (grammar → AST), `src/compile.mjs` (AST →
  SVG/CSS + a verifier spec), `src/cli.mjs`. Grammar reference: `lang/AGENTS.md`.
- `verify/` — the trace verifier: `src/` (Playwright sampler + predicates),
  `examples/` (runnable specs).
- `bench/` — the cross-framework benchmark: `briefs/`, `conditions/`, `harness.mjs`.

## Running things

```bash
# DSL: compile + self-verify the examples
cd lang && node src/cli.mjs examples/signup-success.choreo -o out --verify

# Verifier: demo + planted-regression demo
cd verify && npm install && npm run demo && npm run demo:broken
```

`verify` needs Playwright's browser (`npx playwright install chromium` after
`npm install`).

## Ground rules

- **Keep the grammar bounded.** Choreo's value is that it is *not*
  general-purpose — an agent can hit it reliably precisely because it is small.
  New verbs/predicates need a clear motion-semantics reason, not "one more knob."
- **Every new predicate needs a test** — a spec that passes on a correct
  animation and fails on a broken one (see `verify/examples/demo-broken.spec.mjs`).
- **The verifier stays substrate-independent** — it asserts over rendered traces,
  never over source. Don't couple it to the Choreo compiler.
- Run the examples before opening a PR; CI runs them on every push.

## Reporting issues

Include the `.choreo` program (or the spec + target), what you expected, and what
the verifier reported. Failure reports include captured frames — attach them.
