#!/usr/bin/env python3
"""Send-back gate for rig plans: every moving part must have a numeric pivot (artwork coords),
a rotation constraint [min,max], an existing parent, and a layer. Exit 1 => send back to rig-plan-director."""
import json, sys
def check(path):
    plan = json.load(open(path)); ids = {p["id"] for p in plan["parts"]}; joints = plan.get("joints", {}); errs = []
    for p in plan["parts"]:
        pid = p["id"]
        if "parent" in p and p["parent"] not in ids: errs.append(f"{pid}: parent {p['parent']} not found")
        if "layer" not in p: errs.append(f"{pid}: missing layer")
        if "parent" not in p: continue  # root needs no joint
        j = joints.get(pid)
        if not j: errs.append(f"{pid}: moving part has NO joint entry"); continue
        pv = j.get("pivot")
        if not (isinstance(pv, list) and len(pv) == 2 and all(isinstance(v, (int, float)) for v in pv)): errs.append(f"{pid}: missing/invalid pivot")
        r = j.get("rotation")
        if not (isinstance(r, list) and len(r) == 2 and r[0] < r[1]): errs.append(f"{pid}: missing/invalid rotation constraint")
    for e in errs: print("  ✗", e)
    print(("PASS " if not errs else "SEND BACK ") + path); return not errs
if __name__ == "__main__":
    sys.exit(0 if all([check(p) for p in sys.argv[1:]]) else 1)
