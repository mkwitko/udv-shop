import { createFileRoute, useRouter } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import { FormError } from "#/components/ui/field";
import { useToast } from "#/components/ui/toast";
import { errorMessage } from "#/lib/api/error-message";
import { notifyInterests } from "#/lib/api/gen/clients/notifyInterests";
import {
  getInterestDemandQueryKey,
  useGetInterestDemand,
} from "#/lib/api/gen/hooks/useGetInterestDemand";
import { money } from "#/lib/format";

export const Route = createFileRoute("/gestao/$slug/encomendas")({
  component: InterestsAdmin,
});

function InterestsAdmin() {
  const { slug } = Route.useParams();
  const { queryClient } = useRouter().options.context;
  const { data, isPending } = useGetInterestDemand(slug);
  const [error, setError] = useState<string | null>(null);
  const [busySlug, setBusySlug] = useState<string | null>(null);
  const toast = useToast();
  const items = data?.items ?? [];
  const totalWaiting = items.reduce((sum, item) => sum + item.openCount, 0);

  async function notify(productSlug: string, productName: string) {
    setBusySlug(productSlug);
    setError(null);
    try {
      const result = await notifyInterests(slug, productSlug);
      toast(
        result.notified === 1
          ? `Aviso enviado para 1 pessoa: ${productName} chegou.`
          : `Aviso enviado para ${result.notified} pessoas: ${productName} chegou.`,
      );
      await queryClient.invalidateQueries({ queryKey: getInterestDemandQueryKey(slug) });
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusySlug(null);
    }
  }

  return (
    <div>
      <h2 className="font-display text-lg font-semibold tracking-tight">Encomendas</h2>
      <p className="mt-1 text-sm text-muted">
        Quem se interessou por produto sob encomenda entra nesta fila. Quando o produto chegar, um
        botão avisa todo mundo por e-mail de uma vez.
      </p>

      <FormError>{error}</FormError>

      {isPending ? (
        <div className="mt-6 h-32 animate-pulse rounded-lg bg-surface" />
      ) : items.length === 0 ? (
        <div className="card mt-6 px-6 py-14 text-center">
          <h3 className="font-display text-lg font-semibold">Ninguém esperando por enquanto</h3>
          <p className="mx-auto mt-2 max-w-sm text-muted">
            Quando alguém pedir um produto sob encomenda, a fila aparece aqui com um botão para
            avisar todo mundo de uma vez.
          </p>
        </div>
      ) : (
        <>
          <p className="mt-4 text-sm text-muted tabular-nums">
            {totalWaiting === 1 ? "1 pessoa esperando" : `${totalWaiting} pessoas esperando`} em{" "}
            {items.length === 1 ? "1 produto" : `${items.length} produtos`}.
          </p>
          <ul className="mt-4 grid gap-3">
            {items.map((item) => (
              <li key={item.product.slug} className="card flex flex-wrap items-center gap-4 p-4">
                <span className="inline-grid h-11 w-11 shrink-0 place-items-center rounded-[0.9rem] bg-brand-soft font-bold font-display text-brand-deep text-lg tabular-nums">
                  {item.openCount}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{item.product.name}</p>
                  <p className="mt-0.5 text-sm text-muted tabular-nums">
                    {money(item.product.priceCents)} ·{" "}
                    {item.openCount === 1
                      ? "1 pessoa esperando"
                      : `${item.openCount} pessoas esperando`}{" "}
                    ({item.totalQty} un no total)
                  </p>
                </div>
                <Button
                  size="sm"
                  disabled={busySlug === item.product.slug || item.openCount === 0}
                  onClick={() => notify(item.product.slug, item.product.name)}
                >
                  <Bell className="h-4 w-4" aria-hidden />
                  Avisar que chegou
                </Button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
