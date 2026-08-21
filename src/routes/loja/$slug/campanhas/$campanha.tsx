import { createFileRoute, Link } from "@tanstack/react-router";
import { Ticket } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "#/components/ui/button";
import { HeroGallery } from "#/components/ui/hero-gallery";
import { ShareButton } from "#/components/ui/share-button";
import { Tag } from "#/components/ui/tag";
import { getCampaignQueryOptions, useGetCampaign } from "#/lib/api/gen/hooks/useGetCampaign";
import { listRafflesQueryOptions, useListRaffles } from "#/lib/api/gen/hooks/useListRaffles";
import { publicRequest } from "#/lib/api/public";
import { campaignShareText, openRaffle, pickOgImage, remainingCents } from "#/lib/campaign";
import { money, percent } from "#/lib/format";
import { seo } from "#/lib/seo";

/** Mesmos degraus do checkout de doação, para o valor escolhido aqui chegar lá marcado. */
const PRESETS_CENTS = [2000, 5000, 10000];

export const Route = createFileRoute("/loja/$slug/campanhas/$campanha")({
  loader: async ({ context, params }) => {
    const campaign = await context.queryClient.ensureQueryData(
      getCampaignQueryOptions(params.slug, params.campanha, publicRequest),
    );
    // sorteio entra no SSR porque decide o selo do topo e a imagem do link compartilhado;
    // campanha sem sorteio responde 404 aqui, e isso não é erro de página
    const raffles = await context.queryClient
      .ensureQueryData(listRafflesQueryOptions(params.slug, params.campanha, publicRequest))
      .catch(() => null);
    return { campaign, raffles };
  },
  head: ({ loaderData, params }) => {
    const campaign = loaderData?.campaign;
    if (!campaign) return {};
    const remaining = remainingCents(campaign.raisedCents, campaign.goalCents);
    return seo({
      // "Auxilie:" na frente porque o título viaja sozinho no card do WhatsApp
      title: `Auxilie: ${campaign.title} — ${campaign.store.name}`,
      description: (
        campaign.story ?? campaignShareText(campaign.title, campaign.store.name, remaining)
      ).slice(0, 180),
      path: `/loja/${params.slug}/campanhas/${params.campanha}`,
      image: pickOgImage(campaign.coverImageUrl, loaderData?.raffles?.items),
      type: "article",
    });
  },
  component: CampaignPage,
});

/**
 * Prêmios dos sorteios da campanha. Campanha longa tem um sorteio por período, então é um
 * bloco por sorteio. Lista vazia (ou 404 de campanha sem sorteio) faz a seção desaparecer
 * em vez de mostrar título sem conteúdo.
 */
function RafflePrizes({ slug, campanha }: { slug: string; campanha: string }) {
  const { data } = useListRaffles(slug, campanha, {
    client: publicRequest,
    query: { retry: false },
  });
  const raffles = data?.items ?? [];
  if (raffles.length === 0) return null;

  return (
    <div className="mt-14 grid gap-10">
      {raffles.map((raffle) => (
        <section key={raffle.sequence}>
          <h2 className="font-display font-semibold text-lg tracking-tight">
            {raffle.title}
            {raffle.status === "drawn" && (
              <span className="ml-2 align-middle">
                <Tag tone="neutral">realizado</Tag>
              </span>
            )}
          </h2>
          <p className="mt-2 text-muted text-sm tabular-nums">
            1 número da sorte a cada {money(raffle.centsPerNumber)} doados ·{" "}
            {raffle.totalParticipants} participando
          </p>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            {raffle.prizes.map((prize) => (
              <li key={prize.position} className="card overflow-hidden">
                {prize.imageUrls[0] ? (
                  <img
                    src={prize.imageUrls[0]}
                    alt=""
                    className="aspect-4/3 w-full bg-surface object-cover"
                  />
                ) : null}
                <div className="grid gap-2 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Tag tone="neutral">{prize.position}º prêmio</Tag>
                    {prize.winner && <Tag tone="brand">número {prize.winner.number}</Tag>}
                  </div>
                  <p className="font-display font-semibold">{prize.title}</p>
                  {prize.description && (
                    <p className="whitespace-pre-line text-muted text-sm">{prize.description}</p>
                  )}
                  {prize.winner && (
                    <p className="text-muted text-sm">Ganhou: {prize.winner.participant}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

/** Arrecadado, meta e quanto falta — o argumento que faz alguém decidir doar. */
function Numbers({
  raisedCents,
  goalCents,
  donationCount,
}: {
  raisedCents: number;
  goalCents: number | null;
  donationCount: number;
}) {
  const pct = goalCents ? percent(raisedCents, goalCents) : null;
  const remaining = remainingCents(raisedCents, goalCents);

  return (
    <div className="grid gap-3">
      <p className="flex flex-wrap items-baseline gap-2">
        <span className="font-display font-semibold text-2xl tabular-nums">
          {money(raisedCents)}
        </span>
        {goalCents && (
          <span className="text-muted text-sm tabular-nums">de {money(goalCents)}</span>
        )}
      </p>

      {pct !== null && (
        <div className="h-2 w-full overflow-hidden rounded-full bg-surface">
          {/* progresso é cobre — o fio da marca */}
          <div
            className="progress-fill h-full rounded-full bg-brand"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}

      <p className="text-muted text-sm tabular-nums">
        {remaining !== null && remaining > 0 && (
          <span className="text-ink">Faltam {money(remaining)}</span>
        )}
        {remaining === 0 && <span className="text-ink">Meta batida</span>}
        {remaining !== null && " · "}
        {donationCount === 1 ? "1 pessoa já auxiliou" : `${donationCount} doações até agora`}
      </p>
    </div>
  );
}

function CampaignPage() {
  const { slug, campanha } = Route.useParams();
  const { data: campaign } = useGetCampaign(slug, campanha, { client: publicRequest });
  const { data: rafflesPage } = useListRaffles(slug, campanha, {
    client: publicRequest,
    query: { retry: false },
  });
  const ctaRef = useRef<HTMLDivElement>(null);
  const [ctaVisible, setCtaVisible] = useState(true);

  // a barra fixa só entra quando o botão do topo sai da tela: quem chega por link de
  // WhatsApp rola até o fim da história e não deveria ter de voltar para doar
  useEffect(() => {
    const node = ctaRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) =>
      setCtaVisible(entry?.isIntersecting ?? true),
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  if (!campaign) return null;

  const monthly = campaign.acceptedTypes !== "one_time";
  const active = campaign.status === "active";
  const raffle = openRaffle(rafflesPage?.items);
  const remaining = remainingCents(campaign.raisedCents, campaign.goalCents);
  const shareText = campaignShareText(campaign.title, campaign.store.name, remaining);
  const sharePath = `/loja/${slug}/campanhas/${campanha}`;
  const featuredPrize = raffle?.prizes[0];
  // capa na frente: o carrossel começa por ela, mesmo que tenha sido a última a subir
  const gallery = campaign.coverImageUrl
    ? [
        campaign.coverImageUrl,
        ...campaign.imageUrls.filter((url) => url !== campaign.coverImageUrl),
      ]
    : campaign.imageUrls;

  return (
    <article className="pb-24 md:pb-14">
      {/* capa em faixa larga: é a primeira coisa que aparece quando o link abre */}
      {campaign.coverImageUrl ? (
        // capa primeiro e o resto em carrossel: a foto escolhida é a que abre a página
        // e a que viaja no link, as outras contam o resto sem empurrar o texto para baixo
        <HeroGallery images={gallery}>
          <p className="kicker text-white/80">{campaign.store.name}</p>
          <h1 className="mt-2 max-w-[20ch] text-balance font-display font-semibold text-3xl text-white tracking-tight md:text-5xl">
            {campaign.title}
          </h1>
        </HeroGallery>
      ) : (
        <div className="bloco">
          <div className="shell py-12 md:py-16">
            <p className="kicker text-white/80">{campaign.store.name}</p>
            <h1 className="mt-2 max-w-[20ch] text-balance font-display font-semibold text-3xl text-white tracking-tight md:text-5xl">
              {campaign.title}
            </h1>
          </div>
        </div>
      )}

      <div className="shell grid gap-10 pt-8 md:grid-cols-12 md:pt-12">
        <div className="md:col-span-7">
          {raffle && active && (
            <section className="card grid gap-4 border-brand/30 bg-brand-pale p-5 sm:grid-cols-[auto_1fr] sm:items-center">
              {featuredPrize?.imageUrls[0] ? (
                <img
                  src={featuredPrize.imageUrls[0]}
                  alt=""
                  className="h-24 w-24 rounded-[1rem] bg-surface object-cover"
                />
              ) : (
                <span className="grid h-24 w-24 place-items-center rounded-[1rem] bg-surface">
                  <Ticket className="h-8 w-8 text-brand" aria-hidden />
                </span>
              )}
              <div className="grid gap-1">
                <p className="kicker">Doe e concorra</p>
                <p className="font-display font-semibold text-lg">
                  {featuredPrize?.title ?? raffle.title}
                </p>
                <p className="text-muted text-sm tabular-nums">
                  1 número da sorte a cada {money(raffle.centsPerNumber)} doados ·{" "}
                  {raffle.prizes.length === 1
                    ? "1 prêmio"
                    : `${raffle.prizes.length} prêmios no ${raffle.title.toLowerCase()}`}
                </p>
              </div>
            </section>
          )}

          {campaign.story && (
            <div className="mt-8 max-w-[62ch] whitespace-pre-line text-lede text-muted">
              {campaign.story}
            </div>
          )}

          <RafflePrizes slug={slug} campanha={campanha} />

          <section className="mt-14 card grid gap-3 p-6">
            <h2 className="font-display font-semibold text-lg tracking-tight">
              Auxilie a espalhar
            </h2>
            <p className="text-muted">
              Nem todo mundo pode doar hoje, mas todo mundo conhece alguém que pode. Mandar o link
              para um grupo é o que faz a campanha andar.
            </p>
            <div>
              <ShareButton
                title={campaign.title}
                text={shareText}
                path={sharePath}
                label="Compartilhar campanha"
                size="lg"
              />
            </div>
          </section>
        </div>

        {/* no celular os números e o botão vêm logo abaixo da capa: quem chegou pelo link
            decide antes de ler a história, e a barra fixa só entra depois que isso sai da tela */}
        <aside className="order-first md:order-none md:col-span-5">
          <div className="card grid gap-5 p-6 md:sticky md:top-24">
            <Numbers
              raisedCents={campaign.raisedCents}
              goalCents={campaign.goalCents}
              donationCount={campaign.donationCount}
            />

            <div className="flex flex-wrap gap-2">
              <Tag tone="brand">Doação única</Tag>
              {monthly && <Tag tone="accent">Mensal</Tag>}
              {raffle && active && <Tag tone="accent">Com sorteio</Tag>}
            </div>

            {active ? (
              <div ref={ctaRef} className="grid gap-3">
                {/* valor escolhido aqui já chega marcado no checkout: menos um passo entre
                    a vontade de doar e o pagamento */}
                <div className="grid grid-cols-3 gap-2">
                  {PRESETS_CENTS.map((cents) => (
                    <Button key={cents} asChild variant="outline" size="sm">
                      <Link
                        to="/loja/$slug/doar"
                        params={{ slug }}
                        search={{ campanha, valor: cents }}
                      >
                        {money(cents)}
                      </Link>
                    </Button>
                  ))}
                </div>

                <Button asChild className="w-full" size="lg">
                  <Link to="/loja/$slug/doar" params={{ slug }} search={{ campanha }}>
                    Quero auxiliar
                  </Link>
                </Button>

                <p className="text-muted text-sm">
                  O valor vai direto para a conta de {campaign.store.name}.
                </p>
              </div>
            ) : (
              <p className="rounded-[1rem] bg-surface px-4 py-3 text-[0.95rem] text-muted">
                {campaign.status === "paused"
                  ? "Campanha pausada — a loja pode reabri-la em breve."
                  : "Campanha encerrada. Obrigado a todo mundo que auxiliou."}
              </p>
            )}

            <ShareButton
              title={campaign.title}
              text={shareText}
              path={sharePath}
              label="Compartilhar"
              variant="ghost"
              className="w-full"
            />
          </div>
        </aside>
      </div>

      {/* barra fixa: no celular a decisão acontece depois de ler a história */}
      {active && !ctaVisible && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-line border-t bg-elevated/95 backdrop-blur md:hidden">
          <div className="shell flex items-center gap-3 py-3">
            <p className="min-w-0 flex-1 text-sm tabular-nums">
              <span className="font-display font-semibold">{money(campaign.raisedCents)}</span>
              <span className="block truncate text-muted text-xs">
                {remaining !== null && remaining > 0
                  ? `faltam ${money(remaining)}`
                  : `${campaign.donationCount} doações`}
              </span>
            </p>
            <Button asChild size="md">
              <Link to="/loja/$slug/doar" params={{ slug }} search={{ campanha }}>
                Quero auxiliar
              </Link>
            </Button>
          </div>
        </div>
      )}
    </article>
  );
}
