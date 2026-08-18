/**
 * Símbolos proprietários da marca (§6 do brief): momentos de marca não usam Lucide.
 * Stroke 1.4, geometria arredondada, mesma gramática visual em todos.
 */
type GlyphProps = { className?: string };

const base = {
  viewBox: "0 0 20 20",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.4,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

/** Pix: o losango que todo brasileiro reconhece. */
export function GlyphPix({ className }: GlyphProps) {
  return (
    <svg {...base} className={className}>
      <title>Pix</title>
      <rect x="4.2" y="4.2" width="11.6" height="11.6" rx="3" transform="rotate(45 10 10)" />
    </svg>
  );
}

/** Doação: coração de traço solto. */
export function GlyphCoracao({ className }: GlyphProps) {
  return (
    <svg {...base} className={className}>
      <title>Doação</title>
      <path d="M10 16.2c-3.6-2.5-6.2-4.8-6.2-7.6 0-2 1.5-3.4 3.3-3.4 1.2 0 2.3.6 2.9 1.7.6-1.1 1.7-1.7 2.9-1.7 1.8 0 3.3 1.4 3.3 3.4 0 2.8-2.6 5.1-6.2 7.6Z" />
    </svg>
  );
}

/** Campanha: bandeirinha de festa. */
export function GlyphCampanha({ className }: GlyphProps) {
  return (
    <svg {...base} className={className}>
      <title>Campanha</title>
      <path d="M5 17V3.5" />
      <path d="M5 4h9.6l-2.2 3.2 2.2 3.2H5" />
    </svg>
  );
}

/** Sorteio: bilhete com picote. */
export function GlyphBilhete({ className }: GlyphProps) {
  return (
    <svg {...base} className={className}>
      <title>Sorteio</title>
      <path d="M3.4 7.2c0-.8.6-1.4 1.4-1.4h10.4c.8 0 1.4.6 1.4 1.4v1.2a1.6 1.6 0 0 0 0 3.2v1.2c0 .8-.6 1.4-1.4 1.4H4.8c-.8 0-1.4-.6-1.4-1.4v-1.2a1.6 1.6 0 0 0 0-3.2Z" />
      <path d="M12.4 6.2v1.6M12.4 12.2v1.6" strokeDasharray="0.5 2.2" />
    </svg>
  );
}

/** Pedido: sacola de compra. */
export function GlyphSacola({ className }: GlyphProps) {
  return (
    <svg {...base} className={className}>
      <title>Pedido</title>
      <path d="M4.6 7h10.8l-.9 8.2c-.1.9-.8 1.5-1.7 1.5H7.2c-.9 0-1.6-.6-1.7-1.5L4.6 7Z" />
      <path d="M7.4 9.2V6a2.6 2.6 0 0 1 5.2 0v3.2" />
    </svg>
  );
}

/** Meta alcançada: estrela de traço. */
export function GlyphEstrela({ className }: GlyphProps) {
  return (
    <svg {...base} className={className}>
      <title>Meta alcançada</title>
      <path d="m10 3.4 1.9 3.9 4.3.6-3.1 3 .7 4.3L10 13.2l-3.8 2 .7-4.3-3.1-3 4.3-.6Z" />
    </svg>
  );
}

/** Repasse direto: seta que não faz curva. */
export function GlyphDireto({ className }: GlyphProps) {
  return (
    <svg {...base} className={className}>
      <title>Repasse direto</title>
      <path d="M3.5 10h13M13 6.5l3.5 3.5-3.5 3.5" />
    </svg>
  );
}
