export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-grid h-7 w-7 place-items-center rounded-[0.5rem] bg-[linear-gradient(160deg,var(--sun),var(--brand)_72%)] text-white ${className ?? ""}`}
    >
      {/* sol nascendo no horizonte: meio disco, três raios e a linha do campo */}
      <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor">
        <title>Prospera</title>
        <path d="M4.6 11a3.4 3.4 0 0 1 6.8 0" strokeWidth="1.4" strokeLinecap="round" />
        <path
          d="M8 5.4V3.8M3.9 7.2l-1.1-1.1M12.1 7.2l1.1-1.1"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
        <path d="M2 11h12" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    </span>
  );
}
