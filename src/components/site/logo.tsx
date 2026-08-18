export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-grid h-7 w-7 place-items-center rounded-[0.5rem] bg-brand text-brand-ink ${className ?? ""}`}
    >
      <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor">
        <title>lojinha</title>
        <path d="M3 6.2 4.2 3h7.6L13 6.2M3 6.2h10M3 6.2v6.3h10V6.2" strokeWidth="1.4" />
        <path d="M6.4 13v-3.4h3.2V13" strokeWidth="1.4" />
      </svg>
    </span>
  );
}
