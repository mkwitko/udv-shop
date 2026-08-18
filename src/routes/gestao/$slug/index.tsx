import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Check, Copy, HandCoins, Plus } from "lucide-react";
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
import { publicRequest } from "#/lib/api/public";
import { money } from "#/lib/format";
import { siteUrl } from "#/lib/seo";

export const Route = createFileRoute("/gestao/$slug/")({
  component: Overview,
});

/**
 * A home da gestão é orientada a tarefas (§25 do brief): primeiro o que a pessoa
 * quer fazer, depois quanto falta para a loja estar pronta.
 */
function Overview() {
  const { slug } = Route.useParams();
  const { data: connect } = useGetConnectStatus(slug);
  const { data: billing } = useGetBillingStatus(slug);
  const { data: products } = useListProducts(slug, { limit: 1 }, { client: publicRequest });
  const { data: stores } = useListMyStores();
  const role = stores?.items.find((candidate) => candidate.slug === slug)?.role;
  const canSeePayouts = role === "owner" || role === "admin";
  const { data: payouts } = useListPayouts(slug, { query: { enabled: canSeePayouts } });
  // só o que está em aberto: crédito com um parceiro não abate a dívida com outro
  const owedCents = (payouts?.items ?? []).reduce(
    (sum, row) => sum + Math.max(0, row.balanceCents),
    0,
  );

  const hasPayment = Boolean(connect?.stripe.connected || connect?.woovi.connected);
  const hasProduct = (products?.items.length ?? 0) > 0;
  const billingOk = billing?.status === "active" || billing?.status === "trialing";

  type Step = {
    done: boolean;
    label: string;
    to: "/gestao/$slug/produtos" | "/gestao/$slug/recebimento" | null;
    why?: string;
    cta?: string;
  };
  const steps: Step[] = [
    { done: true, label: "Criar conta e loja", to: null },
    {
      done: hasProduct,
      label: "Adicionar um produto",
      to: "/gestao/$slug/produtos",
      why: "Sem produto na vitrine, quem abre o link não tem o que comprar.",
      cta: "Adicionar produto",
    },
    {
      done: hasPayment,
      label: "Configurar recebimento",
      to: "/gestao/$slug/recebimento",
      why: "É onde o dinheiro cai: sua chave Pix ou sua conta de pagamentos.",
      cta: "Configurar recebimento",
    },
    {
      done: billingOk,
      label: "Ativar assinatura",
      to: "/gestao/$slug/recebimento",
      why: "A assinatura mantém a loja no ar e libera as vendas.",
      cta: "Ver assinatura",
    },
  ];
  const pct = Math.round((steps.filter((s) => s.done).length / (steps.length + 1)) * 100);
  // uma coisa por vez (§13): a home diz o próximo passo, não a lista de pendências
  const next = steps.find((step) => !step.done);

  const storeUrl = `${siteUrl()}/loja/${slug}`;

  return (
    <div className="grid gap-8">
      {/* próximo passo: onboarding contextual, não tutorial */}
      <section className="card p-5 md:p-6">
        <p className="kicker">{next ? "Próximo passo" : "Tudo certo por aqui"}</p>
        <h2 className="mt-2 font-bold font-display text-xl tracking-tight md:text-2xl">
          {next ? next.label : "Compartilhe sua loja"}
        </h2>
        <p className="mt-2 max-w-[52ch] text-muted">
          {next
            ? next.why
            : "Mais pessoas podem conhecer seus produtos e campanhas. Mande o link no grupo."}
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          {next?.to ? (
            <Button asChild>
              <Link to={next.to} params={{ slug }}>
                {next.cta}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </Button>
          ) : (
            <ShareButton
              title="Minha loja"
              path={`/loja/${slug}`}
              label="Compartilhar loja"
              variant="primary"
            />
          )}
        </div>
      </section>

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

        {/* quanto falta */}
        {pct < 100 && (
          <section className="card p-5 md:p-6">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-bold font-display text-lg tracking-tight">
                Sua loja está {pct}% pronta
              </h2>
              <p className="text-muted text-sm tabular-nums">{pct}%</p>
            </div>
            <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-surface">
              <div
                className="progress-fill h-full rounded-full bg-brand"
                style={{ width: `${pct}%` }}
              />
            </div>
            <ul className="mt-5 grid gap-2.5">
              {steps.map((step) => (
                <li key={step.label} className="flex items-center gap-3 text-[0.95rem]">
                  <span
                    className={`inline-grid h-6 w-6 shrink-0 place-items-center rounded-full ${
                      step.done
                        ? "bg-success text-white"
                        : "border border-line-strong text-transparent"
                    }`}
                  >
                    <Check className="h-3.5 w-3.5" aria-hidden />
                  </span>
                  {step.to && !step.done ? (
                    <Link
                      to={step.to}
                      params={{ slug }}
                      className="inline-flex items-center gap-1.5 font-medium text-ink hover:text-brand-deep"
                    >
                      {step.label}
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                    </Link>
                  ) : (
                    <span className={step.done ? "text-muted line-through" : ""}>{step.label}</span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        <ShareCard storeUrl={storeUrl} />
      </div>
    </div>
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
