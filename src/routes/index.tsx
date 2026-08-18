import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BadgePercent,
  Bell,
  Boxes,
  Check,
  HeartHandshake,
  Ticket,
  Wallet,
} from "lucide-react";
import { SiteFooter } from "#/components/site/site-footer";
import { SiteHeader } from "#/components/site/site-header";
import { Button } from "#/components/ui/button";
import { listStoresQueryOptions, useListStores } from "#/lib/api/gen/hooks/useListStores";
import { publicRequest } from "#/lib/api/public";
import { seo } from "#/lib/seo";

export const Route = createFileRoute("/")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(listStoresQueryOptions({ limit: 12 }, publicRequest)),
  head: () =>
    seo({
      title: "Sua loja no ar hoje",
      description:
        "Sua loja, campanhas, doações e sorteios num lugar só. Pix e cartão, com o dinheiro caindo direto na sua conta.",
      path: "/",
    }),
  component: Landing,
});

const FEATURES = [
  {
    icon: Boxes,
    tone: "bg-brand",
    title: "Catálogo que se cuida sozinho",
    body: "Produto com foto, preço, estoque e página própria. Esgotou, some da vitrine sem ninguém precisar lembrar.",
  },
  {
    icon: Wallet,
    tone: "bg-success",
    title: "Cartão e Pix no mesmo checkout",
    body: "Quem compra escolhe como pagar. O dinheiro vai para a sua conta, não para uma conta central.",
  },
  {
    icon: HeartHandshake,
    tone: "bg-ink",
    title: "Campanhas e doações recorrentes",
    body: "Meta com barra de progresso, doação avulsa ou mensal, e a lista de quem doou só para a gestão.",
  },
  {
    icon: Ticket,
    tone: "bg-brand",
    title: "Sorteio com número por doação",
    body: "Cada contribuição vira número da sorte. O sorteio roda na plataforma e o resultado sai por e-mail.",
  },
  {
    icon: Bell,
    tone: "bg-success",
    title: "Encomenda sem grupo de WhatsApp",
    body: "Produto sob encomenda junta a lista de interessados. Chegou, todo mundo é avisado de uma vez.",
  },
  {
    icon: BadgePercent,
    tone: "bg-ink",
    title: "Taxa combinada, à vista",
    body: "A parte da plataforma é um percentual declarado do pedido. Sem tarifa escondida no meio do repasse.",
  },
];

const STEPS = [
  {
    n: 1,
    title: "Crie a conta e a loja",
    body: "Nome, endereço da loja e pronto. Você já entra no painel com o catálogo esperando.",
  },
  {
    n: 2,
    title: "Ligue o recebimento",
    body: "Sua chave Pix ou sua conta de cartão, num passo a passo guiado. O valor não passa por terceiros.",
  },
  {
    n: 3,
    title: "Divulgue o link",
    body: "A loja tem endereço próprio, aparece no Google e abre bonito quando alguém manda no grupo.",
  },
];

function Landing() {
  const { data } = useListStores({ limit: 12 }, { client: publicRequest });
  const stores = data?.items ?? [];

  return (
    <>
      <SiteHeader />

      <main>
        {/* ── Hero: o bloco tangerina, com a vitrine subindo dele ─────────────── */}
        <section className="shell pt-4 md:pt-8">
          <div className="bloco">
            <div className="relative grid gap-10 px-6 pt-10 md:grid-cols-[1.15fr_0.85fr] md:items-end md:gap-14 md:px-12 md:pt-16">
              <div className="pb-10 md:pb-16">
                <h1 className="rise rise-1 text-display">Sua loja no ar hoje.</h1>
                <p className="rise rise-2 mt-5 max-w-[38ch] text-lede text-white/90">
                  Venda, receba doações e faça sorteios sem planilha. O dinheiro cai direto na sua
                  conta.
                </p>
                <div className="rise rise-3 mt-8 flex flex-col gap-3 sm:flex-row">
                  <Button asChild size="lg" variant="inverse" className="w-full sm:w-auto">
                    <Link to="/criar-conta">
                      Criar minha loja grátis
                      <ArrowRight className="h-4 w-4" aria-hidden />
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="inverse-outline" className="w-full sm:w-auto">
                    <Link to="/lojas">Ver uma loja aberta</Link>
                  </Button>
                </div>
                <p className="rise rise-3 mt-4 text-sm text-white/75">
                  Grátis para começar. Só cobramos quando você vende.
                </p>
              </div>

              <div className="rise rise-4">
                <StorefrontPreview />
              </div>
            </div>
          </div>
        </section>

        {/* ── O que já vem pronto ─────────────────────────────────────────────── */}
        <section id="recursos" className="shell scroll-mt-20 py-16 md:py-24">
          <p className="kicker">O que já vem pronto</p>
          <h2 className="mt-3 max-w-2xl text-title">
            Tudo que hoje vive na planilha e no caderninho.
          </h2>

          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <li key={feature.title} className="card card-hover p-6">
                <span
                  className={`inline-grid h-11 w-11 place-items-center rounded-[0.9rem] text-white ${feature.tone}`}
                >
                  <feature.icon className="h-5 w-5" aria-hidden />
                </span>
                <h3 className="mt-4 font-display text-[1.1rem] font-bold">{feature.title}</h3>
                <p className="mt-1.5 text-[0.95rem] leading-relaxed text-muted">{feature.body}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* ── Como funciona ───────────────────────────────────────────────────── */}
        <section id="como-funciona" className="scroll-mt-20 bg-surface">
          <div className="shell py-16 md:py-24">
            <p className="kicker">Como funciona</p>
            <h2 className="mt-3 max-w-xl text-title">Três passos, uma tarde.</h2>

            <ol className="mt-10 grid gap-4 md:grid-cols-3">
              {STEPS.map((step) => (
                <li key={step.n} className="card p-6">
                  <span className="inline-grid h-9 w-9 place-items-center rounded-full bg-brand font-display font-bold text-white">
                    {step.n}
                  </span>
                  <h3 className="mt-4 font-display text-lg font-bold">{step.title}</h3>
                  <p className="mt-1.5 text-[0.95rem] leading-relaxed text-muted">{step.body}</p>
                </li>
              ))}
            </ol>

            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="w-full sm:w-auto">
                <Link to="/criar-conta">Começar agora</Link>
              </Button>
              <Button asChild size="lg" variant="ghost" className="w-full sm:w-auto">
                <Link to="/entrar">Já tenho conta</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* ── Lojas abertas ───────────────────────────────────────────────────── */}
        <section className="shell py-16 md:py-24">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="kicker">Para quem compra</p>
              <h2 className="mt-3 text-title">Lojas abertas agora</h2>
            </div>
            <Link
              to="/lojas"
              className="inline-flex items-center gap-1.5 font-medium text-brand-deep text-sm hover:text-brand-hover"
            >
              ver todas <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>

          {stores.length === 0 ? (
            <p className="mt-8 text-muted">
              Nenhuma loja aberta ainda. Quer ser a primeira?{" "}
              <Link to="/criar-conta" className="text-brand-deep underline underline-offset-4">
                crie a loja
              </Link>
              .
            </p>
          ) : (
            <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {stores.map((store) => (
                <li key={store.id}>
                  <Link
                    to="/loja/$slug"
                    params={{ slug: store.slug }}
                    className="card card-hover group flex h-full items-start gap-4 p-5"
                  >
                    <span className="inline-grid h-12 w-12 shrink-0 place-items-center rounded-full bg-brand font-display text-xl font-bold text-white">
                      {store.name.charAt(0)}
                    </span>
                    <span className="min-w-0">
                      <h3 className="font-display text-lg font-bold group-hover:text-brand-deep">
                        {store.name}
                      </h3>
                      {store.description && (
                        <p className="mt-1 line-clamp-2 text-sm text-muted">{store.description}</p>
                      )}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ── Fecho: outro bloco, mais curto ──────────────────────────────────── */}
        <section className="shell pb-4 md:pb-8">
          <div className="bloco px-6 py-14 text-center md:py-20">
            <div className="relative">
              <h2 className="mx-auto max-w-2xl text-title">
                Você vende melhor do que organiza. A gente resolve a segunda parte.
              </h2>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button asChild size="lg" variant="inverse" className="w-full sm:w-auto">
                  <Link to="/criar-conta">
                    Criar minha loja grátis
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="inverse-outline" className="w-full sm:w-auto">
                  <Link to="/entrar">Entrar</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}

/**
 * A vitrine que sobe do bloco: um produto como quem compra vê. Ilustrativa,
 * desenhada em HTML — nada de screenshot que envelhece na primeira mudança.
 */
function StorefrontPreview() {
  return (
    <div className="mx-auto w-full max-w-sm rounded-t-[1.25rem] bg-elevated p-5 text-ink shadow-[0_-18px_50px_-30px_rgb(0_0_0/0.45)]">
      <div className="relative aspect-[16/10] overflow-hidden rounded-[0.9rem] bg-[linear-gradient(140deg,#f7b98d,#b45f31)]">
        <span className="absolute bottom-2.5 left-3 rounded-full bg-white/90 px-2.5 py-0.5 font-medium text-[#8a4a20] text-xs">
          foto do produto
        </span>
      </div>
      <p className="mt-4 font-display text-lg font-bold">Caneca Esperança</p>
      <div className="mt-1 flex items-center justify-between gap-3">
        <p className="font-display text-xl font-bold tabular-nums">R$ 45,00</p>
        <span className="rounded-full bg-brand px-4 py-2 font-semibold text-sm text-white">
          Comprar
        </span>
      </div>
      <p className="mt-2 flex items-center gap-1.5 text-muted text-sm">
        <Check className="h-3.5 w-3.5 text-success" aria-hidden />
        Pix na hora ou cartão
      </p>
    </div>
  );
}
