# Condition: gsap — GSAP 3

Write ONE HTML file implementing the brief with GSAP.

Rules:
- Include GSAP with exactly this tag (the file exists at that relative path
  from your artifact's location — do not use a CDN):
  `<script src="../../../assets/gsap.min.js"></script>`
- All animation via GSAP (`gsap.to`/`gsap.from`/`gsap.timeline`). No CSS
  `@keyframes`, no `element.animate`, no setTimeout.
- Use GSAP `delay`/timeline `position` parameters for the schedule; durations
  in seconds (GSAP convention) matching the brief's ms timeline.
- Set initial states with `gsap.set` or `gsap.from*` so pre-entrance states
  are correct the moment the script runs.
- No other external resources. Draw the scene with SVG or positioned divs.
- Every required element must carry exactly the required `id`.
- The canvas must be exactly the brief's size, centered on the page, with the
  brief's background color; `html,body{margin:0}`.
- Note: verification samples this condition in real time (GSAP uses its own
  ticker), so keep the schedule exactly as briefed — do not add extra lead-in
  delays.
