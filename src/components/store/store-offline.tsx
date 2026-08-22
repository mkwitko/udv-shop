import { Link } from "@tanstack/react-router";
import { Button } from "#/components/ui/button";

/**
 * Loja fora do ar (§12 do brief). O link já circulou em grupo de WhatsApp — devolver
 * 404 aqui seria mentir sobre um endereço que existe. A página diz o estado, garante
 * que nada foi apagado e oferece uma saída.
 */
export function StoreOffline({
  name,
  status,
}: {
  name: string;
  status: "pending" | "suspended" | string;
}) {
  const pending = status === "pending";

  return (
    <div className="shell py-14 md:py-20">
      <div className="mx-auto max-w-lg text-center">
        <span className="mx-auto inline-grid h-16 w-16 place-items-center rounded-full bg-surface font-bold font-display text-2xl text-muted">
          {name.charAt(0)}
        </span>
        <h1 className="mt-6 font-bold font-display text-3xl tracking-tight md:text-4xl">
          {pending ? `${name} ainda não abriu.` : `${name} está fora do ar.`}
        </h1>
        <p className="mt-4 text-lede text-muted">
          {pending
            ? "Quem organiza ainda está preparando a loja. Vale voltar em alguns dias."
            : "Ninguém pode comprar ou doar enquanto ela estiver fora do ar."}
        </p>
        <p className="mt-3 text-muted">
          Nada foi apagado: produtos, pedidos e campanhas continuam salvos com quem organiza.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild>
            <Link to="/lojas">Ver outras lojas</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link to="/">Ir para o início</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
