import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { ArrowRight, Plus, Store } from "lucide-react";
import { useState } from "react";
import { RequireSession } from "#/components/auth/require-session";
import { SiteFooter } from "#/components/site/site-footer";
import { SiteHeader } from "#/components/site/site-header";
import { Button } from "#/components/ui/button";
import { ConfirmDialog } from "#/components/ui/confirm";
import { Tag } from "#/components/ui/tag";
import { useToast } from "#/components/ui/toast";
import { errorMessage } from "#/lib/api/error-message";
import { cancelDonationSubscription } from "#/lib/api/gen/clients/cancelDonationSubscription";
import { cancelInterest } from "#/lib/api/gen/clients/cancelInterest";
import {
  listMyDonationsQueryKey,
  useListMyDonations,
} from "#/lib/api/gen/hooks/useListMyDonations";
import {
  listMyInterestsQueryKey,
  useListMyInterests,
} from "#/lib/api/gen/hooks/useListMyInterests";
import { useListMyOrders } from "#/lib/api/gen/hooks/useListMyOrders";
import { useListMyStores } from "#/lib/api/gen/hooks/useListMyStores";
import type { ListMyStores200 } from "#/lib/api/gen/types/ListMyStores";
import { useSession } from "#/lib/auth/session";
import { longDate, money } from "#/lib/format";
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
          <div className="flex items-center gap-4">
            <span
              className="inline-grid h-14 w-14 shrink-0 place-items-center rounded-full bg-brand font-bold font-display text-white text-xl"
              aria-hidden
            >
              {user?.name?.charAt(0).toUpperCase()}
            </span>
            <div>
              <p className="kicker">Minha conta</p>
              <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">
                Olá, {user?.name?.split(" ")[0]}
              </h1>
              <p className="mt-1 text-muted">{user?.email}</p>
            </div>
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

        <MyOrders />
        <MyDonations />
        <MyInterests />
      </main>

      <SiteFooter />
    </>
  );
}

function StoreRow({ store }: { store: ListMyStores200["items"][number] }) {
  const status = STATUS_LABEL[store.status] ?? STATUS_LABEL.active;

  return (
    <li className="card card-hover flex flex-wrap items-center justify-between gap-4 p-5">
      <div className="flex min-w-0 items-center gap-4">
        <span
          className="inline-grid h-12 w-12 shrink-0 place-items-center rounded-[0.9rem] bg-brand-soft font-bold font-display text-brand-deep text-lg"
          aria-hidden
        >
          {store.name.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h3 className="font-display text-lg font-semibold">{store.name}</h3>
            <Tag tone={status?.tone}>{status?.text}</Tag>
            <Tag>{ROLE_LABEL[store.role] ?? store.role}</Tag>
          </div>
          <p className="mt-1 truncate text-sm text-muted">/loja/{store.slug}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button asChild variant="secondary" size="sm">
          <Link to="/loja/$slug" params={{ slug: store.slug }}>
            Ver loja
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </Button>
        <Button asChild size="sm">
          <Link to="/gestao/$slug" params={{ slug: store.slug }}>
            Gerenciar
          </Link>
        </Button>
      </div>
    </li>
  );
}

function EmptyStores() {
  return (
    <div className="card mt-6 grid place-items-center px-6 py-16 text-center">
      <span className="inline-grid h-12 w-12 place-items-center rounded-lg bg-brand-soft text-brand-deep">
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

const ORDER_STATUS: Record<
  string,
  { text: string; tone: "brand" | "accent" | "neutral" | "danger" }
> = {
  pending_payment: { text: "Aguardando pagamento", tone: "accent" },
  paid: { text: "Pagamento confirmado", tone: "brand" },
  delivery_arranged: { text: "Entrega combinada", tone: "accent" },
  delivered: { text: "Entregue", tone: "neutral" },
  cancelled: { text: "Cancelado", tone: "neutral" },
  refund_requested: { text: "Reembolso em andamento", tone: "danger" },
  refunded: { text: "Reembolsado", tone: "neutral" },
};

function SectionShell({
  title,
  count,
  children,
}: {
  title: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-12">
      <h2 className="flex items-baseline gap-2 font-display text-xl font-semibold tracking-tight">
        {title}
        {count !== undefined && (
          <span className="font-sans font-normal text-muted text-sm tabular-nums">({count})</span>
        )}
      </h2>
      {children}
    </section>
  );
}

function MyOrders() {
  const { data, isPending } = useListMyOrders({ limit: 10 });
  const orders = data?.items ?? [];
  if (!isPending && orders.length === 0) return null;

  return (
    <SectionShell title="Meus pedidos" count={isPending ? undefined : orders.length}>
      {isPending ? (
        <div className="mt-6 h-24 animate-pulse rounded-lg bg-surface" />
      ) : (
        <ul className="mt-6 grid gap-2.5">
          {orders.map((order) => {
            const status = ORDER_STATUS[order.status] ?? {
              text: order.status,
              tone: "neutral" as const,
            };
            return (
              <li
                key={order.id}
                className="card flex flex-wrap items-center justify-between gap-3 p-4"
              >
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-medium">{order.store.name}</span>
                    <Tag tone={status.tone}>{status.text}</Tag>
                  </p>
                  <p className="mt-1 truncate text-sm text-muted">
                    {order.items.map((item) => `${item.qty}× ${item.name}`).join(" · ")}
                  </p>
                  <p className="mt-1 text-xs text-muted">{longDate(order.createdAt)}</p>
                </div>
                <p className="font-display font-semibold tabular-nums">{money(order.totalCents)}</p>
              </li>
            );
          })}
        </ul>
      )}
    </SectionShell>
  );
}

function MyDonations() {
  const { queryClient } = useRouter().options.context;
  const { data, isPending } = useListMyDonations({ limit: 10 });
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const toast = useToast();
  const donations = data?.items ?? [];
  if (!isPending && donations.length === 0) return null;

  async function cancel(id: string) {
    setBusyId(id);
    setError(null);
    try {
      await cancelDonationSubscription(id);
      await queryClient.invalidateQueries({ queryKey: listMyDonationsQueryKey({ limit: 10 }) });
      toast("Doação mensal cancelada.");
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusyId(null);
      setCancelling(null);
    }
  }

  return (
    <SectionShell title="Minhas doações" count={isPending ? undefined : donations.length}>
      {error && <p className="mt-4 text-sm text-danger">{error}</p>}
      {isPending ? (
        <div className="mt-6 h-24 animate-pulse rounded-lg bg-surface" />
      ) : (
        <ul className="mt-6 grid gap-2.5">
          {donations.map((donation) => (
            <li
              key={donation.id}
              className="card flex flex-wrap items-center justify-between gap-3 p-4"
            >
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-medium">
                    {donation.campaign ? donation.campaign.title : donation.store.name}
                  </span>
                  {donation.type === "monthly" && (
                    <Tag tone={donation.subscriptionActive ? "brand" : "neutral"}>
                      mensal{donation.subscriptionActive ? "" : " (cancelada)"}
                    </Tag>
                  )}
                </p>
                {donation.raffleNumbers.length > 0 && (
                  <p className="mt-1 text-sm text-muted tabular-nums">
                    Números da sorte: {donation.raffleNumbers.join(", ")}
                  </p>
                )}
                <p className="mt-1 text-xs text-muted">{longDate(donation.createdAt)}</p>
              </div>
              <div className="flex items-center gap-3">
                <p className="font-display font-semibold tabular-nums">
                  {money(donation.amountCents)}
                  {donation.type === "monthly" && <span className="text-sm text-muted">/mês</span>}
                </p>
                {donation.type === "monthly" && donation.subscriptionActive && (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={busyId === donation.id}
                    onClick={() => setCancelling(donation.id)}
                  >
                    Cancelar mensal
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={cancelling !== null}
        title="Cancelar esta doação mensal?"
        confirmLabel="Cancelar doação mensal"
        busy={busyId === cancelling}
        onCancel={() => setCancelling(null)}
        onConfirm={() => {
          if (cancelling) void cancel(cancelling);
        }}
      >
        Novas cobranças mensais deixarão de acontecer. Você pode voltar a doar quando quiser.
      </ConfirmDialog>
    </SectionShell>
  );
}

function MyInterests() {
  const { queryClient } = useRouter().options.context;
  const { data, isPending } = useListMyInterests({ limit: 10 });
  const [busyId, setBusyId] = useState<string | null>(null);
  const interests = (data?.items ?? []).filter(
    (interest) => interest.status === "open" || interest.status === "notified",
  );
  if (!isPending && interests.length === 0) return null;

  async function remove(id: string) {
    setBusyId(id);
    try {
      await cancelInterest(id);
      await queryClient.invalidateQueries({ queryKey: listMyInterestsQueryKey({ limit: 10 }) });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <SectionShell title="Minhas encomendas" count={isPending ? undefined : interests.length}>
      {isPending ? (
        <div className="mt-6 h-24 animate-pulse rounded-lg bg-surface" />
      ) : (
        <ul className="mt-6 grid gap-2.5">
          {interests.map((interest) => (
            <li
              key={interest.id}
              className="card flex flex-wrap items-center justify-between gap-3 p-4"
            >
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-medium">{interest.product.name}</span>
                  {interest.status === "notified" ? (
                    <Tag tone="brand">chegou! visite a loja</Tag>
                  ) : (
                    <Tag tone="accent">na lista de espera</Tag>
                  )}
                </p>
                <p className="mt-1 text-sm text-muted">
                  {interest.store.name} · {money(interest.product.priceCents)}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                disabled={busyId === interest.id}
                onClick={() => remove(interest.id)}
              >
                Sair da lista
              </Button>
            </li>
          ))}
        </ul>
      )}
    </SectionShell>
  );
}
