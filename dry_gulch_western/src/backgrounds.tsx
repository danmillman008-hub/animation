import React from "react";

export type BgKind = "street" | "saloon" | "fence" | "porch" | "sunset";
export const GROUND: Record<BgKind, number> = { street: 880, saloon: 890, fence: 890, porch: 900, sunset: 860 };

const Cactus: React.FC<{ x: number; y: number; s?: number }> = ({ x, y, s = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <rect x={-14} y={-150} width={28} height={150} rx={14} fill="#4f7a3a" />
    <rect x={-52} y={-110} width={22} height={60} rx={11} fill="#4f7a3a" /><rect x={-52} y={-70} width={50} height={20} rx={10} fill="#4f7a3a" />
    <rect x={30} y={-125} width={22} height={70} rx={11} fill="#4f7a3a" /><rect x={0} y={-80} width={50} height={20} rx={10} fill="#4f7a3a" />
  </g>
);
const Building: React.FC<{ x: number; y: number; w: number; h: number; color: string; sign?: string; dark?: boolean }> = ({ x, y, w, h, color, sign, dark }) => (
  <g transform={`translate(${x} ${y})`}>
    <rect x={0} y={-h} width={w} height={h} fill={color} />
    <rect x={-8} y={-h - 40} width={w + 16} height={44} fill={dark ? "#4b3320" : "#6b4a2b"} />
    <rect x={-8} y={-h - 40} width={w + 16} height={8} fill={dark ? "#3a2716" : "#4b3320"} />
    {[...Array(Math.max(1, Math.floor(w / 90)))].map((_, i) => <rect key={i} x={30 + i * 90} y={-h + 50} width={40} height={60} fill="#2b2418" stroke="#4b3320" strokeWidth={4} />)}
    <rect x={w / 2 - 28} y={-90} width={56} height={90} fill="#2b2418" />
    <rect x={-6} y={-130} width={w + 12} height={10} fill={dark ? "#3a2716" : "#4b3320"} />
    {[...Array(Math.floor(w / 60) + 1)].map((_, i) => <rect key={i} x={i * 60} y={-130} width={6} height={130} fill={dark ? "#3a2716" : "#4b3320"} />)}
    {sign && <text x={w / 2} y={-h - 10} textAnchor="middle" fontFamily="Georgia, serif" fontWeight="bold" fontSize={26} fill="#f2d68c">{sign}</text>}
  </g>
);
const Fence: React.FC<{ x: number; g: number; cans: boolean[] }> = ({ x, g, cans }) => (
  <g transform={`translate(${x} ${g})`}>
    <rect x={0} y={-60} width={560} height={10} fill="#8a6a45" /><rect x={0} y={-30} width={560} height={10} fill="#8a6a45" />
    {[0, 1, 2, 3, 4, 5].map((i) => <rect key={i} x={i * 110} y={-110} width={16} height={110} fill="#6b4a2b" />)}
    {cans.map((up, i) => up && <g key={i} transform={`translate(${i * 110 + 8} -110)`}><rect x={-10} y={-26} width={20} height={26} rx={3} fill="#c9c9c9" stroke="#8a8a8a" strokeWidth={2} /><rect x={-10} y={-18} width={20} height={6} fill="#b3332a" /></g>)}
  </g>
);
export const Can: React.FC<{ x: number; y: number; rot: number; s?: number }> = ({ x, y, rot, s = 1 }) => (
  <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}><rect x={-10} y={-13} width={20} height={26} rx={3} fill="#c9c9c9" stroke="#8a8a8a" strokeWidth={2} /><rect x={-10} y={-5} width={20} height={6} fill="#b3332a" /></g>
);

export const Background: React.FC<{ kind: BgKind; t: number; camX: number; cans?: boolean[] }> = ({ kind, t, camX, cans }) => {
  const g = GROUND[kind]; const par = (f: number) => -camX * f;
  const sky = kind === "sunset" ? ["#f6a05a", "#f0c070", "#5b3a5a"] : ["#8fc7ee", "#cfe6f5", "#e9d9b0"];
  const sun = kind === "sunset" ? { x: 1500, y: 720, r: 120, c: "#ffd27a" } : { x: 1620, y: 150, r: 70, c: "#fff3c4" };
  return (
    <g>
      <defs><linearGradient id="skyw" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={sky[0]} /><stop offset="0.75" stopColor={sky[1]} /><stop offset="1" stopColor={sky[2]} /></linearGradient></defs>
      <rect width={1920} height={1080} fill="url(#skyw)" />
      <circle cx={sun.x} cy={sun.y} r={sun.r} fill={sun.c} opacity={0.95} />
      {/* mesas */}
      <g transform={`translate(${par(0.06)} 0)`} opacity={0.6}>
        <path d={`M-200 ${g - 240} L 100 ${g - 260} L 260 ${g - 420} L 520 ${g - 420} L 640 ${g - 260} L 1200 ${g - 250} L 1350 ${g - 380} L 1600 ${g - 380} L 1720 ${g - 250} L 2400 ${g - 240} L 2400 ${g} L -200 ${g} Z`} fill={kind === "sunset" ? "#7a4a5a" : "#c98b5b"} />
      </g>
      <g transform={`translate(${par(0.15)} 0)`}>
        <Cactus x={-100} y={g - 40} s={0.8} /><Cactus x={2100} y={g - 30} s={1.1} />
        {(kind === "street" || kind === "sunset") && <><Cactus x={1750} y={g - 20} s={0.9} /><Cactus x={150} y={g - 25} s={0.7} /></>}
      </g>
      {/* town */}
      <g transform={`translate(${par(0.3)} 0)`}>
        {(kind === "street" || kind === "fence" || kind === "sunset") && <>
          <Building x={250} y={g - 20} w={300} h={260} color="#b98a5a" sign="GENERAL STORE" dark={kind === "sunset"} />
          <Building x={620} y={g - 20} w={220} h={220} color="#a97848" sign="BANK" dark={kind === "sunset"} />
          <Building x={1300} y={g - 20} w={360} h={300} color="#c39a66" sign="SALOON" dark={kind === "sunset"} />
        </>}
        {(kind === "saloon" || kind === "porch") && <>
          <Building x={-80} y={g - 20} w={900} h={320} color="#c39a66" sign="SALOON" />
          <Building x={1150} y={g - 20} w={330} h={260} color="#a97848" sign="SHERIFF" />
        </>}
      </g>
      {kind === "porch" && <g><rect x={-100} y={g - 30} width={1000} height={30} fill="#7a5533" /><rect x={-100} y={g - 40} width={1000} height={12} fill="#8a6a45" />{[0, 1, 2, 3].map((i) => <rect key={i} x={i * 300 + 40} y={g - 400} width={22} height={370} fill="#6b4a2b" />)}<rect x={-100} y={g - 420} width={1000} height={28} fill="#5a4328" /></g>}
      {kind === "fence" && <Fence x={1250} g={g} cans={cans ?? [true, true, true, true, true, true]} />}
      {/* ground */}
      <rect x={0} y={g} width={1920} height={1080 - g} fill={kind === "sunset" ? "#8a5a3a" : "#d9b47a"} />
      <rect x={0} y={g} width={1920} height={14} fill={kind === "sunset" ? "#6f4630" : "#c39a5f"} />
      <g transform={`translate(${par(0.9)} 0)`}>{[...Array(24)].map((_, i) => <ellipse key={i} cx={(i * 173) % 2400 - 200} cy={g + 40 + (i * 37) % 120} rx={22 + (i % 4) * 8} ry={5} fill="#c49b62" opacity={0.7} />)}</g>
      {/* tumbleweed */}
      {kind !== "porch" && <g transform={`translate(${((t * 130) % 2600) - 400} ${g - 28 - Math.abs(Math.sin(t * 4)) * 18}) rotate(${t * 200})`}><circle r={28} fill="none" stroke="#a5804a" strokeWidth={4} strokeDasharray="6 8" /><circle r={16} fill="none" stroke="#a5804a" strokeWidth={3} strokeDasharray="4 6" /></g>}
    </g>
  );
};

export const Crowd: React.FC<{ x: number; g: number; t: number; cheer: number }> = ({ x, g, t, cheer }) => (
  <g transform={`translate(${x} ${g})`}>
    {[0, 1, 2, 3, 4].map((i) => { const hop = cheer * Math.abs(Math.sin(t * 9 + i)) * 24; const c = ["#7a4a2b", "#3f5a7a", "#8a3a3a", "#5a6a3a", "#6a4a7a"][i];
      return <g key={i} transform={`translate(${i * 70} ${-hop})`}><rect x={-20} y={-120} width={40} height={90} rx={12} fill={c} /><circle cx={0} cy={-140} r={22} fill="#e2b18b" /><path d="M-32 -150 Q0 -180 32 -150 L 32 -144 L -32 -144 Z" fill="#5a4328" />{cheer > 0.5 && <><rect x={-34} y={-190} width={10} height={60} rx={5} fill="#e2b18b" transform={`rotate(${-20 + Math.sin(t * 12 + i) * 15} -30 -130)`} /><rect x={24} y={-190} width={10} height={60} rx={5} fill="#e2b18b" transform={`rotate(${20 - Math.sin(t * 12 + i) * 15} 30 -130)`} /></>}</g>; })}
  </g>
);
export const Dust: React.FC<{ x: number; g: number; t: number; t0: number; dir?: number }> = ({ x, g, t, t0, dir = 1 }) => {
  const a = t - t0; if (a < 0 || a > 1.2) return null;
  return <g opacity={1 - a / 1.2}>{[0, 1, 2, 3].map((i) => <circle key={i} cx={x - dir * (30 + a * 200 + i * 40)} cy={g - 10 - a * 30 - i * 8} r={14 + a * 40 + i * 6} fill="#e6c58f" />)}</g>;
};
export const Zzz: React.FC<{ x: number; y: number; t: number }> = ({ x, y, t }) => (
  <g>{[0, 1, 2].map((i) => { const ph = ((t * 0.5 + i * 0.33) % 1); return <text key={i} x={x + ph * 40} y={y - ph * 70} fontSize={26 + ph * 20} fontFamily="Georgia" fontWeight="bold" fill="#5a4328" opacity={1 - ph}>z</text>; })}</g>
);
export const SpeedLines: React.FC<{ x: number; y: number; dir: number; k: number }> = ({ x, y, dir, k }) => (
  <g opacity={k}>{[0, 1, 2, 3, 4].map((i) => <rect key={i} x={x - dir * (60 + i * 30)} y={y - 40 + i * 22} width={40 + i * 10} height={4} rx={2} fill="#fff" opacity={0.8 - i * 0.12} />)}</g>
);
export const Exclaim: React.FC<{ x: number; y: number; k: number }> = ({ x, y, k }) => (
  <g transform={`translate(${x} ${y}) scale(${k})`}><text x={0} y={0} fontSize={70} fontWeight="bold" fontFamily="Impact, Arial" fill="#c62828" stroke="#fff" strokeWidth={3}>!</text></g>
);
export const Bang: React.FC<{ x: number; y: number; k: number; dir?: number }> = ({ x, y, k, dir = 1 }) => {
  if (k <= 0) return null;
  return <g transform={`translate(${x} ${y}) scale(${dir * k} ${k})`}>
    <path d="M0 0 L 40 -20 L 30 -50 L 70 -35 L 80 -75 L 100 -40 L 140 -55 L 115 -15 L 150 0 L 115 15 L 140 55 L 100 40 L 80 75 L 70 35 L 30 50 L 40 20 Z" fill="#ffcf3d" stroke="#e6641e" strokeWidth={5} transform="translate(0 0) scale(0.8)" />
    <text x={38} y={12} fontSize={34} fontWeight="bold" fontFamily="Impact, Arial" fill="#c62828" textAnchor="middle">BANG</text>
  </g>;
};
export const Pistol: React.FC<{ x: number; y: number; rot: number; s?: number }> = ({ x, y, rot, s = 1 }) => (
  <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}><rect x={0} y={-6} width={44} height={10} rx={3} fill="#2b2b2b" /><rect x={-4} y={-8} width={16} height={22} rx={4} fill="#5a4328" transform="rotate(20 0 0)" /><circle cx={12} cy={0} r={6} fill="#3a3a3a" /></g>
);
