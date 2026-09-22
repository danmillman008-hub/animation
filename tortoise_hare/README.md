# Tortoise & Hare — rigged 2D animation (OpenMontage / Remotion)

- `videos/` — all renders. `tortoise_and_hare_v5.mp4` is the latest (rig fixes + joint constraints + QA).
- `rig/` — Remotion sources: `Rig.tsx` (FK renderer, `clampJoint`, `validateRig`, joint caps), `Main.tsx` (scenes/poses),
  `characters.ts` (generated part artwork + rig data), `rig_plan_hare.json` / `rig_plan_tort.json`
  (pivots in artwork coordinates + rotation constraints per part, per the character-rigging skill),
  `RigTest.tsx` / `PartsTest.tsx` / `RigQA.tsx` (inspection comps).
- `qa/solve_joints.py` — finds true joint centres by rasterising parent/child overlap.
- `qa/rig_qa.py` — character-animation-qa check: every hinged part must stay attached to its parent across gait phases.
