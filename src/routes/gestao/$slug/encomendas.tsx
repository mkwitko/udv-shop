import { createFileRoute, useRouter } from "@tanstack/react-router";
import { Bell, ChevronDown } from "lucide-react";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import { EmptyState } from "#/components/ui/empty-state";
import { FormError } from "#/components/ui/field";
import { SkeletonRows } from "#/components/ui/skeleton";
import { Tag } from "#/components/ui/tag";
import { useToast } from "#/components/ui/toast";
import { errorMessage } from "#/lib/api/error-message";
import { notifyInterests } from "#/lib/api/gen/clients/notifyInterests";
import {
  getInterestDemandQueryKey,
  useGetInterestDemand,
} from "#/lib/api/gen/hooks/useGetInterestDemand";
import { useListStoreInterests } from "#/lib/api/gen/hooks/useListStoreInterests";
import { longDate, money } from "#/lib/format";

export const Route = createFileRoute("/gestao/$slug/encomendas")({
  component: InterestsAdmin,
});

function InterestsAdmin() {
  const { slug } = Route.useParams();
  const { queryClient } = useRouter().options.context;
  const { data, isPending } = useGetInterestDemand(slug);
  const [error, setError] = useState<string | null>(null);
  const [busySlug, setBusySlug] = useState<string | null>(null);
  const [openSlug, setOpenSlug] = useState<string | null>(null);
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
        Quem pediu um produto sob encomenda — ou avisou que quer um esgotado — entra nesta fila.
        Quando o produto chegar, um botão avisa todo mundo por e-mail de uma vez.
      </p>

      <FormError>{error}</FormError>

      {isPending ? (
        <SkeletonRows rows={2} className="mt-6" />
      ) : items.length === 0 ? (
        <EmptyState className="mt-6" title="Ninguém esperando por enquanto.">
          Quando alguém pedir um produto sob encomenda, a fila aparece aqui com um botão para avisar
          todo mundo de uma vez.
        </EmptyState>
      ) : (
        <>
          <p className="mt-4 text-sm text-muted tabular-nums">
            {totalWaiting === 1 ? "1 pessoa esperando" : `${totalWaiting} pessoas esperando`} em{" "}
            {items.length === 1 ? "1 produto" : `${items.length} produtos`}.
          </p>
          <ul className="mt-4 grid gap-3">
            {items.map((item) => {
              const open = openSlug === item.product.slug;
              return (
                <li key={item.product.slug} className="card p-4">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
                    <span className="inline-grid h-11 w-11 shrink-0 place-items-center rounded-[0.9rem] bg-brand-soft font-bold font-display text-brand-deep text-lg tabular-nums">
                      {item.openCount}
                    </span>
                    <div className="min-w-[11rem] flex-1">
                      <p className="font-medium">{item.product.name}</p>
                      <p className="mt-0.5 text-sm text-muted tabular-nums">
                        {money(item.product.priceCents)} ·{" "}
                        {item.openCount === 1
                          ? "1 pessoa esperando"
                          : `${item.openCount} pessoas esperando`}{" "}
                        ({item.totalQty} un no total)
                      </p>
                    </div>
                    {/* no celular os botões descem para uma linha só deles: nome e preço
                        não podem ficar espremidos numa coluna de duas palavras */}
                    <div className="flex w-full flex-wrap gap-2 sm:w-auto">
                      <Button
                        variant="secondary"
                        size="sm"
                        aria-expanded={open}
                        onClick={() => setOpenSlug(open ? null : item.product.slug)}
                      >
                        <ChevronDown
                          className={`h-4 w-4 transition-transform [transition-duration:var(--dur)] ${
                            open ? "rotate-180" : ""
                          }`}
                          aria-hidden
                        />
                        {open ? "Fechar lista" : "Ver interessados"}
                      </Button>
                      <Button
                        size="sm"
                        disabled={busySlug === item.product.slug || item.openCount === 0}
                        onClick={() => notify(item.product.slug, item.product.name)}
                      >
                        <Bell className="h-4 w-4" aria-hidden />
                        Avisar que chegou
                      </Button>
                    </div>
                  </div>

                  {open && <InterestPeople slug={slug} productSlug={item.product.slug} />}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}

const STATUS_LABEL: Record<string, string> = {
  open: "esperando",
  notified: "avisado",
  converted: "comprou",
  cancelled: "desistiu",
};

/**
 * Lista de quem está na fila (§10 do brief): nome, quando entrou e o telefone
 * mascarado. O contato completo não fica exposto numa lista aberta na mesa — a loja
 * fala com a pessoa pelo e-mail que o botão "avisar que chegou" dispara.
 */
function InterestPeople({ slug, productSlug }: { slug: string; productSlug: string }) {
  const { data, isPending, isError } = useListStoreInterests(slug, { productSlug, limit: 50 });
  const people = data?.items ?? [];

  if (isPending) return <SkeletonRows rows={2} className="mt-4" />;
  if (isError) {
    return (
      <p className="mt-4 text-danger text-sm" role="alert">
        Não conseguimos carregar a lista agora. Feche e abra de novo.
      </p>
    );
  }
  if (people.length === 0) {
    return <p className="mt-4 text-muted text-sm">Ninguém nesta fila agora.</p>;
  }

  return (
    <ul className="mt-4 grid gap-2 border-line border-t pt-4">
      {people.map((person) => (
        <li key={person.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
          <span className="font-medium">{person.customer.name}</span>
          <span className="text-muted">entrou em {longDate(person.createdAt)}</span>
          {person.customer.phoneMasked && (
            <span className="text-muted tabular-nums">{person.customer.phoneMasked}</span>
          )}
          {person.qty > 1 && <span className="text-muted">{person.qty} un</span>}
          <Tag className="ml-auto" tone={person.status === "open" ? "brand" : "neutral"}>
            {STATUS_LABEL[person.status] ?? person.status}
          </Tag>
        </li>
      ))}
    </ul>
  );
}
