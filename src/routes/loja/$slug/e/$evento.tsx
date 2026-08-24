import { createFileRoute, Link } from "@tanstack/react-router";
import {
  CalendarDays,
  Check,
  ChevronRight,
  CreditCard,
  HandCoins,
  MapPin,
  MessageCircle,
  Store,
} from "lucide-react";
import { useState } from "react";
import { Captcha, turnstileSiteKey } from "#/components/store/captcha";
import {
  EMPTY_CONTACT,
  type GuestContact,
  GuestContactFields,
  toContactPayload,
  validateGuestContact,
} from "#/components/store/guest-contact-fields";
import { ProductGallery } from "#/components/store/product-gallery";
import { Button } from "#/components/ui/button";
import { FormError } from "#/components/ui/field";
import { QuantityPicker } from "#/components/ui/quantity-picker";
import { ShareButton } from "#/components/ui/share-button";
import { Tag } from "#/components/ui/tag";
import { errorMessage } from "#/lib/api/error-message";
import { createInterest } from "#/lib/api/gen/clients/createInterest";
import { getEventQueryOptions, useGetEvent } from "#/lib/api/gen/hooks/useGetEvent";
import { getStoreQueryOptions, useGetStore } from "#/lib/api/gen/hooks/useGetStore";
import { publicRequest } from "#/lib/api/public";
import { useSession } from "#/lib/auth/session";
import { dateParts, dateTime, money, weekday } from "#/lib/format";
import { breadcrumbLd, seo, siteUrl } from "#/lib/seo";
import { whatsappUrl } from "#/lib/whatsapp";

export const Route = createFileRoute("/loja/$slug/e/$evento")({
  loader: async ({ context, params }) => {
    const event = await context.queryClient.ensureQueryData(
      getEventQueryOptions(params.slug, params.evento, publicRequest),
    );
    await context.queryClient.ensureQueryData(getStoreQueryOptions(params.slug, publicRequest));
    return { event };
  },
  head: ({ loaderData, params }) => {
    const event = loaderData?.event;
    if (!event) return {};
    const path = `/loja/${params.slug}/e/${params.evento}`;
    return {
      ...seo({
        title: event.name,
        description:
          event.description ??
          `${event.name} — ${dateTime(event.at)}${event.location ? `, ${event.location}` : ""}.`,
        path,
        image: event.imageUrls[0],
      }),
      scripts: [
        // Schema.org de evento, não de produto: é o que faz o Google mostrar data e lugar
        // no resultado da busca em vez de preço solto.
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Event",
            name: event.name,
            ...(event.description ? { description: event.description } : {}),
            startDate: event.at,
            ...(event.endsAt ? { endDate: event.endsAt } : {}),
            ...(event.location
              ? { location: { "@type": "Place", name: event.location } }
              : { eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode" }),
            image: event.imageUrls,
            offers: {
              "@type": "Offer",
              price: (event.priceCents / 100).toFixed(2),
              priceCurrency: event.currency,
              availability:
                event.seats > 0 && !event.finished
                  ? "https://schema.org/InStock"
                  : "https://schema.org/SoldOut",
              url: `${siteUrl()}${path}`,
            },
          }),
        },
        breadcrumbLd([
          { name: "Loja", path: `/loja/${params.slug}` },
          { name: event.name, path },
        ]),
      ],
    };
  },
  component: EventPage,
});

/**
 * Página do evento. Diferente da de produto por onde o olho vai primeiro: aqui a decisão é
 * pela data e pelo lugar, então eles vêm antes do preço. Quem chega por link no grupo do
 * WhatsApp precisa saber, em uma tela, quando é, onde é e se ainda tem vaga.
 */
function EventPage() {
  const { slug, evento } = Route.useParams();
  const { data: event } = useGetEvent(slug, evento, { client: publicRequest });
  const { data: store } = useGetStore(slug, { client: publicRequest });
  const [qty, setQty] = useState(1);

  if (!event) return null;

  const soldOut = event.seats <= 0;
  const buyable = !event.finished && !soldOut;
  const maxQty = Math.min(event.seats, 99);
  const total = event.priceCents * qty;

  return (
    <article className="pb-16">
      <nav className="shell pt-4 md:pt-8" aria-label="Trilha">
        <ol className="flex flex-wrap items-center gap-1 text-muted text-sm">
          <li>
            <Link
              to="/loja/$slug"
              params={{ slug }}
              className="transition-colors [transition-duration:var(--dur)] hover:text-ink"
            >
              {store?.name ?? "Loja"}
            </Link>
          </li>
          <li className="flex min-w-0 items-center gap-1">
            <ChevronRight className="h-3.5 w-3.5 opacity-60" aria-hidden />
            <span className="truncate text-ink" aria-current="page">
              {event.name}
            </span>
          </li>
        </ol>
      </nav>

      <div className="shell grid gap-8 pt-5 md:grid-cols-12 md:gap-12 md:pt-8">
        <div className="md:col-span-7">
          {event.imageUrls.length > 0 ? (
            <ProductGallery images={event.imageUrls} name={event.name} />
          ) : (
            // Evento sem foto é comum (mutirão marcado às pressas): o cartão de data
            // ocupa o lugar dela em vez de deixar um buraco cinza.
            <div className="grid place-items-center rounded-[1.25rem] border border-line bg-brand-pale py-16">
              <span className="grid place-items-center">
                <span className="font-bold font-display text-6xl text-brand-deep tabular-nums">
                  {dateParts(event.at).day}
                </span>
                <span className="mt-1 text-brand-deep uppercase tracking-[0.12em]">
                  {dateParts(event.at).month}
                </span>
              </span>
            </div>
          )}
        </div>

        <div className="md:col-span-5 md:self-start md:sticky md:top-24">
          <h1 className="text-balance font-display font-semibold text-3xl tracking-tight md:text-4xl">
            {event.name}
          </h1>

          {/* Data com dia da semana escrito: "sábado" pesa mais na cabeça de quem vai do
              que "12/10". */}
          <div className="mt-4 grid gap-1.5 rounded-[1rem] border border-line bg-surface px-4 py-3">
            <p className="flex items-center gap-2 font-medium">
              <CalendarDays className="h-4 w-4 shrink-0 text-brand-deep" aria-hidden />
              {/* uma string só: com o dia da semana num span, o JSX metia um espaço antes
                  da vírgula e saía "Sábado , 10 de outubro" */}
              <span>
                {weekday(event.at)}, {dateTime(event.at)}
                {event.endsAt ? ` até ${dateParts(event.endsAt).time}` : ""}
              </span>
            </p>
            {event.location && (
              <p className="flex items-center gap-2 text-muted text-sm">
                <MapPin className="h-4 w-4 shrink-0" aria-hidden />
                {event.location}
              </p>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-2">
            <p className="font-bold font-display text-3xl text-brand-deep tabular-nums">
              {money(event.priceCents)}
            </p>
            {/* Com lotes, o preço é do lote que está vendendo agora: dizer qual é o lote faz
                o valor parar de parecer arbitrário. */}
            {event.batch && <Tag tone="brand">{event.batch.name}</Tag>}
            {event.finished && <Tag>Já aconteceu</Tag>}
            {!event.finished && soldOut && <Tag>Lotado</Tag>}
            {buyable && event.seats <= 3 && (
              <Tag tone="accent">
                {event.seats === 1 ? "última vaga" : `últimas ${event.seats} vagas`}
              </Tag>
            )}
          </div>

          {/* O que faz comprar hoje em vez de "semana que vem". A API só devolve isto quando
              o próximo lote é MAIS CARO — anunciar aumento que não vem queima a confiança. */}
          {buyable && event.nextPriceCents !== null && (
            <p className="mt-2 text-muted text-sm">
              Depois deste lote, a vaga passa a {money(event.nextPriceCents)}.
            </p>
          )}

          {event.description && (
            <p className="mt-6 whitespace-pre-line text-ink/85 leading-relaxed">
              {event.description}
            </p>
          )}

          <div className="mt-7 grid gap-4">
            {buyable ? (
              <>
                {maxQty > 1 && <QuantityPicker value={qty} max={maxQty} onChange={setQty} />}
                <Button asChild size="lg" className="w-full">
                  <Link to="/loja/$slug/comprar" params={{ slug }} search={{ evento, qtd: qty }}>
                    Garantir minha vaga — {money(total)}
                  </Link>
                </Button>
              </>
            ) : event.finished ? (
              <p className="rounded-[1rem] border border-line bg-surface px-4 py-3 text-[0.95rem]">
                Este evento já aconteceu. Veja o que a loja tem marcado agora na{" "}
                <Link
                  to="/loja/$slug"
                  params={{ slug }}
                  className="text-brand-deep underline underline-offset-4"
                >
                  página da loja
                </Link>
                .
              </p>
            ) : (
              <>
                <p className="rounded-[1rem] border border-line bg-surface px-4 py-3 text-[0.95rem]">
                  {/* entre lotes a vaga não acabou: ela ainda não abriu, e a pessoa merece
                      saber que vale a pena voltar */}
                  {event.seatsTotalLeft > 0
                    ? "As vagas deste lote acabaram. Entre na lista e a loja avisa quando o próximo abrir."
                    : "As vagas acabaram. Entre na lista e a loja avisa se abrir uma."}
                </p>
                <WaitlistCta slug={slug} evento={evento} />
              </>
            )}
          </div>

          <ul className="mt-7 grid gap-3 text-sm">
            <TrustLine icon={<CreditCard className="h-4 w-4" aria-hidden />}>
              {buyable ? "Pague com Pix ou cartão." : "Sem pagamento agora — é só entrar na lista."}
            </TrustLine>
            <TrustLine icon={<HandCoins className="h-4 w-4" aria-hidden />}>
              O dinheiro vai direto para a conta de {store?.name ?? "quem organiza"}.
            </TrustLine>
            <TrustLine icon={<CalendarDays className="h-4 w-4" aria-hidden />}>
              Leve o nome de quem comprou: a loja confere a lista na entrada.
            </TrustLine>
          </ul>

          <div className="rule mt-7 grid gap-4 pt-6">
            <Link
              to="/loja/$slug"
              params={{ slug }}
              className="flex items-center gap-3 text-sm transition-colors [transition-duration:var(--dur)] hover:text-brand-deep"
            >
              <span
                className="inline-grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-soft text-brand-deep"
                aria-hidden
              >
                {store?.branding?.logoUrl ? (
                  <img
                    src={store.branding.logoUrl}
                    alt=""
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  <Store className="h-5 w-5" />
                )}
              </span>
              <span className="min-w-0">
                <span className="block text-muted text-xs uppercase tracking-[0.08em]">
                  organizado por
                </span>
                <span className="block truncate font-medium text-ink">
                  {store?.name ?? "esta loja"}
                </span>
              </span>
            </Link>

            {store?.whatsapp && (
              <a
                href={whatsappUrl(store.whatsapp, `Olá! Tenho uma dúvida sobre "${event.name}".`)}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 text-sm text-brand-deep underline underline-offset-4"
              >
                <MessageCircle className="h-4 w-4" aria-hidden />
                Tirar uma dúvida no WhatsApp
              </a>
            )}

            {/* compartilhar é como evento de comunidade enche: o link viaja no grupo */}
            <ShareButton
              title={event.name}
              path={`/loja/${slug}/e/${evento}`}
              label="Compartilhar evento"
              text={`${event.name} — ${weekday(event.at)}, ${dateTime(event.at)}`}
              variant="secondary"
            />
          </div>
        </div>
      </div>
    </article>
  );
}

function TrustLine({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5 text-muted">
      <span className="mt-0.5 shrink-0 text-brand-deep">{icon}</span>
      <span>{children}</span>
    </li>
  );
}

/**
 * Evento lotado: um toque entra na fila de espera. Sem conta também dá — nome e telefone
 * bastam, porque pedir aviso de vaga não vale uma senha.
 */
function WaitlistCta({ slug, evento }: { slug: string; evento: string }) {
  const { status } = useSession();
  const [state, setState] = useState<"idle" | "saving" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const [contact, setContact] = useState<GuestContact>(EMPTY_CONTACT);
  const [captchaToken, setCaptchaToken] = useState("");
  // Enquanto a sessão não respondeu não se sabe de quem é este pedido: o botão espera.
  const sessionPending = status === "loading";
  const visitor = status === "anonymous";

  async function enter() {
    setError(null);
    if (visitor) {
      const problem = validateGuestContact(contact);
      if (problem) {
        setError(problem);
        return;
      }
      if (turnstileSiteKey() && !captchaToken) {
        setError("Confirme que você não é um robô.");
        return;
      }
    }
    setState("saving");
    try {
      await createInterest({
        storeSlug: slug,
        eventSlug: evento,
        qty: 1,
        ...(visitor ? { contact: toContactPayload(contact), captchaToken } : {}),
      });
      setState("done");
    } catch (cause) {
      setError(errorMessage(cause));
      setState("idle");
    }
  }

  if (state === "done") {
    return (
      <div className="rounded-lg border border-brand/30 bg-brand-soft p-4">
        <p className="flex items-center gap-2 font-medium text-brand-deep">
          <Check className="h-5 w-5" aria-hidden />
          Pronto, você está na lista!
        </p>
        <p className="mt-1.5 text-muted text-sm">
          {visitor && contact.email === ""
            ? "Se abrir vaga, quem cuida da loja fala com você pelo telefone que deixou."
            : "Se abrir vaga, a loja avisa você por e-mail."}
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {visitor && (
        <GuestContactFields
          value={contact}
          onChange={setContact}
          emailHint="Com e-mail, o aviso de vaga é automático."
        />
      )}
      {visitor && <Captcha onToken={setCaptchaToken} />}
      <Button
        size="lg"
        className="w-full"
        onClick={enter}
        disabled={state === "saving" || sessionPending}
      >
        {sessionPending
          ? "Só um instante…"
          : state === "saving"
            ? "Anotando…"
            : "Avise-me se abrir vaga"}
      </Button>
      <FormError>{error}</FormError>
    </div>
  );
}
