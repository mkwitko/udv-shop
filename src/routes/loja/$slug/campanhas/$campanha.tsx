import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "#/components/ui/button";
import { ShareButton } from "#/components/ui/share-button";
import { Tag } from "#/components/ui/tag";
import { getCampaignQueryOptions, useGetCampaign } from "#/lib/api/gen/hooks/useGetCampaign";
import { useGetRaffle } from "#/lib/api/gen/hooks/useGetRaffle";
import { publicRequest } from "#/lib/api/public";
import { money } from "#/lib/format";
import { seo } from "#/lib/seo";
import { CampaignProgress } from "./index";

export const Route = createFileRoute("/loja/$slug/campanhas/$campanha")({
  loader: ({ context, params }) =>
    context.queryClient
      .ensureQueryData(getCampaignQueryOptions(params.slug, params.campanha, publicRequest))
      .then((campaign) => ({ campaign })),
  head: ({ loaderData, params }) => {
    const campaign = loaderData?.campaign;
    if (!campaign) return {};
    return seo({
      title: campaign.title,
      description: (campaign.story ?? `Campanha de ${campaign.store.name}.`).slice(0, 180),
      path: `/loja/${params.slug}/campanhas/${params.campanha}`,
      image: campaign.coverImageUrl ?? undefined,
      type: "article",
    });
  },
  component: CampaignPage,
});

/**
 * Prêmios do sorteio na vitrine. 404 quando a campanha não tem sorteio — daí `retry: false`
 * e o bloco simplesmente não aparece.
 */
function RafflePrizes({ slug, campanha }: { slug: string; campanha: string }) {
  const { data: raffle } = useGetRaffle(slug, campanha, {
    client: publicRequest,
    query: { retry: false },
  });
  if (!raffle) return null;

  return (
    <section className="mt-10">
      <h2 className="font-display font-semibold text-lg tracking-tight">
        {raffle.status === "drawn" ? "Prêmios sorteados" : "Prêmios do sorteio"}
      </h2>
      <p className="mt-2 text-muted text-sm tabular-nums">
        1 número da sorte a cada {money(raffle.centsPerNumber)} doados · {raffle.totalParticipants}{" "}
        participando
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
  );
}

function CampaignPage() {
  const { slug, campanha } = Route.useParams();
  const { data: campaign } = useGetCampaign(slug, campanha, { client: publicRequest });
  if (!campaign) return null;

  const monthly = campaign.acceptedTypes !== "one_time";

  return (
    <article className="shell py-14">
      <div className="grid gap-10 md:grid-cols-12">
        <div className="md:col-span-7">
          {campaign.coverImageUrl && (
            <img
              src={campaign.coverImageUrl}
              alt=""
              className="aspect-16/9 w-full rounded-[1.25rem] bg-surface object-cover"
            />
          )}
          <h1 className="mt-8 text-title text-balance">{campaign.title}</h1>
          {campaign.story && (
            <div className="mt-6 max-w-[62ch] whitespace-pre-line text-lede text-muted">
              {campaign.story}
            </div>
          )}

          <RafflePrizes slug={slug} campanha={campanha} />
        </div>

        <aside className="md:col-span-5 md:pt-4">
          <div className="card p-6">
            <CampaignProgress
              raisedCents={campaign.raisedCents}
              goalCents={campaign.goalCents}
              donationCount={campaign.donationCount}
            />
            <div className="mt-6 flex flex-wrap gap-2">
              <Tag tone="brand">Doação única</Tag>
              {monthly && <Tag tone="accent">Mensal</Tag>}
            </div>
            {campaign.status === "active" ? (
              <>
                <Button asChild className="mt-6 w-full" size="lg">
                  <Link to="/loja/$slug/doar" params={{ slug }} search={{ campanha }}>
                    Quero ajudar
                  </Link>
                </Button>
                <p className="mt-3 text-muted text-sm">
                  O valor vai direto para a conta de {campaign.store.name}.
                </p>
              </>
            ) : (
              <p className="mt-6 rounded-[1rem] bg-surface px-4 py-3 text-[0.95rem] text-muted">
                {campaign.status === "paused"
                  ? "Campanha pausada — a loja pode reabri-la em breve."
                  : "Campanha encerrada. Obrigado a todo mundo que ajudou."}
              </p>
            )}
            <div className="mt-4">
              <ShareButton
                title={campaign.title}
                path={`/loja/${slug}/campanhas/${campanha}`}
                label="Compartilhar campanha"
                variant="ghost"
                className="w-full"
              />
            </div>
          </div>
        </aside>
      </div>
    </article>
  );
}
