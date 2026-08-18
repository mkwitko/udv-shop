import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import { ConfirmDialog } from "#/components/ui/confirm";
import { FormError } from "#/components/ui/field";
import { Tag } from "#/components/ui/tag";
import { useToast } from "#/components/ui/toast";
import { errorMessage } from "#/lib/api/error-message";
import { cancelOrder } from "#/lib/api/gen/clients/cancelOrder";
import { refundOrder } from "#/lib/api/gen/clients/refundOrder";
import { updateOrderStatus } from "#/lib/api/gen/clients/updateOrderStatus";
import {
  listStoreOrdersQueryKey,
  useListStoreOrders,
} from "#/lib/api/gen/hooks/useListStoreOrders";
import type { ListStoreOrders200 } from "#/lib/api/gen/types/ListStoreOrders";
import { formatPhone, longDate, money } from "#/lib/format";

export const Route = createFileRoute("/gestao/$slug/pedidos")({
  component: OrdersAdmin,
});

type Order = ListStoreOrders200["items"][number];

const STATUS_META: Record<
  string,
  { label: string; tone: "brand" | "accent" | "neutral" | "danger" }
> = {
  pending_payment: { label: "Aguardando pagamento", tone: "accent" },
  paid: { label: "Pagamento confirmado", tone: "brand" },
  delivery_arranged: { label: "Entrega combinada", tone: "accent" },
  delivered: { label: "Entregue", tone: "neutral" },
  cancelled: { label: "Cancelado", tone: "neutral" },
  refund_requested: { label: "Reembolso em andamento", tone: "danger" },
  refunded: { label: "Reembolsado", tone: "neutral" },
};

function OrdersAdmin() {
  const { slug } = Route.useParams();
  const { queryClient } = useRouter().options.context;
  const { data, isPending } = useListStoreOrders(slug, { limit: 50 });
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [refunding, setRefunding] = useState<Order | null>(null);
  const toast = useToast();
  const orders = data?.items ?? [];

  async function act(order: Order, action: () => Promise<unknown>) {
    setBusyId(order.id);
    setError(null);
    try {
      await action();
      await queryClient.invalidateQueries({
        queryKey: listStoreOrdersQueryKey(slug, { limit: 50 }),
      });
      toast("Pedido atualizado.");
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <h2 className="font-display text-lg font-semibold tracking-tight">Pedidos</h2>
      <p className="mt-1 text-sm text-muted">
        Combine a entrega pelo telefone do pedido e marque aqui cada passo — quem comprou acompanha
        pela conta.
      </p>

      <FormError>{error}</FormError>

      {isPending ? (
        <div className="mt-6 h-32 animate-pulse rounded-lg bg-surface" />
      ) : orders.length === 0 ? (
        <p className="card mt-6 px-6 py-12 text-center text-muted">
          Nenhum pedido ainda. Quando alguém comprar, ele aparece aqui na hora.
        </p>
      ) : (
        <ul className="mt-6 grid gap-3">
          {orders.map((order) => {
            const meta = STATUS_META[order.status] ?? {
              label: order.status,
              tone: "neutral" as const,
            };
            const busy = busyId === order.id;
            return (
              <li key={order.id} className="card p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Tag tone={meta.tone}>{meta.label}</Tag>
                    <span className="text-sm text-muted">{longDate(order.createdAt)}</span>
                  </div>
                  <p className="font-display font-semibold tabular-nums">
                    {money(order.totalCents)}
                  </p>
                </div>

                <p className="mt-2 text-sm">
                  {order.items.map((item) => `${item.qty}× ${item.name}`).join(" · ")}
                </p>
                <p className="mt-1 text-sm text-muted">
                  Contato:{" "}
                  <span className="text-ink tabular-nums">{formatPhone(order.contactPhone)}</span>
                  {order.note && <> · “{order.note}”</>}
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  {order.status === "paid" && (
                    <>
                      <Button
                        size="sm"
                        disabled={busy}
                        onClick={() =>
                          act(order, () =>
                            updateOrderStatus(slug, order.id, { status: "delivery_arranged" }),
                          )
                        }
                      >
                        Entrega combinada
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        disabled={busy}
                        onClick={() => {
                          if (
                            window.confirm("Devolver o dinheiro deste pedido? Isso não tem volta.")
                          ) {
                            void act(order, () => refundOrder(slug, order.id));
                          }
                        }}
                      >
                        Reembolsar
                      </Button>
                    </>
                  )}
                  {order.status === "delivery_arranged" && (
                    <Button
                      size="sm"
                      disabled={busy}
                      onClick={() =>
                        act(order, () => updateOrderStatus(slug, order.id, { status: "delivered" }))
                      }
                    >
                      Marcar como entregue
                    </Button>
                  )}
                  {order.status === "pending_payment" && (
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={busy}
                      onClick={() => act(order, () => cancelOrder(slug, order.id))}
                    >
                      Cancelar pedido
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmDialog
        open={refunding !== null}
        title="Reembolsar este pedido?"
        confirmLabel="Reembolsar pedido"
        busy={busyId === refunding?.id}
        onCancel={() => setRefunding(null)}
        onConfirm={() => {
          if (!refunding) return;
          void act(refunding, () => refundOrder(slug, refunding.id)).then(() => setRefunding(null));
        }}
      >
        O valor de {refunding ? money(refunding.totalCents) : ""} volta para quem comprou. Essa ação
        não pode ser desfeita.
      </ConfirmDialog>
    </div>
  );
}
