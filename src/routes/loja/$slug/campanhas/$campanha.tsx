import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "#/components/ui/button";
import { Tag } from "#/components/ui/tag";
import { getCampaignQueryOptions, useGetCampaign } from "#/lib/api/gen/hooks/useGetCampaign";
import { publicRequest } from "#/lib/api/public";
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
              className="aspect-16/9 w-full bg-surface object-cover"
            />
          )}
          <h1 className="mt-8 text-title text-balance">{campaign.title}</h1>
          {campaign.story && (
            <div className="mt-6 max-w-[62ch] whitespace-pre-line text-lede text-muted">
              {campaign.story}
            </div>
          )}
        </div>

        <aside className="md:col-span-5 md:pt-4">
          <div className="border border-line p-6">
            <CampaignProgress
              raisedCents={campaign.raisedCents}
              goalCents={campaign.goalCents}
              donationCount={campaign.donationCount}
            />
            <div className="mt-6 flex flex-wrap gap-2">
              <Tag tone="brand">Doação única</Tag>
              {monthly && <Tag tone="accent">Mensal</Tag>}
            </div>
            <Button asChild className="mt-6 w-full" size="lg">
              <Link to="/loja/$slug/doar" params={{ slug }} search={{ campanha }}>
                Doar para esta campanha
              </Link>
            </Button>
            <p className="mt-3 text-sm text-muted">
              O valor vai direto para a conta de {campaign.store.name}.
            </p>
          </div>
        </aside>
      </div>
    </article>
  );
}
