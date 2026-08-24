import { Link } from "@tanstack/react-router";
import { MapPin } from "lucide-react";
import { Tag } from "#/components/ui/tag";
import type { ListEvents200 } from "#/lib/api/gen/types/ListEvents";
import { dateParts, money, weekday } from "#/lib/format";

type Event = ListEvents200["items"][number];

/**
 * Card de evento. Diferente do card de produto de propósito: quem olha a agenda decide
 * pela data, não pela foto — então o bloco de dia/mês vem primeiro e é o que puxa o olho.
 * Horizontal porque agenda se lê como lista, não como grade de vitrine.
 */
export function EventCard({ event, storeSlug }: { event: Event; storeSlug: string }) {
  const { day, month, time } = dateParts(event.at);
  const soldOut = event.seats <= 0;

  return (
    <Link
      to="/loja/$slug/e/$evento"
      params={{ slug: storeSlug, evento: event.slug }}
      className="card card-hover group flex items-center gap-4 p-4"
    >
      <span className="inline-grid w-14 shrink-0 place-items-center rounded-[0.9rem] bg-brand-soft px-2 py-2 text-brand-deep">
        <span className="font-bold font-display text-xl leading-none tabular-nums">{day}</span>
        <span className="mt-0.5 text-[0.7rem] uppercase tracking-[0.08em]">{month}</span>
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-display font-semibold">{event.name}</span>
          {soldOut && <Tag tone="accent">lotado</Tag>}
        </span>
        <span className="mt-0.5 block text-muted text-sm">
          {weekday(event.at)}, {time}
          {event.location ? (
            <span className="inline-flex items-baseline gap-1">
              {" · "}
              <MapPin className="h-3.5 w-3.5 self-center" aria-hidden />
              {event.location}
            </span>
          ) : null}
        </span>
      </span>

      <span className="shrink-0 text-right">
        <span className="block font-display font-semibold tabular-nums">
          {money(event.priceCents)}
        </span>
        {!soldOut && event.seats <= 5 && (
          <span className="block text-muted text-xs tabular-nums">
            {event.seats === 1 ? "1 vaga" : `${event.seats} vagas`}
          </span>
        )}
      </span>
    </Link>
  );
}
