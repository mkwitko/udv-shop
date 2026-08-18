import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Heart, Share2 } from "lucide-react";
import { useState } from "react";
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
              <Button asChild variant="inverse">
                <Link to="/loja/$slug/doar" params={{ slug }}>
                  <Heart className="h-4 w-4" aria-hidden />
                  Apoiar esta loja
                </Link>
              </Button>
              <ShareButton name={store?.name ?? "Loja"} slug={slug} />
            </div>
          </div>
        </div>

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

/** Compartilhar: nativo quando o celular oferece, copiar link quando não. */
function ShareButton({ name, slug }: { name: string; slug: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = `${window.location.origin}/loja/${slug}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: name, url });
        return;
      } catch {
        // pessoa fechou o menu de compartilhar: nada a fazer
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // sem clipboard: o link está na barra de endereço
    }
  }

  return (
    <Button variant="inverse-outline" onClick={share}>
      {copied ? (
        <>
          <Check className="h-4 w-4" aria-hidden /> Link copiado!
        </>
      ) : (
        <>
          <Share2 className="h-4 w-4" aria-hidden /> Compartilhar
        </>
      )}
    </Button>
  );
}
