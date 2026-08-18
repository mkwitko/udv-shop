import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "#/components/ui/button";
import { Tag } from "#/components/ui/tag";
import { getProductQueryOptions, useGetProduct } from "#/lib/api/gen/hooks/useGetProduct";
import { publicRequest } from "#/lib/api/public";
import { money } from "#/lib/format";
import { productLd, seo, siteUrl } from "#/lib/seo";

export const Route = createFileRoute("/loja/$slug/p/$produto")({
  loader: ({ context, params }) =>
    context.queryClient
      .ensureQueryData(getProductQueryOptions(params.slug, params.produto, publicRequest))
      .then((product) => ({ product })),
  head: ({ loaderData, params }) => {
    const product = loaderData?.product;
    if (!product) return {};
    const path = `/loja/${params.slug}/p/${params.produto}`;
    return {
      ...seo({
        title: product.name,
        description:
          product.description ??
          `${product.name} por ${money(product.priceCents)}, direto de quem faz.`,
        path,
        image: product.imageUrls[0],
        type: "product",
      }),
      scripts: [
        productLd({
          name: product.name,
          description: product.description,
          priceCents: product.priceCents,
          currency: product.currency,
          images: product.imageUrls,
          inStock: product.availability === "in_stock" && product.stock > 0,
          url: `${siteUrl()}${path}`,
        }),
      ],
    };
  },
  component: ProductPage,
});

function ProductPage() {
  const { slug, produto } = Route.useParams();
  const { data: product } = useGetProduct(slug, produto, { client: publicRequest });
  if (!product) return null;

  const onDemand = product.availability === "on_demand";
  const soldOut = !onDemand && product.stock <= 0;

  return (
    <article className="shell grid gap-10 py-14 md:grid-cols-12">
      <div className="md:col-span-7">
        {product.imageUrls.length > 0 ? (
          <div className="grid gap-3">
            {product.imageUrls.map((url) => (
              <img
                key={url}
                src={url}
                alt={product.name}
                className="w-full bg-surface object-cover"
              />
            ))}
          </div>
        ) : (
          <div className="aspect-4/5 w-full bg-surface" />
        )}
      </div>

      <div className="md:col-span-5 md:pt-4">
        <Link
          to="/loja/$slug"
          params={{ slug }}
          className="text-sm text-muted underline underline-offset-4"
        >
          voltar para a loja
        </Link>

        <h1 className="mt-6 text-title text-balance">{product.name}</h1>
        <p className="mt-4 font-display text-3xl text-brand">{money(product.priceCents)}</p>

        <div className="mt-4 flex gap-2">
          {onDemand && <Tag tone="brand">Sob encomenda</Tag>}
          {soldOut && <Tag>Esgotado no momento</Tag>}
          {!onDemand && product.stock > 0 && <Tag tone="neutral">{product.stock} disponíveis</Tag>}
        </div>

        {product.description && (
          <p className="mt-7 whitespace-pre-line text-muted">{product.description}</p>
        )}

        <div className="mt-9">
          {/* checkout e lista de encomenda entram no plano 8 */}
          <Button size="lg" disabled>
            {onDemand ? "Avise quando chegar" : "Comprar"}
          </Button>
          <p className="mt-3 text-sm text-muted">Pagamento no cartão ou Pix, em breve.</p>
        </div>
      </div>
    </article>
  );
}
