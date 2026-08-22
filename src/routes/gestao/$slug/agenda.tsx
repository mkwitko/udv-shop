import { createFileRoute, useRouter } from "@tanstack/react-router";
import { CalendarDays, Check, MapPin, MessageCircle } from "lucide-react";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import { EmptyState } from "#/components/ui/empty-state";
import { FormError } from "#/components/ui/field";
import { SkeletonRows } from "#/components/ui/skeleton";
import { Tag } from "#/components/ui/tag";
import { errorMessage } from "#/lib/api/error-message";
import { checkInAttendee } from "#/lib/api/gen/clients/checkInAttendee";
import {
  listEventAttendeesQueryKey,
  useListEventAttendees,
} from "#/lib/api/gen/hooks/useListEventAttendees";
import { useListEvents } from "#/lib/api/gen/hooks/useListEvents";
import { dateTime, formatStoredPhone, money, weekday } from "#/lib/format";
import { whatsappUrl } from "#/lib/whatsapp";

export const Route = createFileRoute("/gestao/$slug/agenda")({
  component: AgendaAdmin,
});

/**
 * Agenda da loja com a lista de presença de cada evento. É a tela que fica aberta na porta:
 * um toque marca quem chegou, e quem não chegou tem botão de WhatsApp do lado.
 */
function AgendaAdmin() {
  const { slug } = Route.useParams();
  const { data, isPending } = useListEvents(slug, { limit: 50 });
  const events = data?.items ?? [];
  const [open, setOpen] = useState<string | null>(null);

  if (isPending) return <SkeletonRows rows={3} />;

  return (
    <div>
      <div>
        <h2 className="font-display font-semibold text-lg tracking-tight">Agenda</h2>
        <p className="mt-1 text-muted text-sm">
          O que ainda vai acontecer. Evento é produto com dia e hora — para criar um novo, vá em
          Produtos e marque “isto tem dia e hora”.
        </p>
      </div>

      {events.length === 0 ? (
        <EmptyState
          className="mt-6"
          icon={<CalendarDays className="h-6 w-6" aria-hidden />}
          title="Nada marcado por aqui."
        >
          Quando você cadastrar um produto com dia e hora — sessão, festa, mutirão, curso — ele
          aparece nesta agenda com a lista de quem garantiu vaga.
        </EmptyState>
      ) : (
        <ul className="mt-6 grid gap-3">
          {events.map((event) => {
            const at = event.event?.at;
            if (!at) return null;
            const isOpen = open === event.slug;
            return (
              <li key={event.id} className="card p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2">
                      <span className="font-display font-semibold">{event.name}</span>
                      {event.stock <= 0 && <Tag tone="accent">lotado</Tag>}
                    </p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-muted text-sm">
                      <span>{weekday(at)}</span>
                      <span className="tabular-nums">{dateTime(at)}</span>
                      {event.event?.location && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" aria-hidden />
                          {event.event.location}
                        </span>
                      )}
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setOpen(isOpen ? null : event.slug)}
                  >
                    {isOpen ? "Fechar lista" : "Lista de presença"}
                  </Button>
                </div>
                {isOpen && <Attendees slug={slug} productSlug={event.slug} />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Attendees({ slug, productSlug }: { slug: string; productSlug: string }) {
  const { queryClient } = useRouter().options.context;
  const { data, isPending } = useListEventAttendees(slug, productSlug);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function toggle(orderItemId: string, present: boolean) {
    setBusy(orderItemId);
    setError(null);
    try {
      await checkInAttendee(slug, productSlug, orderItemId, { present });
      await queryClient.invalidateQueries({
        queryKey: listEventAttendeesQueryKey(slug, productSlug),
      });
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(null);
    }
  }

  if (isPending) return <SkeletonRows rows={2} className="mt-4" />;
  if (!data) return null;

  return (
    <div className="rule mt-4 pt-4">
      <p className="flex flex-wrap items-baseline gap-x-4 text-sm">
        <span className="font-medium">
          {data.checkedInQty} de {data.soldQty} chegaram
        </span>
        <span className="text-muted tabular-nums">
          {data.remaining} {data.remaining === 1 ? "vaga livre" : "vagas livres"}
        </span>
      </p>
      <FormError>{error}</FormError>

      {data.items.length === 0 ? (
        <p className="mt-3 text-muted text-sm">
          Ninguém garantiu vaga ainda. Mande o link do evento no grupo.
        </p>
      ) : (
        <ul className="mt-3 grid gap-2">
          {data.items.map((person) => {
            const present = person.checkedInAt !== null;
            return (
              <li
                key={person.orderItemId}
                className="flex flex-wrap items-center gap-3 rounded-[0.9rem] border border-line px-3 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 font-medium text-sm">
                    {person.name}
                    {person.qty > 1 && <Tag>{person.qty} ingressos</Tag>}
                    {/* Ingresso não pago é o caso que faz a loja passar vergonha na porta:
                        aparece marcado, não escondido. */}
                    {person.orderStatus === "pending_payment" && (
                      <Tag tone="accent">pagamento pendente</Tag>
                    )}
                  </p>
                  <p className="mt-0.5 text-muted text-xs tabular-nums">
                    {formatStoredPhone(person.phone)} · {money(person.paidCents)}
                  </p>
                </div>
                <a
                  href={whatsappUrl(person.phone)}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Falar com ${person.name} no WhatsApp`}
                  className="inline-grid h-10 w-10 shrink-0 place-items-center rounded-full border border-line text-muted hover:text-brand-deep"
                >
                  <MessageCircle className="h-4 w-4" aria-hidden />
                </a>
                <Button
                  size="sm"
                  variant={present ? "primary" : "secondary"}
                  disabled={busy === person.orderItemId}
                  onClick={() => toggle(person.orderItemId, !present)}
                >
                  {present ? (
                    <>
                      <Check className="h-4 w-4" aria-hidden /> Chegou
                    </>
                  ) : (
                    "Marcar chegada"
                  )}
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
