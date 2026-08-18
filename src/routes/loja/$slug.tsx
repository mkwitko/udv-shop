import { createFileRoute, Outlet } from "@tanstack/react-router";
import { SiteFooter } from "#/components/site/site-footer";
import { SiteHeader } from "#/components/site/site-header";
import { StoreOffline } from "#/components/store/store-offline";
import { getStoreQueryOptions, useGetStore } from "#/lib/api/gen/hooks/useGetStore";
import { useListMyStores } from "#/lib/api/gen/hooks/useListMyStores";
import { publicRequest } from "#/lib/api/public";
import { useSession } from "#/lib/auth/session";

// Layout da loja: carrega a loja uma vez e todas as rotas filhas herdam o cabeçalho.
export const Route = createFileRoute("/loja/$slug")({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(getStoreQueryOptions(params.slug, publicRequest)),
  component: StoreLayout,
});

function StoreLayout() {
  const { slug } = Route.useParams();
  const { data: store } = useGetStore(slug, { client: publicRequest });
  const { status } = useSession();
  // quem cuida da loja continua navegando na vitrine mesmo fora do ar — é assim que
  // confere como a página ficou antes de abrir. Visitante anônimo não gasta request.
  const { data: mine } = useListMyStores({
    query: { enabled: status === "authenticated" && store?.status !== "active" },
  });
  const isMember = mine?.items.some((candidate) => candidate.slug === slug) ?? false;
  const offline = Boolean(store && store.status !== "active" && !isMember);

  return (
    <>
      {/* loja fora do ar não mostra as abas da vitrine: não há para onde ir */}
      <SiteHeader storeSlug={offline ? undefined : slug} storeName={store?.name} />
      <main>
        {offline && store ? <StoreOffline name={store.name} status={store.status} /> : <Outlet />}
      </main>
      <SiteFooter />
    </>
  );
}
