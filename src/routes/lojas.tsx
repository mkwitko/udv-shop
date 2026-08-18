import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteFooter } from "#/components/site/site-footer";
import { SiteHeader } from "#/components/site/site-header";
import { listStoresQueryOptions, useListStores } from "#/lib/api/gen/hooks/useListStores";
import { publicRequest } from "#/lib/api/public";
import { seo } from "#/lib/seo";

export const Route = createFileRoute("/lojas")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(listStoresQueryOptions({ limit: 50 }, publicRequest)),
  head: () =>
    seo({
      title: "Lojas",
      description: "Todas as lojinhas de núcleo abertas na plataforma.",
      path: "/lojas",
    }),
  component: Stores,
});

function Stores() {
  const { data } = useListStores({ limit: 50 }, { client: publicRequest });
  const stores = data?.items ?? [];

  return (
    <>
      <SiteHeader />
      <main className="shell py-16">
        <p className="kicker">Diretório</p>
        <h1 className="mt-4 text-title">Lojas abertas</h1>

        <ul className="mt-12 divide-y divide-line border-y border-line">
          {stores.map((store) => (
            <li key={store.id}>
              <Link
                to="/loja/$slug"
                params={{ slug: store.slug }}
                className="group grid gap-2 py-6 md:grid-cols-12 md:items-baseline"
              >
                <h2 className="font-display text-2xl md:col-span-5 transition-colors duration-(--dur) ease-(--ease) group-hover:text-brand">
                  {store.name}
                </h2>
                <p className="text-muted md:col-span-7">{store.description ?? ""}</p>
              </Link>
            </li>
          ))}
        </ul>
        {stores.length === 0 && <p className="mt-8 text-muted">Nenhuma loja aberta ainda.</p>}
      </main>
      <SiteFooter />
    </>
  );
}
