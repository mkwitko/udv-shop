import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { RequireSession } from "#/components/auth/require-session";
import { SiteFooter } from "#/components/site/site-footer";
import { SiteHeader } from "#/components/site/site-header";
import { Tag } from "#/components/ui/tag";
import { useListMyStores } from "#/lib/api/gen/hooks/useListMyStores";
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

const TABS = [
  { to: "/gestao/$slug", label: "Resumo", exact: true },
  { to: "/gestao/$slug/produtos", label: "Produtos" },
  { to: "/gestao/$slug/pedidos", label: "Pedidos" },
  { to: "/gestao/$slug/encomendas", label: "Encomendas" },
  { to: "/gestao/$slug/campanhas", label: "Campanhas" },
  { to: "/gestao/$slug/doacoes", label: "Doações" },
  { to: "/gestao/$slug/recebimento", label: "Recebimento" },
] as const;

function ManageLayout() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const { data, isPending } = useListMyStores();
  const store = data?.items.find((candidate) => candidate.slug === slug);

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
              {store.status !== "active" && (
                <Tag tone={store.status === "pending" ? "accent" : "danger"}>
                  {store.status === "pending" ? "aguardando liberação" : "suspensa"}
                </Tag>
              )}
              <Link
                to="/loja/$slug"
                params={{ slug }}
                className="text-sm text-brand underline underline-offset-4"
              >
                ver como cliente
              </Link>
            </div>

            <nav className="scroll-row mt-5 -mb-px" aria-label="Seções da gestão">
              {TABS.map((tab) => (
                <Link
                  key={tab.to}
                  to={tab.to}
                  params={{ slug }}
                  activeOptions={{ exact: "exact" in tab && tab.exact }}
                  className="whitespace-nowrap border-b-2 border-transparent px-3 pb-3 text-sm text-muted transition-colors [transition-duration:var(--dur)] hover:text-ink"
                  activeProps={{
                    className:
                      "whitespace-nowrap border-b-2 border-brand px-3 pb-3 text-sm font-medium text-ink",
                  }}
                >
                  {tab.label}
                </Link>
              ))}
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
