import { createFileRoute, Link } from "@tanstack/react-router";
import {
  CalendarDays,
  Check,
  ChevronRight,
  CreditCard,
  HandCoins,
  MapPin,
  MessageCircle,
  Store,
  Truck,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Captcha, turnstileSiteKey } from "#/components/store/captcha";
import {
  EMPTY_CONTACT,
  type GuestContact,
  GuestContactFields,
  toContactPayload,
  validateGuestContact,
} from "#/components/store/guest-contact-fields";
import { ProductCard } from "#/components/store/product-card";
import { ProductGallery } from "#/components/store/product-gallery";
import { Button } from "#/components/ui/button";
import { FormError } from "#/components/ui/field";
import { QuantityPicker } from "#/components/ui/quantity-picker";
import { ShareButton } from "#/components/ui/share-button";
import { Tag } from "#/components/ui/tag";
import { errorMessage } from "#/lib/api/error-message";
import { createInterest } from "#/lib/api/gen/clients/createInterest";
import { getProductQueryOptions, useGetProduct } from "#/lib/api/gen/hooks/useGetProduct";
import { getStoreQueryOptions, useGetStore } from "#/lib/api/gen/hooks/useGetStore";
import { listProductsQueryOptions, useListProducts } from "#/lib/api/gen/hooks/useListProducts";
import { publicRequest } from "#/lib/api/public";
import { useSession } from "#/lib/auth/session";
import { dateParts, dateTime, money, weekday } from "#/lib/format";
import { breadcrumbLd, productLd, seo, siteUrl } from "#/lib/seo";
import { whatsappUrl } from "#/lib/whatsapp";

/** Quantos produtos da mesma gaveta aparecem no fim da página. */
const RELATED_LIMIT = 4;

export const Route = createFileRoute("/loja/$slug/p/$produto")({
  loader: async ({ context, params }) => {
    const product = await context.queryClient.ensureQueryData(
      getProductQueryOptions(params.slug, params.produto, publicRequest),
    );
    // a loja e os relacionados entram no SSR: a página tem de nascer inteira, inclusive
    // para quem chega por link compartilhado e nunca viu a vitrine
    await Promise.all([
      context.queryClient.ensureQueryData(getStoreQueryOptions(params.slug, publicRequest)),
      context.queryClient.ensureQueryData(
        listProductsQueryOptions(params.slug, relatedQuery(product.category?.slug), publicRequest),
      ),
    ]);
    return { product };
  },
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
        breadcrumbLd([
          { name: "Loja", path: `/loja/${params.slug}` },
          ...(product.category
            ? [
                {
                  name: product.category.name,
                  path: `/loja/${params.slug}?categoria=${product.category.slug}`,
                },
              ]
            : []),
          { name: product.name, path },
        ]),
      ],
    };
  },
  component: ProductPage,
});

/** Relacionados saem da mesma gaveta; sem gaveta, saem da própria loja. */
function relatedQuery(categorySlug: string | undefined) {
  return {
    limit: RELATED_LIMIT + 1,
    ...(categorySlug ? { category: categorySlug } : {}),
  } as const;
}

function ProductPage() {
  const { slug, produto } = Route.useParams();
  const { data: product } = useGetProduct(slug, produto, { client: publicRequest });
  const { data: store } = useGetStore(slug, { client: publicRequest });
  const [qty, setQty] = useState(1);
  const ctaRef = useRef<HTMLDivElement>(null);
  const [ctaVisible, setCtaVisible] = useState(true);

  // a barra fixa só entra quando o botão do topo sai da tela: quem rolou até a descrição
  // não deveria ter de voltar para comprar
  useEffect(() => {
    const node = ctaRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) =>
      setCtaVisible(entry?.isIntersecting ?? true),
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  if (!product) return null;

  const onDemand = product.availability === "on_demand";
  const soldOut = !onDemand && product.stock <= 0;
  const buyable = !onDemand && !soldOut;
  const maxQty = Math.min(product.stock, 99);
  const total = product.priceCents * qty;

  return (
    <article className="pb-24 md:pb-16">
      <nav className="shell pt-4 md:pt-8" aria-label="Trilha">
        <ol className="flex flex-wrap items-center gap-1 text-muted text-sm">
          <li>
            <Link
              to="/loja/$slug"
              params={{ slug }}
              className="transition-colors [transition-duration:var(--dur)] hover:text-ink"
            >
              {store?.name ?? "Loja"}
            </Link>
          </li>
          {product.category && (
            <li className="flex items-center gap-1">
              <ChevronRight className="h-3.5 w-3.5 opacity-60" aria-hidden />
              {/* a gaveta leva de volta à vitrine já filtrada — é o caminho de "quero ver
                  outros parecidos" sem passar por tudo de novo */}
              <Link
                to="/loja/$slug"
                params={{ slug }}
                search={{ categoria: product.category.slug }}
                className="transition-colors [transition-duration:var(--dur)] hover:text-ink"
              >
                {product.category.name}
              </Link>
            </li>
          )}
          <li className="flex min-w-0 items-center gap-1">
            <ChevronRight className="h-3.5 w-3.5 opacity-60" aria-hidden />
            <span className="truncate text-ink" aria-current="page">
              {product.name}
            </span>
          </li>
        </ol>
      </nav>

      <div className="shell grid gap-8 pt-5 md:grid-cols-12 md:gap-12 md:pt-8">
        <div className="md:col-span-7">
          <ProductGallery images={product.imageUrls} name={product.name} />
        </div>

        {/* no desktop o painel de compra acompanha a rolagem das fotos */}
        <div className="md:col-span-5 md:self-start md:sticky md:top-24">
          <h1 className="text-balance font-display font-semibold text-3xl tracking-tight md:text-4xl">
            {product.name}
          </h1>

          {/* Evento se decide pela data: ela vem antes do preço, com dia da semana escrito
              porque "sábado" pesa mais na cabeça de quem vai do que "12/10". */}
          {product.event && (
            <div className="mt-4 grid gap-1.5 rounded-[1rem] border border-line bg-surface px-4 py-3">
              <p className="flex items-center gap-2 font-medium">
                <CalendarDays className="h-4 w-4 shrink-0 text-brand-deep" aria-hidden />
                <span>{weekday(product.event.at)}</span>, {dateTime(product.event.at)}
                {product.event.endsAt ? ` até ${dateParts(product.event.endsAt).time}` : ""}
              </p>
              {product.event.location && (
                <p className="flex items-center gap-2 text-muted text-sm">
                  <MapPin className="h-4 w-4 shrink-0" aria-hidden />
                  {product.event.location}
                </p>
              )}
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-2">
            <p className="font-bold font-display text-3xl text-brand-deep tabular-nums">
              {money(product.priceCents)}
            </p>
            {onDemand && <Tag tone="brand">Feito sob encomenda</Tag>}
            {soldOut && <Tag>{product.event ? "Lotado" : "Esgotado"}</Tag>}
            {buyable && product.stock <= 3 && (
              <Tag tone="accent">
                {product.event
                  ? product.stock === 1
                    ? "última vaga"
                    : `últimas ${product.stock} vagas`
                  : product.stock === 1
                    ? "última unidade"
                    : `últimas ${product.stock} unidades`}
              </Tag>
            )}
          </div>

          {product.description && (
            <p className="mt-6 whitespace-pre-line text-ink/85 leading-relaxed">
              {product.description}
            </p>
          )}

          <div className="mt-7 grid gap-4" ref={ctaRef}>
            {buyable ? (
              <>
                {/* quantidade só aparece quando há mais de uma para escolher */}
                {maxQty > 1 && <QuantityPicker value={qty} max={maxQty} onChange={setQty} />}
                <Button asChild size="lg" className="w-full">
                  <Link to="/loja/$slug/comprar" params={{ slug }} search={{ produto, qtd: qty }}>
                    {product.event ? "Garantir minha vaga" : "Comprar"} — {money(total)}
                  </Link>
                </Button>
              </>
            ) : (
              <>
                {soldOut && (
                  <p className="rounded-[1rem] border border-line bg-surface px-4 py-3 text-[0.95rem]">
                    Este produto está esgotado. Entre na lista e a loja avisa quando ele voltar.
                  </p>
                )}
                <InterestCta slug={slug} produto={produto} />
              </>
            )}
          </div>

          <ul className="mt-7 grid gap-3 text-sm">
            <TrustLine icon={<CreditCard className="h-4 w-4" aria-hidden />}>
              {buyable ? "Pague com Pix ou cartão." : "Sem pagamento agora — é só avisar a loja."}
            </TrustLine>
            <TrustLine icon={<HandCoins className="h-4 w-4" aria-hidden />}>
              O dinheiro vai direto para a conta de {store?.name ?? "quem faz"}.
            </TrustLine>
            {/* A loja que declarou como entrega fala por si; sem declaração fica a promessa
                genérica, que é o mínimo honesto. */}
            {product.event ? (
              <TrustLine icon={<CalendarDays className="h-4 w-4" aria-hidden />}>
                Leve o nome de quem comprou: a loja confere a lista na entrada.
              </TrustLine>
            ) : (
              <TrustLine icon={<Truck className="h-4 w-4" aria-hidden />}>
                {store?.deliveryNote ?? "A entrega ou retirada é combinada direto com a loja."}
              </TrustLine>
            )}
          </ul>

          <div className="rule mt-7 grid gap-4 pt-6">
            <Link
              to="/loja/$slug"
              params={{ slug }}
              className="flex items-center gap-3 text-sm transition-colors [transition-duration:var(--dur)] hover:text-brand-deep"
            >
              <span
                className="inline-grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-soft text-brand-deep"
                aria-hidden
              >
                {store?.branding?.logoUrl ? (
                  <img
                    src={store.branding.logoUrl}
                    alt=""
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  <Store className="h-5 w-5" />
                )}
              </span>
              <span className="min-w-0">
                <span className="block text-muted text-xs uppercase tracking-[0.08em]">
                  vendido por
                </span>
                <span className="block truncate font-medium text-ink">
                  {store?.name ?? "esta loja"}
                </span>
              </span>
            </Link>

            {/* Dúvida antes de comprar não tinha para onde ir: "combinado com a loja" e
                nenhum jeito de falar com ela. Link discreto, para não competir com o
                botão de comprar. */}
            {store?.whatsapp && (
              <a
                href={whatsappUrl(store.whatsapp, `Olá! Tenho uma dúvida sobre "${product.name}".`)}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 text-sm text-brand-deep underline underline-offset-4"
              >
                <MessageCircle className="h-4 w-4" aria-hidden />
                Tirar uma dúvida no WhatsApp
              </a>
            )}

            {/* compartilhar é aquisição: um produto bonito viaja no grupo de WhatsApp */}
            <ShareButton
              title={product.name}
              path={`/loja/${slug}/p/${produto}`}
              label="Compartilhar produto"
              text={`${product.name} — ${money(product.priceCents)}`}
              variant="secondary"
            />
          </div>
        </div>
      </div>

      <Related
        slug={slug}
        currentSlug={produto}
        categorySlug={product.category?.slug}
        categoryName={product.category?.name}
      />

      {/* barra fixa do celular: preço e ação sempre à mão, sem tapar a página no desktop */}
      {buyable && !ctaVisible && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-line border-t bg-elevated/95 backdrop-blur-md md:hidden">
          <div className="shell flex items-center gap-3 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-muted text-xs">{product.name}</p>
              <p className="font-display font-semibold tabular-nums">{money(total)}</p>
            </div>
            <Button asChild size="md">
              <Link to="/loja/$slug/comprar" params={{ slug }} search={{ produto, qtd: qty }}>
                Comprar
              </Link>
            </Button>
          </div>
        </div>
      )}
    </article>
  );
}

function TrustLine({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5 text-muted">
      <span className="mt-0.5 shrink-0 text-brand-deep">{icon}</span>
      <span>{children}</span>
    </li>
  );
}

/**
 * "Mais de Chás" fecha o caminho: quem não quis este produto continua na loja em vez de
 * voltar para o WhatsApp. Sem gaveta, mostra o que mais a loja tem.
 */
function Related({
  slug,
  currentSlug,
  categorySlug,
  categoryName,
}: {
  slug: string;
  currentSlug: string;
  categorySlug: string | undefined;
  categoryName: string | undefined;
}) {
  const { data } = useListProducts(slug, relatedQuery(categorySlug), { client: publicRequest });
  // o próprio produto vem na lista: buscamos um a mais justamente para poder tirá-lo
  const items = (data?.items ?? [])
    .filter((item) => item.slug !== currentSlug)
    .slice(0, RELATED_LIMIT);
  if (items.length === 0) return null;

  return (
    <section className="shell mt-14 md:mt-20">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display font-semibold text-xl tracking-tight md:text-2xl">
          {categoryName ? `Mais de ${categoryName}` : "Mais desta loja"}
        </h2>
        <Link
          to="/loja/$slug"
          params={{ slug }}
          search={categorySlug ? { categoria: categorySlug } : {}}
          className="text-brand-deep text-sm underline underline-offset-4"
        >
          ver tudo
        </Link>
      </div>
      <ul className="mt-6 grid grid-cols-2 gap-x-5 gap-y-8 md:grid-cols-4 md:gap-x-6">
        {items.map((item) => (
          <li key={item.id}>
            <ProductCard product={item} storeSlug={slug} showCategory={!categoryName} />
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Produto sob encomenda: um toque avisa a loja do interesse. Sem conta também dá — nome e
 * telefone bastam, porque dizer "me avise quando chegar" não vale uma senha.
 */
function InterestCta({ slug, produto }: { slug: string; produto: string }) {
  const { status } = useSession();
  const [state, setState] = useState<"idle" | "saving" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const [contact, setContact] = useState<GuestContact>(EMPTY_CONTACT);
  const [captchaToken, setCaptchaToken] = useState("");
  // Enquanto a sessão não respondeu não se sabe de quem é este interesse: o botão espera.
  // Sem isso quem está logado levava "Coloque seu nome" ao clicar rápido numa conexão lenta.
  const sessionPending = status === "loading";
  const visitor = status === "anonymous";

  async function interest() {
    setError(null);
    if (visitor) {
      const problem = validateGuestContact(contact);
      if (problem) {
        setError(problem);
        return;
      }
      if (turnstileSiteKey() && !captchaToken) {
        setError("Confirme que você não é um robô.");
        return;
      }
    }
    setState("saving");
    try {
      await createInterest({
        storeSlug: slug,
        productSlug: produto,
        qty: 1,
        ...(visitor ? { contact: toContactPayload(contact), captchaToken } : {}),
      });
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
        <p className="mt-1.5 text-muted text-sm">
          {visitor && contact.email === ""
            ? "Quando o produto chegar, quem cuida da loja fala com você pelo telefone que deixou."
            : "Quando o produto chegar, a loja avisa você por e-mail."}
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {visitor && (
        <GuestContactFields
          value={contact}
          onChange={setContact}
          emailHint="Com e-mail, o aviso de chegada é automático."
        />
      )}
      {visitor && <Captcha onToken={setCaptchaToken} />}
      <Button
        size="lg"
        className="w-full"
        onClick={interest}
        disabled={state === "saving" || sessionPending}
      >
        {sessionPending
          ? "Só um instante…"
          : state === "saving"
            ? "Anotando…"
            : "Quero ser avisado"}
      </Button>
      {visitor && (
        <Link
          to="/entrar"
          search={{ redirect: `/loja/${slug}/p/${produto}` }}
          className="text-center text-muted text-sm underline underline-offset-4"
        >
          Já tenho conta
        </Link>
      )}
      <FormError>{error}</FormError>
    </div>
  );
}
