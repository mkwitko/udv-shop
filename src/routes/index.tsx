import { createFileRoute, Link } from "@tanstack/react-router";
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
      title: "Lojinha dos Núcleos",
      description:
        "Cada núcleo com sua lojinha: produtos feitos por perto, campanhas e doações, tudo no mesmo lugar.",
      path: "/",
    }),
  component: Landing,
});

function Landing() {
  const { data } = useListStores({ limit: 12 }, { client: publicRequest });
  const stores = data?.items ?? [];

  return (
    <>
      <SiteHeader />

      <main>
        {/* Hero assimétrico: título come 7 colunas, o texto fica embaixo e à direita. */}
        <section className="shell pt-16 pb-20 md:pt-24">
          <p className="kicker">Feito por quem cuida</p>
          <h1 className="mt-5 max-w-[14ch] text-display text-balance">
            A lojinha do seu núcleo, aberta o ano inteiro.
          </h1>
          <div className="mt-10 grid gap-8 md:grid-cols-12">
            <div className="md:col-start-6 md:col-end-12">
              <p className="text-lede text-ink-soft">
                Produtos feitos por perto, campanhas de obra, doações de mês a mês. O dinheiro cai
                na conta do próprio núcleo — a plataforma só cuida da estrada.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Button asChild size="lg">
                  <Link to="/lojas">Ver as lojas</Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <a href="#como-funciona">Como funciona</a>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section id="como-funciona" className="rule">
          <div className="shell grid gap-x-10 gap-y-12 py-20 md:grid-cols-3">
            {[
              {
                n: "01",
                t: "O núcleo abre a loja",
                d: "Cadastra os produtos, define o preço e liga a conta de recebimento. Leva uma tarde.",
              },
              {
                n: "02",
                t: "A comunidade compra",
                d: "Cartão ou Pix. Quem não tem em estoque pede encomenda e é avisado quando chega.",
              },
              {
                n: "03",
                t: "O valor chega inteiro",
                d: "O pagamento vai direto para a conta do núcleo. A plataforma cobra sua parte à parte.",
              },
            ].map((step) => (
              <div key={step.n}>
                <p className="font-display text-3xl text-ocre">{step.n}</p>
                <h2 className="mt-3 font-display text-xl">{step.t}</h2>
                <p className="mt-2 text-ink-soft">{step.d}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rule">
          <div className="shell py-20">
            <div className="flex items-baseline justify-between gap-6">
              <h2 className="text-title">Lojas abertas agora</h2>
              <Link to="/lojas" className="text-sm text-clay underline underline-offset-4">
                ver todas
              </Link>
            </div>

            {stores.length === 0 ? (
              <p className="mt-8 text-ink-soft">Nenhuma loja aberta ainda. Volte daqui a pouco.</p>
            ) : (
              <ul className="mt-10 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
                {stores.map((store) => (
                  <li key={store.id}>
                    <Link to="/loja/$slug" params={{ slug: store.slug }} className="group block">
                      <h3 className="font-display text-2xl transition-colors duration-(--dur) ease-(--ease) group-hover:text-clay">
                        {store.name}
                      </h3>
                      {store.description && (
                        <p className="mt-2 line-clamp-3 text-ink-soft">{store.description}</p>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
