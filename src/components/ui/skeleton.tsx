import { cn } from "#/lib/utils";

/**
 * Espera com a geometria do que vem depois — nunca um spinner no meio da tela.
 * O brilho é discreto e some inteiro em `prefers-reduced-motion` (regra global no CSS).
 */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-surface", className)} aria-hidden />;
}

/** Lista de gestão carregando: mesma altura de linha dos cards reais. */
export function SkeletonRows({ rows = 3, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("grid gap-3", className)} aria-busy="true">
      {Array.from({ length: rows }, (_, index) => `row-${index}`).map((key) => (
        <Skeleton key={key} className="h-[5.5rem] rounded-lg" />
      ))}
    </div>
  );
}

/** Vitrine carregando: retângulo da foto + duas linhas de texto. */
export function SkeletonCards({ count = 4, className }: { count?: number; className?: string }) {
  return (
    <div
      className={cn("grid grid-cols-2 gap-x-6 gap-y-12 md:grid-cols-3 lg:grid-cols-4", className)}
      aria-busy="true"
    >
      {Array.from({ length: count }, (_, index) => `card-${index}`).map((key) => (
        <div key={key}>
          <Skeleton className="aspect-4/5 rounded-lg" />
          <Skeleton className="mt-3.5 h-4 w-3/4" />
          <Skeleton className="mt-2 h-3.5 w-1/3" />
        </div>
      ))}
    </div>
  );
}
