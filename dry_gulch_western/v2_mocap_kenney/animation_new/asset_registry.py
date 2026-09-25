#!/usr/bin/env python3
"""Asset registry for rig parts: builds/validates parts_registry.json from characters.ts + rig_plan_*.json.
Each entry: id, character, kind, version(hash of artwork), tags, pivot, rotation limits, parent, layer, bbox-free size.
Usage: asset_registry.py build <characters.ts> <rig_plan...>   |   asset_registry.py find tag=arm character=hare"""
import json, sys, hashlib, re
from jsonschema import validate
SCHEMA = {"type": "object", "required": ["version", "parts"], "properties": {"parts": {"type": "array", "items": {"type": "object",
  "required": ["id", "character", "kind", "artwork_hash", "pivot", "rotation", "layer", "tags"],
  "properties": {"pivot": {"type": "array", "minItems": 2, "maxItems": 2}, "rotation": {"type": "array", "minItems": 2, "maxItems": 2}}}}}}
def tags_for(pid):
    t = set(pid.replace("_", " ").split()); t |= {"arm"} if "arm" in pid or "hand" in pid else set(); t |= {"leg"} if any(k in pid for k in ("thigh", "shin", "shoe")) else set()
    t |= {"front"} if pid.endswith("_f") else {"back"} if pid.endswith("_b") else set(); return sorted(t)
def build(chars_ts, plans):
    s = open(chars_ts).read(); d = json.loads(s[s.index("= ") + 2:].rstrip().rstrip(";"))
    reg = {"version": 1, "parts": []}
    for plan_path in plans:
        plan = json.load(open(plan_path)); cid = plan["character_id"]
        for p in plan["parts"]:
            art = d[cid]["parts"].get(p["id"], ""); j = plan["joints"].get(p["id"], {})
            reg["parts"].append({"id": f"{cid}/{p['id']}", "character": cid, "part": p["id"], "kind": p["kind"], "parent": p.get("parent"), "layer": p["layer"],
                "artwork_hash": hashlib.sha1(art.encode()).hexdigest()[:10], "artwork_bytes": len(art), "pivot": j.get("pivot", d[cid]["rig"]["parts"][p["id"]]["pivot"]),
                "rotation": j.get("rotation", [-30, 30]), "cap": j.get("cap"), "tags": tags_for(p["id"])})
    validate(reg, SCHEMA); json.dump(reg, open("parts_registry.json", "w"), indent=1); print(f"registry: {len(reg['parts'])} parts -> parts_registry.json")
def find(filters):
    reg = json.load(open("parts_registry.json")); f = dict(kv.split("=") for kv in filters)
    for p in reg["parts"]:
        if all((v in p["tags"]) if k == "tag" else str(p.get(k)) == v for k, v in f.items()): print(p["id"], p["pivot"], p["rotation"], p["tags"])
if __name__ == "__main__":
    (build(sys.argv[2], sys.argv[3:]) if sys.argv[1] == "build" else find(sys.argv[2:]))
