import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Check, CreditCard, MessageCircle, Minus, Plus, QrCode } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { KeepReceipt } from "#/components/pay/keep-receipt";
import { PayChoice } from "#/components/pay/pay-choice";
import { PixPanel } from "#/components/pay/pix-panel";
import { StepHeading } from "#/components/pay/steps";
import { StripePanel } from "#/components/pay/stripe-panel";
import { Captcha, turnstileSiteKey } from "#/components/store/captcha";
import {
  EMPTY_CONTACT,
  type GuestContact,
  GuestContactFields,
  toContactPayload,
  validateGuestContact,
} from "#/components/store/guest-contact-fields";
import { Button } from "#/components/ui/button";
import { Field, FormError, Input, Textarea } from "#/components/ui/field";
import { errorMessage } from "#/lib/api/error-message";
import { checkout } from "#/lib/api/gen/clients/checkout";
import { useGetMyOrder } from "#/lib/api/gen/hooks/useGetMyOrder";
import { useGetOrderReceipt } from "#/lib/api/gen/hooks/useGetOrderReceipt";
import { getProductQueryOptions, useGetProduct } from "#/lib/api/gen/hooks/useGetProduct";
import { useGetStore } from "#/lib/api/gen/hooks/useGetStore";
import type { Checkout201 } from "#/lib/api/gen/types/Checkout";
import { publicRequest } from "#/lib/api/public";
import { useSession } from "#/lib/auth/session";
import { formatPhone, money } from "#/lib/format";
import { stripePublishableKey } from "#/lib/pay/stripe";
import { seo } from "#/lib/seo";
import { whatsappUrl } from "#/lib/whatsapp";

const SearchSchema = z.object({
  produto: z.string().min(1),
  qtd: z.coerce.number().int().min(1).max(99).catch(1),
  /**
   * Pedido em andamento e a chave do recibo. Ficam na URL para a tela de pagamento sobreviver a
   * um F5 — quem comprou sem conta não tem "meus pedidos" para reencontrar o Pix.
   */
  pedido: z.string().uuid().optional(),
  recibo: z.string().uuid().optional(),
});

/**
 * `contactPhone` é opcional aqui porque quem compra sem conta manda o telefone junto do resto
 * do contato, num campo só. A validação do caminho logado acontece no submit.
 */
const BuySchema = z.object({
  contactPhone: z.string().max(20, "Telefone muito longo").optional(),
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

/** Comprar não pede conta: nome e telefone bastam — a loja liga para combinar a entrega. */
function BuyRoute() {
  return <BuyPage />;
}

function BuyPage() {
  const { slug } = Route.useParams();
  const search = Route.useSearch();
  const { data: product } = useGetProduct(slug, search.produto, { client: publicRequest });
  const { data: store } = useGetStore(slug, { client: publicRequest });

  const { status } = useSession();
  // Enquanto a sessão não respondeu não se sabe de quem é este pedido, e nem os campos de
  // convidado nem a validação deles fazem sentido: o botão espera. Sem isso quem está logado
  // levava "Coloque seu nome" ao clicar rápido numa conexão lenta.
  const sessionPending = status === "loading";
  const visitor = status === "anonymous";
  const navigate = useNavigate({ from: Route.fullPath });
  const [contact, setContact] = useState<GuestContact>(EMPTY_CONTACT);
  const [captchaToken, setCaptchaToken] = useState("");
  // A URL é a fonte da verdade do pedido em andamento: recarregar a página não pode perder um
  // Pix que já está esperando pagamento.
  const resumed = Boolean(search.pedido && search.recibo);
  const [phase, setPhase] = useState<Phase>(resumed ? "pay" : "form");
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
  const orderId = result?.order.id ?? search.pedido;
  const receiptToken = result?.receiptToken ?? search.recibo ?? null;
  const polling = phase === "pay" && Boolean(orderId);
  function pollInterval(order: { status: string } | undefined) {
    return !order || order.status === "pending_payment" ? 4000 : false;
  }
  const { data: mine } = useGetMyOrder(orderId, {
    query: {
      enabled: polling && !receiptToken,
      refetchInterval: (query) => pollInterval(query.state.data),
    },
  });
  // Quem comprou sem conta não tem sessão para consultar o pedido: acompanha pelo recibo, cuja
  // chave nasceu junto com o pagamento. Sem isso o Pix ficaria num QR code sem resposta.
  const {
    data: receipt,
    isLoading: receiptLoading,
    isError: receiptError,
  } = useGetOrderReceipt(
    orderId,
    { token: receiptToken ?? "" },
    {
      client: publicRequest,
      query: {
        enabled: polling && Boolean(receiptToken),
        // Token inválido não melhora tentando de novo: retentar só faz a tela ficar em
        // "carregando" por segundos antes de admitir que o link não vale.
        retry: false,
        refetchInterval: (query) => pollInterval(query.state.data),
      },
    },
  );
  const liveOrder = receiptToken ? receipt : mine;

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
    if (visitor) {
      const problem = validateGuestContact(contact);
      if (problem) {
        setFormError(problem);
        return;
      }
      if (turnstileSiteKey() && !captchaToken) {
        setFormError("Confirme que você não é um robô.");
        return;
      }
    } else if (!values.contactPhone || values.contactPhone.replace(/\D/g, "").length < 10) {
      setFormError("Coloque um telefone com DDD para a loja falar com você.");
      return;
    }
    try {
      const response = await checkout({
        storeSlug: slug,
        provider,
        items: [{ productSlug: search.produto, qty }],
        ...(visitor
          ? { contact: toContactPayload(contact), captchaToken }
          : { contactPhone: values.contactPhone }),
        note: values.note || undefined,
      });
      setResult(response);
      // O id e a chave do recibo vão para a URL: é o que faz um F5 voltar para o Pix em vez de
      // para o formulário em branco. `replace` para o botão voltar não repetir a compra.
      if (response.receiptToken) {
        void navigate({
          search: { ...search, pedido: response.order.id, recibo: response.receiptToken },
          replace: true,
        });
      }
      setPhase("pay");
    } catch (error) {
      setFormError(errorMessage(error));
    }
  }

  if (phase === "done") {
    const storeName = result?.order.store.name ?? receipt?.store.name ?? "A loja";
    // O número que a loja vai chamar, devolvido para conferência: dígito errado aqui é
    // pedido pago e entrega que nunca acontece. Depois de um F5 vem parcial, do recibo.
    const phone = result?.order.contactPhone
      ? formatPhone(result.order.contactPhone)
      : receipt?.contactPhoneMasked;
    const delivery = receipt?.deliveryNote ?? store?.deliveryNote;
    const orderTotal = result?.order.totalCents ?? receipt?.totalCents ?? totalCents;
    return (
      <section className="halo-top relative">
        <div className="shell mx-auto max-w-md py-16 text-center md:py-24">
          <SuccessCheck />
          <h1 className="rise rise-2 mt-6 font-bold font-display text-3xl tracking-tight">
            Pedido confirmado!
          </h1>
          <div className="rise rise-3 mx-auto mt-6 max-w-sm rounded-[1rem] bg-surface p-5 text-left">
            <p className="kicker">Próximos passos</p>
            <ol className="mt-3 grid gap-2.5 text-[0.95rem]">
              <li className="flex gap-2.5">
                <StepNum n={1} /> O pagamento foi confirmado.
              </li>
              <li className="flex gap-2.5">
                <span>
                  <StepNum n={2} /> {storeName} vai falar com você
                  {phone ? (
                    <>
                      {" "}
                      no <span className="font-semibold tabular-nums">{phone}</span>
                    </>
                  ) : (
                    " pelo telefone que deixou"
                  )}{" "}
                  para combinar a entrega.
                  {phone && (
                    <span className="mt-1 block text-muted text-sm">
                      Confira o número: é por aí que a loja vai chamar.
                      {store?.whatsapp ? " Errado? Fale com a loja aqui embaixo." : ""}
                    </span>
                  )}
                </span>
              </li>
              {delivery && (
                <li className="flex gap-2.5">
                  <span>
                    <StepNum n={3} /> Como {storeName} entrega:{" "}
                    <span className="text-ink">{delivery}</span>
                  </span>
                </li>
              )}
              {status === "authenticated" && (
                <li className="flex gap-2.5">
                  <StepNum n={delivery ? 4 : 3} /> Acompanhe tudo em Minha conta.
                </li>
              )}
            </ol>
          </div>

          {/* Quem comprou sem conta não tem "meus pedidos": este link É o pedido dela.
              Sem um jeito de guardar, fechar a aba apagava o único acesso que existia. */}
          {receiptToken && status !== "authenticated" && (
            <KeepReceipt kind="pedido" className="rise rise-4" />
          )}

          <div className="rise rise-4 mt-8 grid gap-3">
            {/* O canal de volta: até agora quem pagava dependia de a loja ligar primeiro.
                A mensagem já vai escrita — a pessoa não precisa explicar de novo. */}
            {store?.whatsapp && (
              <Button asChild size="lg" variant="secondary">
                <a
                  href={whatsappUrl(
                    store.whatsapp,
                    `Olá! Acabei de fazer um pedido de ${money(orderTotal)} na ${storeName}.`,
                  )}
                  target="_blank"
                  rel="noreferrer"
                >
                  <MessageCircle className="h-4 w-4" aria-hidden />
                  Falar com a loja no WhatsApp
                </a>
              </Button>
            )}
            {status === "authenticated" && (
              <Button asChild size="lg">
                <Link to="/conta">Ver meus pedidos</Link>
              </Button>
            )}
            <Button
              asChild
              size="lg"
              variant={status === "authenticated" ? "secondary" : "primary"}
            >
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
        <h1 className="font-bold font-display text-2xl tracking-tight">O pagamento expirou</h1>
        <p className="mt-3 text-muted">
          Este código Pix não pode mais ser usado. Nada foi cobrado — é só fazer o pedido de novo.
        </p>
        {/* O botão dizia "voltar para o pagamento" e caía no formulário, deixando na URL o
            pedido morto: um F5 depois disso voltava direto para esta tela. Limpar a URL é
            o que fecha o ciclo. */}
        <Button
          size="lg"
          className="mt-6 w-full"
          onClick={() => {
            void navigate({ search: { ...search, pedido: undefined, recibo: undefined } });
            setPhase("form");
          }}
        >
          Fazer o pedido de novo
        </Button>
      </section>
    );
  }

  if (phase === "pay") {
    // Depois de um F5 não existe mais `result`: o Pix vem do recibo, que é justamente o que faz
    // esta tela sobreviver ao recarregamento. O cartão não sobrevive — o clientSecret morre com
    // a aba — e aí a tela pede para começar de novo.
    const pix = result?.payment.provider === "woovi" ? result.payment : receipt?.pix;
    const stripeSecret = result?.payment.provider === "stripe" ? result.payment.clientSecret : null;
    const orderTotalCents = result?.order.totalCents ?? receipt?.totalCents ?? totalCents;

    // Sem esta guarda a tela pisca "pagamento não está mais aqui" a cada recarregamento, antes
    // de o recibo responder.
    if (!pix && !stripeSecret && receiptLoading) {
      return (
        <section className="shell mx-auto max-w-md py-10 md:py-16" aria-busy="true">
          <div className="h-7 w-52 animate-pulse rounded-md bg-surface" />
          <div className="mt-6 h-64 animate-pulse rounded-lg bg-surface" />
        </section>
      );
    }

    if (!pix && !stripeSecret) {
      const restart = () => {
        void navigate({ search: { ...search, pedido: undefined, recibo: undefined } });
        setPhase("form");
      };
      return (
        <section className="shell mx-auto max-w-md py-16 md:py-24">
          <h1 className="font-bold font-display text-2xl tracking-tight">
            {receiptError ? "Não encontramos este pedido" : "Este pagamento não está mais aqui"}
          </h1>
          <p className="mt-3 text-muted">
            {receiptError
              ? "O link pode ter expirado ou estar incompleto. Nada foi cobrado."
              : "O pagamento no cartão precisa ser feito de uma vez. Nada foi cobrado — é só começar de novo."}
          </p>
          <Button size="lg" className="mt-6 w-full" onClick={restart}>
            Fazer o pedido de novo
          </Button>
        </section>
      );
    }

    return (
      <section className="shell mx-auto max-w-md py-10 md:py-16">
        <StepHeading step={2} total={2} title={pix ? "Pague com Pix" : "Pague com cartão"} />

        <OrderSummary name={product.name} qty={qty} totalCents={orderTotalCents} className="mt-6" />

        <div className="mt-6">
          {pix ? (
            <PixPanel
              brCode={pix.brCode}
              qrCodeImageUrl={pix.qrCodeImageUrl}
              expiresAt={pix.expiresAt}
              onExpired={() => setPhase("expired")}
            />
          ) : (
            stripeSecret && (
              <StripePanel
                clientSecret={stripeSecret}
                submitLabel={`Pagar ${money(orderTotalCents)}`}
                onConfirmed={() => undefined /* o poll acima detecta o "paid" do webhook */}
              />
            )
          )}
        </div>

        <p
          className="mt-6 flex items-center justify-center gap-2 text-sm text-muted"
          aria-live="polite"
        >
          <span className="h-2 w-2 animate-pulse rounded-full bg-accent" aria-hidden />
          Esperando o banco confirmar…
        </p>
        {/* "guarde o link" sem dizer como não guarda nada: aqui o link tem botão de copiar
            e de mandar no WhatsApp, que é onde essa pessoa guarda as coisas. */}
        {receiptToken && <KeepReceipt kind="pedido" className="mt-6" />}
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

        {visitor ? (
          <GuestContactFields
            value={contact}
            onChange={setContact}
            emailHint="Com e-mail, o comprovante do pedido chega sozinho."
          />
        ) : (
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
              {...register("contactPhone", {
                onChange: (event) => {
                  event.target.value = formatPhone(event.target.value);
                },
              })}
            />
          </Field>
        )}

        {/* Antes de pagar, o que acontece depois: quem compra pela primeira vez não sabe se
            recebe em casa, se retira, nem quando. */}
        {store?.deliveryNote && (
          <p className="rounded-[1rem] border border-line bg-surface px-4 py-3 text-[0.95rem]">
            <span className="font-semibold">Como a loja entrega:</span>{" "}
            <span className="text-muted">{store.deliveryNote}</span>
          </p>
        )}

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

        <div className="flex items-baseline justify-between rounded-[1rem] bg-surface px-4 py-3">
          <span className="font-medium text-muted text-sm">Total</span>
          <span className="font-bold font-display text-xl tabular-nums">{money(totalCents)}</span>
        </div>

        {visitor && <Captcha onToken={setCaptchaToken} />}

        <FormError>{formError}</FormError>

        <Button size="lg" type="submit" disabled={isSubmitting || sessionPending}>
          {sessionPending
            ? "Só um instante…"
            : isSubmitting
              ? "Preparando pagamento…"
              : "Continuar"}
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

/** Check de sucesso: scale 0.75 → 1 (§29 do brief), sem confetti. */
function SuccessCheck() {
  const reduce = useReducedMotion();
  return (
    <motion.span
      initial={reduce ? false : { opacity: 0, scale: 0.75 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="mx-auto inline-grid h-14 w-14 place-items-center rounded-full bg-success-soft text-success"
    >
      <Check className="h-7 w-7" aria-hidden />
    </motion.span>
  );
}

function StepNum({ n }: { n: number }) {
  return (
    <span className="mt-0.5 inline-grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-soft font-semibold text-brand-deep text-xs">
      {n}
    </span>
  );
}
