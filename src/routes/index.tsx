import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BadgePercent,
  Boxes,
  ClipboardList,
  HeartHandshake,
  Ticket,
  Wallet,
} from "lucide-react";
import { SiteFooter } from "#/components/site/site-footer";
import { SiteHeader } from "#/components/site/site-header";
import { Button } from "#/components/ui/button";
import { Tag } from "#/components/ui/tag";
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
    title: "Catálogo que se cuida sozinho",
    body: "Produto com foto, preço, estoque e página própria. Esgotou, some da vitrine sem ninguém precisar lembrar.",
  },
  {
    icon: Wallet,
    title: "Cartão e Pix no mesmo checkout",
    body: "Quem compra escolhe como pagar. O dinheiro vai para a sua conta, não para uma conta central.",
  },
  {
    icon: HeartHandshake,
    title: "Campanhas e doações recorrentes",
    body: "Meta de arrecadação com barra de progresso, doação avulsa ou mensal, e a lista de quem doou só para a gestão.",
  },
  {
    icon: Ticket,
    title: "Sorteio com número por doação",
    body: "Cada contribuição vira número. O sorteio roda na plataforma e o resultado sai por e-mail.",
  },
  {
    icon: ClipboardList,
    title: "Encomenda sem grupo de WhatsApp",
    body: "Produto sob encomenda junta a lista de interessados. Chegou, todo mundo é avisado de uma vez.",
  },
  {
    icon: BadgePercent,
    title: "Taxa combinada, à vista",
    body: "A parte da plataforma é um percentual declarado do pedido. Sem tarifa escondida no meio do repasse.",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Crie a conta e a loja",
    body: "Nome, endereço da loja e pronto. Você já entra no painel com o catálogo vazio esperando.",
  },
  {
    n: "02",
    title: "Ligue o recebimento",
    body: "Conecte sua conta e sua chave Pix seguindo o passo a passo. É o que garante que o valor não passa por terceiros.",
  },
  {
    n: "03",
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
        {/* Hero: o sol nasce atrás do painel — assinatura da marca */}
        <section className="horizon relative">
          <div className="grid-field pointer-events-none absolute inset-0" aria-hidden />

          <div className="shell relative pt-16 pb-14 md:pt-28">
            <div className="mx-auto max-w-3xl text-center">
              <div className="rise rise-1">
                <Tag tone="brand" className="mb-6">
                  Loja, campanhas e sorteios num lugar só
                </Tag>
              </div>
              <h1 className="rise rise-2 text-display">Sua loja no ar hoje.</h1>
              <p className="rise rise-3 mx-auto mt-6 max-w-2xl text-lede text-muted">
                Venda seus produtos, receba doações e faça sorteios sem planilha e sem complicação.
                O dinheiro cai direto na sua conta.
              </p>
              <div className="rise rise-4 mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button asChild size="lg" className="w-full sm:w-auto">
                  <Link to="/criar-conta">
                    Criar minha loja grátis
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="secondary" className="w-full sm:w-auto">
                  <Link to="/lojas">Visitar uma loja aberta</Link>
                </Button>
              </div>
              <p className="rise rise-4 mt-4 text-sm text-muted">
                Grátis para começar. Só cobramos quando você vende.
              </p>
            </div>

            <div className="rise rise-5">
              <DashboardPreview />
            </div>
          </div>
        </section>

        {/* Recursos */}
        <section id="recursos" className="shell scroll-mt-20 py-20">
          <p className="kicker">O que já vem pronto</p>
          <h2 className="mt-3 max-w-2xl text-title">
            Tudo que hoje vive na planilha e no caderninho, funcionando sozinho.
          </h2>

          <ul className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <li key={feature.title} className="card card-hover p-6">
                <span className="inline-grid h-10 w-10 place-items-center rounded-md bg-brand-soft text-brand">
                  <feature.icon className="h-5 w-5" aria-hidden />
                </span>
                <h3 className="mt-5 font-display text-[1.05rem] font-semibold">{feature.title}</h3>
                <p className="mt-2 text-[0.95rem] leading-relaxed text-muted">{feature.body}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* Como funciona */}
        <section id="como-funciona" className="scroll-mt-20 border-y border-line bg-surface">
          <div className="shell py-20">
            <p className="kicker">Como funciona</p>
            <h2 className="mt-3 max-w-2xl text-title">Três passos, uma tarde.</h2>

            <ol className="mt-12 grid gap-8 md:grid-cols-3">
              {STEPS.map((step) => (
                <li key={step.n} className="border-line border-t pt-6 md:border-t-2">
                  <p className="font-display text-sm font-semibold text-brand">{step.n}</p>
                  <h3 className="mt-3 font-display text-lg font-semibold">{step.title}</h3>
                  <p className="mt-2 text-[0.95rem] leading-relaxed text-muted">{step.body}</p>
                </li>
              ))}
            </ol>

            <div className="mt-12 flex flex-wrap gap-3">
              <Button asChild>
                <Link to="/criar-conta">Começar agora</Link>
              </Button>
              <Button asChild variant="ghost">
                <Link to="/entrar">Já tenho conta</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Para quem compra */}
        <section className="shell py-20">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="kicker">Para quem compra</p>
              <h2 className="mt-3 text-title">Lojas abertas agora</h2>
            </div>
            <Link
              to="/lojas"
              className="inline-flex items-center gap-1.5 text-sm text-brand hover:text-brand-hover"
            >
              ver todas <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>

          {stores.length === 0 ? (
            <p className="mt-8 text-muted">
              Nenhuma loja aberta ainda. Quer ser a primeira?{" "}
              <Link to="/criar-conta" className="text-brand underline underline-offset-4">
                crie a loja
              </Link>
              .
            </p>
          ) : (
            <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {stores.map((store) => (
                <li key={store.id}>
                  <Link
                    to="/loja/$slug"
                    params={{ slug: store.slug }}
                    className="card card-hover group block p-6"
                  >
                    <h3 className="font-display text-lg font-semibold group-hover:text-brand">
                      {store.name}
                    </h3>
                    {store.description && (
                      <p className="mt-2 line-clamp-2 text-[0.95rem] text-muted">
                        {store.description}
                      </p>
                    )}
                    <p className="mt-4 inline-flex items-center gap-1.5 text-sm text-brand">
                      visitar loja <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* CTA final */}
        <section className="shell pb-24">
          <div className="card relative overflow-hidden px-6 py-14 text-center md:px-16">
            <div className="glow-field pointer-events-none absolute inset-0" aria-hidden />
            <div className="relative">
              <h2 className="mx-auto max-w-2xl text-title">
                Você vende melhor do que organiza. A gente resolve a segunda parte.
              </h2>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Button asChild size="lg">
                  <Link to="/criar-conta">
                    Criar minha loja
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="secondary">
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

/** Prévia do painel desenhada em HTML — nada de screenshot que envelhece na primeira mudança. */
function DashboardPreview() {
  return (
    <div className="relative mx-auto mt-16 max-w-4xl">
      <div className="card overflow-hidden shadow-[var(--shadow-card)]">
        <div className="flex items-center gap-2 border-b border-line bg-surface px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
          <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
          <span className="h-2.5 w-2.5 rounded-full bg-line-strong" />
          <p className="ml-3 text-xs text-muted">prospera.app/gestao/nucleo-demo</p>
        </div>

        <div className="grid gap-4 p-5 sm:grid-cols-3">
          {[
            { label: "Vendas do mês", value: "R$ 4.280", trend: "+18%" },
            { label: "Campanha da obra", value: "62%", trend: "R$ 12.4k de 20k" },
            { label: "Encomendas na fila", value: "9", trend: "3 novas hoje" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-md border border-line bg-surface p-4">
              <p className="text-xs text-muted">{stat.label}</p>
              <p className="mt-1.5 font-display text-2xl font-semibold tracking-tight">
                {stat.value}
              </p>
              <p className="mt-1 text-xs text-brand">{stat.trend}</p>
            </div>
          ))}
        </div>

        <div className="border-t border-line px-5 py-4">
          <p className="kicker mb-3">Últimos pedidos</p>
          <ul className="grid gap-2.5">
            {[
              { who: "Ana R.", what: "Camiseta bordada · 2un", value: "R$ 178,00", tone: "brand" },
              { who: "Doação mensal", what: "Campanha reforma", value: "R$ 50,00", tone: "accent" },
              { who: "Carlos M.", what: "Mel 500ml", value: "R$ 42,00", tone: "neutral" },
            ].map((row) => (
              <li key={row.who} className="flex items-center justify-between gap-4 text-sm">
                <span className="flex min-w-0 items-center gap-2.5">
                  <Tag tone={row.tone as "brand" | "accent" | "neutral"}>pago</Tag>
                  <span className="truncate text-ink">{row.who}</span>
                  <span className="hidden truncate text-muted sm:inline">{row.what}</span>
                </span>
                <span className="shrink-0 font-medium tabular-nums">{row.value}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
