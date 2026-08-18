import { createFileRoute, Link } from "@tanstack/react-router";
import { listCampaignsQueryOptions, useListCampaigns } from "#/lib/api/gen/hooks/useListCampaigns";
import { publicRequest } from "#/lib/api/public";
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
      <p className="kicker">Obra em andamento</p>
      <h1 className="mt-4 text-title">Campanhas</h1>

      {campaigns.length === 0 ? (
        <p className="mt-8 text-muted">Nenhuma campanha aberta agora.</p>
      ) : (
        <ul className="mt-10 grid gap-4 md:grid-cols-2">
          {campaigns.map((campaign) => (
            <li key={campaign.id}>
              <Link
                to="/loja/$slug/campanhas/$campanha"
                params={{ slug, campanha: campaign.slug }}
                className="card card-hover group block overflow-hidden"
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
                  <h2 className="font-display text-xl font-semibold transition-colors duration-(--dur) ease-(--ease) group-hover:text-brand">
                    {campaign.title}
                  </h2>
                  <CampaignProgress
                    raisedCents={campaign.raisedCents}
                    goalCents={campaign.goalCents}
                    donationCount={campaign.donationCount}
                  />
                </div>
              </Link>
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
