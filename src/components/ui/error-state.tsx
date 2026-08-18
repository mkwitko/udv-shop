import { Button } from "#/components/ui/button";
import { cn } from "#/lib/utils";

/**
 * Erro em linguagem de gente (§30 do brief): diz o que não deu, o que tentar, e
 * oferece o botão de tentar de novo. Nunca stack trace, nunca "algo deu errado".
 */
export function ErrorState({
  title = "Não conseguimos carregar isso agora.",
  message = "Verifique sua conexão e tente novamente.",
  onRetry,
  retryLabel = "Tentar de novo",
  className,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}) {
  return (
    <div className={cn("card px-6 py-12 text-center", className)} role="alert">
      <h3 className="font-display font-semibold text-lg tracking-tight">{title}</h3>
      <p className="mx-auto mt-2 max-w-sm text-muted">{message}</p>
      {onRetry && (
        <Button variant="secondary" className="mt-6" onClick={onRetry}>
          {retryLabel}
        </Button>
      )}
    </div>
  );
}
