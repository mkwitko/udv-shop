import { Link } from "@tanstack/react-router";
import { Tag } from "#/components/ui/tag";
import type { ListProducts200 } from "#/lib/api/gen/types/ListProducts";
import { money } from "#/lib/format";

type Product = ListProducts200["items"][number];

export function ProductCard({ product, storeSlug }: { product: Product; storeSlug: string }) {
  const cover = product.imageUrls[0];
  const onDemand = product.availability === "on_demand";
  const soldOut = !onDemand && product.stock <= 0;

  return (
    <article className="group">
      <Link
        to="/loja/$slug/p/$produto"
        params={{ slug: storeSlug, produto: product.slug }}
        className="block"
      >
        <div className="relative aspect-4/5 overflow-hidden rounded-lg border border-line bg-surface transition-colors [transition-duration:var(--dur)] group-hover:border-line-strong">
          {cover ? (
            <img
              src={cover}
              alt={product.name}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-(--dur) ease-(--ease) group-hover:scale-[1.03]"
            />
          ) : (
            // sem foto ainda: campo de cor da marca, não ícone decorativo
            <div className="h-full w-full bg-[radial-gradient(circle_at_30%_25%,var(--glow),transparent_65%)]" />
          )}
          {(onDemand || soldOut) && (
            <div className="absolute top-3 left-3">
              <Tag tone={soldOut ? "neutral" : "brand"}>
                {soldOut ? "Esgotado" : "Sob encomenda"}
              </Tag>
            </div>
          )}
        </div>

        <h3 className="mt-3.5 font-display font-semibold leading-snug transition-colors [transition-duration:var(--dur)] group-hover:text-brand-hover">
          {product.name}
        </h3>
        <p className="mt-1 text-[0.95rem] text-muted tabular-nums">{money(product.priceCents)}</p>
      </Link>
    </article>
  );
}
