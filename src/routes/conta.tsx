import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Plus, Store } from "lucide-react";
import { RequireSession } from "#/components/auth/require-session";
import { SiteFooter } from "#/components/site/site-footer";
import { SiteHeader } from "#/components/site/site-header";
import { Button } from "#/components/ui/button";
import { Tag } from "#/components/ui/tag";
import { useListMyStores } from "#/lib/api/gen/hooks/useListMyStores";
import type { ListMyStores200 } from "#/lib/api/gen/types/ListMyStores";
import { useSession } from "#/lib/auth/session";
import { seo } from "#/lib/seo";

export const Route = createFileRoute("/conta")({
  head: () =>
    seo({
      title: "Minha conta",
      description: "Suas lojas e seus dados.",
      path: "/conta",
      noIndex: true,
    }),
  component: () => (
    <RequireSession redirectTo="/conta">
      <AccountPage />
    </RequireSession>
  ),
});

const STATUS_LABEL: Record<string, { text: string; tone: "brand" | "accent" | "neutral" }> = {
  active: { text: "no ar", tone: "brand" },
  pending: { text: "aguardando liberação", tone: "accent" },
  suspended: { text: "suspensa", tone: "neutral" },
};

const ROLE_LABEL: Record<string, string> = {
  owner: "dono",
  admin: "administra",
  staff: "equipe",
};

function AccountPage() {
  const { user, logout } = useSession();
  const navigate = useNavigate();
  const { data, isPending } = useListMyStores();
  const stores = data?.items ?? [];

  return (
    <>
      <SiteHeader />

      <main className="shell py-14">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="kicker">Minha conta</p>
            <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">
              Olá, {user?.name?.split(" ")[0]}
            </h1>
            <p className="mt-1 text-muted">{user?.email}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              await logout();
              await navigate({ to: "/", replace: true });
            }}
          >
            Sair
          </Button>
        </div>

        {user?.emailVerified === false && (
          <p className="mt-6 rounded-md border border-accent/35 bg-accent/10 px-4 py-3 text-sm text-accent">
            Seu e-mail ainda não foi confirmado. Procure a mensagem que enviamos ao criar a conta.
          </p>
        )}

        <section className="mt-12">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="font-display text-xl font-semibold tracking-tight">Minhas lojas</h2>
            <Button asChild size="sm">
              <Link to="/nova-loja">
                <Plus className="h-4 w-4" aria-hidden />
                Nova loja
              </Link>
            </Button>
          </div>

          {isPending ? (
            <div className="mt-6 grid gap-3">
              <div className="h-24 animate-pulse rounded-lg bg-surface" />
              <div className="h-24 animate-pulse rounded-lg bg-surface" />
            </div>
          ) : stores.length === 0 ? (
            <EmptyStores />
          ) : (
            <ul className="mt-6 grid gap-3">
              {stores.map((store) => (
                <StoreRow key={store.id} store={store} />
              ))}
            </ul>
          )}
        </section>
      </main>

      <SiteFooter />
    </>
  );
}

function StoreRow({ store }: { store: ListMyStores200["items"][number] }) {
  const status = STATUS_LABEL[store.status] ?? STATUS_LABEL.active;

  return (
    <li className="card card-hover flex flex-wrap items-center justify-between gap-4 p-5">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2.5">
          <h3 className="font-display text-lg font-semibold">{store.name}</h3>
          <Tag tone={status?.tone}>{status?.text}</Tag>
          <Tag>{ROLE_LABEL[store.role] ?? store.role}</Tag>
        </div>
        <p className="mt-1 truncate text-sm text-muted">/loja/{store.slug}</p>
      </div>

      <div className="flex items-center gap-2">
        <Button asChild variant="secondary" size="sm">
          <Link to="/loja/$slug" params={{ slug: store.slug }}>
            Ver loja
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </Button>
        {/* painel de gestão é o próximo plano; o botão fica visível para não sumir a rota */}
        <Button variant="ghost" size="sm" disabled title="Painel de gestão em breve">
          Gerenciar
        </Button>
      </div>
    </li>
  );
}

function EmptyStores() {
  return (
    <div className="card mt-6 grid place-items-center px-6 py-16 text-center">
      <span className="inline-grid h-12 w-12 place-items-center rounded-lg bg-brand-soft text-brand">
        <Store className="h-6 w-6" aria-hidden />
      </span>
      <h3 className="mt-5 font-display text-lg font-semibold">Nenhuma loja ainda</h3>
      <p className="mt-2 max-w-sm text-muted">
        Crie sua loja, cadastre os primeiros produtos e compartilhe o link.
      </p>
      <Button asChild className="mt-6">
        <Link to="/nova-loja">Criar minha loja</Link>
      </Button>
    </div>
  );
}
