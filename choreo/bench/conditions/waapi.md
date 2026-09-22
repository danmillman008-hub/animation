# Condition: waapi — Web Animations API

Write ONE self-contained HTML file implementing the brief.

Rules:
- All animation via **`element.animate(keyframes, options)`** (the Web
  Animations API). No CSS `@keyframes`, no external libraries.
- Schedule timing ONLY with the WAAPI `delay`/`duration` options — **never
  setTimeout/setInterval/requestAnimationFrame** (they break deterministic
  verification).
- Start all animations in one script that runs immediately (end of body).
  Use `fill: 'both'` or `fill: 'forwards'` plus initial inline/CSS styles so
  pre-entrance and final states are correct.
- No external resources. Draw the scene with SVG or positioned divs.
- Every required element must carry exactly the required `id`.
- The canvas must be exactly the brief's size, centered on the page, with the
  brief's background color; `html,body{margin:0}`.
- Match the brief's timeline exactly (delays and durations in ms).
