import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "#/components/ui/button";
import { EmptyState } from "#/components/ui/empty-state";
import { ShareButton } from "#/components/ui/share-button";
import { Tag } from "#/components/ui/tag";
import { listCampaignsQueryOptions, useListCampaigns } from "#/lib/api/gen/hooks/useListCampaigns";
import { publicRequest } from "#/lib/api/public";
import { campaignShareText, remainingCents } from "#/lib/campaign";
import { money, percent } from "#/lib/format";
import { seo } from "#/lib/seo";

export const Route = createFileRoute("/loja/$slug/campanhas/")({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(
      listCampaignsQueryOptions(params.slug, { limit: 24 }, publicRequest),
    ),
  head: ({ params }) =>
    seo({
      title: "Campanhas",
      description: "Campanhas abertas desta loja e quanto já foi arrecadado.",
      path: `/loja/${params.slug}/campanhas`,
    }),
  component: CampaignList,
});

function CampaignList() {
  const { slug } = Route.useParams();
  const { data } = useListCampaigns(slug, { limit: 24 }, { client: publicRequest });
  const campaigns = data?.items ?? [];

  return (
    <section className="shell py-14">
      <p className="kicker">Campanhas</p>
      <h1 className="mt-4 text-title">Veja onde seu auxílio faz diferença.</h1>

      {campaigns.length === 0 ? (
        <EmptyState
          className="mt-10"
          title="Nenhuma campanha aberta agora."
          action={
            <Button asChild variant="secondary">
              <Link to="/loja/$slug/doar" params={{ slug }}>
                Apoiar a loja
              </Link>
            </Button>
          }
        >
          Quando esta loja criar uma campanha com meta, ela aparece aqui. Dá para apoiar a loja
          agora mesmo, sem esperar.
        </EmptyState>
      ) : (
        <ul className="mt-10 grid gap-4 md:grid-cols-2">
          {campaigns.map((campaign) => (
            // o card é o <li> e não o <Link>: com o link envolvendo tudo, o botão de
            // compartilhar ficaria dentro de uma âncora — HTML inválido e clique roubado
            <li key={campaign.id} className="card card-hover group overflow-hidden">
              <Link
                to="/loja/$slug/campanhas/$campanha"
                params={{ slug, campanha: campaign.slug }}
                className="block"
              >
                {campaign.coverImageUrl && (
                  <img
                    src={campaign.coverImageUrl}
                    alt=""
                    loading="lazy"
                    className="aspect-16/9 w-full bg-surface object-cover"
                  />
                )}
                <div className="p-6">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-bold font-display text-xl transition-colors duration-(--dur) ease-(--ease) group-hover:text-brand-deep">
                      {campaign.title}
                    </h2>
                    {campaign.status === "paused" && <Tag tone="accent">pausada</Tag>}
                    {campaign.status === "finished" && <Tag>encerrada</Tag>}
                  </div>
                  <CampaignProgress
                    raisedCents={campaign.raisedCents}
                    goalCents={campaign.goalCents}
                    donationCount={campaign.donationCount}
                  />
                  {campaign.status === "active" && (
                    <p className="mt-4 inline-flex items-center gap-1.5 font-semibold text-brand-deep text-sm">
                      Quero auxiliar →
                    </p>
                  )}
                </div>
              </Link>
              <div className="border-line border-t px-6 py-3">
                <ShareButton
                  title={campaign.title}
                  text={campaignShareText(
                    campaign.title,
                    campaign.store.name,
                    remainingCents(campaign.raisedCents, campaign.goalCents),
                  )}
                  path={`/loja/${slug}/campanhas/${campaign.slug}`}
                  label="Compartilhar"
                  variant="ghost"
                  size="sm"
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function CampaignProgress({
  raisedCents,
  goalCents,
  donationCount,
}: {
  raisedCents: number;
  goalCents: number | null;
  donationCount: number;
}) {
  const pct = goalCents ? percent(raisedCents, goalCents) : null;
  return (
    <div className="mt-4">
      {pct !== null && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface">
          {/* progresso é cobre — o fio da marca */}
          <div
            className="progress-fill h-full rounded-full bg-brand"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
      <p className="mt-3 text-sm text-muted">
        <span className="text-ink">{money(raisedCents)}</span>
        {goalCents ? ` de ${money(goalCents)}` : " arrecadados"} ·{" "}
        {donationCount === 1 ? "1 doação" : `${donationCount} doações`}
      </p>
    </div>
  );
}
