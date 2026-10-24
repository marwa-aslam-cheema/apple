// App icon artwork (rendered to PNG with next/og): a gold star in a ruby chip on velvet black.
import type { ReactElement } from "react";

export function IconArt({ size, scale = 0.8 }: { size: number; scale?: number }): ReactElement {
  const s = size * scale;
  return (
    <div style={{ width: size, height: size, display: "flex", alignItems: "center", justifyContent: "center", background: "radial-gradient(circle at 50% 25%, #6a0f33 0%, #1b0b1c 60%, #0a0509 100%)" }}>
      <svg width={s} height={s} viewBox="0 0 48 48">
        <circle cx="24" cy="24" r="21" fill="#a3123d" stroke="#ffcf4a" strokeWidth="3" />
        <circle cx="24" cy="24" r="16.5" fill="none" stroke="#ffe58f" strokeWidth="1.2" strokeDasharray="3 3" />
        <path d="M24 10.5l3.7 7.6 8.3 1.1-6 5.8 1.5 8.3L24 29.2l-7.5 4.1 1.5-8.3-6-5.8 8.3-1.1z" fill="#ffcf4a" stroke="#c58a0a" strokeWidth="0.8" />
      </svg>
    </div>
  );
}
