import { createFileRoute, useRouter } from "@tanstack/react-router";
import { Check, CreditCard, ExternalLink, QrCode, ReceiptText } from "lucide-react";
import { type ReactNode, useState } from "react";
import { StripeConnectEmbedded } from "#/components/stripe-connect-embedded";
import { Button } from "#/components/ui/button";
import { Field, FormError, Input } from "#/components/ui/field";
import { Tag } from "#/components/ui/tag";
import { useToast } from "#/components/ui/toast";
import { errorMessage } from "#/lib/api/error-message";
import { createBillingCheckout } from "#/lib/api/gen/clients/createBillingCheckout";
import { createBillingPortal } from "#/lib/api/gen/clients/createBillingPortal";
import { createStripeAccountLink } from "#/lib/api/gen/clients/createStripeAccountLink";
import { createStripeDashboardLink } from "#/lib/api/gen/clients/createStripeDashboardLink";
import { putWooviConnect } from "#/lib/api/gen/clients/putWooviConnect";
import { withdrawWoovi } from "#/lib/api/gen/clients/withdrawWoovi";
import { useGetBillingStatus } from "#/lib/api/gen/hooks/useGetBillingStatus";
import {
  getConnectStatusQueryKey,
  useGetConnectStatus,
} from "#/lib/api/gen/hooks/useGetConnectStatus";
import {
  getWooviBalanceQueryKey,
  useGetWooviBalance,
} from "#/lib/api/gen/hooks/useGetWooviBalance";
import { longDate, money } from "#/lib/format";
import { stripePublishableKey } from "#/lib/pay/stripe";
import { cn } from "#/lib/utils";

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
      <div className="grid gap-6 lg:grid-cols-2">
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

/**
 * Casca dos dois cards de recebimento. Existe para eles ficarem alinhados de verdade:
 * mesma altura (`h-full` + grid que estica), corpo que cresce e AÇÃO ancorada no rodapé.
 * Sem isso um card ficava mais alto que o outro e os botões desalinhavam, porque a
 * altura vinha do tamanho do texto de cada um. Com os dois na mesma altura, o `mt-auto`
 * do rodapé já alinha os botões — não é preciso reservar linha no subtítulo.
 */
function PaymentCard({
  icon,
  iconClass,
  title,
  subtitle,
  badge,
  children,
  actions,
}: {
  icon: ReactNode;
  iconClass: string;
  title: string;
  subtitle: string;
  badge?: ReactNode;
  children?: ReactNode;
  actions: ReactNode;
}) {
  return (
    <section className="card flex h-full flex-col p-5">
      <header className="flex items-start gap-3">
        <span
          className={cn(
            "inline-grid h-11 w-11 shrink-0 place-items-center rounded-[0.9rem]",
            iconClass,
          )}
        >
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display font-semibold">{title}</h2>
            {badge}
          </div>
          <p className="mt-0.5 text-muted text-sm">{subtitle}</p>
        </div>
      </header>

      {children ? <div className="mt-4 grid gap-3">{children}</div> : null}

      <div className="mt-auto pt-4">{actions}</div>
    </section>
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
    <PaymentCard
      icon={<QrCode className="h-5 w-5" aria-hidden />}
      iconClass="bg-brand-soft text-brand-deep"
      title="Receber por Pix"
      subtitle="Cai na hora, na chave que você cadastrar. Sem nada descontado da venda."
      badge={connected ? <Tag tone="brand">ligado</Tag> : undefined}
      actions={
        <Button onClick={save} disabled={saving}>
          {saving ? "Salvando…" : connected ? "Salvar nova chave" : "Salvar chave Pix"}
        </Button>
      }
    >
      {/* dizer só "ligado" não bastava: a loja precisa conferir QUAL chave recebe o
            dinheiro. A API devolve a chave parcial — a inteira não trafega.
            Texto solto, sem moldura: numa caixa cinza logo acima do campo de chave, isso
            era lido como um input desabilitado. */}
      {connected && connect?.woovi.pixKeyMasked && (
        <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
          <span className="text-muted">Recebendo na chave</span>
          <span className="font-medium tabular-nums">{connect.woovi.pixKeyMasked}</span>
        </p>
      )}

      {connected && <PixSaldo slug={slug} />}

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
        <p className="flex items-center gap-2 text-brand-deep text-sm">
          <Check className="h-4 w-4" aria-hidden /> Chave salva. O Pix já está valendo.
        </p>
      )}
    </PaymentCard>
  );
}

/**
 * Saldo Pix que ainda está na conta da plataforma. Existe porque split para subconta
 * Woovi é saldo VIRTUAL: o valor só sai daqui no saque. O saque roda sozinho a cada Pix
 * confirmado, então normalmente isto mostra zero — o botão é para quando sobra saldo
 * (falha no automático, ou dinheiro que entrou antes disso existir).
 */
function PixSaldo({ slug }: { slug: string }) {
  const { queryClient } = useRouter().options.context;
  const toast = useToast();
  const { data, isPending } = useGetWooviBalance(slug);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isPending || !data?.available) return null;

  const saldo = data.balanceCents;
  // Zero é o estado normal (o saque roda a cada Pix confirmado). Mostrar "R$ 0,00" com
  // texto explicando que não há nada só ocupa espaço — aparece quando há dinheiro parado
  // ou quando a Woovi travou o saque, que é quando a loja precisa saber.
  if (saldo === 0 && !data.withdrawBlocked) return null;

  async function sacar() {
    setBusy(true);
    setError(null);
    try {
      const result = await withdrawWoovi(slug);
      if (result.status === "requested") {
        toast(`Saque de ${money(result.balanceCents)} pedido. Cai na sua chave Pix.`);
      } else if (result.status === "empty") {
        toast("Não havia saldo para sacar.");
      } else {
        setError(
          "A Woovi bloqueou o saque desta subconta. Fale com quem cuida da plataforma — o dinheiro não foi perdido.",
        );
      }
      await queryClient.invalidateQueries({ queryKey: getWooviBalanceQueryKey(slug) });
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-2 rounded-[0.9rem] border border-line bg-surface px-3.5 py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-muted text-sm">Saldo Pix a caminho</span>
        <span className="font-bold font-display tabular-nums">{money(saldo)}</span>
      </div>
      <p className="text-muted text-xs">
        {data.withdrawBlocked
          ? "A Woovi bloqueou o saque desta subconta. Fale com quem cuida da plataforma."
          : "O saque acontece sozinho a cada Pix recebido. Se preferir, force agora."}
      </p>
      {!data.withdrawBlocked && (
        <Button
          variant="secondary"
          size="sm"
          className="justify-self-start"
          disabled={busy}
          onClick={sacar}
        >
          {busy ? "Sacando…" : "Sacar para minha chave"}
        </Button>
      )}
      <FormError>{error}</FormError>
    </div>
  );
}

function CardBlock({ slug }: { slug: string }) {
  const { data: connect, refetch } = useGetConnectStatus(slug);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [onboarding, setOnboarding] = useState(false);
  const [embeddedFailed, setEmbeddedFailed] = useState(false);
  // Sem chave publicável não há componente embutido: sobra o fluxo hospedado, que é o
  // mesmo de antes. Serve para ambiente sem Stripe configurado — e para quando o
  // embutido falha em montar, caso em que o hospedado é o caminho que ainda funciona.
  const embedded = stripePublishableKey() !== "" && !embeddedFailed;
  const connected = Boolean(connect?.stripe.connected);
  // Ter conta na Stripe não é o mesmo que poder receber: até a capability `transfers`
  // ficar ativa a loja não vende no cartão, e dizer "ligado" aqui deixaria o núcleo
  // esperando venda que a API está barrando.
  const ready = Boolean(connect?.stripe.transfersEnabled);

  // A conta é Express: o núcleo não entra em dashboard.stripe.com, entra por um link de
  // uso único que a plataforma gera na hora. Por isso é botão, não href fixo.
  const canOpenDashboard = Boolean(connect?.stripe.detailsSubmitted);

  async function openLink(create: () => Promise<{ url: string }>) {
    setBusy(true);
    setError(null);
    try {
      const { url } = await create();
      window.location.href = url;
    } catch (cause) {
      setError(errorMessage(cause));
      setBusy(false);
    }
  }

  return (
    <PaymentCard
      icon={<CreditCard className="h-5 w-5" aria-hidden />}
      iconClass="bg-sky/18 text-sky"
      title="Receber por cartão"
      subtitle="Cadastro guiado pela Stripe, que processa o pagamento. Tenha CNPJ e dados bancários à mão."
      badge={
        connected ? (
          <Tag tone={ready ? "brand" : "accent"}>{ready ? "ligado" : "cadastro incompleto"}</Tag>
        ) : undefined
      }
      actions={
        <div className="flex flex-wrap gap-2">
          {/* Um destaque por card: com cadastro pendente o que importa é terminá-lo, e
              dois botões laranja lado a lado não diziam qual era o próximo passo. */}
          {canOpenDashboard && (
            <Button
              onClick={() => openLink(() => createStripeDashboardLink(slug))}
              disabled={busy}
              variant={ready ? "primary" : "secondary"}
            >
              Abrir painel de recebimentos
              <ExternalLink className="h-4 w-4" aria-hidden />
            </Button>
          )}
          <Button
            onClick={() =>
              embedded ? setOnboarding(true) : openLink(() => createStripeAccountLink(slug))
            }
            disabled={busy || (embedded && onboarding)}
            variant={ready ? "secondary" : "primary"}
          >
            {ready ? "Revisar cadastro" : connected ? "Continuar cadastro" : "Começar cadastro"}
            {embedded ? null : <ExternalLink className="h-4 w-4" aria-hidden />}
          </Button>
        </div>
      }
    >
      {connected && !ready && (
        <p className="text-muted text-sm">
          A Stripe ainda está conferindo os dados da loja. Enquanto isso o cartão fica indisponível
          na sua página — volte ao cadastro para ver o que falta.
        </p>
      )}
      <FormError>{error}</FormError>
      {/* Só monta depois de conta existir ou de o núcleo pedir o cadastro: a rota da
          sessão cria a conta conectada, e montar sozinho criaria conta para quem nunca
          pediu. */}
      {embedded && (connected || onboarding) && (
        <StripeConnectEmbedded
          slug={slug}
          showOnboarding={onboarding}
          onExit={() => {
            setOnboarding(false);
            void refetch();
          }}
          onLoadError={() => {
            setEmbeddedFailed(true);
            setOnboarding(false);
          }}
        />
      )}
    </PaymentCard>
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
  // Zero é o normal agora: a plataforma vive da mensalidade, não de comissão. Dizer
  // "taxa de 0%" faria a pessoa procurar a taxa que não existe.
  const fee =
    bps === undefined || bps === 0
      ? null
      : (bps / 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 });

  return (
    <p className="rounded-[1rem] border border-line bg-surface px-4 py-3 text-[0.95rem]">
      <span className="font-semibold">O pagamento vai direto para a conta da sua loja.</span>{" "}
      <span className="text-muted">
        O dinheiro não fica parado na plataforma.
        {fee
          ? ` Taxa da plataforma: ${fee}% por venda, descontada na hora.`
          : // Quem paga o Stripe/Woovi é a plataforma (fees.payer: application, ADR-024 +
            // comissão zero, ADR-027): a loja recebe o valor integral. Dizer que existe a
            // taxa e que ela não sai da venda é mais honesto — e mais forte — que omitir.
            " Cartão e Pix têm taxa de quem processa o pagamento, e ela é paga pela Colheita: não sai da sua venda. Da sua parte, só a mensalidade da plataforma."}
      </span>
    </p>
  );
}
