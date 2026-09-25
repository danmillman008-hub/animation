#!/usr/bin/env python3
"""BVH (CMU / Mixamo) -> 2D side-view joint-rotation clip for the OpenMontage SVG rigs.

Unlike ink-theater's bvh2clip (2D joint *positions*, frontal projection), this
emits per-frame *rotations* in the rig's own convention so the artwork can be
driven directly:  rot = screen angle of the bone - rest angle, child-relative.
Projection plane = character's own sagittal plane (heading x up), so a walk is
always seen from the side, facing +x.

usage: bvh_retarget.py in.bvh out.json [--fps 30] [--start s] [--dur s] [--name n] [--flip]
"""
import sys, json, math, re
import numpy as np

def parse_bvh(path):
    tok = open(path, encoding="utf8", errors="ignore").read().replace("\r", "").split("\n")
    joints = []; li = 0
    def pj(parent):
        nonlocal li
        line = tok[li].strip(); li += 1
        end = line.startswith("End")
        name = (parent["name"] + "_end") if end else line.split()[1]
        j = {"name": name, "parent": parent, "offset": np.zeros(3), "channels": [], "children": [], "end": end}
        joints.append(j); li += 1
        while li < len(tok):
            t = tok[li].strip()
            if t.startswith("OFFSET"): j["offset"] = np.array(list(map(float, t.split()[1:4]))); li += 1
            elif t.startswith("CHANNELS"): j["channels"] = t.split()[2:]; li += 1
            elif t.startswith("JOINT") or t.startswith("End"): j["children"].append(pj(j))
            elif t.startswith("}"): li += 1; break
            else: li += 1
        return j
    while not tok[li].strip().startswith("ROOT"): li += 1
    root = pj(None)
    while not tok[li].strip().startswith("Frames:"): li += 1
    nf = int(tok[li].split(":")[1]); li += 1
    ft = float(tok[li].split(":")[1]); li += 1
    motion = []
    for _ in range(nf):
        if li >= len(tok): break
        v = tok[li].split(); li += 1
        if len(v) > 1: motion.append(list(map(float, v)))
    return root, joints, np.array(motion), ft

def rot(ax, deg):
    a = math.radians(deg); c, s = math.cos(a), math.sin(a)
    if ax == "X": return np.array([[1,0,0],[0,c,-s],[0,s,c]])
    if ax == "Y": return np.array([[c,0,s],[0,1,0],[-s,0,c]])
    return np.array([[c,-s,0],[s,c,0],[0,0,1]])

def fk(root, joints, frame):
    pos = {}; idx = [0]
    def rec(j, pR, pT):
        R = np.eye(3); T = np.zeros(3)
        for ch in j["channels"]:
            v = frame[idx[0]]; idx[0] += 1
            if ch.endswith("position"): T["XYZ".index(ch[0])] = v
            else: R = R @ rot(ch[0], v)
        local_t = (T if j["parent"] is None else j["offset"])
        wp = pT + pR @ local_t
        pos[j["name"]] = wp
        gR = pR @ R
        for c in j["children"]: rec(c, gR, wp)
    rec(root, np.eye(3), np.zeros(3))
    return pos

ALIAS = {
  "hips": ["Hips","mixamorig:Hips","Hip"], "chest": ["Spine3","Spine2","Spine1","Chest","Spine","mixamorig:Spine2"],
  "neck": ["Neck","Neck1","mixamorig:Neck"], "head": ["Head","mixamorig:Head"],
  "shR": ["RightArm","RightShoulder","mixamorig:RightArm"], "elR": ["RightForeArm","mixamorig:RightForeArm"], "haR": ["RightHand","mixamorig:RightHand"],
  "shL": ["LeftArm","LeftShoulder","mixamorig:LeftArm"], "elL": ["LeftForeArm","mixamorig:LeftForeArm"], "haL": ["LeftHand","mixamorig:LeftHand"],
  "hipR": ["RightUpLeg","RightHip","mixamorig:RightUpLeg"], "knR": ["RightLeg","mixamorig:RightLeg"], "ftR": ["RightFoot","mixamorig:RightFoot"],
  "hipL": ["LeftUpLeg","LeftHip","mixamorig:LeftUpLeg"], "knL": ["LeftLeg","mixamorig:LeftLeg"], "ftL": ["LeftFoot","mixamorig:LeftFoot"],
  "toeR": ["RightToeBase","RightFoot_end"], "toeL": ["LeftToeBase","LeftFoot_end"],
}

def ang(a, b):  # screen angle deg of vector a->b (x right, y down)
    return math.degrees(math.atan2(b[1]-a[1], b[0]-a[0]))
def wrap(d): return (d + 180) % 360 - 180

def main():
    args = sys.argv[1:]; opt = {"fps": 30, "start": 0.0, "dur": None, "name": None, "flip": False}
    pos_args = []
    i = 0
    while i < len(args):
        a = args[i]
        if a == "--fps": opt["fps"] = float(args[i+1]); i += 2
        elif a == "--start": opt["start"] = float(args[i+1]); i += 2
        elif a == "--dur": opt["dur"] = float(args[i+1]); i += 2
        elif a == "--name": opt["name"] = args[i+1]; i += 2
        elif a == "--flip": opt["flip"] = True; i += 1
        else: pos_args.append(a); i += 1
    inp, outp = pos_args
    root, joints, motion, ft = parse_bvh(inp)
    names = {j["name"] for j in joints}
    J = {k: next((n for n in v if n in names), None) for k, v in ALIAS.items()}
    missing = [k for k, v in J.items() if v is None and k not in ("toeR","toeL")]
    if missing: print("WARN unmapped", missing, file=sys.stderr)
    src_fps = 1.0 / ft
    f0 = int(opt["start"] * src_fps); f1 = len(motion) if opt["dur"] is None else min(len(motion), int((opt["start"] + opt["dur"]) * src_fps))
    step = src_fps / opt["fps"]
    # up axis
    P0 = fk(root, joints, motion[f0])
    span = np.abs(P0[J["head"]] - P0[J["ftR"]]); up_ax = 1 if span[1] >= span[2] else 2
    up = np.zeros(3); up[up_ax] = 1.0 if P0[J["head"]][up_ax] > P0[J["ftR"]][up_ax] else -1.0
    # rest leg length (for hip-height normalisation)
    def rest_len():
        d = 0.0; j = next(j for j in joints if j["name"] == J["knR"]); d += np.linalg.norm(j["offset"])
        j = next(j for j in joints if j["name"] == J["ftR"]); d += np.linalg.norm(j["offset"]); return d
    leg_len = rest_len()
    # heading: smoothed over whole clip so the view doesn't jitter; forward = hips velocity if moving, else pelvis normal
    frames = []
    hips_traj = []
    P_all = []
    fi = f0
    while fi < f1:
        P = fk(root, joints, motion[int(fi)]); P_all.append(P); hips_traj.append(P[J["hips"]]); fi += step
    hips_traj = np.array(hips_traj)
    disp = hips_traj[-1] - hips_traj[0]; disp -= up * np.dot(disp, up)
    if np.linalg.norm(disp) > leg_len * 0.5:
        fwd = disp / np.linalg.norm(disp)
    else:
        right = P_all[0][J["hipR"]] - P_all[0][J["hipL"]]; right -= up * np.dot(right, up)
        fwd = np.cross(up, right); fwd /= np.linalg.norm(fwd)
        # CMU: hipR - hipL cross up gives forward for a right-handed frame; verify by the toe direction
        toe = P_all[0].get(J["toeR"]) if J["toeR"] else None
        if toe is not None and np.dot(toe - P_all[0][J["ftR"]], fwd) < 0: fwd = -fwd
    if opt["flip"]: fwd = -fwd
    def proj(p): return np.array([np.dot(p, fwd), -np.dot(p, up)])
    out = []
    for P in P_all:
        Q = {k: proj(P[v]) for k, v in J.items() if v}
        hips = Q["hips"]
        tor = ang(Q["hips"], Q["chest"]); hd = ang(Q["neck"], Q["head"])
        def limb(s, e, h):
            ua = ang(Q[s], Q[e]); la = ang(Q[e], Q[h]); return ua, la, ang(Q[s], Q[h])
        uaR, laR, waR = limb("shR", "elR", "haR"); uaL, laL, waL = limb("shL", "elL", "haL")
        thR, shR, wlR = limb("hipR", "knR", "ftR"); thL, shL, wlL = limb("hipL", "knL", "ftL")
        ftaR = ang(Q["ftR"], Q["toeR"]) if J["toeR"] else 0; ftaL = ang(Q["ftL"], Q["toeL"]) if J["toeL"] else 0
        # rig convention: limbs hang at +90 (down), torso at -90 (up), foot points +x (0)
        pose = {
            "torso": wrap(tor + 90), "head": wrap(hd - tor),
            "uarm_f": wrap(uaR - 90 - (tor + 90)), "larm_f": wrap(laR - uaR), "arm_f": wrap(waR - 90 - (tor + 90)),
            "uarm_b": wrap(uaL - 90 - (tor + 90)), "larm_b": wrap(laL - uaL), "arm_b": wrap(waL - 90 - (tor + 90)),
            "thigh_f": wrap(thR - 90), "shin_f": wrap(shR - thR), "leg_f": wrap(wlR - 90), "shoe_f": wrap(ftaR - shR + 90) if J["toeR"] else 0,
            "thigh_b": wrap(thL - 90), "shin_b": wrap(shL - thL), "leg_b": wrap(wlL - 90), "shoe_b": wrap(ftaL - shL + 90) if J["toeL"] else 0,
        }
        foot_low = max(Q["ftR"][1], Q["ftL"][1])
        pose["hipH"] = float((foot_low - hips[1]) / leg_len)   # hip height in leg-lengths (1 = straight legs)
        pose["x"] = float(hips[0] / leg_len)                    # forward travel in leg-lengths
        out.append({k: round(float(v), 2) for k, v in pose.items()})
    # smooth lightly (3-tap) to kill capture jitter
    keys = [k for k in out[0] if k != "x"]
    for k in keys:
        v = np.array([f[k] for f in out])
        if len(v) > 2:
            sm = v.copy(); sm[1:-1] = (v[:-2] + 2 * v[1:-1] + v[2:]) / 4
            for f, s in zip(out, sm): f[k] = round(float(s), 2)
    clip = {"name": opt["name"] or re.sub(r"\.bvh$", "", inp.split("/")[-1]), "fps": opt["fps"], "frames": out, "src": inp.split("/")[-1],
            "travel": round(out[-1]["x"] - out[0]["x"], 3)}
    json.dump(clip, open(outp, "w"))
    print(clip["name"], len(out), "frames", "travel(leg-lengths)", clip["travel"], "hipH", round(min(f["hipH"] for f in out), 2), round(max(f["hipH"] for f in out), 2))

if __name__ == "__main__": main()
