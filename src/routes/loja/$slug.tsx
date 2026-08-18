import { createFileRoute, Outlet } from "@tanstack/react-router";
import { SiteFooter } from "#/components/site/site-footer";
import { SiteHeader } from "#/components/site/site-header";
import { getStoreQueryOptions, useGetStore } from "#/lib/api/gen/hooks/useGetStore";
import { publicRequest } from "#/lib/api/public";

// Layout da loja: carrega a loja uma vez e todas as rotas filhas herdam o cabeçalho.
export const Route = createFileRoute("/loja/$slug")({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(getStoreQueryOptions(params.slug, publicRequest)),
  component: StoreLayout,
});

function StoreLayout() {
  const { slug } = Route.useParams();
  const { data: store } = useGetStore(slug, { client: publicRequest });

  return (
    <>
      <SiteHeader storeSlug={slug} storeName={store?.name} />
      <main>
        <Outlet />
      </main>
      <SiteFooter />
    </>
  );
}
