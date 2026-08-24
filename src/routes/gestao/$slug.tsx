import { createFileRoute, Link, Outlet, useMatchRoute, useNavigate } from "@tanstack/react-router";
import { motion, useReducedMotion } from "motion/react";
import { useEffect } from "react";
import { RequireSession } from "#/components/auth/require-session";
import { SiteFooter } from "#/components/site/site-footer";
import { SiteHeader } from "#/components/site/site-header";
import { MenuButton } from "#/components/ui/menu-button";
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
 * Doze telas em fileira estouravam a largura: virava barra de rolagem com metade dos nomes
 * escondida sem avisar. Agora são cinco alvos por assunto ("onde vejo dinheiro?") e a tela
 * escolhida sai num painel curto.
 *
 * Grupo de uma tela só vira link direto: menu de um item é um botão pior.
 */
const GROUP_LABELS: Record<string, string> = {
  inicio: "Resumo",
  loja: "Loja",
  eventos: "Eventos",
  apoio: "Apoio",
  dinheiro: "Dinheiro",
  ajustes: "Ajustes",
};

const TABS = [
  { to: "/gestao/$slug", label: "Resumo", exact: true, group: "inicio" },
  { to: "/gestao/$slug/produtos", label: "Produtos", group: "loja" },
  { to: "/gestao/$slug/pedidos", label: "Pedidos", group: "loja", badge: "orders" },
  { to: "/gestao/$slug/encomendas", label: "Fila de espera", group: "loja", badge: "interests" },
  { to: "/gestao/$slug/agenda", label: "Agenda", group: "eventos" },
  // Resultado é o número que faltava para o evento ser tratado como fonte de receita: hoje
  // ele existia espalhado entre a lista de presença e o extrato. Só admin+ vê, como todo
  // resto que fala de dinheiro.
  { to: "/gestao/$slug/resultado", label: "Resultado", group: "eventos", adminOnly: true },
  { to: "/gestao/$slug/campanhas", label: "Campanhas", group: "apoio" },
  { to: "/gestao/$slug/doacoes", label: "Doações", group: "apoio" },
  { to: "/gestao/$slug/recebimento", label: "Recebimento", group: "dinheiro" },
  // repasse é acordo comercial: a API recusa staff, então a aba nem aparece
  { to: "/gestao/$slug/repasses", label: "A repassar", group: "dinheiro", adminOnly: true },
  { to: "/gestao/$slug/extrato", label: "Extrato", group: "dinheiro", adminOnly: true },
  { to: "/gestao/$slug/configuracoes", label: "Configurações", group: "ajustes", ownerOnly: true },
] as const;

type Tab = (typeof TABS)[number];

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
  // Blocos derivados da ordem das abas, não de uma segunda lista: com duas listas, esconder
  // uma aba por papel deixaria um rótulo de bloco vazio na tela.
  const groups = visibleTabs.reduce<Array<{ key: string; tabs: Tab[] }>>((acc, tab) => {
    const last = acc.at(-1);
    if (last?.key === tab.group) last.tabs.push(tab);
    else acc.push({ key: tab.group, tabs: [tab] });
    return acc;
  }, []);

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

  function isActive(tab: Tab): boolean {
    const exact = "exact" in tab && tab.exact;
    return Boolean(matchRoute({ to: tab.to, params: { slug }, fuzzy: !exact }));
  }
  function countOf(tab: Tab): number {
    if (!("badge" in tab)) return 0;
    if (tab.badge === "orders") return openOrders;
    return tab.badge === "interests" ? openInterests : 0;
  }
  function ActiveUnderline() {
    return (
      <motion.span
        layoutId="gestao-tab-indicator"
        transition={
          reducedMotion ? { duration: 0 } : { type: "spring", stiffness: 500, damping: 40 }
        }
        className="absolute inset-x-2 -bottom-px h-[2.5px] rounded-full bg-brand"
        aria-hidden
      />
    );
  }

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
              {groups.map((group) => {
                const activeTab = group.tabs.find((tab) => isActive(tab));
                // Soma dos avisos do grupo: fechado, o painel não pode esconder que alguém
                // está esperando resposta. Sem isto o dono só descobria a venda abrindo a
                // tela certa — e agora ela está dentro de um menu.
                const groupCount = group.tabs.reduce((sum, tab) => sum + countOf(tab), 0);
                const indicator = activeTab ? <ActiveUnderline /> : null;

                // Uma tela só: link direto. O rótulo do grupo é o nome dela.
                if (group.tabs.length === 1) {
                  const only = group.tabs[0] as Tab;
                  return (
                    <Link
                      key={group.key}
                      to={only.to}
                      params={{ slug }}
                      aria-current={activeTab ? "page" : undefined}
                      className={`relative whitespace-nowrap px-3 pb-3 text-sm transition-colors [transition-duration:var(--dur)] ${
                        activeTab ? "font-semibold text-ink" : "text-muted hover:text-ink"
                      }`}
                    >
                      {only.label}
                      <Count n={groupCount} />
                      {indicator}
                    </Link>
                  );
                }

                return (
                  <MenuButton
                    key={group.key}
                    // dentro do grupo, o botão mostra a tela aberta: sem isso a pessoa
                    // perdia de vista onde está e tinha de abrir o menu para descobrir
                    label={activeTab?.label ?? (GROUP_LABELS[group.key] as string)}
                    active={Boolean(activeTab)}
                    badge={<Count n={groupCount} />}
                    indicator={indicator}
                  >
                    <span className="px-2.5 pt-1 pb-1.5 text-[0.65rem] text-muted uppercase tracking-[0.1em]">
                      {GROUP_LABELS[group.key]}
                    </span>
                    {group.tabs.map((tab) => (
                      <Link
                        key={tab.to}
                        to={tab.to}
                        params={{ slug }}
                        role="menuitem"
                        aria-current={isActive(tab) ? "page" : undefined}
                        className={`flex items-center gap-2 rounded-[0.6rem] px-2.5 py-2 text-sm transition-colors [transition-duration:var(--dur)] ${
                          isActive(tab)
                            ? "bg-brand-soft font-semibold text-brand-deep"
                            : "text-ink hover:bg-surface"
                        }`}
                      >
                        {tab.label}
                        <Count n={countOf(tab)} />
                      </Link>
                    ))}
                  </MenuButton>
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

/**
 * Contador de quem está esperando resposta. Some quando é zero: um "0" ao lado de "Pedidos"
 * parecia estado de erro para quem nunca vendeu.
 */
function Count({ n }: { n: number }) {
  if (n <= 0) return null;
  return (
    <span className="inline-grid h-5 min-w-5 place-items-center rounded-full bg-brand px-1.5 font-semibold text-[0.7rem] text-brand-ink tabular-nums">
      {n > 9 ? "9+" : n}
    </span>
  );
}
