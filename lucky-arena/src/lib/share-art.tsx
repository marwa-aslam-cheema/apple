// Artwork for the shareable invite post and the link preview (rendered to PNG with next/og).
import type { ReactElement } from "react";

const SLICES = ["#b3123f", "#17101c", "#0e6b4c", "#2a1a33", "#1e5aa8", "#d6336c", "#e0a526", "#b3123f", "#2a1a33", "#0e6b4c", "#17101c", "#ff3b3b"];

const pt = (cx: number, cy: number, r: number, deg: number): [number, number] => {
  const a = ((deg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
};

/** A static prize wheel with a gold rim and marquee bulbs. Plain SVG shapes only (no text), so it renders anywhere. */
export function ShareWheel({ size }: { size: number }): ReactElement {
  const c = size / 2;
  const R = size / 2 - 6;
  const n = SLICES.length;
  const sa = 360 / n;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={c} cy={c} r={R} fill="#12081a" stroke="#ffcf4a" strokeWidth={size * 0.028} />
      {SLICES.map((color, i) => {
        const [x1, y1] = pt(c, c, R - size * 0.03, i * sa);
        const [x2, y2] = pt(c, c, R - size * 0.03, (i + 1) * sa);
        return <path key={i} d={`M${c} ${c} L${x1} ${y1} A${R - size * 0.03} ${R - size * 0.03} 0 0 1 ${x2} ${y2}Z`} fill={color} stroke="#0a0509" strokeWidth={2} />;
      })}
      {SLICES.map((_, i) => {
        const [x, y] = pt(c, c, (R - size * 0.03) * 0.72, (i + 0.5) * sa);
        return <circle key={`d${i}`} cx={x} cy={y} r={size * 0.016} fill="#fff3b0" />;
      })}
      {Array.from({ length: 24 }, (_, i) => {
        const [x, y] = pt(c, c, R, i * 15);
        return <circle key={`b${i}`} cx={x} cy={y} r={size * 0.014} fill="#fff3b0" />;
      })}
      <circle cx={c} cy={c} r={size * 0.085} fill="#0a0509" stroke="#ffcf4a" strokeWidth={size * 0.014} />
      <circle cx={c} cy={c} r={size * 0.03} fill="#ffcf4a" />
    </svg>
  );
}

/** A frame of marquee bulbs along the edge (Satori cannot draw dotted CSS borders, so draw them as circles). */
function Marquee({ w, h, inset, bulb, gap }: { w: number; h: number; inset: number; bulb: number; gap: number }): ReactElement {
  const dots: [number, number][] = [];
  const x0 = inset, y0 = inset, x1 = w - inset, y1 = h - inset;
  for (let x = x0; x <= x1; x += gap) { dots.push([x, y0]); dots.push([x, y1]); }
  for (let y = y0 + gap; y < y1; y += gap) { dots.push([x0, y]); dots.push([x1, y]); }
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ position: "absolute", top: 0, left: 0 }}>
      <rect x={x0} y={y0} width={x1 - x0} height={y1 - y0} rx={28} fill="none" stroke="rgba(255,207,74,0.35)" strokeWidth={2} />
      {dots.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={bulb} fill={i % 2 ? "#ffcf4a" : "#ff9d2e"} />)}
    </svg>
  );
}

const bg = "radial-gradient(circle at 50% 0%, #5a1030 0%, #1b0b1c 55%, #0a0509 100%)";
const gold = "#ffcf4a";

export function SquarePost({ code, host }: { code?: string; host: string }): ReactElement {
  return (
    <div style={{ width: 1080, height: 1080, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between", padding: "56px 60px", background: bg, color: "#fff4e0", position: "relative" }}>
      <Marquee w={1080} h={1080} inset={26} bulb={6} gap={38} />
      <div style={{ display: "flex", fontSize: 38, letterSpacing: 14, color: gold, fontWeight: 800 }}>LUCKY ARENA</div>
      <div style={{ display: "flex" }}>
        <ShareWheel size={470} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ display: "flex", fontSize: 64, fontWeight: 800, letterSpacing: 4 }}>JOIN &amp; GET</div>
        <div style={{ display: "flex", fontSize: 150, fontWeight: 900, color: gold, lineHeight: 1, textShadow: "0 6px 0 #8a5a05, 0 0 40px rgba(255,190,40,0.55)" }}>FREE SPINS</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        {code ? (
          <div style={{ display: "flex", padding: "10px 34px", borderRadius: 999, border: `3px solid ${gold}`, background: "rgba(255,207,74,0.12)", fontSize: 38, fontWeight: 800, letterSpacing: 6, color: gold }}>CODE {code}</div>
        ) : null}
        <div style={{ display: "flex", fontSize: 30, color: "#e9d3bd" }}>Play with friends at {host}</div>
        <div style={{ display: "flex", fontSize: 22, color: "#a58f80" }}>Virtual demo credits only. No real money. 18+</div>
      </div>
    </div>
  );
}

export function WidePost({ code, host }: { code?: string; host: string }): ReactElement {
  return (
    <div style={{ width: 1200, height: 630, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "40px 70px", background: bg, color: "#fff4e0", position: "relative" }}>
      <Marquee w={1200} h={630} inset={22} bulb={5} gap={34} />
      <div style={{ display: "flex", flexDirection: "column", maxWidth: 640 }}>
        <div style={{ display: "flex", fontSize: 30, letterSpacing: 12, color: gold, fontWeight: 800 }}>LUCKY ARENA</div>
        <div style={{ display: "flex", fontSize: 56, fontWeight: 800, marginTop: 18 }}>JOIN &amp; GET</div>
        <div style={{ display: "flex", fontSize: 100, fontWeight: 900, color: gold, lineHeight: 1.05, textShadow: "0 5px 0 #8a5a05, 0 0 36px rgba(255,190,40,0.5)" }}>FREE SPINS</div>
        <div style={{ display: "flex", fontSize: 28, color: "#e9d3bd", marginTop: 18 }}>{code ? `Use code ${code} at ${host}` : `Play with friends at ${host}`}</div>
        <div style={{ display: "flex", fontSize: 20, color: "#a58f80", marginTop: 10 }}>Virtual demo credits only. No real money. 18+</div>
      </div>
      <div style={{ display: "flex" }}>
        <ShareWheel size={400} />
      </div>
    </div>
  );
}
