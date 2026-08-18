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
      description: "Campanhas abertas deste núcleo e quanto já foi arrecadado.",
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
        <p className="mt-8 text-ink-soft">Nenhuma campanha aberta agora.</p>
      ) : (
        <ul className="mt-12 grid gap-x-8 gap-y-12 md:grid-cols-2">
          {campaigns.map((campaign) => (
            <li key={campaign.id}>
              <Link
                to="/loja/$slug/campanhas/$campanha"
                params={{ slug, campanha: campaign.slug }}
                className="group block"
              >
                {campaign.coverImageUrl && (
                  <img
                    src={campaign.coverImageUrl}
                    alt=""
                    loading="lazy"
                    className="aspect-16/9 w-full bg-paper-deep object-cover"
                  />
                )}
                <h2 className="mt-5 font-display text-2xl transition-colors duration-(--dur) ease-(--ease) group-hover:text-clay">
                  {campaign.title}
                </h2>
                <CampaignProgress
                  raisedCents={campaign.raisedCents}
                  goalCents={campaign.goalCents}
                  donationCount={campaign.donationCount}
                />
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
        <div className="h-1 w-full bg-paper-deep">
          <div className="h-full bg-moss" style={{ width: `${pct}%` }} />
        </div>
      )}
      <p className="mt-3 text-sm text-ink-soft">
        <span className="text-ink">{money(raisedCents)}</span>
        {goalCents ? ` de ${money(goalCents)}` : " arrecadados"} ·{" "}
        {donationCount === 1 ? "1 doação" : `${donationCount} doações`}
      </p>
    </div>
  );
}
