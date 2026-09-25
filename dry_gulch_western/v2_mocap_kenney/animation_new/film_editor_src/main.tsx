import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Player, PlayerRef } from "@remotion/player";
import { Main, SCENES, applyOverrides, Overrides, OvKey, Frame } from "@west/Main";
import { CHARS } from "@west/characters";
import { GROUND } from "@west/backgrounds";
import { Pose, CharState } from "@west/Rig";
import props from "./props.json";

const FPS = 30, W = 1920, H = 1080, DUR = 77.6;
const CHAR_IDS = ["hare", "tort"] as const; type Cid = typeof CHAR_IDS[number];
const NAMES: Record<Cid, string> = { hare: "Rusty", tort: "Sheriff June" };
const LS = "dry_gulch_overrides";
const ease: any = { linear: (p: number) => p, inOut: (p: number) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2), out: (p: number) => 1 - Math.pow(1 - p, 3), in: (p: number) => p * p * p, backOut: (p: number) => 1 + 2.70158 * Math.pow(p - 1, 3) + 1.70158 * Math.pow(p - 1, 2) };

// ---------- joint math (mirrors Rig.tsx) ----------
function jointScreen(id: Cid, st: CharState, g: number, zoom: number, camX: number, camY: number) {
  const C = CHARS[id]; const parts = C.rig.parts; const rest = C.rig.rest || {};
  const local = (n: string) => { const j = st.pose[n] || {}; const r = rest[n] || {}; const [px, py] = parts[n].pivot; const lim = parts[n].rotation; let rot = (j.rot ?? 0) + (r.rot ?? 0); if (lim) rot = Math.min(lim[1], Math.max(lim[0], rot));
    return new DOMMatrix().translate(px + (j.x ?? 0) + (r.x ?? 0), py + (j.y ?? 0) + (r.y ?? 0)).rotate(rot).scale(j.sx ?? 1, j.sy ?? 1).translate(-px, -py); };
  const world = (n: string) => { let m = new DOMMatrix(); const chain: string[] = []; let k: string | null = n; while (k) { chain.unshift(k); k = parts[k].parent; } for (const c of chain) m = m.multiply(local(c)); return m; };
  const [fx, fy] = C.rig.foot; const s = st.scale; const sq = st.squash ?? 0;
  const root = new DOMMatrix().translate(W / 2, H / 2).scale(zoom).translate(-W / 2 - camX, -H / 2 - camY)
    .translate(st.x, g + st.y + (st.bob ?? 0)).scale(s * st.facing * (1 + sq * 0.5), s * (1 - sq)).rotate(st.lean ?? 0).translate(-fx, -fy);
  const out: Record<string, { x: number; y: number; parentM: DOMMatrix; m: DOMMatrix }> = {};
  for (const n of Object.keys(parts)) { const pm = root.multiply(parts[n].parent ? world(parts[n].parent) : new DOMMatrix()); const m = root.multiply(world(n)); const p = m.transformPoint(new DOMPoint(parts[n].pivot[0], parts[n].pivot[1])); out[n] = { x: p.x, y: p.y, parentM: pm, m }; }
  return out;
}

function App() {
  const player = useRef<PlayerRef>(null);
  const [t, setT] = useState(0); const [playing, setPlaying] = useState(false);
  const [ov, setOv] = useState<Overrides>(() => { try { return JSON.parse(localStorage.getItem(LS) || "{}"); } catch { return {}; } });
  const [selChar, setSelChar] = useState<Cid>("hare"); const [selPart, setSelPart] = useState<string | null>(null);
  const [showJoints, setShowJoints] = useState(true); const [snap, setSnap] = useState(0.1); const [ikOn, setIk] = useState(true);
  const [msg, setMsg] = useState(""); const boxRef = useRef<HTMLDivElement>(null); const [pro, setPro] = useState(false);
  useEffect(() => { localStorage.setItem(LS, JSON.stringify(ov)); }, [ov]);
  useEffect(() => { const p = player.current; if (!p) return; const onF = (e: any) => setT(e.detail.frame / FPS); p.addEventListener("frameupdate", onF); p.addEventListener("play", () => setPlaying(true)); p.addEventListener("pause", () => setPlaying(false)); return () => p.removeEventListener("frameupdate", onF); }, []);
  const sc = SCENES.find((s) => t >= s.start && t < s.end) ?? SCENES[SCENES.length - 1]; const lt = t - sc.start;
  const base: Frame = useMemo(() => sc.solve(lt), [sc, lt]);
  const frame: Frame = useMemo(() => applyOverrides(base, sc, lt, ov), [base, sc, lt, ov]);
  const g = GROUND[sc.bg]; const zoom = frame.zoom ?? 1, camX = frame.camX ?? 0, camY = frame.camY ?? 0;
  const seek = (sec: number) => { player.current?.seekTo(Math.round(Math.max(0, Math.min(DUR - 0.04, sec)) * FPS)); setT(sec); };
  const keysFor = (cid: Cid) => (ov[sc.id]?.[cid] || []).slice().sort((a, b) => a.t - b.t);
  const keyAt = (cid: Cid) => keysFor(cid).find((k) => Math.abs(k.t - lt) < 0.02);
  const upsertKey = (cid: Cid, patch: Partial<OvKey>) => {
    setOv((o) => { const so = { ...(o[sc.id] || {}) }; const ks = (so[cid] || []).slice(); const kt = Math.round(lt / snap) * snap; let i = ks.findIndex((k) => Math.abs(k.t - kt) < 0.02);
      if (i < 0) { // new key: start from the current interpolated delta so the drag continues smoothly
        const cur = interpDelta(ks, kt); ks.push({ t: +kt.toFixed(2), ease: "inOut", ...cur }); i = ks.length - 1; }
      ks[i] = { ...ks[i], ...patch, pose: patch.pose ? { ...(ks[i].pose || {}), ...patch.pose } : ks[i].pose }; so[cid] = ks; return { ...o, [sc.id]: so }; }); };
  const delKey = (cid: Cid, kt: number) => setOv((o) => { const so = { ...(o[sc.id] || {}) }; so[cid] = (so[cid] || []).filter((k) => Math.abs(k.t - kt) > 0.01); return { ...o, [sc.id]: so }; });
  // --- dragging joints on top of the player ---
  const dragRef = useRef<any>(null);
  const toStage = (e: React.PointerEvent) => { const r = boxRef.current!.getBoundingClientRect(); return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H }; };
  const joints = useMemo(() => { const o: any = {}; for (const cid of CHAR_IDS) { const st = (frame as any)[cid] as CharState | undefined; if (st) o[cid] = jointScreen(cid, st, g, zoom, camX, camY); } return o; }, [frame, g, zoom, camX, camY]);
  const onDown = (cid: Cid, part: string, e: React.PointerEvent) => { e.preventDefault(); player.current?.pause(); setSelChar(cid); setSelPart(part); const p = toStage(e); const J = joints[cid][part];
    const curDelta = ((frame as any)[cid].pose[part]?.rot ?? 0) - ((base as any)[cid].pose[part]?.rot ?? 0); const kx = keyAt(cid)?.x ?? interpDelta(keysFor(cid), lt).x ?? 0; const ky = keyAt(cid)?.y ?? interpDelta(keysFor(cid), lt).y ?? 0;
    dragRef.current = { cid, part, start: p, a0: Math.atan2(p.y - J.y, p.x - J.x), r0: curDelta, x0: kx, y0: ky, shift: e.shiftKey, root: part === "hips" }; boxRef.current?.setPointerCapture(e.pointerId); };
  const onMove = (e: React.PointerEvent) => { const d = dragRef.current; if (!d) return; const p = toStage(e); const st: CharState = (frame as any)[d.cid];
    if (d.root) { upsertKey(d.cid, { x: d.x0 + (p.x - d.start.x) / zoom, y: d.y0 + (p.y - d.start.y) / zoom }); return; }
    const J = jointScreen(d.cid, (base as any)[d.cid], g, zoom, camX, camY)[d.part]; // pivot from base (stable while dragging)
    const Jc = joints[d.cid][d.part];
    const C = CHARS[d.cid]; const parent = C.rig.parts[d.part].parent; const isEnd = /^(larm|shin)_/.test(d.part);
    if (ikOn && !d.shift && isEnd && parent) { // 2-bone IK computed against the BASE (code) pose, so deltas are absolute, not accumulated
      const up = parent; const bj = jointScreen(d.cid, (base as any)[d.cid], g, zoom, camX, camY); const A = bj[up], B = bj[d.part]; const child = Object.keys(C.rig.parts).find((k) => C.rig.parts[k].parent === d.part);
      const Tp = child ? bj[child] : { x: B.x + (B.x - A.x) * 0.9, y: B.y + (B.y - A.y) * 0.9 };
      const l1 = Math.hypot(B.x - A.x, B.y - A.y), l2 = Math.hypot(Tp.x - B.x, Tp.y - B.y); let dx = p.x - A.x, dy = p.y - A.y, dd = Math.hypot(dx, dy); dd = Math.max(Math.abs(l1 - l2) + 0.01, Math.min(l1 + l2 - 0.01, dd));
      const w = (r: number) => ((r + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI; const sgn = (bj[up].parentM.a * bj[up].parentM.d - bj[up].parentM.b * bj[up].parentM.c) < 0 ? -1 : 1;
      const a1c = Math.atan2(B.y - A.y, B.x - A.x), a2c = Math.atan2(Tp.y - B.y, Tp.x - B.x); const lim1 = C.rig.parts[up].rotation, lim2 = C.rig.parts[d.part].rotation; const base1 = (base as any)[d.cid].pose[up]?.rot ?? 0, base2 = (base as any)[d.cid].pose[d.part]?.rot ?? 0;
      let best: any = null;
      for (const bend of [1, -1]) { const a1 = Math.atan2(dy, dx) - bend * Math.acos((l1 * l1 + dd * dd - l2 * l2) / (2 * l1 * dd)); const Bn = { x: A.x + l1 * Math.cos(a1), y: A.y + l1 * Math.sin(a1) }; const a2 = Math.atan2(p.y - Bn.y, p.x - Bn.x);
        const dUp = sgn * w(a1 - a1c) * 180 / Math.PI, dLo = sgn * w((a2 - a2c) - (a1 - a1c)) * 180 / Math.PI; const r1 = base1 + dUp, r2 = base2 + dLo;
        const pen = (lim1 ? Math.max(0, lim1[0] - r1, r1 - lim1[1]) : 0) + (lim2 ? Math.max(0, lim2[0] - r2, r2 - lim2[1]) : 0); const cost = pen * 10 + Math.abs(dUp) + Math.abs(dLo);
        if (!best || cost < best.cost) best = { cost, dUp, dLo }; }
      upsertKey(d.cid, { pose: { [up]: { rot: +best.dUp.toFixed(1) }, [d.part]: { rot: +best.dLo.toFixed(1) } } }); return; }
    const a = Math.atan2(p.y - Jc.y, p.x - Jc.x); let da = a - d.a0; const dist = Math.hypot(p.x - Jc.x, p.y - Jc.y); if (dist < 120) da *= dist / 120; da = ((da + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI; const pm = Jc.parentM; const sgn = (pm.a * pm.d - pm.b * pm.c) < 0 ? -1 : 1; const rot = d.r0 + sgn * da * 180 / Math.PI; upsertKey(d.cid, { pose: { [d.part]: { rot: +rot.toFixed(1) } } }); };
  const onUp = () => { dragRef.current = null; };
  const exportJson = () => { const blob = new Blob([JSON.stringify(ov, null, 1)], { type: "application/json" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "overrides.json"; a.click(); setMsg("overrides.json downloaded — drop it in /home/user and I'll bake it into the render"); };
  const saveServer = async () => { try { const r = await fetch("/__save", { method: "POST", body: JSON.stringify(ov) }); setMsg(r.ok ? "saved to /home/user/film_editor/overrides.json ✓" : "save failed"); } catch { setMsg("save failed"); } };
  const importJson = (f: File) => { const r = new FileReader(); r.onload = () => { try { setOv(JSON.parse(r.result as string)); setMsg("imported"); } catch { setMsg("bad json"); } }; r.readAsText(f); };
  const inputProps = useMemo(() => ({ ...(props as any), audio: "narration_full.wav", overrides: ov }), [ov]);
  const selKeys = keysFor(selChar); const curKey = keyAt(selChar);
  const parts = Object.keys(CHARS[selChar].rig.parts);
  const dirty = Object.keys(ov).length > 0;
  const stage = (
    <div ref={boxRef} style={{ position: "relative", width: "100%", aspectRatio: "16/9", maxHeight: "100%", background: "#000" }} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
      <Player ref={player} component={Main as any} inputProps={inputProps} durationInFrames={Math.round(DUR * FPS)} fps={FPS} compositionWidth={W} compositionHeight={H} style={{ width: "100%", height: "100%" }} controls={false} clickToPlay={false} />
      {showJoints && !playing && <svg viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
        {CHAR_IDS.map((cid) => joints[cid] && Object.entries(joints[cid] as any).filter(([n]) => !/^(hat|hair|hair_back|neck)$/.test(n)).sort(([x], [y]) => (x === "hips" ? 1 : 0) - (y === "hips" ? 1 : 0)).map(([n, j]: any) => (
          <g key={cid + n} onPointerDown={(e) => onDown(cid, n, e)} style={{ cursor: "grab", pointerEvents: "all" }}>
            <circle data-c={cid} data-j={n} cx={j.x} cy={j.y} r={n === "hips" ? 15 : 10} fill={selChar === cid && selPart === n ? "#ffd66b" : n === "hips" ? "#3b9cff" : cid === "hare" ? "#f44" : "#4c4"} stroke="#fff" strokeWidth={2} opacity={0.8} />
          </g>)))}
      </svg>}
      {!playing && !pro && <div style={{ position: "absolute", left: 12, top: 10, color: "#fff", textShadow: "0 1px 3px #000", fontSize: 13, opacity: 0.85 }}>{sc.id} · {t.toFixed(2)}s {curKey ? "· key ●" : ""}</div>}
    </div>);
  const controls = (
    <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "8px 12px", background: "#24252d", borderTop: "1px solid #000" }}>
      <button style={{ ...btn, width: 44, fontSize: 16 }} title="prev key  [" onClick={() => jumpKey(-1)}>«</button>
      <button style={{ ...btn, width: 44, fontSize: 16 }} title="step back ," onClick={() => seek(t - 1 / FPS)}>‹</button>
      <button style={{ ...btn, width: 64, fontSize: 18, background: playing ? "#555" : "#2d6cdf" }} title="space" onClick={() => (playing ? player.current?.pause() : player.current?.play())}>{playing ? "❚❚" : "▶"}</button>
      <button style={{ ...btn, width: 44, fontSize: 16 }} title="step fwd ." onClick={() => seek(t + 1 / FPS)}>›</button>
      <button style={{ ...btn, width: 44, fontSize: 16 }} title="next key  ]" onClick={() => jumpKey(1)}>»</button>
      <span style={{ fontFamily: "monospace", width: 150, textAlign: "center", whiteSpace: "nowrap" }}>{fmt(t)} / {fmt(DUR)}</span>
      <Scrub t={t} ov={ov} selChar={selChar} onSeek={seek} />
      <select style={inp} value={selChar} onChange={(e) => setSelChar(e.target.value as Cid)} title="which character's keys to navigate">{CHAR_IDS.map((c) => <option key={c} value={c}>{NAMES[c]}</option>)}</select>
      {curKey && <button style={{ ...btn, background: "#a33" }} title="delete key at this time" onClick={() => delKey(selChar, curKey.t)}>✕ key</button>}
      <button style={{ ...btn, background: dirty ? "#2d6cdf" : "#3a3b45" }} onClick={saveServer}>Save</button>
      <button style={btn} onClick={() => setPro(!pro)}>{pro ? "Simple" : "Details"}</button>
    </div>);
  function jumpKey(dir: 1 | -1) { const ks = SCENES.flatMap((s) => (ov[s.id]?.[selChar] || []).map((k) => s.start + k.t)).sort((a, b) => a - b); const n = dir > 0 ? ks.find((k) => k > t + 0.03) : ks.filter((k) => k < t - 0.03).pop(); if (n != null) seek(n); }
  useEffect(() => { const h = (e: KeyboardEvent) => { const tg = (e.target as any).tagName; if (tg === "INPUT" || tg === "SELECT" || tg === "TEXTAREA") return; if (e.code === "Space") { e.preventDefault(); playing ? player.current?.pause() : player.current?.play(); } if (e.key === ",") seek(t - 1 / FPS); if (e.key === ".") seek(t + 1 / FPS); if (e.key === "[") jumpKey(-1); if (e.key === "]") jumpKey(1); if (e.key === "s" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); saveServer(); } };
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h); });
  if (!pro) return (
    <div style={{ userSelect: "none", display: "flex", flexDirection: "column", height: "100vh" }}>
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "#000", minHeight: 0 }}>{stage}</div>
      {controls}
      {msg && <div style={{ position: "fixed", right: 14, bottom: 60, background: "#2d6cdf", color: "#fff", padding: "6px 12px", borderRadius: 6, fontSize: 12 }}>{msg}</div>}
    </div>);
  return (
    <div style={{ userSelect: "none", display: "grid", gridTemplateColumns: "300px 1fr 280px", gridTemplateRows: "44px 1fr auto", height: "100vh" }}>
      <div style={{ gridColumn: "1/4", display: "flex", gap: 10, alignItems: "center", padding: "0 12px", background: "#2a2b33", borderBottom: "1px solid #000" }}>
        <b>Film Editor — The Fastest Draw in Dry Gulch</b>
        <span style={{ color: "#9ab" }}>scene <b style={{ color: "#ffd66b" }}>{sc.id}</b> · {sc.bg} · t={t.toFixed(2)}s (scene {lt.toFixed(2)}s)</span>
        <label><input type="checkbox" checked={showJoints} onChange={(e) => setShowJoints(e.target.checked)} /> joints</label>
        <label><input type="checkbox" checked={ikOn} onChange={(e) => setIk(e.target.checked)} /> IK</label>
        <label>snap <select value={snap} onChange={(e) => setSnap(+e.target.value)}><option value={0.033}>frame</option><option value={0.1}>0.1s</option><option value={0.25}>0.25s</option></select></label>
        <span style={{ flex: 1 }} /><span style={{ color: "#9f9", fontSize: 12 }}>{msg}</span>
        <label style={btn}>Import<input type="file" accept=".json" hidden onChange={(e) => e.target.files && importJson(e.target.files[0])} /></label>
        <button style={btn} onClick={exportJson}>Download JSON</button>
        <button style={{ ...btn, background: "#a33" }} onClick={() => { if (confirm("Clear all edits?")) setOv({}); }}>Clear all</button>
      </div>
      <div style={{ overflow: "auto", padding: 10, background: "#24252d" }}>
        <h3 style={h3}>Scenes</h3>
        {SCENES.map((s) => { const n = CHAR_IDS.reduce((a, c) => a + (ov[s.id]?.[c]?.length || 0), 0); return (
          <div key={s.id} onClick={() => seek(s.start + 0.05)} style={{ padding: "6px 8px", margin: "3px 0", borderRadius: 4, cursor: "pointer", background: s.id === sc.id ? "#3d4a6b" : "#2f3039", display: "flex", justifyContent: "space-between" }}>
            <span><b>{s.id}</b> <span style={{ color: "#9ab" }}>{s.bg}</span></span><span style={{ color: "#aaa" }}>{s.start.toFixed(1)}–{s.end.toFixed(1)}s {n ? <b style={{ color: "#ffd66b" }}>●{n}</b> : ""}</span></div>); })}
        <h3 style={h3}>Joint offsets · {NAMES[selChar]} {curKey ? <span style={{ color: "#ffd66b" }}>(key @{curKey.t.toFixed(2)})</span> : <span style={{ color: "#888" }}>(drag/slide to create key)</span>}</h3>
        {parts.filter((p) => p !== "hips").map((p) => { const v = curKey?.pose?.[p]?.rot ?? interpDelta(selKeys, lt).pose?.[p]?.rot ?? 0; const lim = CHARS[selChar].rig.parts[p].rotation || [-180, 180]; return (
          <div key={p} style={{ display: "flex", alignItems: "center", gap: 6, margin: "2px 0", color: selPart === p ? "#ffd66b" : "#ccc" }}>
            <label style={{ width: 64, fontFamily: "monospace", fontSize: 11 }} onClick={() => setSelPart(p)}>{p}</label>
            <input type="range" min={lim[0] - 90} max={lim[1] + 90} value={v} style={{ flex: 1 }} onChange={(e) => { setSelPart(p); upsertKey(selChar, { pose: { [p]: { rot: +e.target.value } } }); }} />
            <input type="number" value={Math.round(v)} style={{ width: 50, ...inp }} onChange={(e) => upsertKey(selChar, { pose: { [p]: { rot: +e.target.value } } })} /></div>); })}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}><label style={{ width: 64, fontFamily: "monospace", fontSize: 11 }}>face</label>
          <select style={inp} value={curKey?.face || ""} onChange={(e) => upsertKey(selChar, { face: e.target.value || undefined })}><option value="">(scene default)</option>{Object.keys(CHARS[selChar].faces || {}).map((f) => <option key={f}>{f}</option>)}</select></div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}><label style={{ width: 64, fontFamily: "monospace", fontSize: 11 }}>ease in</label>
          <select style={inp} value={curKey?.ease || "inOut"} onChange={(e) => upsertKey(selChar, { ease: e.target.value })}>{["inOut", "backOut", "out", "in", "linear"].map((f) => <option key={f}>{f}</option>)}</select></div>
      </div>
      <div style={{ position: "relative", background: "#000", display: "flex", alignItems: "center", justifyContent: "center", minHeight: 0 }}>{stage}</div>
      <div style={{ overflow: "auto", padding: 10, background: "#24252d", fontSize: 12, lineHeight: 1.45 }}>
        <h3 style={h3}>How it works</h3>
        <div style={{ color: "#aab" }}>Pause anywhere, drag a joint: that creates a <b>correction key</b> (offset on top of the scene code) at this time. Between your keys the offset is interpolated; outside them nothing changes.<br />• red/green dots rotate parts (hands/feet = IK, Shift = single part) · blue dot moves the character<br />• <b>Save</b> only writes <code>film_editor/overrides.json</code> — nothing runs. Tell me when to read it.</div>
        <h3 style={h3}>Keys · {NAMES[selChar]} · {sc.id}</h3>
        {selKeys.length === 0 && <div style={{ color: "#777" }}>none yet</div>}
        {selKeys.map((k) => <div key={k.t} onClick={() => seek(sc.start + k.t)} style={{ padding: "4px 6px", margin: "2px 0", borderRadius: 4, cursor: "pointer", background: curKey === k ? "#4a4320" : "#2f3039", display: "flex", justifyContent: "space-between" }}>
          <span>@{k.t.toFixed(2)}s <span style={{ color: "#9ab" }}>{k.ease || "inOut"}</span></span><span style={{ color: "#aaa" }}>{Object.keys(k.pose || {}).length} joints{k.x ? ` x${Math.round(k.x)}` : ""}{k.face ? ` ${k.face}` : ""}</span></div>)}
      </div>
      <div style={{ gridColumn: "1/4" }}>{controls}</div>
    </div>);
}
const fmt = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toFixed(2).padStart(5, "0")}`;
function Scrub({ t, ov, selChar, onSeek }: any) {
  const ref = useRef<HTMLDivElement>(null); const [drag, setDrag] = useState(false);
  const pos = (e: React.PointerEvent) => { const r = ref.current!.getBoundingClientRect(); return Math.max(0, Math.min(DUR, ((e.clientX - r.left) / r.width) * DUR)); };
  return (
    <div ref={ref} style={{ position: "relative", flex: 1, height: 26, background: "#15161c", borderRadius: 13, cursor: "pointer", overflow: "hidden" }}
      onPointerDown={(e) => { setDrag(true); onSeek(pos(e)); (e.currentTarget as any).setPointerCapture(e.pointerId); }} onPointerMove={(e) => drag && onSeek(pos(e))} onPointerUp={() => setDrag(false)}>
      {SCENES.map((s: any, i: number) => <div key={s.id} title={s.id} style={{ position: "absolute", left: `${(s.start / DUR) * 100}%`, width: `${((s.end - s.start) / DUR) * 100}%`, top: 0, bottom: 0, background: i % 2 ? "#23242d" : "#2a2b35" }} />)}
      <div style={{ position: "absolute", left: 0, width: `${(t / DUR) * 100}%`, top: 0, bottom: 0, background: "#2d6cdf55" }} />
      {SCENES.map((s: any) => (["hare", "tort"] as const).map((cid) => (ov[s.id]?.[cid] || []).map((k: any) => <div key={s.id + cid + k.t} style={{ position: "absolute", left: `calc(${((s.start + k.t) / DUR) * 100}% - 3px)`, top: cid === "hare" ? 4 : 14, width: 6, height: 8, background: cid === "hare" ? "#f44" : "#4c4", opacity: cid === selChar ? 1 : 0.45, borderRadius: 2 }} />)))}
      <div style={{ position: "absolute", left: `calc(${(t / DUR) * 100}% - 1px)`, top: 0, bottom: 0, width: 2, background: "#ffd66b" }} />
    </div>);
}
function interpDelta(ks: OvKey[], lt: number): { pose?: Pose; x?: number; y?: number } {
  if (!ks.length) return {}; const s = ks.slice().sort((a, b) => a.t - b.t); let a = s[0], b = s[0]; for (const k of s) { if (k.t <= lt) a = k; if (k.t >= lt) { b = k; break; } b = k; }
  const p = b.t > a.t ? ease[b.ease || "inOut"](Math.max(0, Math.min(1, (lt - a.t) / (b.t - a.t)))) : 1; const pose: Pose = {};
  new Set([...Object.keys(a.pose || {}), ...Object.keys(b.pose || {})]).forEach((k) => { pose[k] = { rot: +((a.pose?.[k]?.rot ?? 0) + ((b.pose?.[k]?.rot ?? 0) - (a.pose?.[k]?.rot ?? 0)) * p).toFixed(1) }; });
  return { pose, x: (a.x ?? 0) + ((b.x ?? 0) - (a.x ?? 0)) * p, y: (a.y ?? 0) + ((b.y ?? 0) - (a.y ?? 0)) * p };
}
const btn: React.CSSProperties = { background: "#3a3b45", color: "#eee", border: "1px solid #555", borderRadius: 4, padding: "4px 10px", cursor: "pointer", font: "inherit" };
const inp: React.CSSProperties = { background: "#3a3b45", color: "#eee", border: "1px solid #555", borderRadius: 4, padding: "2px 4px", font: "inherit" };
const h3: React.CSSProperties = { margin: "10px 0 4px", fontSize: 11, color: "#9ab", textTransform: "uppercase", letterSpacing: ".06em" };
createRoot(document.getElementById("root")!).render(<App />);
