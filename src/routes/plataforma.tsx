import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { RequireSession } from "#/components/auth/require-session";
import { SiteFooter } from "#/components/site/site-footer";
import { SiteHeader } from "#/components/site/site-header";
import { Button } from "#/components/ui/button";
import { ConfirmDialog } from "#/components/ui/confirm";
import { SkeletonRows } from "#/components/ui/skeleton";
import { Tag } from "#/components/ui/tag";
import { useToast } from "#/components/ui/toast";
import { errorMessage } from "#/lib/api/error-message";
import { adminListStores } from "#/lib/api/gen/clients/adminListStores";
import { updateStoreStatus } from "#/lib/api/gen/clients/updateStoreStatus";
import {
  adminListStoresQueryKey,
  useAdminListStores,
} from "#/lib/api/gen/hooks/useAdminListStores";
import type { AdminListStores200 } from "#/lib/api/gen/types/AdminListStores";
import { useSession } from "#/lib/auth/session";
import { longDate } from "#/lib/format";
import { seo } from "#/lib/seo";

export const Route = createFileRoute("/plataforma")({
  head: () =>
    seo({
      title: "Plataforma",
      description: "Administração das lojas da plataforma.",
      path: "/plataforma",
      noIndex: true,
    }),
  component: () => (
    <RequireSession redirectTo="/plataforma">
      <PlatformPage />
    </RequireSession>
  ),
});

type AdminStore = AdminListStores200["items"][number];
type StatusFilter = "all" | "pending" | "active" | "suspended";

const STATUS_LABEL: Record<string, { text: string; tone: "brand" | "accent" | "neutral" }> = {
  active: { text: "no ar", tone: "brand" },
  pending: { text: "ainda não abriu", tone: "accent" },
  suspended: { text: "fora do ar", tone: "neutral" },
};

/** Suspensa por cobrança volta sozinha quando a loja paga; a nossa, só na mão. */
const SUSPENSION_REASON: Record<string, string> = {
  billing: "assinatura interrompida",
  platform: "suspensa pela plataforma",
};

const PAGE_SIZE = 50;

function PlatformPage() {
  const { user } = useSession();
  const navigate = useNavigate();
  const isAdmin = Boolean(user?.platformAdmin);

  // guarda extra além da sessão: página só existe para quem administra a plataforma
  useEffect(() => {
    if (user && !isAdmin) {
      void navigate({ to: "/conta", replace: true });
    }
  }, [user, isAdmin, navigate]);

  if (!isAdmin) return null;
  return <PlatformStores />;
}

function PlatformStores() {
  const { queryClient } = useRouter().options.context;
  const toast = useToast();
  const [filter, setFilter] = useState<StatusFilter>("all");
  // páginas além da primeira, carregadas pelo "Mostrar mais"
  const [tail, setTail] = useState<{ items: AdminStore[]; next: string | null } | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [suspending, setSuspending] = useState<AdminStore | null>(null);
  const [busySlug, setBusySlug] = useState<string | null>(null);

  const params = {
    limit: PAGE_SIZE,
    ...(filter === "all" ? {} : { status: filter }),
  };
  const { data, isPending } = useAdminListStores(params);
  const items = [...(data?.items ?? []), ...(tail?.items ?? [])];
  const nextCursor = tail ? tail.next : (data?.nextCursor ?? null);

  function changeFilter(next: StatusFilter) {
    setFilter(next);
    setTail(null);
  }

  async function loadMore() {
    if (!nextCursor) return;
    setLoadingMore(true);
    try {
      const page = await adminListStores({ ...params, cursor: nextCursor });
      setTail((prev) => ({
        items: [...(prev?.items ?? []), ...page.items],
        next: page.nextCursor,
      }));
    } catch (cause) {
      toast(errorMessage(cause));
    } finally {
      setLoadingMore(false);
    }
  }

  async function setStatus(store: AdminStore, status: "active" | "suspended") {
    setBusySlug(store.slug);
    try {
      await updateStoreStatus(store.slug, { status });
      await queryClient.invalidateQueries({ queryKey: adminListStoresQueryKey() });
      setTail(null);
      toast(status === "active" ? `${store.name} está no ar.` : `${store.name} foi suspensa.`);
    } catch (cause) {
      toast(errorMessage(cause));
    } finally {
      setBusySlug(null);
      setSuspending(null);
    }
  }

  return (
    <>
      <SiteHeader />
      <main className="shell py-14">
        <p className="kicker">Plataforma</p>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">
          Lojas da plataforma
        </h1>
        <p className="mt-1 text-muted">
          Libere lojas novas, suspenda o que precisar e acompanhe quem está no ar.
        </p>

        <fieldset className="mt-6 flex flex-wrap gap-2" aria-label="Filtrar lojas">
          <FilterPill active={filter === "all"} onClick={() => changeFilter("all")}>
            Todas
          </FilterPill>
          <FilterPill active={filter === "pending"} onClick={() => changeFilter("pending")}>
            Aguardando liberação
          </FilterPill>
          <FilterPill active={filter === "active"} onClick={() => changeFilter("active")}>
            No ar
          </FilterPill>
          <FilterPill active={filter === "suspended"} onClick={() => changeFilter("suspended")}>
            Suspensas
          </FilterPill>
        </fieldset>

        {isPending ? (
          <SkeletonRows rows={2} className="mt-6" />
        ) : items.length === 0 ? (
          <div className="card mt-6 px-6 py-14 text-center">
            <h2 className="font-display text-lg font-semibold">Nada por aqui</h2>
            <p className="mx-auto mt-2 max-w-sm text-muted">
              {filter === "pending"
                ? "Nenhuma loja esperando para abrir."
                : "Nenhuma loja com esse filtro."}
            </p>
          </div>
        ) : (
          <>
            <ul className="mt-6 grid gap-3">
              {items.map((store) => {
                const meta = STATUS_LABEL[store.status] ?? {
                  text: store.status,
                  tone: "neutral" as const,
                };
                const busy = busySlug === store.slug;
                return (
                  <li key={store.id} className="card flex flex-wrap items-center gap-4 p-4">
                    <span className="inline-grid h-12 w-12 shrink-0 place-items-center rounded-[0.9rem] bg-brand-soft font-bold font-display text-brand-deep text-lg">
                      {store.name.charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2">
                        <span className="font-display font-semibold">{store.name}</span>
                        <Tag tone={meta.tone}>{meta.text}</Tag>
                      </p>
                      <p className="mt-0.5 text-sm text-muted">
                        <Link
                          to="/loja/$slug"
                          params={{ slug: store.slug }}
                          className="underline-offset-2 hover:underline"
                        >
                          /loja/{store.slug}
                        </Link>{" "}
                        · criada em {longDate(store.createdAt)}
                        {store.suspensionReason
                          ? ` · ${SUSPENSION_REASON[store.suspensionReason] ?? store.suspensionReason}`
                          : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {store.status === "pending" && (
                        <Button
                          size="sm"
                          disabled={busy}
                          onClick={() => setStatus(store, "active")}
                        >
                          {busy ? "Um momento…" : "Pôr no ar"}
                        </Button>
                      )}
                      {store.status === "active" && (
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={busy}
                          onClick={() => setSuspending(store)}
                        >
                          Suspender
                        </Button>
                      )}
                      {store.status === "suspended" && (
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={busy}
                          onClick={() => setStatus(store, "active")}
                        >
                          {busy ? "Um momento…" : "Reativar"}
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
            {nextCursor && (
              <div className="mt-6 flex justify-center">
                <Button variant="secondary" disabled={loadingMore} onClick={loadMore}>
                  {loadingMore ? "Carregando…" : "Mostrar mais lojas"}
                </Button>
              </div>
            )}
          </>
        )}
      </main>
      <SiteFooter />

      <ConfirmDialog
        open={suspending !== null}
        title={suspending ? `Suspender ${suspending.name}?` : ""}
        confirmLabel="Suspender loja"
        busy={busySlug !== null}
        onConfirm={() => suspending && setStatus(suspending, "suspended")}
        onCancel={() => setSuspending(null)}
      >
        A loja sai do ar na hora: ninguém compra nem doa até você reativar. Nada é apagado.
      </ConfirmDialog>
    </>
  );
}

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors [transition-duration:var(--dur)] ${
        active
          ? "border-transparent bg-brand font-medium text-white"
          : "border-line text-muted hover:border-line-strong hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}
