import { createFileRoute, Link, Outlet, useMatchRoute, useNavigate } from "@tanstack/react-router";
import { motion, useReducedMotion } from "motion/react";
import { useEffect } from "react";
import { RequireSession } from "#/components/auth/require-session";
import { SiteFooter } from "#/components/site/site-footer";
import { SiteHeader } from "#/components/site/site-header";
import { Tag } from "#/components/ui/tag";
import { useListMyStores } from "#/lib/api/gen/hooks/useListMyStores";
import { useListStoreInterests } from "#/lib/api/gen/hooks/useListStoreInterests";
import { useListStoreOrders } from "#/lib/api/gen/hooks/useListStoreOrders";
import { seo } from "#/lib/seo";

export const Route = createFileRoute("/gestao/$slug")({
  head: () =>
    seo({
      title: "Gestão da loja",
      description: "",
      path: "",
      noIndex: true,
    }),
  component: () => (
    <RequireSession redirectTo="/conta">
      <ManageLayout />
    </RequireSession>
  ),
});

/**
 * Dez abas planas viravam dez palavras soltas para quem nunca vendeu: "Pedidos" ×
 * "Encomendas" e "Repasses" × "Extrato" eram pares indistinguíveis. Continua uma fileira
 * só (é o que funciona em 390px), agora com nome que diz o que é e um traço separando os
 * três assuntos: vender, dinheiro, apoio.
 */
const TABS = [
  { to: "/gestao/$slug", label: "Resumo", exact: true, group: "loja" },
  { to: "/gestao/$slug/produtos", label: "Produtos", group: "vender" },
  { to: "/gestao/$slug/pedidos", label: "Pedidos", group: "vender", badge: "orders" },
  { to: "/gestao/$slug/agenda", label: "Agenda", group: "vender" },
  { to: "/gestao/$slug/encomendas", label: "Fila de espera", group: "vender", badge: "interests" },
  { to: "/gestao/$slug/campanhas", label: "Campanhas", group: "apoio" },
  { to: "/gestao/$slug/doacoes", label: "Doações", group: "apoio" },
  { to: "/gestao/$slug/recebimento", label: "Recebimento", group: "dinheiro" },
  // repasse é acordo comercial: a API recusa staff, então a aba nem aparece
  { to: "/gestao/$slug/repasses", label: "A repassar", group: "dinheiro", adminOnly: true },
  { to: "/gestao/$slug/extrato", label: "Extrato", group: "dinheiro", adminOnly: true },
  { to: "/gestao/$slug/configuracoes", label: "Configurações", group: "loja", ownerOnly: true },
] as const;

function ManageLayout() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const matchRoute = useMatchRoute();
  const reducedMotion = useReducedMotion();
  const { data, isPending } = useListMyStores();
  const store = data?.items.find((candidate) => candidate.slug === slug);
  const visibleTabs = TABS.filter((tab) => {
    if ("adminOnly" in tab && tab.adminOnly && store?.role === "staff") return false;
    if ("ownerOnly" in tab && tab.ownerOnly && store?.role !== "owner") return false;
    return true;
  });

  // O que está esperando alguém da loja: pedido pago sem entrega combinada e gente na fila
  // de espera. Uma página de 50 basta para um contador — acima disso mostramos "9+".
  const { data: paidOrders } = useListStoreOrders(slug, { limit: 50, status: "paid" });
  const { data: interests } = useListStoreInterests(slug, { limit: 50 });
  const openOrders = paidOrders?.items.length ?? 0;
  const openInterests = (interests?.items ?? []).filter((row) => row.status === "open").length;

  // quem não tem papel nesta loja não vê o painel — a API recusaria de todo jeito,
  // mas aqui a pessoa é levada de volta em vez de ver telas de erro
  useEffect(() => {
    if (!isPending && data && !store) {
      void navigate({ to: "/conta", replace: true });
    }
  }, [isPending, data, store, navigate]);

  if (isPending || !store) {
    return (
      <div className="shell py-20" aria-busy="true">
        <div className="h-7 w-48 animate-pulse rounded-md bg-surface" />
        <div className="mt-6 h-40 animate-pulse rounded-lg bg-surface" />
      </div>
    );
  }

  return (
    <>
      <SiteHeader />
      <main>
        <header className="border-b border-line bg-surface">
          <div className="shell pt-8 pb-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-display text-2xl font-semibold tracking-tight">{store.name}</h1>
              {/* "aguardando liberação" prometia uma aprovação que não existe: quem abre a
                  loja é a assinatura. O selo diz o fato, e o guia da home diz o que fazer. */}
              {store.status !== "active" && (
                <Tag tone={store.status === "pending" ? "accent" : "danger"}>
                  {store.status === "pending" ? "ainda não abriu" : "fora do ar"}
                </Tag>
              )}
              <Link
                to="/loja/$slug"
                params={{ slug }}
                className="text-sm text-brand-deep underline underline-offset-4"
              >
                ver como cliente
              </Link>
            </div>

            <nav className="scroll-row mt-5 -mb-px" aria-label="Seções da gestão">
              {visibleTabs.map((tab, index) => {
                const exact = "exact" in tab && tab.exact;
                const active = Boolean(matchRoute({ to: tab.to, params: { slug }, fuzzy: !exact }));
                const count =
                  "badge" in tab
                    ? tab.badge === "orders"
                      ? openOrders
                      : tab.badge === "interests"
                        ? openInterests
                        : 0
                    : 0;
                const newGroup = index > 0 && visibleTabs[index - 1]?.group !== tab.group;
                return (
                  <Link
                    key={tab.to}
                    to={tab.to}
                    params={{ slug }}
                    aria-current={active ? "page" : undefined}
                    className={`relative whitespace-nowrap px-3 pb-3 text-sm transition-colors [transition-duration:var(--dur)] ${
                      newGroup ? "ml-3 border-line border-l pl-6" : ""
                    } ${active ? "font-semibold text-ink" : "text-muted hover:text-ink"}`}
                  >
                    {tab.label}
                    {/* Contador é o único aviso dentro do painel de que alguém está esperando
                        resposta. Sem ele o dono só descobria a venda abrindo a aba certa. */}
                    {count > 0 && (
                      <span className="ml-1.5 inline-grid h-5 min-w-5 place-items-center rounded-full bg-brand px-1.5 font-semibold text-[0.7rem] text-brand-ink tabular-nums">
                        {count > 9 ? "9+" : count}
                      </span>
                    )}
                    {active && (
                      <motion.span
                        layoutId="gestao-tab-indicator"
                        transition={
                          reducedMotion
                            ? { duration: 0 }
                            : { type: "spring", stiffness: 500, damping: 40 }
                        }
                        className="absolute inset-x-2 -bottom-px h-[2.5px] rounded-full bg-brand"
                        aria-hidden
                      />
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>
        </header>

        <div className="shell py-8 md:py-10">
          <Outlet />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
