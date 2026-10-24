export function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <defs>
        <linearGradient id="lg1" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffd36e" />
          <stop offset="1" stopColor="#f472b6" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="21" fill="#12142d" stroke="url(#lg1)" strokeWidth="3" />
      {[0, 60, 120].map((a) => (
        <line key={a} x1="24" y1="6" x2="24" y2="42" stroke="#2a2e5a" strokeWidth="2" transform={`rotate(${a} 24 24)`} />
      ))}
      <path d="M24 12l3.4 7 7.6 1-5.5 5.3 1.3 7.7L24 29.4 17.2 33l1.3-7.7L13 20l7.6-1z" fill="url(#lg1)" />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark />
      <span className="text-lg font-extrabold tracking-tight">
        Lucky<span className="text-gold">Arena</span>
      </span>
    </span>
  );
}
