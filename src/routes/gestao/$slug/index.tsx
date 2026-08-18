import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Check, Copy, Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import {
  GlyphBilhete,
  GlyphCampanha,
  GlyphCoracao,
  GlyphPix,
  GlyphSacola,
} from "#/components/ui/glyphs";
import { useGetBillingStatus } from "#/lib/api/gen/hooks/useGetBillingStatus";
import { useGetConnectStatus } from "#/lib/api/gen/hooks/useGetConnectStatus";
import { useListProducts } from "#/lib/api/gen/hooks/useListProducts";
import { publicRequest } from "#/lib/api/public";
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

  const hasPayment = Boolean(connect?.stripe.connected || connect?.woovi.connected);
  const hasProduct = (products?.items.length ?? 0) > 0;
  const billingOk = billing?.status === "active" || billing?.status === "trialing";

  const steps = [
    { done: true, label: "Criar conta e loja" },
    { done: hasProduct, label: "Cadastrar o primeiro produto", to: "/gestao/$slug/produtos" },
    { done: hasPayment, label: "Configurar recebimento", to: "/gestao/$slug/recebimento" },
    { done: billingOk, label: "Ativar assinatura", to: "/gestao/$slug/recebimento" },
    { done: false, label: "Compartilhar a loja" },
  ];
  const pct = Math.round((steps.filter((s) => s.done).length / steps.length) * 100);

  const storeUrl = `${siteUrl()}/loja/${slug}`;

  return (
    <div className="grid max-w-2xl gap-8">
      {/* o que você quer fazer hoje */}
      <section>
        <h2 className="font-bold font-display text-xl tracking-tight">
          O que você quer fazer hoje?
        </h2>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <ActionCard to="/gestao/$slug/produtos" slug={slug} label="Adicionar produto">
            <Plus className="h-5 w-5" aria-hidden />
          </ActionCard>
          <ActionCard to="/gestao/$slug/pedidos" slug={slug} label="Ver pedidos">
            <GlyphSacola className="h-5 w-5" />
          </ActionCard>
          <ActionCard to="/gestao/$slug/campanhas" slug={slug} label="Criar campanha">
            <GlyphCampanha className="h-5 w-5" />
          </ActionCard>
          <ActionCard to="/gestao/$slug/doacoes" slug={slug} label="Ver doações">
            <GlyphCoracao className="h-5 w-5" />
          </ActionCard>
          <ActionCard to="/gestao/$slug/recebimento" slug={slug} label="Recebimento">
            <GlyphPix className="h-5 w-5" />
          </ActionCard>
          <ActionCard to="/gestao/$slug/campanhas" slug={slug} label="Sorteios">
            <GlyphBilhete className="h-5 w-5" />
          </ActionCard>
        </div>
      </section>

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
  );
}

function ActionCard({
  to,
  slug,
  label,
  children,
}: {
  to: string;
  slug: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      params={{ slug }}
      className="card card-hover flex min-h-24 flex-col justify-between gap-3 p-4"
    >
      <span className="inline-grid h-10 w-10 place-items-center rounded-[0.8rem] bg-brand-soft text-brand-deep">
        {children}
      </span>
      <span className="font-semibold text-sm leading-tight">{label}</span>
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
        <Button variant={copied ? "secondary" : "primary"} onClick={copy} className="shrink-0">
          {copied ? (
            <>
              <Check className="h-4 w-4" aria-hidden /> Copiado!
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" aria-hidden /> Copiar link
            </>
          )}
        </Button>
      </div>
    </section>
  );
}
