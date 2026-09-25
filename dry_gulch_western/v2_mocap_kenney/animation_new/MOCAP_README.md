# Mocap → SVG rig pipeline

Real motion capture (CMU Graphics Lab, free for any use; Mixamo BVH also parses) driving our
draw-once SVG rigs in OpenMontage/Remotion.

- `bvh_retarget.py in.bvh out.json [--dur s] [--start s] [--fps 30] [--flip]`
  BVH → 3D FK → projection onto the character's own sagittal plane (side view, facing +x)
  → per-frame *rotations* in the rig convention (torso, head, uarm/larm, thigh/shin/shoe, f/b sides)
  plus `hipH` (hip height in leg-lengths) and `x` (root travel). Light 3-tap smoothing.
- `add_motion.sh <name> <cmu-id|url|file> [--dur 8]` → fetch, retarget, merge into
  `projects/{west,kwest}/remotion/mocap_clips.ts`.
- `Rig.tsx: mocapPose(clip, t, {speed, legLen, amp, armAmp, single, loop, start, end})`
  → `{pose, hipY, travel}`. `single:true` for one-segment limbs (Kenney rigs).
  `legLen` = thigh+shin pivot distance of the rig (hare 146.8, tort 749.8, kenney 200).
- QA comps: `MocapStrip` (8-frame filmstrip, debug pivots) and `MocapDemo` (root-motion walk-through).
- Foot slide: choose `speed` so `travel/s * scale ≈ screen px/s` (see comments in Main.tsx).

Clips bundled: walk 02_01, walk2 07_01, swagger 07_02, run 16_35, sneak 77_29, sit 13_01,
wave 141_16, jump 13_11. BVH sources in `mocap/`.
