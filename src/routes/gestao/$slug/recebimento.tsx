import { createFileRoute, useRouter } from "@tanstack/react-router";
import { Check, CreditCard, ExternalLink, QrCode, ReceiptText } from "lucide-react";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import { Field, FormError, Input } from "#/components/ui/field";
import { Tag } from "#/components/ui/tag";
import { errorMessage } from "#/lib/api/error-message";
import { createBillingCheckout } from "#/lib/api/gen/clients/createBillingCheckout";
import { createBillingPortal } from "#/lib/api/gen/clients/createBillingPortal";
import { createStripeAccountLink } from "#/lib/api/gen/clients/createStripeAccountLink";
import { putWooviConnect } from "#/lib/api/gen/clients/putWooviConnect";
import { useGetBillingStatus } from "#/lib/api/gen/hooks/useGetBillingStatus";
import {
  getConnectStatusQueryKey,
  useGetConnectStatus,
} from "#/lib/api/gen/hooks/useGetConnectStatus";
import { longDate } from "#/lib/format";

export const Route = createFileRoute("/gestao/$slug/recebimento")({
  // o onboarding do Stripe volta para cá com ?connect=ok|refresh
  validateSearch: (search: Record<string, unknown>): { connect?: "ok" | "refresh" } =>
    search.connect === "ok" || search.connect === "refresh" ? { connect: search.connect } : {},
  component: PaymentsAdmin,
});

/**
 * Recebimento + assinatura numa tela só: é a parte mais sensível para quem não é do
 * mundo digital, então cada bloco diz o que é, o estado atual e um único botão.
 */
function PaymentsAdmin() {
  const { slug } = Route.useParams();
  const { connect } = Route.useSearch();
  return (
    <div className="grid gap-6">
      {connect && (
        <output className="card block p-4 text-sm">
          {connect === "ok"
            ? "Cadastro enviado. A confirmação pode levar alguns minutos — esta página mostra o estado atual da sua conta."
            : "O cadastro não foi concluído. Você pode continuar de onde parou pelo botão abaixo."}
        </output>
      )}
      <div>
        <h2 className="font-bold font-display text-lg tracking-tight">
          Recebimento das suas vendas
        </h2>
        <p className="mt-0.5 text-muted text-sm">Para onde vai o dinheiro de quem compra ou doa.</p>
      </div>

      <FeeNote slug={slug} />
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <PixBlock slug={slug} />
        <CardBlock slug={slug} />
      </div>

      <div className="rule pt-6">
        <h2 className="font-bold font-display text-lg tracking-tight">
          Sua assinatura da plataforma
        </h2>
        <p className="mt-0.5 text-muted text-sm">
          Separada das vendas: é o que mantém a loja no ar.
        </p>
      </div>
      <BillingBlock slug={slug} />
    </div>
  );
}

function PixBlock({ slug }: { slug: string }) {
  const { queryClient } = useRouter().options.context;
  const { data: connect } = useGetConnectStatus(slug);
  const [pixKey, setPixKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const connected = Boolean(connect?.woovi.connected);

  async function save() {
    if (!pixKey.trim()) {
      setError("Digite a chave Pix da conta que vai receber.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await putWooviConnect(slug, { pixKey: pixKey.trim() });
      await queryClient.invalidateQueries({ queryKey: getConnectStatusQueryKey(slug) });
      setSaved(true);
      setPixKey("");
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="card p-5">
      <header className="flex items-center gap-3">
        <span className="inline-grid h-11 w-11 shrink-0 place-items-center rounded-[0.9rem] bg-brand-soft text-brand-deep">
          <QrCode className="h-5 w-5" aria-hidden />
        </span>
        <div>
          <h2 className="font-display font-semibold">Receber por Pix</h2>
          <p className="text-sm text-muted">
            O valor cai na conta da chave, já com a taxa separada.
          </p>
        </div>
        {connected && (
          <Tag tone="brand" className="ml-auto">
            ligado
          </Tag>
        )}
      </header>

      <div className="mt-4 grid gap-3">
        <Field
          label={connected ? "Trocar a chave Pix" : "Chave Pix da loja"}
          htmlFor="pixKey"
          hint="Pode ser CNPJ, e-mail, telefone ou chave aleatória."
          error={undefined}
        >
          <Input
            id="pixKey"
            value={pixKey}
            onChange={(event) => {
              setPixKey(event.target.value);
              setSaved(false);
            }}
            placeholder="chave@exemplo.org"
          />
        </Field>
        <FormError>{error}</FormError>
        {saved && (
          <p className="flex items-center gap-2 text-sm text-brand-deep">
            <Check className="h-4 w-4" aria-hidden /> Chave salva. O Pix já está valendo.
          </p>
        )}
        <Button onClick={save} disabled={saving} className="justify-self-start">
          {saving ? "Salvando…" : "Salvar chave Pix"}
        </Button>
      </div>
    </section>
  );
}

function CardBlock({ slug }: { slug: string }) {
  const { data: connect } = useGetConnectStatus(slug);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const connected = Boolean(connect?.stripe.connected);

  async function openOnboarding() {
    setBusy(true);
    setError(null);
    try {
      const { url } = await createStripeAccountLink(slug);
      window.location.href = url;
    } catch (cause) {
      setError(errorMessage(cause));
      setBusy(false);
    }
  }

  return (
    <section className="card p-5">
      <header className="flex items-center gap-3">
        <span className="inline-grid h-11 w-11 shrink-0 place-items-center rounded-[0.9rem] bg-sky/18 text-sky">
          <CreditCard className="h-5 w-5" aria-hidden />
        </span>
        <div>
          <h2 className="font-display font-semibold">Receber por cartão</h2>
          <p className="text-sm text-muted">
            Cadastro guiado pela Stripe, a empresa que processa o cartão. Tenha o CNPJ e os dados
            bancários à mão.
          </p>
        </div>
        {connected && (
          <Tag tone="brand" className="ml-auto">
            ligado
          </Tag>
        )}
      </header>
      <FormError>{error}</FormError>
      <Button
        onClick={openOnboarding}
        disabled={busy}
        variant={connected ? "secondary" : "primary"}
        className="mt-4"
      >
        {connected ? "Revisar cadastro" : "Começar cadastro"}
        <ExternalLink className="h-4 w-4" aria-hidden />
      </Button>
    </section>
  );
}

const BILLING_LABEL: Record<
  string,
  { text: string; tone: "brand" | "accent" | "neutral" | "danger" }
> = {
  none: { text: "sem assinatura", tone: "neutral" },
  trialing: { text: "em período de testes", tone: "accent" },
  active: { text: "ativa", tone: "brand" },
  past_due: { text: "precisamos atualizar seu pagamento", tone: "danger" },
  incomplete: { text: "pagamento pendente", tone: "accent" },
  canceled: { text: "cancelada", tone: "neutral" },
};

function BillingBlock({ slug }: { slug: string }) {
  const { data: billing } = useGetBillingStatus(slug);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const status = billing?.status ?? "none";
  const meta = BILLING_LABEL[status] ?? { text: status, tone: "neutral" as const };
  const hasSubscription = status !== "none";

  async function open() {
    setBusy(true);
    setError(null);
    try {
      const { url } = hasSubscription
        ? await createBillingPortal(slug)
        : await createBillingCheckout(slug);
      window.location.href = url;
    } catch (cause) {
      setError(errorMessage(cause));
      setBusy(false);
    }
  }

  return (
    <section className="card p-5">
      <header className="flex flex-wrap items-center gap-3">
        <span className="inline-grid h-11 w-11 shrink-0 place-items-center rounded-[0.9rem] bg-sand/35 text-brand-deep">
          <ReceiptText className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-display font-semibold">Assinatura da plataforma</h2>
          <p className="text-sm text-muted">
            Mantém a loja no ar. Quem paga é a loja, nunca quem compra.
          </p>
        </div>
        <Tag tone={meta.tone}>{meta.text}</Tag>
      </header>
      {billing?.currentPeriodEnd && (
        <p className="mt-3 text-sm text-muted">
          {billing.cancelAtPeriodEnd ? "Termina em" : "Renova em"}{" "}
          {longDate(billing.currentPeriodEnd)}.
        </p>
      )}
      <FormError>{error}</FormError>
      <Button
        onClick={open}
        disabled={busy}
        variant={hasSubscription ? "secondary" : "primary"}
        className="mt-4"
      >
        {hasSubscription ? "Gerenciar assinatura" : "Assinar agora"}
        <ExternalLink className="h-4 w-4" aria-hidden />
      </Button>
    </section>
  );
}

/**
 * O diferencial "sem intermediário" dito com honestidade (§27 do brief): o dinheiro não
 * fica parado aqui, e a taxa aparece com o número de verdade — nunca "100% grátis".
 */
function FeeNote({ slug }: { slug: string }) {
  const { data: connect } = useGetConnectStatus(slug);
  const bps = connect?.applicationFeeBps;
  const fee =
    bps === undefined ? null : (bps / 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 });

  return (
    <p className="rounded-[1rem] border border-line bg-surface px-4 py-3 text-[0.95rem]">
      <span className="font-semibold">O pagamento vai direto para a conta da sua loja.</span>{" "}
      <span className="text-muted">
        O dinheiro não fica parado na plataforma.
        {fee ? ` Taxa da plataforma: ${fee}% por venda, descontada na hora.` : ""}
      </span>
    </p>
  );
}
