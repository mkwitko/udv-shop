import type { ReactNode } from "react";
import { cn } from "#/lib/utils";

/**
 * Vazio que orienta (§28 do brief): o que aconteceu, por quê, e o que fazer agora.
 * Sem "nenhum registro encontrado" — sempre uma frase de gente e, quando existe uma
 * próxima ação, o botão dela.
 */
export function EmptyState({
  title,
  children,
  action,
  icon,
  className,
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("card px-6 py-12 text-center md:py-14", className)}>
      {icon && (
        <span className="mx-auto mb-4 inline-grid h-12 w-12 place-items-center rounded-full bg-brand-soft text-brand-deep">
          {icon}
        </span>
      )}
      <h3 className="font-display font-semibold text-lg tracking-tight">{title}</h3>
      {children && <p className="mx-auto mt-2 max-w-sm text-muted">{children}</p>}
      {action && <div className="mt-6 flex flex-wrap justify-center gap-3">{action}</div>}
    </div>
  );
}
