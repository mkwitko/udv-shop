import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { ProductCard } from "#/components/store/product-card";
import { Button } from "#/components/ui/button";
import { getStoreQueryOptions, useGetStore } from "#/lib/api/gen/hooks/useGetStore";
import { listProductsQueryOptions, useListProducts } from "#/lib/api/gen/hooks/useListProducts";
import { publicRequest } from "#/lib/api/public";
import { organizationLd, seo } from "#/lib/seo";

export const Route = createFileRoute("/loja/$slug/")({
  loader: async ({ context, params }) => {
    const [store] = await Promise.all([
      context.queryClient.ensureQueryData(getStoreQueryOptions(params.slug, publicRequest)),
      context.queryClient.ensureQueryData(
        listProductsQueryOptions(params.slug, { limit: 24 }, publicRequest),
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

function StoreCatalog() {
  const { slug } = Route.useParams();
  const { data: store } = useGetStore(slug, { client: publicRequest });
  const { data } = useListProducts(slug, { limit: 24 }, { client: publicRequest });
  const products = data?.items ?? [];

  return (
    <>
      <section className="thread thread-glow relative">
        <div className="shell py-14 md:py-20">
          <p className="rise rise-1 kicker">Loja</p>
          <h1 className="rise rise-2 mt-4 max-w-[18ch] text-title text-balance">{store?.name}</h1>
          {store?.description && (
            <p className="rise rise-3 mt-5 max-w-[52ch] text-lede text-muted">
              {store.description}
            </p>
          )}
          <div className="rise rise-4 mt-7">
            <Button asChild variant="secondary">
              <Link to="/loja/$slug/doar" params={{ slug }}>
                <Heart className="h-4 w-4 text-brand" aria-hidden />
                Apoiar esta loja
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section>
        <div className="shell py-10 md:py-14">
          {products.length === 0 ? (
            <p className="text-muted">Esta loja ainda não publicou produtos. Vale voltar depois.</p>
          ) : (
            <ul className="grid grid-cols-2 gap-x-6 gap-y-12 md:grid-cols-3 lg:grid-cols-4">
              {products.map((product) => (
                <li key={product.id}>
                  <ProductCard product={product} storeSlug={slug} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}
