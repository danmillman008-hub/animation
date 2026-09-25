#!/usr/bin/env python3
"""poses.json (from pose_editor) -> TypeScript snippet for Main.tsx.
usage: import_poses.py poses.json [VAR]   -> prints `const VAR = {...}` poses + a seq() keyframe list, and applies rigPatch to characters.ts (backup kept)."""
import json, sys, shutil, re
o = json.load(open(sys.argv[1])); var = sys.argv[2] if len(sys.argv) > 2 else "U"
proj, cid = o["character"].split(":")
def rnd(p): return {k: {kk: round(vv, 1) for kk, vv in v.items()} for k, v in p.items()}
names = {}
for k in o["keys"]:
    p = rnd(k["pose"])
    if k.get("hipsY"): p.setdefault("hips", {})["y"] = round(k["hipsY"], 1)
    names[k["name"]] = p
print(f"// poses authored in pose_editor for {o['character']} ({o.get('exported','')})")
print(f"const {var} = {{")
for n, p in names.items(): print(f"  {n}: {json.dumps(p)} as Pose,")
print("};")
keys = sorted(o["keys"], key=lambda k: k["t"])
print(f"// keyframes: seq(t, [{', '.join(f'[{k['t']}, {var}.{k['name']}, \"{k['ease']}\"]' for k in keys)}])")
if o.get("rigPatch"):
    f = f"/home/user/OpenMontage/projects/{proj}/remotion/characters.ts"; shutil.copy(f, f + ".bak")
    s = open(f).read(); head = s[:s.index("= ") + 2]; d = json.loads(s[len(head):].rstrip().rstrip(";"))
    for part, piv in o["rigPatch"].items(): d[cid]["rig"]["parts"][part]["pivot"] = piv; print(f"// pivot {cid}.{part} -> {piv}", file=sys.stderr)
    open(f, "w").write(head + json.dumps(d) + ";\n"); print(f"// rig patch applied to {f} (backup .bak)", file=sys.stderr)
