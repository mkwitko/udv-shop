export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-grid h-7 w-7 place-items-center rounded-[0.6rem] bg-brand text-white ${className ?? ""}`}
    >
      {/* a rodela de tangerina: gomos partindo do centro */}
      <svg viewBox="0 0 16 16" className="h-4.5 w-4.5" fill="none" stroke="currentColor">
        <title>Prospera</title>
        <circle cx="8" cy="8" r="5.4" strokeWidth="1.3" />
        <path
          d="M8 2.6v10.8M3.3 5.3l9.4 5.4M12.7 5.3l-9.4 5.4"
          strokeWidth="1.1"
          strokeLinecap="round"
          opacity="0.9"
        />
      </svg>
    </span>
  );
}
