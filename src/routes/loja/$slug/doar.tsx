import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CreditCard, QrCode } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
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
import { Field, FormError, Textarea } from "#/components/ui/field";
import { GlyphEstrela } from "#/components/ui/glyphs";
import { MoneyInput } from "#/components/ui/money-input";
import { ShareButton } from "#/components/ui/share-button";
import { errorMessage } from "#/lib/api/error-message";
import { createDonation } from "#/lib/api/gen/clients/createDonation";
import { useGetCampaign } from "#/lib/api/gen/hooks/useGetCampaign";
import { useGetDonationReceipt } from "#/lib/api/gen/hooks/useGetDonationReceipt";
import { useGetMyDonation } from "#/lib/api/gen/hooks/useGetMyDonation";
import type { CreateDonation201 } from "#/lib/api/gen/types/CreateDonation";
import { publicRequest } from "#/lib/api/public";
import { useSession } from "#/lib/auth/session";
import { money } from "#/lib/format";
import { parseAmount } from "#/lib/pay/amount";
import { stripePublishableKey } from "#/lib/pay/stripe";
import { seo } from "#/lib/seo";

const SearchSchema = z.object({
  campanha: z.string().optional(),
  /** Valor em centavos escolhido na página da campanha, para já chegar aqui decidido. */
  valor: z.coerce.number().int().positive().optional(),
  /**
   * Doação em andamento e a chave do recibo. Ficam na URL para a tela de pagamento sobreviver
   * a um F5 — quem doou sem conta não tem "minhas doações" para reencontrar o Pix.
   */
  doacao: z.string().uuid().optional(),
  recibo: z.string().uuid().optional(),
});

const PRESETS_CENTS = [2000, 5000, 10000];
const MIN_CENTS = 500;
const MAX_CENTS = 5_000_000;

type Provider = "woovi" | "stripe";
type DonationType = "one_time" | "monthly";
type Phase = "form" | "pay" | "done" | "expired";

export const Route = createFileRoute("/loja/$slug/doar")({
  validateSearch: SearchSchema,
  head: () => seo({ title: "Fazer uma doação", description: "", path: "", noIndex: true }),
  component: DonateRoute,
});

/**
 * Doação avulsa não pede conta: nome e telefone bastam. A mensal continua pedindo, e o próprio
 * formulário explica por quê — é lá que a pessoa cancela sem depender de ninguém.
 */
function DonateRoute() {
  return <DonatePage />;
}

function DonatePage() {
  const { slug } = Route.useParams();
  const search = Route.useSearch();
  const { data: campaign } = useGetCampaign(slug, search.campanha ?? "", {
    client: publicRequest,
    // sem campanha na URL é doação avulsa à loja — não busca nada
    query: { enabled: Boolean(search.campanha) },
  });

  const navigate = useNavigate({ from: Route.fullPath });
  const reduceMotion = useReducedMotion();
  const { status } = useSession();
  // Enquanto a sessão não respondeu não se sabe de quem é esta doação, e nem os campos de
  // convidado nem a validação deles fazem sentido: o botão espera. Sem isso quem está logado
  // levava "Coloque seu nome" ao clicar rápido numa conexão lenta.
  const sessionPending = status === "loading";
  const visitor = status === "anonymous";
  const [contact, setContact] = useState<GuestContact>(EMPTY_CONTACT);
  const [captchaToken, setCaptchaToken] = useState("");
  // A URL é a fonte da verdade da doação em andamento: recarregar a página não pode perder um
  // Pix que já está esperando pagamento.
  const resumed = Boolean(search.doacao && search.recibo);
  const [phase, setPhase] = useState<Phase>(resumed ? "pay" : "form");
  // valor vindo da página da campanha manda, desde que caiba nos limites da doação
  const [amountCents, setAmountCents] = useState<number>(
    search.valor && search.valor >= MIN_CENTS && search.valor <= MAX_CENTS ? search.valor : 5000,
  );
  const [customValue, setCustomValue] = useState("");
  const [type, setType] = useState<DonationType>("one_time");
  const [provider, setProvider] = useState<Provider>("woovi");
  const [anonymous, setAnonymous] = useState(false);
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<CreateDonation201 | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const donationId = result?.donation.id ?? search.doacao;
  const receiptToken = result?.receiptToken ?? search.recibo ?? null;
  // os números do sorteio nascem num worker logo DEPOIS do "paid" — vale a pena
  // continuar perguntando algumas vezes para mostrá-los na tela de obrigado
  const paidPollsRef = useRef(0);
  function pollInterval(donation: { status: string; raffleNumbers: number[] } | undefined) {
    if (!donation || donation.status === "pending_payment") return 4000;
    if (donation.status === "paid" && donation.raffleNumbers.length === 0) {
      paidPollsRef.current += 1;
      return paidPollsRef.current <= 5 ? 3000 : false;
    }
    return false;
  }

  const polling = (phase === "pay" || phase === "done") && Boolean(donationId);
  const { data: mine } = useGetMyDonation(donationId, {
    query: {
      enabled: polling && !receiptToken,
      refetchInterval: (query) => pollInterval(query.state.data),
    },
  });
  // Quem doou sem conta não tem sessão para consultar a doação: acompanha pelo recibo, cuja
  // chave nasceu junto com o pagamento. Sem isso o Pix ficaria num QR code sem resposta.
  const {
    data: receipt,
    isLoading: receiptLoading,
    isError: receiptError,
  } = useGetDonationReceipt(
    donationId,
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
  const liveDonation = receiptToken ? receipt : mine;

  useEffect(() => {
    if (phase !== "pay" || !liveDonation) return;
    if (liveDonation.status === "paid") setPhase("done");
    if (liveDonation.status === "failed" || liveDonation.status === "cancelled")
      setPhase("expired");
  }, [phase, liveDonation]);

  const cardAvailable = Boolean(stripePublishableKey());
  const acceptedTypes = campaign?.acceptedTypes ?? "one_time";
  const allowMonthly = acceptedTypes !== "one_time";
  const allowOneTime = acceptedTypes !== "monthly";
  const effectiveCents = customValue ? parseAmount(customValue) : amountCents;

  // campanha só-mensal: o formulário nasce já no tipo certo
  useEffect(() => {
    if (!allowOneTime) setType("monthly");
  }, [allowOneTime]);

  // Pix não faz cobrança recorrente: a Woovi não tem split em assinatura, então o
  // dinheiro da mensal não chegaria na conta de quem organiza. Mensal é só cartão —
  // o backend recusa com `monthly_not_supported_for_provider`, e o doador descobrir
  // isso depois de preencher tudo é pior do que não poder escolher.
  const pixAvailable = type !== "monthly";
  useEffect(() => {
    if (!pixAvailable) setProvider("stripe");
  }, [pixAvailable]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    if (effectiveCents === null || effectiveCents < MIN_CENTS) {
      setFormError(`A doação mínima é ${money(MIN_CENTS)}.`);
      return;
    }
    if (effectiveCents > MAX_CENTS) {
      setFormError(`A doação máxima é ${money(MAX_CENTS)}.`);
      return;
    }
    if (visitor && type === "monthly") {
      setFormError("A doação mensal precisa de conta. Entre para continuar.");
      return;
    }
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
    }
    setSubmitting(true);
    try {
      const response = await createDonation({
        storeSlug: slug,
        campaignSlug: search.campanha,
        provider,
        type,
        amountCents: effectiveCents,
        anonymous,
        message: message || undefined,
        ...(visitor ? { contact: toContactPayload(contact), captchaToken } : {}),
      });
      setResult(response);
      // O id e a chave do recibo vão para a URL: é o que faz um F5 voltar para o Pix em vez
      // de para o formulário em branco. `replace` para o botão voltar não repetir a doação.
      if (response.receiptToken) {
        void navigate({
          search: { ...search, doacao: response.donation.id, recibo: response.receiptToken },
          replace: true,
        });
      }
      setPhase("pay");
    } catch (error) {
      setFormError(errorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  if (phase === "done") {
    const numbers = liveDonation?.raffleNumbers ?? result?.donation.raffleNumbers ?? [];
    return (
      <section className="halo-top relative">
        <div className="shell mx-auto max-w-md py-16 text-center md:py-24">
          <span className="rise rise-1 mx-auto inline-grid h-14 w-14 place-items-center rounded-full bg-brand-soft text-brand-deep">
            <GlyphEstrela className="h-7 w-7" />
          </span>
          <h1 className="rise rise-2 mt-6 font-bold font-display text-3xl tracking-tight">
            Obrigado por auxiliar!
          </h1>
          <p className="rise rise-3 mt-4 text-lede text-muted">
            {type === "monthly"
              ? "Sua contribuição mensal está ativa. Você pode acompanhá-la (e cancelar quando quiser) na sua conta."
              : // O servidor manda no valor: depois de um F5 `result` é nulo e o formulário
                // já voltou ao valor padrão — mostrar isso diria um número que ninguém doou.
                `O valor de ${money(liveDonation?.amountCents ?? result?.donation.amountCents ?? effectiveCents ?? 0)} já está a caminho de quem organiza.`}
          </p>

          {numbers.length > 0 && (
            <div className="rise rise-4 card mt-8 p-5 text-left">
              <p className="kicker">Seus números da sorte</p>
              <p className="mt-1.5 text-sm text-muted">
                {/* Depois de um F5 não se sabe mais se a pessoa deixou e-mail: aí a frase não
                    promete canal nenhum, em vez de prometer o errado. */}
                {result === null
                  ? "Esta campanha tem sorteio entre quem doa. Guarde seus números."
                  : visitor && contact.email === ""
                    ? "Esta campanha tem sorteio entre quem doa. Anote seus números — quem organiza fala com você pelo telefone que deixou."
                    : "Esta campanha tem sorteio entre quem doa. Guarde seus números — o resultado também chega por e-mail."}
              </p>
              <ul className="mt-4 flex flex-wrap gap-2">
                {numbers.map((n, index) => (
                  <motion.li
                    key={n}
                    // entrada escalonada sutil (§20): recompensa, não cassino
                    initial={reduceMotion ? false : { opacity: 0, scale: 0.85, y: 6 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{
                      duration: 0.32,
                      ease: [0.22, 1, 0.36, 1],
                      delay: reduceMotion ? 0 : Math.min(index, 8) * 0.06,
                    }}
                    className="inline-grid h-11 min-w-11 place-items-center rounded-md bg-[linear-gradient(140deg,var(--brand),var(--brand-hover))] px-2 font-display font-semibold text-white tabular-nums"
                  >
                    {n}
                  </motion.li>
                ))}
              </ul>
            </div>
          )}

          <div className="rise rise-5 mt-8 grid gap-3">
            <ShareButton
              title={campaign?.title ?? "Apoie esta loja"}
              path={
                search.campanha ? `/loja/${slug}/campanhas/${search.campanha}` : `/loja/${slug}`
              }
              label={search.campanha ? "Chamar mais gente" : "Compartilhar a loja"}
              size="lg"
              variant="primary"
            />
            {status === "authenticated" && (
              <Button asChild size="lg" variant="secondary">
                <Link to="/conta">Ver minhas doações</Link>
              </Button>
            )}
            <Button asChild size="lg" variant="ghost">
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
          O pagamento não foi concluído
        </h1>
        <p className="mt-3 text-muted">Nada foi cobrado. Quando quiser, é só tentar de novo.</p>
        <Button size="lg" className="mt-6 w-full" onClick={() => setPhase("form")}>
          Tentar de novo
        </Button>
      </section>
    );
  }

  if (phase === "pay") {
    // Depois de um F5 não existe mais `result`: o Pix vem do recibo, que é justamente o que
    // faz esta tela sobreviver ao recarregamento. O cartão não sobrevive — o clientSecret
    // morre com a aba — e aí a tela pede para começar de novo.
    // Só o recibo carrega a cobrança guardada; `useGetMyDonation` não expõe brCode.
    const pix = result?.payment.provider === "woovi" ? result.payment : receipt?.pix;
    const stripeSecret = result?.payment.provider === "stripe" ? result.payment.clientSecret : null;
    const amountCents = result?.donation.amountCents ?? liveDonation?.amountCents;

    // Ainda buscando a cobrança guardada: sem esta guarda a tela pisca "pagamento não está
    // mais aqui" a cada recarregamento, antes de o recibo responder.
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
        void navigate({ search: { ...search, doacao: undefined, recibo: undefined } });
        setPhase("form");
      };
      return (
        <section className="shell mx-auto max-w-md py-16 md:py-24">
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            {receiptError ? "Não encontramos este pagamento" : "Este pagamento não está mais aqui"}
          </h1>
          <p className="mt-3 text-muted">
            {receiptError
              ? "O link pode ter expirado ou estar incompleto. Nada foi cobrado."
              : "O pagamento no cartão precisa ser feito de uma vez. Nada foi cobrado — é só começar de novo."}
          </p>
          <Button size="lg" className="mt-6 w-full" onClick={restart}>
            Fazer a doação de novo
          </Button>
        </section>
      );
    }

    return (
      <section className="shell mx-auto max-w-md py-10 md:py-16">
        <StepHeading step={2} total={2} title={pix ? "Pague com Pix" : "Pague com cartão"} />
        <div className="card mt-6 flex items-center justify-between gap-4 p-4">
          <p className="min-w-0 truncate text-sm text-muted">
            {type === "monthly" ? "Doação mensal" : "Doação"}
            {campaign ? (
              <>
                {" "}
                — <span className="text-ink">{campaign.title}</span>
              </>
            ) : null}
          </p>
          {amountCents !== undefined && (
            <p className="shrink-0 font-display font-semibold tabular-nums">
              {money(amountCents)}
              {type === "monthly" && <span className="text-sm text-muted">/mês</span>}
            </p>
          )}
        </div>

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
                submitLabel={`Doar ${money(amountCents ?? 0)}${type === "monthly" ? " por mês" : ""}`}
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
        {receiptToken && (
          <p className="mt-4 text-center text-muted text-sm">
            Pode fechar esta página: guarde o link e volte quando quiser para ver se o pagamento
            caiu.
          </p>
        )}
      </section>
    );
  }

  return (
    <section className="shell mx-auto max-w-md py-10 md:py-16">
      <StepHeading step={1} total={2} title={campaign ? campaign.title : "Fazer uma doação"} />
      <p className="mt-3 text-sm text-muted">
        O valor vai direto para a conta de quem organiza — sem intermediário.
      </p>

      <form onSubmit={submit} className="mt-6 grid gap-5">
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-ink">Quanto você quer doar?</legend>
          <div className="grid grid-cols-3 gap-2">
            {PRESETS_CENTS.map((cents) => {
              const active = !customValue && amountCents === cents;
              return (
                <button
                  key={cents}
                  type="button"
                  onClick={() => {
                    setAmountCents(cents);
                    setCustomValue("");
                  }}
                  className={`h-12 rounded-lg border font-display font-semibold tabular-nums transition-colors [transition-duration:var(--dur)] ${
                    active
                      ? "border-brand bg-brand-pale text-brand-deep"
                      : "border-line bg-elevated hover:border-line-strong"
                  }`}
                >
                  {money(cents)}
                </button>
              );
            })}
          </div>
          <Field label="Outro valor" htmlFor="custom" error={undefined}>
            <MoneyInput
              id="custom"
              value={customValue}
              onChange={(event) => setCustomValue(event.target.value)}
            />
          </Field>
        </fieldset>

        {allowMonthly && allowOneTime && (
          <fieldset className="grid grid-cols-2 gap-2">
            <legend className="mb-2 text-sm font-medium text-ink">Com que frequência?</legend>
            <TypeChoice
              checked={type === "one_time"}
              onSelect={() => setType("one_time")}
              title="Uma vez"
              detail="Doação única, agora"
            />
            <TypeChoice
              checked={type === "monthly"}
              onSelect={() => setType("monthly")}
              disabled={!cardAvailable || visitor}
              title="Todo mês"
              detail={
                visitor
                  ? "Precisa de conta, para você cancelar quando quiser"
                  : cardAvailable
                    ? "No cartão, cancele quando quiser"
                    : "Indisponível: só no cartão"
              }
            />
          </fieldset>
        )}

        <fieldset className="grid gap-2">
          <legend className="mb-1.5 text-sm font-medium text-ink">Como você quer pagar?</legend>
          <PayChoice
            checked={provider === "woovi"}
            onSelect={() => setProvider("woovi")}
            disabled={!pixAvailable}
            icon={<QrCode className="h-5 w-5" aria-hidden />}
            title="Pix"
            detail={
              pixAvailable
                ? "Aprovado na hora, direto do app do seu banco"
                : "O Pix não faz cobrança automática todo mês"
            }
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

        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            className="mt-0.5 h-5 w-5 accent-(--brand)"
            checked={anonymous}
            onChange={(event) => setAnonymous(event.target.checked)}
          />
          <span>
            <span className="font-medium text-ink">Quero doar sem aparecer</span>
            <span className="block text-muted">Seu nome não aparece nem para a gestão.</span>
          </span>
        </label>

        <Field label="Deixar um recado (opcional)" htmlFor="message" error={undefined}>
          <Textarea
            id="message"
            rows={2}
            maxLength={500}
            placeholder="Uma palavra de incentivo para quem organiza"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
          />
        </Field>

        {type === "monthly" && effectiveCents !== null && (
          <p className="rounded-[1rem] bg-warning-soft px-4 py-3 text-[0.95rem]">
            <span className="font-semibold">Doação mensal:</span> você será cobrado{" "}
            <span className="font-bold tabular-nums">{money(effectiveCents)} por mês</span>, e pode
            cancelar quando quiser na sua conta.
          </p>
        )}

        {/* campanha só-mensal numa loja sem cartão: não há forma de pagar, e deixar o
            botão ativo só rende um 400 depois de tudo preenchido */}
        {type === "monthly" && !cardAvailable && (
          <p className="rounded-[1rem] bg-warning-soft px-4 py-3 text-[0.95rem]">
            Esta campanha aceita só doação mensal, e a doação mensal precisa de cartão — que esta
            loja ainda não tem ativo. Fale com quem organiza.
          </p>
        )}

        {/* Campanha só-mensal e visitante: sem conta não há onde cancelar depois, então a
            porta certa é entrar — e não um botão que só renderia erro. */}
        {type === "monthly" && visitor && (
          <div className="rounded-[1rem] bg-warning-soft px-4 py-3 text-[0.95rem]">
            <p>
              A doação mensal precisa de conta: é lá que você cancela quando quiser, sem depender de
              ninguém.
            </p>
            <Button asChild size="sm" variant="secondary" className="mt-3">
              <Link to="/entrar" search={{ redirect: `/loja/${slug}/doar` }}>
                Entrar ou criar conta
              </Link>
            </Button>
          </div>
        )}

        {visitor && type !== "monthly" && (
          <GuestContactFields
            value={contact}
            onChange={setContact}
            emailHint="Com e-mail, o recibo e o resultado do sorteio chegam sozinhos."
          />
        )}
        {visitor && type !== "monthly" && <Captcha onToken={setCaptchaToken} />}

        <FormError>{formError}</FormError>

        <Button
          size="lg"
          type="submit"
          disabled={
            submitting ||
            sessionPending ||
            effectiveCents === null ||
            (type === "monthly" && (!cardAvailable || visitor))
          }
        >
          {sessionPending
            ? "Só um instante…"
            : submitting
              ? "Preparando…"
              : `Continuar — ${effectiveCents !== null ? money(effectiveCents) : "escolha o valor"}${type === "monthly" ? "/mês" : ""}`}
        </Button>
        <p className="text-center text-sm text-muted">Você ainda não paga nada nesta etapa.</p>
      </form>
    </section>
  );
}

function TypeChoice({
  checked,
  onSelect,
  title,
  detail,
  disabled,
}: {
  checked: boolean;
  onSelect: () => void;
  title: string;
  detail: string;
  disabled?: boolean;
}) {
  return (
    <label
      className={`cursor-pointer rounded-lg border p-3.5 transition-colors [transition-duration:var(--dur)] ${
        checked ? "border-brand bg-brand-pale" : "border-line bg-elevated hover:border-line-strong"
      } ${disabled ? "cursor-not-allowed opacity-55" : ""}`}
    >
      <input
        type="radio"
        name="type"
        className="sr-only"
        checked={checked}
        disabled={disabled}
        onChange={onSelect}
      />
      <span className="block font-medium">{title}</span>
      <span className="block text-sm text-muted">{detail}</span>
    </label>
  );
}
