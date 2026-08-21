import { useInfiniteQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, PackageSearch, SearchX } from "lucide-react";
import { ProductCard } from "#/components/store/product-card";
import { StoreHero } from "#/components/store/store-hero";
import { StoreToolbar } from "#/components/store/store-toolbar";
import { Button } from "#/components/ui/button";
import { EmptyState } from "#/components/ui/empty-state";
import { GlyphCampanha } from "#/components/ui/glyphs";
import { SkeletonCards } from "#/components/ui/skeleton";
import { Tag } from "#/components/ui/tag";
import { getStoreQueryOptions, useGetStore } from "#/lib/api/gen/hooks/useGetStore";
import { listCampaignsQueryOptions, useListCampaigns } from "#/lib/api/gen/hooks/useListCampaigns";
import {
  listCategoriesQueryOptions,
  useListCategories,
} from "#/lib/api/gen/hooks/useListCategories";
import type { ListCampaigns200 } from "#/lib/api/gen/types/ListCampaigns";
import { publicRequest } from "#/lib/api/public";
import {
  type CatalogSearch,
  CatalogSearchSchema,
  cleanSearch,
  storeCatalogInfiniteOptions,
} from "#/lib/api/store-catalog";
import { money, percent } from "#/lib/format";
import { organizationLd, seo } from "#/lib/seo";

export const Route = createFileRoute("/loja/$slug/")({
  validateSearch: CatalogSearchSchema,
  // o filtro entra no SSR: link com categoria ou busca já chega renderizado filtrado
  loaderDeps: ({ search }) => cleanSearch(search),
  loader: async ({ context, params, deps }) => {
    const [store] = await Promise.all([
      context.queryClient.ensureQueryData(getStoreQueryOptions(params.slug, publicRequest)),
      context.queryClient.ensureInfiniteQueryData(
        storeCatalogInfiniteOptions(params.slug, deps, publicRequest),
      ),
      context.queryClient.ensureQueryData(listCategoriesQueryOptions(params.slug, publicRequest)),
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
        // canônica sem filtro: categoria e busca são formas de olhar a mesma vitrine
        path: `/loja/${params.slug}`,
      }),
      scripts: [organizationLd(store)],
    };
  },
  component: StoreCatalog,
});

/**
 * A loja é o hub da comunidade (§15 do brief): quem chega decide entre comprar e
 * apoiar, vê a campanha que está de pé e depois a vitrine — que agora se navega por
 * gaveta, busca e ordem em vez de ser uma parede de fotos.
 */
function StoreCatalog() {
  const { slug } = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const { data: store } = useGetStore(slug, { client: publicRequest });
  const { data: categoryPage } = useListCategories(slug, { client: publicRequest });
  const { data: campaignPage } = useListCampaigns(slug, { limit: 6 }, { client: publicRequest });
  const filters = cleanSearch(search);
  const {
    data: catalog,
    isPending,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery(storeCatalogInfiniteOptions(slug, filters, publicRequest));

  const products = catalog?.pages.flatMap((page) => page.items) ?? [];
  const categories = categoryPage?.items ?? [];
  const campaigns = campaignPage?.items ?? [];
  const featured = campaigns.find((campaign) => campaign.status === "active");
  const activeCount = campaigns.filter((campaign) => campaign.status === "active").length;
  const storeTotal = categoryPage?.total ?? 0;
  const hasProducts = storeTotal > 0 || products.length > 0;
  const showCategory = categories.length > 0;
  const filtered = Boolean(filters.categoria || filters.q);

  /** Troca de filtro preserva o resto e não empilha histórico: voltar sai da loja. */
  function changeFilters(patch: CatalogSearch) {
    void navigate({
      search: (previous) => cleanSearch({ ...previous, ...patch }),
      replace: true,
      resetScroll: false,
    });
  }

  return (
    <>
      <section className="shell pt-4 md:pt-8">
        <StoreHero
          store={store}
          slug={slug}
          hasProducts={hasProducts}
          meta={
            <>
              {storeTotal > 0 && (
                <span className="tabular-nums">
                  {storeTotal === 1 ? "1 produto" : `${storeTotal} produtos`}
                </span>
              )}
              {activeCount > 0 && (
                <span className="tabular-nums">
                  {activeCount === 1 ? "1 campanha no ar" : `${activeCount} campanhas no ar`}
                </span>
              )}
            </>
          }
        />

        {store && store.status !== "active" && (
          <p className="mt-4 rounded-[1rem] border border-accent/35 bg-warning-soft px-4 py-3 text-[0.95rem] text-ink">
            <strong className="font-semibold">Só você está vendo esta página.</strong> A loja está{" "}
            {store.status === "pending" ? "aguardando liberação" : "fora do ar"} — ninguém de fora
            consegue comprar ou doar.
          </p>
        )}
      </section>

      {featured && (
        <section className="shell mt-8">
          <FeaturedCampaign slug={slug} campaign={featured} />
        </section>
      )}

      {/* a toolbar vive dentro da seção da vitrine: `sticky` só cola enquanto o PAI está
          na tela, e um invólucro do tamanho dela mesma fazia a barra sumir na primeira rolagem */}
      <section id="produtos" className="mt-8 scroll-mt-40">
        {hasProducts && (
          <StoreToolbar
            categories={categories}
            value={filters}
            onChange={changeFilters}
            total={storeTotal}
          />
        )}
        <div className="shell py-8 md:py-12">
          {isPending ? (
            <SkeletonCards count={8} />
          ) : products.length > 0 ? (
            <>
              <ul className="grid grid-cols-2 gap-x-5 gap-y-8 md:grid-cols-3 md:gap-x-6 md:gap-y-10 lg:grid-cols-4">
                {products.map((product) => (
                  <li key={product.id}>
                    <ProductCard product={product} storeSlug={slug} showCategory={showCategory} />
                  </li>
                ))}
              </ul>

              {hasNextPage && (
                <div className="mt-10 flex justify-center">
                  <Button
                    variant="secondary"
                    disabled={isFetchingNextPage}
                    onClick={() => void fetchNextPage()}
                  >
                    {isFetchingNextPage ? "Carregando…" : "Ver mais produtos"}
                  </Button>
                </div>
              )}
            </>
          ) : filters.q ? (
            <EmptyState
              icon={<SearchX className="h-6 w-6" aria-hidden />}
              title={`Nada encontrado para “${filters.q}”.`}
              action={
                <>
                  <Button variant="secondary" onClick={() => changeFilters({ q: undefined })}>
                    Limpar busca
                  </Button>
                  {filters.categoria && (
                    <Button
                      variant="ghost"
                      onClick={() => changeFilters({ q: undefined, categoria: undefined })}
                    >
                      Ver todos os produtos
                    </Button>
                  )}
                </>
              }
            >
              Tente outra palavra — ou o nome de quem faz o produto.
            </EmptyState>
          ) : filters.categoria ? (
            <EmptyState
              icon={<PackageSearch className="h-6 w-6" aria-hidden />}
              title="Nenhum produto nesta categoria agora."
              action={
                <Button variant="secondary" onClick={() => changeFilters({ categoria: undefined })}>
                  Ver todos os produtos
                </Button>
              }
            >
              A loja tem outras coisas — dá uma olhada na vitrine inteira.
            </EmptyState>
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

          {/* filtro ativo com resultado: a saída fica à mão sem precisar rolar de volta */}
          {filtered && products.length > 0 && (
            <p className="mt-8 text-center text-muted text-sm">
              <button
                type="button"
                className="underline underline-offset-4 transition-colors [transition-duration:var(--dur)] hover:text-ink"
                onClick={() => changeFilters({ categoria: undefined, q: undefined })}
              >
                Limpar filtros e ver a loja inteira
              </button>
            </p>
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
