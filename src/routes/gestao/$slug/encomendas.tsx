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
import { notifyEventInterests } from "#/lib/api/gen/clients/notifyEventInterests";
import { notifyInterests } from "#/lib/api/gen/clients/notifyInterests";
import {
  getInterestDemandQueryKey,
  useGetInterestDemand,
} from "#/lib/api/gen/hooks/useGetInterestDemand";
import { useListStoreInterests } from "#/lib/api/gen/hooks/useListStoreInterests";
import { formatStoredPhone, longDate, money } from "#/lib/format";

export const Route = createFileRoute("/gestao/$slug/encomendas")({
  component: InterestsAdmin,
});

/** O que a fila está esperando, achatado: produto da vitrine ou evento da agenda. */
type Subject = {
  kind: "produto" | "evento";
  slug: string;
  name: string;
  priceCents: number;
  /** Chave da linha na tela. Produto e evento podem ter o mesmo slug. */
  key: string;
};

function InterestsAdmin() {
  const { slug } = Route.useParams();
  const { queryClient } = useRouter().options.context;
  const { data, isPending } = useGetInterestDemand(slug);
  const [error, setError] = useState<string | null>(null);
  const [busySlug, setBusySlug] = useState<string | null>(null);
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const toast = useToast();
  // A fila mistura produto e evento: cada linha vira um "assunto" com o mínimo que a tela
  // precisa, e o resto do componente não fica perguntando de qual tabela aquilo veio.
  const items = (data?.items ?? []).flatMap((item) => {
    const subject = item.event
      ? {
          kind: "evento" as const,
          slug: item.event.slug,
          name: item.event.name,
          priceCents: item.event.priceCents,
          key: `e:${item.event.slug}`,
        }
      : item.product
        ? {
            kind: "produto" as const,
            slug: item.product.slug,
            name: item.product.name,
            priceCents: item.product.priceCents,
            key: `p:${item.product.slug}`,
          }
        : null;
    return subject ? [{ ...item, subject }] : [];
  });
  const totalWaiting = items.reduce((sum, item) => sum + item.openCount, 0);

  // Produto e evento têm rotas de aviso separadas porque a frase é outra: "chegou" não
  // serve para sessão lotada que abriu vaga.
  async function notify(subject: Subject) {
    setBusySlug(subject.key);
    setError(null);
    try {
      const result =
        subject.kind === "evento"
          ? await notifyEventInterests(slug, subject.slug)
          : await notifyInterests(slug, subject.slug);
      const o_que = subject.kind === "evento" ? "abriu vaga" : "chegou";
      toast(
        result.notified === 1
          ? `Aviso enviado para 1 pessoa: ${subject.name} ${o_que}.`
          : `Aviso enviado para ${result.notified} pessoas: ${subject.name} ${o_que}.`,
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
      <h2 className="font-display text-lg font-semibold tracking-tight">Fila de espera</h2>
      <p className="mt-1 text-sm text-muted">
        Quem pediu um produto sob encomenda, avisou que quer um esgotado ou ficou de fora de um
        evento lotado entra nesta fila. Quando chegar (ou abrir vaga), um botão avisa por e-mail
        todo mundo de uma vez. Quem entrou sem deixar e-mail aparece na lista com o telefone: com
        essa gente, é você quem fala.
      </p>

      <FormError>{error}</FormError>

      {isPending ? (
        <SkeletonRows rows={2} className="mt-6" />
      ) : items.length === 0 ? (
        <EmptyState className="mt-6" title="Ninguém esperando por enquanto.">
          Quando alguém pedir um produto sob encomenda, ou ficar de fora de um evento lotado, a fila
          aparece aqui com um botão para avisar todo mundo de uma vez.
        </EmptyState>
      ) : (
        <>
          <p className="mt-4 text-sm text-muted tabular-nums">
            {totalWaiting === 1 ? "1 pessoa esperando" : `${totalWaiting} pessoas esperando`} em{" "}
            {items.length === 1 ? "1 coisa" : `${items.length} coisas`}.
          </p>
          <ul className="mt-4 grid gap-3">
            {items.map((item) => {
              const open = openSlug === item.subject.key;
              return (
                <li key={item.subject.key} className="card p-4">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
                    <span className="inline-grid h-11 w-11 shrink-0 place-items-center rounded-[0.9rem] bg-brand-soft font-bold font-display text-brand-deep text-lg tabular-nums">
                      {item.openCount}
                    </span>
                    <div className="min-w-[11rem] flex-1">
                      <p className="flex flex-wrap items-center gap-2 font-medium">
                        {item.subject.name}
                        {item.subject.kind === "evento" && <Tag tone="brand">evento</Tag>}
                      </p>
                      <p className="mt-0.5 text-sm text-muted tabular-nums">
                        {money(item.subject.priceCents)} ·{" "}
                        {item.openCount === 1
                          ? "1 pessoa esperando"
                          : `${item.openCount} pessoas esperando`}{" "}
                        ({item.totalQty}{" "}
                        {item.subject.kind === "evento"
                          ? item.totalQty === 1
                            ? "vaga"
                            : "vagas"
                          : "un"}{" "}
                        no total)
                      </p>
                    </div>
                    {/* no celular os botões descem para uma linha só deles: nome e preço
                        não podem ficar espremidos numa coluna de duas palavras */}
                    <div className="flex w-full flex-wrap gap-2 sm:w-auto">
                      <Button
                        variant="secondary"
                        size="sm"
                        aria-expanded={open}
                        onClick={() => setOpenSlug(open ? null : item.subject.key)}
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
                        disabled={busySlug === item.subject.key || item.openCount === 0}
                        onClick={() => notify(item.subject)}
                      >
                        <Bell className="h-4 w-4" aria-hidden />
                        {item.subject.kind === "evento"
                          ? "Avisar que abriu vaga"
                          : "Avisar que chegou"}
                      </Button>
                    </div>
                  </div>
                  {open && <InterestPeople slug={slug} subject={item.subject} />}
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
 * Lista de quem está na fila (§10 do brief): nome, quando entrou e o telefone. Para staff o
 * número sai mascarado — contato completo não fica exposto numa lista aberta na mesa. Para
 * quem responde pela loja ele vira um link de WhatsApp, porque quem entrou na fila sem deixar
 * e-mail só é avisado assim: o botão "avisar que chegou" manda e-mail, e não há para onde
 * mandar.
 */
function InterestPeople({ slug, subject }: { slug: string; subject: Subject }) {
  const { data, isPending, isError } = useListStoreInterests(slug, {
    ...(subject.kind === "evento" ? { eventSlug: subject.slug } : { productSlug: subject.slug }),
    limit: 50,
  });
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
          {person.customer.phone ? (
            <a
              href={`https://wa.me/${person.customer.phone.replace(/\D/g, "")}`}
              target="_blank"
              rel="noreferrer"
              className="text-brand-deep tabular-nums underline underline-offset-4"
            >
              {formatStoredPhone(person.customer.phone)}
            </a>
          ) : (
            person.customer.phoneMasked && (
              <span className="text-muted tabular-nums">{person.customer.phoneMasked}</span>
            )
          )}
          {person.qty > 1 && (
            <span className="text-muted">
              {person.qty} {subject.kind === "evento" ? "vagas" : "un"}
            </span>
          )}
          <Tag className="ml-auto" tone={person.status === "open" ? "brand" : "neutral"}>
            {STATUS_LABEL[person.status] ?? person.status}
          </Tag>
        </li>
      ))}
    </ul>
  );
}
