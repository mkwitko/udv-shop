import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Heart, ShoppingBag } from "lucide-react";
import { ProductCard } from "#/components/store/product-card";
import { Button } from "#/components/ui/button";
import { EmptyState } from "#/components/ui/empty-state";
import { GlyphCampanha } from "#/components/ui/glyphs";
import { ShareButton } from "#/components/ui/share-button";
import { SkeletonCards } from "#/components/ui/skeleton";
import { Tag } from "#/components/ui/tag";
import { listCampaignsQueryOptions, useListCampaigns } from "#/lib/api/gen/hooks/useListCampaigns";
import { getStoreQueryOptions, useGetStore } from "#/lib/api/gen/hooks/useGetStore";
import { listProductsQueryOptions, useListProducts } from "#/lib/api/gen/hooks/useListProducts";
import type { ListCampaigns200 } from "#/lib/api/gen/types/ListCampaigns";
import { publicRequest } from "#/lib/api/public";
import { money, percent } from "#/lib/format";
import { organizationLd, seo } from "#/lib/seo";

export const Route = createFileRoute("/loja/$slug/")({
  loader: async ({ context, params }) => {
    const [store] = await Promise.all([
      context.queryClient.ensureQueryData(getStoreQueryOptions(params.slug, publicRequest)),
      context.queryClient.ensureQueryData(
        listProductsQueryOptions(params.slug, { limit: 24 }, publicRequest),
      ),
      context.queryClient.ensureQueryData(
        listCampaignsQueryOptions(params.slug, { limit: 6 }, publicRequest),
      ),
    ]);
    return { store };
  },
  head: ({ loaderData, params }) => {
    const store = loaderData?.store;
    if (!store) return {};
    return {
      ...seo({
        title: store.name,
        description:
          store.description ?? `Produtos e campanhas de ${store.name}, direto de quem faz.`,
        path: `/loja/${params.slug}`,
      }),
      scripts: [organizationLd(store)],
    };
  },
  component: StoreCatalog,
});

/**
 * A loja é o hub da comunidade (§15 do brief): quem chega decide entre comprar e
 * apoiar, vê a campanha que está de pé e depois a vitrine. Nada de seção vazia.
 */
function StoreCatalog() {
  const { slug } = Route.useParams();
  const { data: store } = useGetStore(slug, { client: publicRequest });
  const { data, isPending } = useListProducts(slug, { limit: 24 }, { client: publicRequest });
  const { data: campaignPage } = useListCampaigns(slug, { limit: 6 }, { client: publicRequest });
  const products = data?.items ?? [];
  const campaigns = campaignPage?.items ?? [];
  const featured = campaigns.find((campaign) => campaign.status === "active");
  const hasProducts = products.length > 0;

  return (
    <>
      {/* topo da loja é um bloco tangerina: a vitrine tem a cor da casa */}
      <section className="shell pt-4 md:pt-8">
        <div className="bloco px-6 py-10 md:px-12 md:py-14">
          <div className="relative">
            <div className="rise rise-1 flex items-center gap-4">
              <span className="inline-grid h-14 w-14 shrink-0 place-items-center rounded-full bg-white font-bold font-display text-2xl text-brand-deep shadow-md">
                {store?.name.charAt(0)}
              </span>
              <h1 className="max-w-[16ch] font-bold font-display text-3xl text-balance leading-tight md:text-4xl">
                {store?.name}
              </h1>
            </div>
            {store?.description && (
              <p className="rise rise-2 mt-4 max-w-[52ch] text-lede text-white/90">
                {store.description}
              </p>
            )}
            <div className="rise rise-3 mt-7 flex flex-wrap gap-3">
              {hasProducts && (
                <Button asChild variant="inverse">
                  <Link to="/loja/$slug" params={{ slug }} hash="produtos">
                    <ShoppingBag className="h-4 w-4" aria-hidden />
                    Comprar
                  </Link>
                </Button>
              )}
              <Button asChild variant={hasProducts ? "inverse-outline" : "inverse"}>
                <Link to="/loja/$slug/doar" params={{ slug }}>
                  <Heart className="h-4 w-4" aria-hidden />
                  Apoiar
                </Link>
              </Button>
              <ShareButton
                title={store?.name ?? "Loja"}
                path={`/loja/${slug}`}
                variant="inverse-outline"
                label="Compartilhar"
              />
            </div>
          </div>
        </div>

        {store && store.status !== "active" && (
          <p className="mt-4 rounded-[1rem] border border-accent/35 bg-warning-soft px-4 py-3 text-[0.95rem] text-ink">
            <strong className="font-semibold">Só você está vendo esta página.</strong> A loja está{" "}
            {store.status === "pending" ? "aguardando liberação" : "fora do ar"} — ninguém de fora
            consegue comprar ou doar.
          </p>
        )}

        {/* navegação da vitrine: pills, com rolagem no celular */}
        <nav className="scroll-row mt-4" aria-label="Seções da loja">
          <span className="rounded-full bg-ink px-4 py-2 font-semibold text-bg text-sm">
            Produtos
          </span>
          <Link
            to="/loja/$slug/campanhas"
            params={{ slug }}
            className="rounded-full border border-line bg-elevated px-4 py-2 font-medium text-muted text-sm transition-colors [transition-duration:var(--dur)] hover:text-ink"
          >
            Campanhas
          </Link>
          <Link
            to="/loja/$slug/doar"
            params={{ slug }}
            className="rounded-full border border-line bg-elevated px-4 py-2 font-medium text-muted text-sm transition-colors [transition-duration:var(--dur)] hover:text-ink"
          >
            Doar
          </Link>
        </nav>
      </section>

      {featured && (
        <section className="shell mt-8">
          <FeaturedCampaign slug={slug} campaign={featured} />
        </section>
      )}

      <section id="produtos" className="scroll-mt-24">
        <div className="shell py-10 md:py-14">
          {isPending ? (
            <SkeletonCards count={4} />
          ) : hasProducts ? (
            <ul className="grid grid-cols-2 gap-x-6 gap-y-12 md:grid-cols-3 lg:grid-cols-4">
              {products.map((product) => (
                <li key={product.id}>
                  <ProductCard product={product} storeSlug={slug} />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              title="Ainda não há produtos aqui."
              action={
                campaigns.length > 0 ? (
                  <Button asChild variant="secondary">
                    <Link to="/loja/$slug/campanhas" params={{ slug }}>
                      Ver campanhas
                    </Link>
                  </Button>
                ) : (
                  <Button asChild variant="secondary">
                    <Link to="/loja/$slug/doar" params={{ slug }}>
                      Apoiar esta loja
                    </Link>
                  </Button>
                )
              }
            >
              Esta loja está montando a vitrine. Vale voltar depois — ou já dar uma força agora.
            </EmptyState>
          )}
        </div>
      </section>
    </>
  );
}

type Campaign = ListCampaigns200["items"][number];

/** A campanha de pé aparece logo abaixo do topo: necessidade, meta e o quanto falta. */
function FeaturedCampaign({ slug, campaign }: { slug: string; campaign: Campaign }) {
  const pct = campaign.goalCents ? percent(campaign.raisedCents, campaign.goalCents) : null;

  return (
    <article className="card p-5 md:p-7">
      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-soft text-brand-deep">
          <GlyphCampanha className="h-5 w-5" />
        </span>
        <h2 className="font-bold font-display text-xl tracking-tight md:text-2xl">
          {campaign.title}
        </h2>
        <Tag tone="brand">campanha no ar</Tag>
      </div>

      <p className="mt-5 font-bold font-display text-2xl tabular-nums md:text-3xl">
        {money(campaign.raisedCents)}
        {campaign.goalCents && (
          <span className="font-medium font-sans text-base text-muted">
            {" "}
            de {money(campaign.goalCents)}
          </span>
        )}
      </p>

      {pct !== null && (
        <>
          <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-surface">
            <div
              className="progress-fill h-full rounded-full bg-brand"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-2 text-muted text-sm tabular-nums">
            {pct}% da meta ·{" "}
            {campaign.donationCount === 1 ? "1 doação" : `${campaign.donationCount} doações`}
          </p>
        </>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        <Button asChild>
          <Link to="/loja/$slug/doar" params={{ slug }} search={{ campanha: campaign.slug }}>
            Apoiar campanha
          </Link>
        </Button>
        <Button asChild variant="ghost">
          <Link to="/loja/$slug/campanhas/$campanha" params={{ slug, campanha: campaign.slug }}>
            Ver a história
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </Button>
      </div>
    </article>
  );
}
