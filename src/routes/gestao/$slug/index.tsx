import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Check, Copy } from "lucide-react";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import { useGetBillingStatus } from "#/lib/api/gen/hooks/useGetBillingStatus";
import { useGetConnectStatus } from "#/lib/api/gen/hooks/useGetConnectStatus";
import { useListProducts } from "#/lib/api/gen/hooks/useListProducts";
import { publicRequest } from "#/lib/api/public";
import { siteUrl } from "#/lib/seo";

export const Route = createFileRoute("/gestao/$slug/")({
  component: Overview,
});

/**
 * Resumo = lista de próximos passos. Quem abre o painel pela primeira vez precisa
 * saber o que falta para vender, não ver gráfico vazio.
 */
function Overview() {
  const { slug } = Route.useParams();
  const { data: connect } = useGetConnectStatus(slug);
  const { data: billing } = useGetBillingStatus(slug);
  const { data: products } = useListProducts(slug, { limit: 1 }, { client: publicRequest });

  const hasPayment = Boolean(connect?.stripe.connected || connect?.woovi.connected);
  const hasProduct = (products?.items.length ?? 0) > 0;
  const billingOk = billing?.status === "active" || billing?.status === "trialing";

  const storeUrl = `${siteUrl()}/loja/${slug}`;

  return (
    <div className="grid max-w-2xl gap-6">
      <section className="grid gap-3">
        <h2 className="font-display text-lg font-semibold tracking-tight">
          O que falta para vender
        </h2>

        <StepCard
          done={hasPayment}
          title="Ligar o recebimento"
          body="Conecte a conta de cartão ou a chave Pix. Sem isso, ninguém consegue pagar."
          to="/gestao/$slug/recebimento"
          slug={slug}
          cta="Configurar"
        />
        <StepCard
          done={hasProduct}
          title="Cadastrar o primeiro produto"
          body="Foto, preço e uma boa descrição. Dá para começar com um só."
          to="/gestao/$slug/produtos"
          slug={slug}
          cta="Cadastrar"
        />
        <StepCard
          done={billingOk}
          title="Ativar a assinatura da plataforma"
          body="É ela que mantém sua loja no ar depois do período de testes."
          to="/gestao/$slug/recebimento"
          slug={slug}
          cta="Ver assinatura"
        />
      </section>

      <ShareCard storeUrl={storeUrl} />
    </div>
  );
}

function StepCard({
  done,
  title,
  body,
  to,
  slug,
  cta,
}: {
  done: boolean;
  title: string;
  body: string;
  to: string;
  slug: string;
  cta: string;
}) {
  return (
    <div className="card flex items-start gap-4 p-5">
      <span
        className={`mt-0.5 inline-grid h-7 w-7 shrink-0 place-items-center rounded-full ${
          done ? "bg-brand text-brand-ink" : "border border-line-strong text-transparent"
        }`}
      >
        <Check className="h-4 w-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <h3 className={`font-medium ${done ? "text-muted line-through" : ""}`}>{title}</h3>
        {!done && <p className="mt-1 text-sm text-muted">{body}</p>}
      </div>
      {!done && (
        <Button asChild size="sm" variant="secondary" className="shrink-0">
          <Link to={to} params={{ slug }}>
            {cta}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </Button>
      )}
    </div>
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
    <section className="card p-5">
      <h2 className="font-display text-lg font-semibold tracking-tight">Divulgue sua loja</h2>
      <p className="mt-1 text-sm text-muted">
        Este é o endereço da sua loja. Mande no grupo, cole na bio, imprima no cartaz.
      </p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <p className="min-w-0 flex-1 truncate rounded-md border border-line bg-surface px-3.5 py-2.5 text-sm text-ink">
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
