export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-grid h-7 w-7 place-items-center rounded-[0.55rem] bg-cta text-cta-ink ${className ?? ""}`}
    >
      {/* a moeda e o fio: o dinheiro passa direto, sem parar em terceiros */}
      <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor">
        <title>Prospera</title>
        <circle cx="8" cy="8" r="4.2" strokeWidth="1.4" />
        <path d="M1 8h2.4M12.6 8H15" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    </span>
  );
}
