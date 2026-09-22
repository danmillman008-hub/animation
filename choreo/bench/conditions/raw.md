# Condition: raw — hand-written SVG/HTML + CSS animations

Write ONE self-contained HTML file implementing the brief.

Rules:
- **CSS animations only** (`@keyframes` + `animation:` with `animation-delay`).
  **No JavaScript at all** — the file must not contain a `<script>` tag.
- No external resources (no CDNs, fonts, images).
- Draw the scene with SVG or plain positioned divs — your choice.
- Every required element must carry exactly the required `id`.
- The canvas must be exactly the brief's size, centered on the page, with the
  brief's background color; `html,body{margin:0}`.
- Use `animation-fill-mode` and initial styles so elements are in their correct
  pre-entrance state before their animation starts (e.g. `opacity:0` base for
  elements that fade in) and hold their final state afterwards.
- Match the brief's timeline exactly (delays and durations in ms).
