#!/usr/bin/env python3
"""Objective motion-quality metrics for keyframe/pose data (character-animation-qa extension).

Input: JSON list of frames, each {"t": seconds, "pose": {part: {"rot": deg, ...}}}  (dump from the Remotion rig
by sampling SCENES[i].solve(t) every frame), or a rig_plan for limits.
Reports per part: max angular speed (deg/s), max angular acceleration, normalised jerk (smoothness),
% of frames at a joint limit, frozen spans, and pops (single-frame jumps). Exit 1 if any hard threshold fails.
"""
import json, sys, numpy as np

HARD = {"max_speed": 1400.0, "pop_deg": 25.0, "limit_frac": 0.35}     # deg/s, deg/frame, fraction of frames pinned at limit
SOFT = {"jerk": 2.5, "frozen_s": 2.5}

def series(frames, part):
    return np.array([f["pose"].get(part, {}).get("rot", 0.0) for f in frames], float)

def analyse(frames, limits=None):
    t = np.array([f["t"] for f in frames]); dt = np.median(np.diff(t)) if len(t) > 1 else 1 / 30
    parts = sorted({p for f in frames for p in f["pose"]})
    report, fails, warns = {}, [], []
    for p in parts:
        x = series(frames, p)
        if len(x) < 4: continue
        v = np.gradient(x, dt); a = np.gradient(v, dt); j = np.gradient(a, dt)
        rng = max(1e-6, x.max() - x.min()); dur = max(1e-6, t[-1] - t[0])
        # dimensionless jerk (Hogan & Sternad): sqrt(∫j² dt · dur^5 / range²) -> lower = smoother
        nj = float(np.sqrt(np.trapezoid(j * j, t) * dur ** 5 / rng ** 2)) / 1e4 if rng > 2 else 0.0
        pops = int((np.abs(np.diff(x)) > HARD["pop_deg"]).sum())
        # frozen: longest run with |v| < 1 deg/s while the part moves elsewhere in the clip
        still = np.abs(v) < 1.0; run = best = 0
        for s in still: run = run + 1 if s else 0; best = max(best, run)
        frozen_s = best * dt if rng > 5 else 0.0
        lim_frac = 0.0
        if limits and p in limits:
            lo, hi = limits[p]; lim_frac = float(((x <= lo + 0.5) | (x >= hi - 0.5)).mean())
        r = {"max_speed": float(np.abs(v).max()), "max_accel": float(np.abs(a).max()), "jerk": nj, "pops": pops, "frozen_s": float(frozen_s), "limit_frac": lim_frac, "range": float(rng)}
        report[p] = r
        if r["max_speed"] > HARD["max_speed"]: fails.append(f"{p}: angular speed {r['max_speed']:.0f} deg/s (pop / too fast)")
        if pops: fails.append(f"{p}: {pops} single-frame jump(s) > {HARD['pop_deg']} deg")
        if lim_frac > HARD["limit_frac"]: fails.append(f"{p}: pinned at joint limit {lim_frac*100:.0f}% of the time (pose exceeds constraint)")
        if nj > SOFT["jerk"]: warns.append(f"{p}: jerky (normalised jerk {nj:.2f})")
        if frozen_s > SOFT["frozen_s"]: warns.append(f"{p}: frozen for {frozen_s:.1f}s (dead / needs breathing or hold-with-life)")
    return report, fails, warns

def load_limits(rig_plan_path):
    plan = json.load(open(rig_plan_path)); return {k: v["rotation"] for k, v in plan.get("joints", {}).items() if "rotation" in v}

if __name__ == "__main__":
    if len(sys.argv) < 2: print(__doc__); sys.exit(2)
    frames = json.load(open(sys.argv[1])); limits = load_limits(sys.argv[2]) if len(sys.argv) > 2 else None
    report, fails, warns = analyse(frames, limits)
    for p, r in report.items(): print(f"{p:12} speed {r['max_speed']:7.0f}  jerk {r['jerk']:6.2f}  pops {r['pops']}  frozen {r['frozen_s']:4.1f}s  atLimit {r['limit_frac']*100:3.0f}%")
    for w in warns: print("  ⚠", w)
    for f in fails: print("  ✗", f)
    print("MOTION QA:", "FAIL" if fails else ("PASS with warnings" if warns else "PASS")); sys.exit(1 if fails else 0)
