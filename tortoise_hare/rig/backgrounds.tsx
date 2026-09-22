import React from "react";

const Tree: React.FC<{ x: number; y: number; s?: number; dark?: boolean; sway?: number }> = ({ x, y, s = 1, dark, sway = 0 }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <rect x={-18} y={-150} width={36} height={160} rx={8} fill="#5b3a21" />
    <g transform={`rotate(${sway})`}>
      <circle cx={0} cy={-190} r={95} fill={dark ? "#2f6b3a" : "#3f8a4a"} />
      <circle cx={-70} cy={-150} r={70} fill={dark ? "#2a5f33" : "#37793f"} />
      <circle cx={70} cy={-150} r={70} fill={dark ? "#357a42" : "#4a9a55"} />
      <circle cx={0} cy={-240} r={65} fill={dark ? "#3a8248" : "#56a862"} />
    </g>
  </g>
);
const Cloud: React.FC<{ x: number; y: number; s?: number }> = ({ x, y, s = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`} fill="#fff" opacity={0.95}>
    <ellipse cx={0} cy={0} rx={80} ry={32} /><circle cx={-35} cy={-14} r={34} /><circle cx={20} cy={-24} r={42} /><circle cx={55} cy={-8} r={30} />
  </g>
);
export type BgKind = "meadow" | "forest" | "tree" | "finish" | "sunset";
export const GROUND: Record<BgKind, number> = { meadow: 880, forest: 890, tree: 900, finish: 890, sunset: 850 };

export const Background: React.FC<{ kind: BgKind; t: number; camX: number }> = ({ kind, t, camX }) => {
  const sunset = kind === "sunset";
  const sky = sunset ? ["#5a3a6e", "#e0764b", "#f7c66a"] : ["#7ec8f5", "#b8e3fb", "#e6f6ff"];
  const grass = sunset ? ["#4f7a3a", "#3f6a30"] : ["#7cc463", "#5faa4c"];
  const g = GROUND[kind]; const sway = Math.sin(t * 1.3) * 1.5; const par = (f: number) => -camX * f;
  return (
    <g>
      <defs><linearGradient id={`sky-${kind}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={sky[0]} /><stop offset="0.6" stopColor={sky[1]} /><stop offset="1" stopColor={sky[2]} /></linearGradient></defs>
      <rect x={-2000} y={-200} width={6000} height={1500} fill={`url(#sky-${kind})`} />
      {sunset && <circle cx={1500} cy={560} r={110} fill="#ffd78a" opacity={0.9} />}
      <g transform={`translate(${par(0.15)} 0)`}>{[0, 1, 2, 3].map((i) => <Cloud key={i} x={-400 + i * 900 + ((t * 12) % 300)} y={140 + (i % 2) * 90} s={0.8 + (i % 3) * 0.25} />)}</g>
      <g transform={`translate(${par(0.3)} 0)`}>
        <path d={`M-2000 ${g - 120} Q -800 ${g - 300} 400 ${g - 150} T 2800 ${g - 200} T 5200 ${g - 120} V 1300 H -2000 Z`} fill={sunset ? "#7a5a7a" : "#9ad283"} opacity={0.8} />
        {kind !== "meadow" && [-1500, -900, -300, 300, 900, 1500, 2100, 2700, 3300].map((x, i) => <Tree key={i} x={x} y={g - 90} s={0.7 + (i % 3) * 0.15} dark sway={sway * 0.5} />)}
      </g>
      <rect x={-2000} y={g - 40} width={7000} height={600} fill={grass[0]} />
      <path d={`M-2000 ${g + 60} Q 0 ${g + 20} 1200 ${g + 60} T 5000 ${g + 60} V 1300 H -2000 Z`} fill={grass[1]} />
      <path d={`M-2000 ${g + 10} L 5000 ${g + 10} L 5000 ${g + 50} L -2000 ${g + 50} Z`} fill={sunset ? "#8a6a48" : "#c9a36a"} />
      <g transform={`translate(${par(0.6)} 0)`}>
        {kind === "forest" && [-1200, -500, 250, 1000, 1750, 2500, 3200].map((x, i) => <Tree key={i} x={x} y={g - 10} s={1.1 + (i % 2) * 0.2} sway={sway} />)}
        {kind === "tree" && <Tree x={1150} y={g} s={2.2} sway={sway} />}
        {kind === "sunset" && <Tree x={1500} y={g} s={1.6} dark sway={sway} />}
        {kind === "meadow" && [-900, 1850, 2700].map((x, i) => <Tree key={i} x={x} y={g - 10} s={1.2} sway={sway} />)}
      </g>
      {Array.from({ length: 40 }).map((_, i) => { const x = -1500 + i * 160 + ((i * 37) % 60); const c = ["#ffd54f", "#ff8a80", "#ea80fc", "#fff"][i % 4];
        return <g key={i} transform={`translate(${x} ${g + 30 + ((i * 13) % 20)})`}><line x1={0} y1={0} x2={0} y2={-14} stroke="#3e7d33" strokeWidth={3} /><circle cx={0} cy={-16} r={6} fill={c} /></g>; })}
    </g>
  );
};
export const FinishLine: React.FC<{ x: number; g: number; ribbon: number }> = ({ x, g, ribbon }) => (
  <g transform={`translate(${x} ${g})`}>
    <rect x={-6} y={-330} width={12} height={340} fill="#5b3a21" /><rect x={194} y={-330} width={12} height={340} fill="#5b3a21" />
    <rect x={-20} y={-370} width={240} height={50} rx={6} fill="#fff8e1" stroke="#5b3a21" strokeWidth={4} />
    <text x={100} y={-335} textAnchor="middle" fontFamily="Georgia, serif" fontWeight="bold" fontSize={30} fill="#3b2a1a">FINISH</text>
    {ribbon < 1 && <path d={`M 0 -200 Q 100 ${-200 + ribbon * 120} 200 -200`} stroke="#e53935" strokeWidth={8} fill="none" opacity={1 - ribbon} />}
    {ribbon > 0 && <><path d={`M 0 -200 Q ${20 + ribbon * 30} ${-150 + ribbon * 120} ${10 + ribbon * 40} ${-80 + ribbon * 80}`} stroke="#e53935" strokeWidth={8} fill="none" /><path d={`M 200 -200 Q ${180 - ribbon * 30} ${-150 + ribbon * 120} ${190 - ribbon * 40} ${-80 + ribbon * 80}`} stroke="#e53935" strokeWidth={8} fill="none" /></>}
  </g>
);
export const Crowd: React.FC<{ x: number; g: number; t: number; cheer: number }> = ({ x, g, t, cheer }) => (
  <g transform={`translate(${x} ${g})`}>
    {[["#8d6e63", 0], ["#ef9a9a", 1], ["#90a4ae", 2], ["#a1887f", 3], ["#ffcc80", 4]].map(([c, i]: any) => { const jump = cheer * Math.max(0, Math.sin(t * 9 + i * 1.3)) * 30;
      return (<g key={i} transform={`translate(${i * 70} ${-jump})`}><ellipse cx={0} cy={-38} rx={30} ry={38} fill={c} /><circle cx={-10} cy={-45} r={5} fill="#222" /><circle cx={10} cy={-45} r={5} fill="#222" />
        <path d={cheer > 0.5 ? "M-10 -28 Q0 -16 10 -28" : "M-8 -26 Q0 -22 8 -26"} stroke="#222" strokeWidth={3} fill="none" />
        <line x1={-30} y1={-30} x2={-48} y2={-70 * cheer - 10} stroke={c} strokeWidth={10} strokeLinecap="round" /><line x1={30} y1={-30} x2={48} y2={-70 * cheer - 10} stroke={c} strokeWidth={10} strokeLinecap="round" /></g>); })}
  </g>
);
export const Dust: React.FC<{ x: number; g: number; t: number; t0: number; dir?: number }> = ({ x, g, t, t0, dir = 1 }) => {
  const age = t - t0; if (age < 0 || age > 2.5) return null;
  return (<g>{Array.from({ length: 10 }).map((_, i) => { const a = age - i * 0.08; if (a < 0) return null; const r = 14 + a * 40; const op = Math.max(0, 0.55 - a * 0.3);
    return <circle key={i} cx={x - dir * (i * 40 + a * 60)} cy={g - 10 - a * 30 - (i % 3) * 12} r={r} fill="#d9c9a5" opacity={op} />; })}</g>);
};
export const Zzz: React.FC<{ x: number; y: number; t: number }> = ({ x, y, t }) => (
  <g>{[0, 1, 2].map((i) => { const ph = ((t * 0.5 + i * 0.33) % 1);
    return <text key={i} x={x + ph * 60 + i * 10} y={y - ph * 120} fontSize={26 + ph * 30} fontFamily="Georgia, serif" fontWeight="bold" fill="#fff" opacity={1 - ph} stroke="#2a3a5a" strokeWidth={2}>z</text>; })}</g>
);
export const SpeedLines: React.FC<{ x: number; y: number; dir: number; k: number }> = ({ x, y, dir, k }) => (
  <g opacity={k}>{[0, 1, 2, 3, 4].map((i) => <line key={i} x1={x - dir * 60} y1={y - 120 + i * 45} x2={x - dir * (160 + (i % 2) * 80)} y2={y - 120 + i * 45} stroke="#fff" strokeWidth={5} strokeLinecap="round" opacity={0.7} />)}</g>
);
export const Sweat: React.FC<{ x: number; y: number; t: number }> = ({ x, y, t }) => (
  <g>{[0, 1].map((i) => { const ph = ((t * 0.9 + i * 0.5) % 1); return <path key={i} transform={`translate(${x + i * 30} ${y + ph * 40}) scale(${1 - ph * 0.3})`} d="M0 -14 C 6 -4 8 2 8 6 A 8 8 0 1 1 -8 6 C -8 2 -6 -4 0 -14 Z" fill="#8ed6ff" opacity={1 - ph} />; })}</g>
);
export const Exclaim: React.FC<{ x: number; y: number; k: number }> = ({ x, y, k }) => (
  <g transform={`translate(${x} ${y}) scale(${k})`} opacity={Math.min(1, k)}>
    <path d="M-10 -60 L10 -60 L6 10 L-6 10 Z" fill="#ff5252" stroke="#7a1010" strokeWidth={3} /><circle cx={0} cy={28} r={9} fill="#ff5252" stroke="#7a1010" strokeWidth={3} />
  </g>
);
