import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { Check, ChevronDown, Copy, Plus } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "#/components/ui/button";
import { EmptyState } from "#/components/ui/empty-state";
import { Field, FormError, Input } from "#/components/ui/field";
import { MoneyInput } from "#/components/ui/money-input";
import { SkeletonRows } from "#/components/ui/skeleton";
import { Tag } from "#/components/ui/tag";
import { useToast } from "#/components/ui/toast";
import { errorMessage } from "#/lib/api/error-message";
import { createSettlement } from "#/lib/api/gen/clients/createSettlement";
import { createSupplier } from "#/lib/api/gen/clients/createSupplier";
import { getPayoutQueryKey, useGetPayout } from "#/lib/api/gen/hooks/useGetPayout";
import { listPayoutsQueryKey, useListPayouts } from "#/lib/api/gen/hooks/useListPayouts";
import { listSuppliersQueryKey } from "#/lib/api/gen/hooks/useListSuppliers";
import type { ListPayouts200 } from "#/lib/api/gen/types/ListPayouts";
import { longDate, money } from "#/lib/format";
import { parseAmount } from "#/lib/pay/amount";

export const Route = createFileRoute("/gestao/$slug/repasses")({
  component: PayoutsAdmin,
});

type Balance = ListPayouts200["items"][number];

function PayoutsAdmin() {
  const { slug } = Route.useParams();
  const { queryClient } = useRouter().options.context;
  const { data, isPending, isError } = useListPayouts(slug);
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const items = data?.items ?? [];
  const toPay = items.filter((row) => row.balanceCents > 0);
  const totalToPay = toPay.reduce((sum, row) => sum + row.balanceCents, 0);

  async function refresh(supplierId?: string) {
    await queryClient.invalidateQueries({ queryKey: listPayoutsQueryKey(slug) });
    if (supplierId) {
      await queryClient.invalidateQueries({ queryKey: getPayoutQueryKey(slug, supplierId) });
    }
  }

  if (creating) {
    return (
      <SupplierForm
        slug={slug}
        onDone={async () => {
          await queryClient.invalidateQueries({ queryKey: listSuppliersQueryKey(slug) });
          await refresh();
          setCreating(false);
        }}
        onCancel={() => setCreating(false)}
      />
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display font-semibold text-lg tracking-tight">Repasses</h2>
        <Button size="sm" onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" aria-hidden />
          Novo parceiro
        </Button>
      </div>
      <p className="mt-1 text-muted text-sm">
        Quanto a loja deve a quem faz os produtos. O dinheiro da venda cai na conta da loja; aqui
        fica o registro do que ainda falta pagar e do que já foi pago.
      </p>

      <FormError>{error}</FormError>

      {isPending ? (
        <SkeletonRows rows={2} className="mt-6" />
      ) : isError ? (
        <p className="mt-6 text-danger text-sm" role="alert">
          Não conseguimos carregar os repasses agora. Recarregue a página.
        </p>
      ) : items.length === 0 ? (
        <EmptyState
          className="mt-6"
          title="Nenhum parceiro cadastrado."
          action={<Button onClick={() => setCreating(true)}>Cadastrar parceiro</Button>}
        >
          Cadastre quem faz os produtos da loja e combine, na página do produto, quanto do preço é
          dessa pessoa. A cada venda paga o valor entra aqui como repasse a pagar.
        </EmptyState>
      ) : (
        <>
          <div className="card mt-6 p-4">
            <p className="kicker">A repassar agora</p>
            <p className="mt-1 font-display font-semibold text-2xl tabular-nums">
              {money(totalToPay)}
            </p>
            <p className="mt-1 text-muted text-sm">
              {toPay.length === 0
                ? "Nada em aberto — todo mundo já recebeu."
                : toPay.length === 1
                  ? "1 parceiro esperando."
                  : `${toPay.length} parceiros esperando.`}
            </p>
          </div>

          <ul className="mt-4 grid gap-3">
            {items.map((row) => (
              <SupplierRow
                key={row.supplier.id}
                slug={slug}
                row={row}
                open={openId === row.supplier.id}
                onToggle={() => setOpenId(openId === row.supplier.id ? null : row.supplier.id)}
                onPaid={async () => {
                  await refresh(row.supplier.id);
                }}
                onError={setError}
              />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function SupplierRow({
  slug,
  row,
  open,
  onToggle,
  onPaid,
  onError,
}: {
  slug: string;
  row: Balance;
  open: boolean;
  onToggle: () => void;
  onPaid: () => Promise<void>;
  onError: (message: string | null) => void;
}) {
  const [paying, setPaying] = useState(false);
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const owed = row.balanceCents;

  async function pay() {
    const cents = parseAmount(amount);
    if (cents === null) {
      onError("Diga quanto você pagou: 120 ou 120,50.");
      return;
    }
    setBusy(true);
    onError(null);
    try {
      await createSettlement(slug, row.supplier.id, { amountCents: cents });
      toast(`Repasse de ${money(cents)} registrado.`);
      setPaying(false);
      setAmount("");
      await onPaid();
    } catch (cause) {
      onError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="card p-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <div className="min-w-[11rem] flex-1">
          <p className="flex flex-wrap items-center gap-2 font-medium">
            {row.supplier.name}
            {!row.supplier.active && <Tag>desativado</Tag>}
          </p>
          <p className="mt-0.5 text-muted text-sm tabular-nums">
            {owed > 0 ? (
              <>
                <span className="font-medium text-ink">{money(owed)}</span> a pagar
              </>
            ) : owed < 0 ? (
              <>
                crédito de <span className="font-medium text-ink">{money(-owed)}</span> com esta
                pessoa
              </>
            ) : (
              "em dia"
            )}
            {" · "}
            {money(row.earnedCents)} gerados em vendas
          </p>
        </div>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          <Button variant="secondary" size="sm" aria-expanded={open} onClick={onToggle}>
            <ChevronDown
              className={`h-4 w-4 transition-transform [transition-duration:var(--dur)] ${
                open ? "rotate-180" : ""
              }`}
              aria-hidden
            />
            {open ? "Fechar" : "Ver conta"}
          </Button>
          <Button
            size="sm"
            variant={owed > 0 ? "primary" : "secondary"}
            onClick={() => {
              setPaying(true);
              setAmount(owed > 0 ? (owed / 100).toFixed(2).replace(".", ",") : "");
            }}
          >
            <Check className="h-4 w-4" aria-hidden />
            Registrar pagamento
          </Button>
        </div>
      </div>

      {paying && (
        <div className="mt-4 grid gap-3 border-line border-t pt-4 sm:max-w-sm">
          <Field
            label="Quanto você pagou"
            htmlFor={`amount-${row.supplier.id}`}
            hint="Só o registro: o Pix ou o dinheiro sai por fora."
          >
            <MoneyInput
              id={`amount-${row.supplier.id}`}
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </Field>
          {row.supplier.pixKey && <PixKey value={row.supplier.pixKey} />}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" disabled={busy} onClick={pay}>
              {busy ? "Registrando…" : "Registrar"}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setPaying(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {open && <SupplierAccount slug={slug} supplierId={row.supplier.id} />}
    </li>
  );
}

function PixKey({ value }: { value: string }) {
  const toast = useToast();
  return (
    <button
      type="button"
      className="flex items-center gap-2 justify-self-start text-brand-deep text-sm underline underline-offset-4"
      onClick={() => {
        void navigator.clipboard?.writeText(value).then(() => toast("Chave Pix copiada."));
      }}
    >
      <Copy className="h-4 w-4" aria-hidden />
      Copiar chave Pix: {value}
    </button>
  );
}

/** Extrato de um parceiro: as vendas que geraram repasse e os pagamentos já feitos. */
function SupplierAccount({ slug, supplierId }: { slug: string; supplierId: string }) {
  const { data, isPending, isError } = useGetPayout(slug, supplierId);

  if (isPending) return <SkeletonRows rows={2} className="mt-4" />;
  if (isError || !data) {
    return (
      <p className="mt-4 text-danger text-sm" role="alert">
        Não conseguimos abrir a conta agora. Feche e abra de novo.
      </p>
    );
  }

  return (
    <div className="mt-4 grid gap-6 border-line border-t pt-4">
      <section>
        <h4 className="kicker">Vendas que geraram repasse</h4>
        {data.sales.length === 0 ? (
          <p className="mt-2 text-muted text-sm">
            Nenhuma venda paga ainda com produto desta pessoa.
          </p>
        ) : (
          <ul className="mt-2 grid gap-1.5 text-sm">
            {data.sales.map((sale) => (
              <li
                key={`${sale.orderId}-${sale.productName}`}
                className="flex flex-wrap items-baseline gap-x-3 gap-y-1"
              >
                <span className="font-medium">{sale.productName}</span>
                {sale.qty > 1 && <span className="text-muted">{sale.qty} un</span>}
                <span className="text-muted">{longDate(sale.soldAt)}</span>
                <span className="ml-auto tabular-nums">{money(sale.payoutCents)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h4 className="kicker">Pagamentos registrados</h4>
        {data.settlements.length === 0 ? (
          <p className="mt-2 text-muted text-sm">Nada pago por aqui ainda.</p>
        ) : (
          <ul className="mt-2 grid gap-1.5 text-sm">
            {data.settlements.map((settlement) => (
              <li key={settlement.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="font-medium tabular-nums">{money(settlement.amountCents)}</span>
                <span className="text-muted">{longDate(settlement.paidAt)}</span>
                {settlement.note && <span className="text-muted">{settlement.note}</span>}
                {settlement.byName && (
                  <span className="ml-auto text-muted">por {settlement.byName}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

const SupplierSchema = z.object({
  name: z.string().min(2, "Nome muito curto").max(120),
  phone: z.string().max(32).optional(),
  pixKey: z.string().max(140).optional(),
  note: z.string().max(500).optional(),
});
type SupplierForm = z.infer<typeof SupplierSchema>;

function SupplierForm({
  slug,
  onDone,
  onCancel,
}: {
  slug: string;
  onDone: () => Promise<void>;
  onCancel: () => void;
}) {
  const [formError, setFormError] = useState<string | null>(null);
  const toast = useToast();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SupplierForm>({ resolver: zodResolver(SupplierSchema) });

  async function submit(values: SupplierForm) {
    setFormError(null);
    try {
      await createSupplier(slug, {
        name: values.name,
        phone: values.phone || undefined,
        pixKey: values.pixKey || undefined,
        note: values.note || undefined,
      });
      toast(`${values.name} entrou na lista de parceiros.`);
      await onDone();
    } catch (error) {
      setFormError(errorMessage(error));
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display font-semibold text-lg tracking-tight">Novo parceiro</h2>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Voltar
        </Button>
      </div>
      <p className="mt-1 text-muted text-sm">
        Quem faz um produto da loja e recebe parte do valor da venda.
      </p>

      <form onSubmit={handleSubmit(submit)} className="mt-6 grid max-w-xl gap-5">
        <Field label="Nome" htmlFor="name" error={errors.name?.message}>
          <Input id="name" placeholder="Dona Ana" {...register("name")} />
        </Field>
        <Field
          label="Chave Pix (opcional)"
          htmlFor="pixKey"
          hint="Fica salva só para você copiar na hora de pagar."
          error={errors.pixKey?.message}
        >
          <Input id="pixKey" placeholder="ana@email.com" {...register("pixKey")} />
        </Field>
        <Field label="Telefone (opcional)" htmlFor="phone" error={errors.phone?.message}>
          <Input id="phone" inputMode="tel" placeholder="(48) 99999-0000" {...register("phone")} />
        </Field>
        <Field label="Observação (opcional)" htmlFor="note" error={errors.note?.message}>
          <Input id="note" placeholder="Costura as camisetas" {...register("note")} />
        </Field>

        <FormError>{formError}</FormError>

        <Button size="lg" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Salvando…" : "Salvar parceiro"}
        </Button>
      </form>
    </div>
  );
}
