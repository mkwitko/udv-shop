import { Link } from "@tanstack/react-router";
import { Heart, MessageCircle, ShoppingBag } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "#/components/ui/button";
import { ShareButton } from "#/components/ui/share-button";
import type { GetStore200 } from "#/lib/api/gen/types/GetStore";
import { whatsappUrl } from "#/lib/whatsapp";

type Store = GetStore200;

/**
 * Topo da loja. Com capa, a foto da comunidade é a primeira coisa que aparece; sem capa,
 * cai no bloco tangerina de sempre — nenhuma loja que já está no ar piora por causa
 * de um campo que ela não preencheu.
 */
export function StoreHero({
  store,
  slug,
  hasProducts,
  meta,
}: {
  store: Store | undefined;
  slug: string;
  hasProducts: boolean;
  /** Linha de contexto: quantos produtos, quantas campanhas. */
  meta?: ReactNode;
}) {
  const cover = store?.branding?.coverUrl ?? null;
  const logo = store?.branding?.logoUrl ?? null;

  const actions = (
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
      {/* Falar com quem cuida da loja: em comunidade a conversa vem antes da compra, e
          até agora a página não dava caminho nenhum de volta. */}
      {store?.whatsapp && (
        <Button asChild variant="inverse-outline">
          <a
            href={whatsappUrl(
              store.whatsapp,
              `Olá! Vi a loja ${store.name} e queria falar com você.`,
            )}
            target="_blank"
            rel="noreferrer"
          >
            <MessageCircle className="h-4 w-4" aria-hidden />
            Falar com a loja
          </a>
        </Button>
      )}
    </div>
  );

  const identity = (
    <>
      <div className="rise rise-1 flex items-center gap-4">
        {logo ? (
          <img
            src={logo}
            alt=""
            className="h-14 w-14 shrink-0 rounded-full bg-white object-cover shadow-md"
          />
        ) : (
          <span className="inline-grid h-14 w-14 shrink-0 place-items-center rounded-full bg-white font-bold font-display text-2xl text-brand-deep shadow-md">
            {store?.name.charAt(0)}
          </span>
        )}
        <h1 className="max-w-[16ch] text-balance font-bold font-display text-3xl leading-tight md:text-4xl">
          {store?.name}
        </h1>
      </div>
      {store?.description && (
        <p className="rise rise-2 mt-4 max-w-[52ch] text-lede text-white/90">{store.description}</p>
      )}
      {meta && (
        <div className="rise rise-2 mt-4 flex flex-wrap gap-x-5 gap-y-1 text-white/80 text-sm">
          {meta}
        </div>
      )}
      {actions}
    </>
  );

  if (!cover) {
    return (
      <div className="bloco px-6 py-10 md:px-12 md:py-14">
        <div className="relative">{identity}</div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-[calc(var(--radius)+0.5rem)] bg-ink">
      <img
        src={cover}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        // capa é decoração de fundo: nunca deve atrasar o texto do topo
        loading="eager"
      />
      {/* o texto vive sobre a foto: sem esta cortina, capa clara come o branco */}
      <div className="absolute inset-0 bg-linear-to-t from-ink/85 via-ink/60 to-ink/35" />
      <div className="relative px-6 py-10 text-white md:px-12 md:py-14">{identity}</div>
    </div>
  );
}
