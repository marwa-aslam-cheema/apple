import { useId } from "react";

export function LogoMark({ size = 36 }: { size?: number }) {
  const gid = `lg-${useId().replace(/:/g, "")}`;
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff0a8" />
          <stop offset="1" stopColor="#f0a30a" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="21" fill="#7a0c2c" stroke={`url(#${gid})`} strokeWidth="3" />
      <circle cx="24" cy="24" r="17" fill="none" stroke={`url(#${gid})`} strokeWidth="1" strokeDasharray="3 3" />
      {[0, 60, 120].map((a) => (
        <line key={a} x1="24" y1="6" x2="24" y2="42" stroke="#a3173f" strokeWidth="2" transform={`rotate(${a} 24 24)`} />
      ))}
      <path d="M24 12l3.4 7 7.6 1-5.5 5.3 1.3 7.7L24 29.4 17.2 33l1.3-7.7L13 20l7.6-1z" fill={`url(#${gid})`} />
    </svg>
  );
}

/** `markOnly` shows just the round logo on phones (the top bar of a signed-in player is full: balance, picture, sound, +). */
export function Logo({ name = "Lucky Arena", logo = "", markOnly = false }: { name?: string; logo?: string; markOnly?: boolean }) {
  const custom = name !== "Lucky Arena";
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      {logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logo} alt="" width={36} height={36} className="h-9 w-9 shrink-0 rounded-full object-cover" />
      ) : (
        <span className="shrink-0"><LogoMark /></span>
      )}
      <span className={`min-w-0 truncate font-[family-name:var(--font-display)] text-base font-extrabold uppercase tracking-wide min-[400px]:text-lg min-[400px]:tracking-wider${markOnly ? " max-[479px]:hidden" : ""}`}>
        {custom ? <span className="gold-text">{name}</span> : <>Lucky<span className="gold-text">Arena</span></>}
      </span>
    </span>
  );
}

export function ChipIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="11" fill="#b3123f" stroke="#ffcf4a" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="7.4" fill="none" stroke="#ffcf4a" strokeWidth="2" strokeDasharray="2.3 2.3" />
      <circle cx="12" cy="12" r="3.6" fill="#ffcf4a" />
    </svg>
  );
}
