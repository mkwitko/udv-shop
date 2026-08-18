import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import { FormError } from "#/components/ui/field";
import { Tag } from "#/components/ui/tag";
import { errorMessage } from "#/lib/api/error-message";
import { createInterest } from "#/lib/api/gen/clients/createInterest";
import { getProductQueryOptions, useGetProduct } from "#/lib/api/gen/hooks/useGetProduct";
import { publicRequest } from "#/lib/api/public";
import { useSession } from "#/lib/auth/session";
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
                loading="lazy"
                className="aspect-[4/3] w-full rounded-[1.25rem] bg-surface object-cover"
              />
            ))}
          </div>
        ) : (
          <div className="aspect-[4/3] w-full rounded-[1.25rem] bg-[radial-gradient(circle_at_30%_25%,var(--glow),transparent_65%)]" />
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
        <p className="mt-4 font-display text-3xl text-brand-deep">{money(product.priceCents)}</p>

        <div className="mt-4 flex flex-wrap gap-2">
          {onDemand && <Tag tone="brand">Feito sob encomenda</Tag>}
          {soldOut && <Tag>Esgotado</Tag>}
          {!onDemand && product.stock > 3 && <Tag tone="neutral">Disponível</Tag>}
          {!onDemand && product.stock > 0 && product.stock <= 3 && (
            <Tag tone="accent">Últimas unidades</Tag>
          )}
        </div>

        {product.description && (
          <p className="mt-7 whitespace-pre-line text-muted">{product.description}</p>
        )}

        <div className="mt-9">
          {onDemand ? (
            <InterestCta slug={slug} produto={produto} />
          ) : (
            <>
              {soldOut ? (
                <div className="rounded-[1rem] border border-line bg-surface p-4">
                  <p className="font-bold font-display">Esgotado</p>
                  <p className="mt-1 text-muted text-sm">
                    Este produto não está disponível agora. Vale voltar depois — a loja repõe a
                    vitrine por aqui.
                  </p>
                </div>
              ) : (
                <Button asChild size="lg" className="w-full sm:w-auto">
                  <Link to="/loja/$slug/comprar" params={{ slug }} search={{ produto, qtd: 1 }}>
                    Comprar — {money(product.priceCents)}
                  </Link>
                </Button>
              )}
              {!soldOut && (
                <p className="mt-3 text-muted text-sm">
                  Pague com Pix ou cartão. A entrega é combinada direto com a loja.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </article>
  );
}

/**
 * Produto sob encomenda: um toque avisa a loja do interesse. Quem não está logado é
 * levado a entrar e volta direto para cá.
 */
function InterestCta({ slug, produto }: { slug: string; produto: string }) {
  const { status } = useSession();
  const navigate = useNavigate();
  const [state, setState] = useState<"idle" | "saving" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  async function interest() {
    if (status !== "authenticated") {
      void navigate({ to: "/entrar", search: { redirect: `/loja/${slug}/p/${produto}` } });
      return;
    }
    setState("saving");
    setError(null);
    try {
      await createInterest({ storeSlug: slug, productSlug: produto, qty: 1 });
      setState("done");
    } catch (cause) {
      setError(errorMessage(cause));
      setState("idle");
    }
  }

  if (state === "done") {
    return (
      <div className="rounded-lg border border-brand/30 bg-brand-soft p-4">
        <p className="flex items-center gap-2 font-medium text-brand-deep">
          <Check className="h-5 w-5" aria-hidden />
          Pronto, você está na lista!
        </p>
        <p className="mt-1.5 text-sm text-muted">
          Quando o produto chegar, a loja avisa você por e-mail.
        </p>
      </div>
    );
  }

  return (
    <>
      <Button
        size="lg"
        className="w-full sm:w-auto"
        onClick={interest}
        disabled={state === "saving"}
      >
        {state === "saving" ? "Anotando…" : "Me avise quando chegar"}
      </Button>
      <div className="mt-3">
        <FormError>{error}</FormError>
      </div>
      <p className="mt-3 text-sm text-muted">Sem pagamento agora — é só um aviso de interesse.</p>
    </>
  );
}
