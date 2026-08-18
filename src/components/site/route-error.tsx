import { Link, useRouter } from "@tanstack/react-router";
import { Button } from "#/components/ui/button";
import { ApiError } from "#/lib/api/fetch-client";

/** Moldura das telas de aviso: centrada, calma, com caminho de saída. */
function Notice({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action: React.ReactNode;
}) {
  return (
    // div, não main: esta tela também aparece dentro do layout da loja, que já tem um
    <div className="shell grid min-h-[70vh] place-items-center py-16">
      <div className="max-w-md text-center">
        <h1 className="font-bold font-display text-3xl tracking-tight md:text-4xl">{title}</h1>
        <p className="mt-4 text-lede text-muted">{children}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">{action}</div>
      </div>
    </div>
  );
}

/**
 * Erro de rota em linguagem de gente (§30 do brief). Quando a API devolveu 404, a
 * frase é "esse endereço não existe" — nada de stack trace, nada de "unexpected error".
 */
export function RouteError({ error, reset }: { error: unknown; reset?: () => void }) {
  const router = useRouter();
  const notFound = error instanceof ApiError && error.status === 404;

  if (notFound) return <RouteNotFound />;

  return (
    <Notice
      title="Não conseguimos abrir esta página."
      action={
        <>
          <Button
            onClick={() => {
              reset?.();
              void router.invalidate();
            }}
          >
            Tentar de novo
          </Button>
          <Button asChild variant="secondary">
            <Link to="/">Ir para o início</Link>
          </Button>
        </>
      }
    >
      Pode ter sido a conexão. Tente de novo em instantes — se continuar, volte ao início.
    </Notice>
  );
}

/** Endereço que não existe: loja apagada, link torto, produto que saiu do catálogo. */
export function RouteNotFound() {
  return (
    <Notice
      title="Esse endereço não existe."
      action={
        <>
          <Button asChild>
            <Link to="/lojas">Ver lojas abertas</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link to="/">Ir para o início</Link>
          </Button>
        </>
      }
    >
      O link pode ter mudado ou a página saiu do ar. Dá para procurar entre as lojas abertas.
    </Notice>
  );
}
