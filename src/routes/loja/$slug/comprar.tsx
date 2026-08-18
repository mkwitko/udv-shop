import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, CreditCard, Minus, Plus, QrCode } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { RequireSession } from "#/components/auth/require-session";
import { PayChoice } from "#/components/pay/pay-choice";
import { PixPanel } from "#/components/pay/pix-panel";
import { StepHeading } from "#/components/pay/steps";
import { StripePanel } from "#/components/pay/stripe-panel";
import { Button } from "#/components/ui/button";
import { Field, FormError, Input, Textarea } from "#/components/ui/field";
import { errorMessage } from "#/lib/api/error-message";
import { checkout } from "#/lib/api/gen/clients/checkout";
import { useGetMyOrder } from "#/lib/api/gen/hooks/useGetMyOrder";
import { getProductQueryOptions, useGetProduct } from "#/lib/api/gen/hooks/useGetProduct";
import type { Checkout201 } from "#/lib/api/gen/types/Checkout";
import { publicRequest } from "#/lib/api/public";
import { money } from "#/lib/format";
import { stripePublishableKey } from "#/lib/pay/stripe";
import { seo } from "#/lib/seo";

const SearchSchema = z.object({
  produto: z.string().min(1),
  qtd: z.coerce.number().int().min(1).max(99).catch(1),
});

const BuySchema = z.object({
  contactPhone: z
    .string()
    .min(8, "Coloque um telefone com DDD para a loja falar com você")
    .max(20, "Telefone muito longo"),
  note: z.string().max(500).optional(),
});
type BuyForm = z.infer<typeof BuySchema>;

type Provider = "woovi" | "stripe";
type Phase = "form" | "pay" | "done" | "expired";

export const Route = createFileRoute("/loja/$slug/comprar")({
  validateSearch: SearchSchema,
  loaderDeps: ({ search }) => ({ produto: search.produto }),
  loader: ({ context, params, deps }) =>
    context.queryClient.ensureQueryData(
      getProductQueryOptions(params.slug, deps.produto, publicRequest),
    ),
  head: () => seo({ title: "Finalizar compra", description: "", path: "", noIndex: true }),
  component: BuyRoute,
});

function BuyRoute() {
  const { slug } = Route.useParams();
  const search = Route.useSearch();
  return (
    <RequireSession
      redirectTo={`/loja/${slug}/comprar?produto=${search.produto}&qtd=${search.qtd}`}
    >
      <BuyPage />
    </RequireSession>
  );
}

function BuyPage() {
  const { slug } = Route.useParams();
  const search = Route.useSearch();
  const { data: product } = useGetProduct(slug, search.produto, { client: publicRequest });

  const [phase, setPhase] = useState<Phase>("form");
  const [qty, setQty] = useState(search.qtd);
  const [provider, setProvider] = useState<Provider>("woovi");
  const [result, setResult] = useState<Checkout201 | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<BuyForm>({ resolver: zodResolver(BuySchema) });

  // enquanto o Pix ou o cartão está na tela, a página pergunta ao servidor se o
  // pagamento chegou — a pessoa não precisa apertar nada
  const orderId = result?.order.id;
  const { data: liveOrder } = useGetMyOrder(orderId, {
    query: {
      enabled: phase === "pay" && Boolean(orderId),
      refetchInterval: (query) =>
        query.state.data?.status === "pending_payment" || !query.state.data ? 4000 : false,
    },
  });

  useEffect(() => {
    if (phase !== "pay" || !liveOrder) return;
    if (liveOrder.status === "paid") setPhase("done");
    if (liveOrder.status === "cancelled") setPhase("expired");
  }, [phase, liveOrder]);

  if (!product) return null;

  const cardAvailable = Boolean(stripePublishableKey());
  const maxQty = product.availability === "in_stock" ? Math.min(99, product.stock) : 99;
  const totalCents = product.priceCents * qty;

  async function submit(values: BuyForm) {
    setFormError(null);
    try {
      const response = await checkout({
        storeSlug: slug,
        provider,
        items: [{ productSlug: search.produto, qty }],
        contactPhone: values.contactPhone,
        note: values.note || undefined,
      });
      setResult(response);
      setPhase("pay");
    } catch (error) {
      setFormError(errorMessage(error));
    }
  }

  if (phase === "done") {
    return (
      <section className="horizon">
        <div className="shell mx-auto max-w-md py-16 text-center md:py-24">
          <span className="rise rise-1 mx-auto inline-grid h-14 w-14 place-items-center rounded-full bg-brand-soft text-brand">
            <Check className="h-7 w-7" aria-hidden />
          </span>
          <h1 className="rise rise-2 mt-6 font-display text-3xl font-semibold tracking-tight">
            Pedido confirmado!
          </h1>
          <p className="rise rise-3 mt-4 text-lede text-muted">
            O pagamento foi aprovado. A loja {result?.order.store.name} vai falar com você pelo
            telefone que deixou, para combinar a entrega.
          </p>
          <div className="rise rise-4 mt-8 grid gap-3">
            <Button asChild size="lg">
              <Link to="/conta">Ver meus pedidos</Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link to="/loja/$slug" params={{ slug }}>
                Voltar para a loja
              </Link>
            </Button>
          </div>
        </div>
      </section>
    );
  }

  if (phase === "expired") {
    return (
      <section className="shell mx-auto max-w-md py-16 md:py-24">
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          O tempo do pagamento acabou
        </h1>
        <p className="mt-3 text-muted">
          Sem problema: nada foi cobrado. É só começar de novo — o produto continua reservável.
        </p>
        <Button size="lg" className="mt-6 w-full" onClick={() => setPhase("form")}>
          Tentar de novo
        </Button>
      </section>
    );
  }

  if (phase === "pay" && result) {
    return (
      <section className="shell mx-auto max-w-md py-10 md:py-16">
        <StepHeading
          step={2}
          total={2}
          title={result.payment.provider === "woovi" ? "Pague com Pix" : "Pague com cartão"}
        />

        <OrderSummary
          name={product.name}
          qty={qty}
          totalCents={result.order.totalCents}
          className="mt-6"
        />

        <div className="mt-6">
          {result.payment.provider === "woovi" ? (
            <PixPanel
              brCode={result.payment.brCode}
              qrCodeImageUrl={result.payment.qrCodeImageUrl}
              expiresAt={result.payment.expiresAt}
              onExpired={() => setPhase("expired")}
            />
          ) : (
            <StripePanel
              clientSecret={result.payment.clientSecret}
              submitLabel={`Pagar ${money(result.order.totalCents)}`}
              onConfirmed={() => undefined /* o poll acima detecta o "paid" do webhook */}
            />
          )}
        </div>

        <p
          className="mt-6 flex items-center justify-center gap-2 text-sm text-muted"
          aria-live="polite"
        >
          <span className="h-2 w-2 animate-pulse rounded-full bg-accent" aria-hidden />
          Esperando o banco confirmar…
        </p>
      </section>
    );
  }

  return (
    <section className="shell mx-auto max-w-md py-10 md:py-16">
      <StepHeading step={1} total={2} title="Confira e escolha como pagar" />

      <div className="card mt-6 flex items-center gap-4 p-4">
        {product.imageUrls[0] ? (
          <img
            src={product.imageUrls[0]}
            alt=""
            className="h-16 w-16 rounded-md border border-line bg-surface object-cover"
          />
        ) : (
          <div className="h-16 w-16 rounded-md bg-[radial-gradient(circle_at_30%_25%,var(--glow),transparent_65%)]" />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate font-display font-semibold">{product.name}</p>
          <p className="text-sm text-muted tabular-nums">{money(product.priceCents)} cada</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(submit)} className="mt-6 grid gap-5">
        <div className="grid gap-1.5">
          <span className="text-sm font-medium text-ink">Quantidade</span>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="h-11 w-11"
              aria-label="Diminuir quantidade"
              disabled={qty <= 1}
              onClick={() => setQty((current) => Math.max(1, current - 1))}
            >
              <Minus className="h-4 w-4" aria-hidden />
            </Button>
            <span className="min-w-8 text-center font-display text-xl font-semibold tabular-nums">
              {qty}
            </span>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="h-11 w-11"
              aria-label="Aumentar quantidade"
              disabled={qty >= maxQty}
              onClick={() => setQty((current) => Math.min(maxQty, current + 1))}
            >
              <Plus className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        </div>

        <Field
          label="Telefone com DDD"
          htmlFor="contactPhone"
          hint="A loja usa este número para combinar a entrega com você."
          error={errors.contactPhone?.message}
        >
          <Input
            id="contactPhone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="(11) 98765-4321"
            aria-invalid={Boolean(errors.contactPhone)}
            {...register("contactPhone")}
          />
        </Field>

        <Field label="Recado para a loja (opcional)" htmlFor="note" error={errors.note?.message}>
          <Textarea
            id="note"
            rows={2}
            placeholder="Ex.: prefiro retirar no sábado"
            {...register("note")}
          />
        </Field>

        <fieldset className="grid gap-2">
          <legend className="mb-1.5 text-sm font-medium text-ink">Como você quer pagar?</legend>
          <PayChoice
            checked={provider === "woovi"}
            onSelect={() => setProvider("woovi")}
            icon={<QrCode className="h-5 w-5" aria-hidden />}
            title="Pix"
            detail="Aprovado na hora, direto do app do seu banco"
          />
          <PayChoice
            checked={provider === "stripe"}
            onSelect={() => setProvider("stripe")}
            disabled={!cardAvailable}
            icon={<CreditCard className="h-5 w-5" aria-hidden />}
            title="Cartão"
            detail={cardAvailable ? "Crédito ou débito" : "Indisponível no momento"}
          />
        </fieldset>

        <FormError>{formError}</FormError>

        <Button size="lg" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Preparando pagamento…" : `Continuar — ${money(totalCents)}`}
        </Button>
        <p className="text-center text-sm text-muted">Você ainda não paga nada nesta etapa.</p>
      </form>
    </section>
  );
}

function OrderSummary({
  name,
  qty,
  totalCents,
  className,
}: {
  name: string;
  qty: number;
  totalCents: number;
  className?: string;
}) {
  return (
    <div className={`card flex items-center justify-between gap-4 p-4 ${className ?? ""}`}>
      <p className="min-w-0 truncate text-sm text-muted">
        {qty}× <span className="text-ink">{name}</span>
      </p>
      <p className="shrink-0 font-display font-semibold tabular-nums">{money(totalCents)}</p>
    </div>
  );
}
