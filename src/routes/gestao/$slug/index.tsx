import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Check, Copy, HandCoins, Loader2, Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import {
  GlyphBilhete,
  GlyphCampanha,
  GlyphCoracao,
  GlyphPix,
  GlyphSacola,
} from "#/components/ui/glyphs";
import { ShareButton } from "#/components/ui/share-button";
import { useGetBillingStatus } from "#/lib/api/gen/hooks/useGetBillingStatus";
import { useGetConnectStatus } from "#/lib/api/gen/hooks/useGetConnectStatus";
import { useListMyStores } from "#/lib/api/gen/hooks/useListMyStores";
import { useListPayouts } from "#/lib/api/gen/hooks/useListPayouts";
import { useListProducts } from "#/lib/api/gen/hooks/useListProducts";
import { money } from "#/lib/format";
import { siteUrl } from "#/lib/seo";

export const Route = createFileRoute("/gestao/$slug/")({
  component: Overview,
});

type Step = {
  done: boolean;
  label: string;
  to: "/gestao/$slug/produtos" | "/gestao/$slug/recebimento" | null;
  /** O que é e por que importa, em uma frase, para quem nunca vendeu on-line. */
  why: string;
  cta?: string;
  /** Passo esperando o servidor, não a pessoa: aparece em andamento, sem botão. */
  waiting?: boolean;
};

/**
 * A home da gestão é orientada a tarefas (§25 do brief): primeiro o que a pessoa
 * quer fazer, depois quanto falta para a loja estar pronta.
 */
function Overview() {
  const { slug } = Route.useParams();
  const { data: connect } = useGetConnectStatus(slug);
  const { data: billing } = useGetBillingStatus(slug);
  const billingOk = billing?.status === "active" || billing?.status === "trialing";
  // cliente autenticado de propósito: a listagem pública devolve 404 em loja `pending`,
  // e era isso que deixava "Adicionar um produto" pendente para sempre depois de cadastrar.
  const { data: products } = useListProducts(slug, { limit: 1 });
  const { data: stores } = useListMyStores({
    query: {
      // Quem libera a loja é o webhook da assinatura, não esta tela. Sem o repique, a
      // pessoa paga e continua vendo "sua loja ainda não está no ar" até dar F5.
      refetchInterval: (query) =>
        billingOk &&
        query.state.data?.items.some(
          (candidate) => candidate.slug === slug && candidate.status !== "active",
        )
          ? 5000
          : false,
    },
  });
  const myStore = stores?.items.find((candidate) => candidate.slug === slug);
  const role = myStore?.role;
  const canSeePayouts = role === "owner" || role === "admin";
  const { data: payouts } = useListPayouts(slug, { query: { enabled: canSeePayouts } });
  // só o que está em aberto: crédito com um parceiro não abate a dívida com outro
  const owedCents = (payouts?.items ?? []).reduce(
    (sum, row) => sum + Math.max(0, row.balanceCents),
    0,
  );

  const hasPayment = Boolean(connect?.stripe.connected || connect?.woovi.connected);
  const hasProduct = (products?.items.length ?? 0) > 0;
  const storeStatus = myStore?.status;
  const onAir = storeStatus === "active";
  const suspendedByPlatform =
    storeStatus === "suspended" && myStore?.suspensionReason === "platform";

  const steps: Step[] = [
    {
      done: true,
      label: "Criar sua conta e sua loja",
      to: null,
      why: "Feito. O nome e o endereço da loja já são seus.",
    },
    {
      done: hasProduct,
      label: "Cadastrar o primeiro produto",
      to: "/gestao/$slug/produtos",
      why: "Uma foto, um nome e o preço bastam. Sem produto, quem abre o link não tem o que comprar.",
      cta: "Cadastrar produto",
    },
    {
      done: hasPayment,
      label: "Dizer para onde vai o dinheiro",
      to: "/gestao/$slug/recebimento",
      why: "Sua chave Pix ou sua conta de cartão. O dinheiro das vendas cai direto aí, sem passar pela plataforma.",
      cta: "Configurar recebimento",
    },
    {
      done: billingOk,
      label: "Ativar a assinatura da plataforma",
      to: "/gestao/$slug/recebimento",
      why: "É a mensalidade da loja — paga por você, nunca por quem compra. Ativar a assinatura já abre a loja.",
      cta: "Ativar assinatura",
    },
    // A liberação não é um passo manual de ninguém: sai do próprio pagamento. O passo
    // existe para a pessoa entender por que a vitrine pública ainda não mostra a loja.
    {
      done: onAir,
      label: onAir ? "Loja no ar" : "Abrir a loja para o público",
      to: billingOk ? null : "/gestao/$slug/recebimento",
      waiting: billingOk && !onAir && !suspendedByPlatform,
      cta: billingOk ? undefined : "Ativar assinatura",
      why: onAir
        ? "Sua loja está aberta: qualquer pessoa com o link já consegue comprar e doar."
        : suspendedByPlatform
          ? "A loja está fora do ar por decisão da plataforma. Fale com a equipe da Colheita para saber o que precisa mudar."
          : billingOk
            ? "Pagamento confirmado. A abertura é automática e leva alguns minutos — esta página avisa sozinha."
            : storeStatus === "suspended"
              ? "A loja saiu do ar quando a assinatura parou. Retomando o pagamento ela volta sozinha, sem perder nada."
              : "A loja abre sozinha assim que a assinatura estiver ativa. Até lá, só quem é da loja consegue abrir as páginas dela.",
    },
  ];
  // sobre o total de passos, sem `+1`: com o denominador inflado a barra travava em 80%
  // mesmo com tudo pronto, e a loja ficava eternamente "quase lá".
  const pct = Math.round((steps.filter((s) => s.done).length / steps.length) * 100);
  // uma coisa por vez (§13): a home diz o próximo passo, não a lista de pendências
  const next = steps.find((step) => !step.done);

  const storeUrl = `${siteUrl()}/loja/${slug}`;

  return (
    <div className="grid gap-8">
      {/* Com a loja pronta, o cartão de topo é o convite a divulgar. Enquanto não está, o
          guia abaixo já é o "próximo passo" — os dois juntos repetiam o mesmo texto e o
          mesmo botão em sequência, e dois botões iguais leem como dois passos diferentes. */}
      {!next && (
        <section className="card p-5 md:p-6">
          <p className="kicker">Tudo certo por aqui</p>
          <h2 className="mt-2 font-bold font-display text-xl tracking-tight md:text-2xl">
            Compartilhe sua loja
          </h2>
          <p className="mt-2 max-w-[52ch] text-muted">
            Mais pessoas podem conhecer seus produtos e campanhas. Mande o link no grupo.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <ShareButton
              title="Minha loja"
              path={`/loja/${slug}`}
              label="Compartilhar loja"
              variant="primary"
            />
          </div>
        </section>
      )}

      {/* guia de abertura: fica acima das ações enquanto a loja não está pronta, porque
          quem chega aqui pela primeira vez não sabe o que vem antes do quê */}
      {next && <StartGuide steps={steps} pct={pct} slug={slug} nextLabel={next.label} />}

      {/* o que você quer fazer hoje */}
      <section>
        <h2 className="font-bold font-display text-xl tracking-tight">
          O que você quer fazer hoje?
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <ActionCard
            to="/gestao/$slug/produtos"
            slug={slug}
            label="Adicionar produto"
            hint="Foto, preço, pronto"
            tone="brand"
          >
            <Plus className="h-5 w-5" aria-hidden />
          </ActionCard>
          <ActionCard
            to="/gestao/$slug/pedidos"
            slug={slug}
            label="Ver pedidos"
            hint="Quem comprou e quando"
            tone="sky"
          >
            <GlyphSacola className="h-5 w-5" />
          </ActionCard>
          <ActionCard
            to="/gestao/$slug/campanhas"
            slug={slug}
            label="Criar campanha"
            hint="Arrecadar com meta"
            tone="coral"
          >
            <GlyphCampanha className="h-5 w-5" />
          </ActionCard>
          <ActionCard
            to="/gestao/$slug/doacoes"
            slug={slug}
            label="Ver doações"
            hint="Quem apoiou sua loja"
            tone="plum"
          >
            <GlyphCoracao className="h-5 w-5" />
          </ActionCard>
          <ActionCard
            to="/gestao/$slug/recebimento"
            slug={slug}
            label="Recebimento"
            hint="Pix e assinatura"
            tone="sand"
          >
            <GlyphPix className="h-5 w-5" />
          </ActionCard>
          <ActionCard
            to="/gestao/$slug/campanhas"
            slug={slug}
            label="Sorteios"
            hint="Números da sorte"
            tone="lavender"
          >
            <GlyphBilhete className="h-5 w-5" />
          </ActionCard>
          {canSeePayouts && (
            <ActionCard
              to="/gestao/$slug/repasses"
              slug={slug}
              label="Repasses"
              hint="Quanto devolver a quem faz"
              tone="sand"
            >
              <HandCoins className="h-5 w-5" aria-hidden />
            </ActionCard>
          )}
        </div>
      </section>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        {/* dinheiro que já é de outra pessoa aparece antes do resto */}
        {canSeePayouts && owedCents > 0 && (
          <section className="card p-5 md:p-6">
            <p className="kicker">A repassar</p>
            <p className="mt-2 font-bold font-display text-2xl tabular-nums">{money(owedCents)}</p>
            <p className="mt-2 max-w-[46ch] text-muted">
              Parte do que suas vendas geraram é de quem faz os produtos. Registre aqui quando
              pagar.
            </p>
            <Button variant="secondary" className="mt-4" asChild>
              <Link to="/gestao/$slug/repasses" params={{ slug }}>
                Ver repasses
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </Button>
          </section>
        )}

        <ShareCard storeUrl={storeUrl} />
      </div>
    </div>
  );
}

/**
 * O caminho todo, em ordem, com o porquê de cada passo escrito para quem não é do mundo
 * digital. Um botão por vez: só o passo atual tem ação, os seguintes ficam legíveis mas
 * quietos — lista com cinco botões faz a pessoa escolher errado e travar.
 */
function StartGuide({
  steps,
  pct,
  slug,
  nextLabel,
}: {
  steps: Step[];
  pct: number;
  slug: string;
  nextLabel?: string;
}) {
  return (
    <section className="card p-5 md:p-6">
      <p className="kicker">Para abrir sua loja</p>
      <div className="mt-2 flex items-baseline justify-between gap-3">
        <h2 className="font-bold font-display text-lg tracking-tight md:text-xl">
          Sua loja está {pct}% pronta
        </h2>
        <p className="text-muted text-sm tabular-nums">{pct}%</p>
      </div>
      <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-surface">
        <div className="progress-fill h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
      </div>

      <ol className="mt-6 grid gap-5">
        {steps.map((step, index) => {
          const current = step.label === nextLabel;
          return (
            <li key={step.label} className="flex gap-3.5">
              <span
                aria-hidden
                className={`inline-grid h-7 w-7 shrink-0 place-items-center rounded-full font-semibold text-xs tabular-nums ${
                  step.done
                    ? "bg-success text-white"
                    : current
                      ? "bg-brand text-white"
                      : "border border-line-strong text-muted"
                }`}
              >
                {step.done ? <Check className="h-4 w-4" /> : index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p
                  className={`font-semibold text-[0.98rem] leading-tight ${
                    step.done ? "text-muted" : "text-ink"
                  }`}
                >
                  {step.label}
                  {step.done && <span className="sr-only"> (concluído)</span>}
                </p>
                {/* o porquê só aparece onde ajuda: no passo atual e nos que ainda vêm */}
                {!step.done && <p className="mt-1 max-w-[52ch] text-muted text-sm">{step.why}</p>}
                {current && step.to && (
                  <Button className="mt-3" asChild>
                    <Link to={step.to} params={{ slug }}>
                      {step.cta}
                      <ArrowRight className="h-4 w-4" aria-hidden />
                    </Link>
                  </Button>
                )}
                {current && step.waiting && (
                  <p className="mt-2 inline-flex items-center gap-2 text-brand-deep text-sm">
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    Confirmando com o banco…
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      <p className="mt-6 border-line border-t pt-4 text-muted text-sm">
        Travou em algum passo? Fale com quem te convidou para a Colheita — dá para retomar de onde
        parou, nada do que você cadastrou é perdido.
      </p>
    </section>
  );
}

const TILE_TONES = {
  brand: "bg-brand-soft text-brand-deep",
  coral: "bg-coral/18 text-coral",
  plum: "bg-plum/15 text-plum",
  lavender: "bg-lavender/18 text-lavender",
  sky: "bg-sky/18 text-sky",
  sand: "bg-sand/35 text-brand-deep",
} as const;

function ActionCard({
  to,
  slug,
  label,
  hint,
  tone,
  children,
}: {
  to: string;
  slug: string;
  label: string;
  hint: string;
  tone: keyof typeof TILE_TONES;
  children: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      params={{ slug }}
      className="card card-hover group flex min-h-[4.5rem] items-center gap-4 p-4"
    >
      <span
        className={`inline-grid h-11 w-11 shrink-0 place-items-center rounded-[0.9rem] transition-transform [transition-duration:var(--dur)] group-hover:scale-110 ${TILE_TONES[tone]}`}
      >
        {children}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-sm leading-tight">{label}</span>
        <span className="mt-0.5 block truncate text-muted text-xs">{hint}</span>
      </span>
      <ArrowRight
        className="h-4 w-4 shrink-0 text-muted opacity-0 transition-all [transition-duration:var(--dur)] group-hover:translate-x-0.5 group-hover:text-brand-deep group-hover:opacity-100"
        aria-hidden
      />
    </Link>
  );
}

function ShareCard({ storeUrl }: { storeUrl: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(storeUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // sem clipboard: o endereço fica visível para copiar na mão
    }
  }

  return (
    <section className="card p-5 md:p-6">
      <h2 className="font-bold font-display text-lg tracking-tight">Divulgue sua loja</h2>
      <p className="mt-1 text-muted text-sm">
        Este é o endereço da sua loja. Mande no grupo, cole na bio, imprima no cartaz.
      </p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <p className="min-w-0 flex-1 truncate rounded-full border border-line bg-surface px-4 py-3 text-ink text-sm">
          {storeUrl}
        </p>
        <Button variant="secondary" onClick={copy} className="shrink-0">
          {copied ? (
            <>
              <Check className="h-4 w-4" aria-hidden /> Link copiado
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" aria-hidden /> Copiar link
            </>
          )}
        </Button>
        <ShareButton
          title="Minha loja"
          path={new URL(storeUrl).pathname}
          label="Compartilhar"
          variant="primary"
          className="shrink-0"
        />
      </div>
    </section>
  );
}
