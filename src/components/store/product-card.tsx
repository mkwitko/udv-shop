import { Link } from "@tanstack/react-router";
import { Tag } from "#/components/ui/tag";
import type { ListProducts200 } from "#/lib/api/gen/types/ListProducts";
import { money } from "#/lib/format";

type Product = ListProducts200["items"][number];

export function ProductCard({
  product,
  storeSlug,
  showCategory = false,
}: {
  product: Product;
  storeSlug: string;
  /**
   * Ligado quando a vitrine tem categorias: aí a linha existe em todo card, mesmo vazia,
   * para nome e preço ficarem na mesma altura em toda a grade.
   */
  showCategory?: boolean;
}) {
  const cover = product.imageUrls[0];
  const onDemand = product.availability === "on_demand";
  const soldOut = !onDemand && product.stock <= 0;

  return (
    <article className="group">
      <Link
        to="/loja/$slug/p/$produto"
        params={{ slug: storeSlug, produto: product.slug }}
        className="block rounded-lg focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-4"
      >
        <div className="relative aspect-4/5 overflow-hidden rounded-lg border border-line bg-surface transition-colors [transition-duration:var(--dur)] group-hover:border-line-strong">
          {cover ? (
            <img
              src={cover}
              alt={product.name}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-(--dur) ease-(--ease) group-hover:scale-[1.03] group-active:scale-[0.99]"
            />
          ) : (
            // sem foto ainda: campo de cor da marca, não ícone decorativo
            <div className="h-full w-full bg-[radial-gradient(circle_at_30%_25%,var(--glow),transparent_65%)]" />
          )}
          {/* um selo por canto: esgotado e sob encomenda disputavam o mesmo lugar e
              o segundo simplesmente não aparecia */}
          {(onDemand || soldOut) && (
            <div className="absolute top-3 left-3">
              <Tag tone={soldOut ? "neutral" : "brand"}>
                {soldOut ? "Esgotado" : "Sob encomenda"}
              </Tag>
            </div>
          )}
        </div>

        {/* categoria fica acima do nome e discreta: é orientação, não etiqueta de vitrine */}
        {showCategory && (
          <p className="mt-3 truncate text-[0.7rem] text-muted uppercase tracking-[0.08em]">
            {product.category?.name ?? " "}
          </p>
        )}
        <h3
          className={`font-display font-semibold leading-snug transition-colors [transition-duration:var(--dur)] group-hover:text-brand-hover ${
            showCategory ? "mt-1" : "mt-3.5"
          }`}
        >
          {/* duas linhas no máximo, altura fixa: nome longo empurrava o preço e
              desalinhava a grade inteira */}
          <span className="line-clamp-2 min-h-[2.75rem]">{product.name}</span>
        </h3>
        <p className="mt-1 text-[0.95rem] text-muted tabular-nums">{money(product.priceCents)}</p>
      </Link>
    </article>
  );
}
