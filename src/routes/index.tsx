import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Check } from "lucide-react";
import { animate, motion, useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { SiteFooter } from "#/components/site/site-footer";
import { SiteHeader } from "#/components/site/site-header";
import { Button } from "#/components/ui/button";
import {
  GlyphBilhete,
  GlyphCoracao,
  GlyphDireto,
  GlyphPix,
  GlyphSacola,
} from "#/components/ui/glyphs";
import { Reveal } from "#/components/ui/reveal";
import { listStoresQueryOptions, useListStores } from "#/lib/api/gen/hooks/useListStores";
import { publicRequest } from "#/lib/api/public";
import { seo } from "#/lib/seo";

export const Route = createFileRoute("/")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(listStoresQueryOptions({ limit: 12 }, publicRequest)),
  head: () =>
    seo({
      title: "O que sua comunidade cultiva, cresce junto",
      description:
        "Venda produtos, receba doações, crie campanhas com meta e sorteios auditáveis. Pix e cartão, com o dinheiro indo direto para quem faz acontecer.",
      path: "/",
    }),
  component: Landing,
});

const TICKER = [
  "Pix aprovado na hora",
  "o dinheiro vai direto para você",
  "loja, campanhas e doações num lugar só",
  "sorteio auditável",
  "catálogo com página própria",
  "doação mensal sem burocracia",
  "sem comissão por venda",
  "sua loja aparece no Google",
];

/** O que a assinatura inclui. Preço fica na seção; se mudar, muda no Stripe também. */
const PLAN_INCLUDES = [
  "Loja com página própria e endereço para divulgar",
  "Pix e cartão, com o dinheiro caindo direto na sua conta",
  "Campanhas com meta, doação única ou mensal",
  "Sorteios com regra pública e resultado auditável",
  "Encomendas, pedidos e extrato em planilha",
  "Quantos produtos e campanhas você quiser",
];

type Glyph = (props: { className?: string }) => React.ReactElement;

const CAMPAIGN_POINTS: Array<{ label: string; Icon: Glyph }> = [
  { label: "Doação única ou todo mês", Icon: GlyphCoracao },
  { label: "Progresso público, doadores privados", Icon: GlyphCampanhaInline },
  { label: "Quem doa pode escolher ficar anônimo", Icon: GlyphPix },
];

function Landing() {
  const { data } = useListStores({ limit: 12 }, { client: publicRequest });
  const stores = data?.items ?? [];

  return (
    <>
      <SiteHeader />

      <main>
        {/* ═══ HERO: painel tangerina + a loja acontecendo num telefone ═══════ */}
        <section className="shell pt-4 md:pt-6">
          <div className="bloco">
            <div className="relative grid gap-12 px-6 pt-12 pb-10 md:grid-cols-[1.05fr_0.95fr] md:items-center md:gap-10 md:px-12 md:pt-16 md:pb-12">
              <div>
                <h1 className="rise rise-1 text-display">
                  Venda. Apoie.
                  <br />
                  Faça acontecer.
                </h1>
                <p className="rise rise-2 mt-5 max-w-[36ch] text-lede text-white/90">
                  Sua comunidade tem muito para realizar. A Colheita reúne loja, campanhas e doações
                  num lugar só — e o dinheiro vai direto para quem faz acontecer.
                </p>
                <div className="rise rise-3 mt-8 flex flex-col gap-3 sm:flex-row">
                  <Button asChild size="lg" variant="inverse" className="w-full sm:w-auto">
                    <Link to="/criar-conta">
                      Criar minha loja
                      <ArrowRight className="h-4 w-4" aria-hidden />
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="inverse-outline" className="w-full sm:w-auto">
                    <Link to="/" hash="como-funciona">
                      Ver como funciona
                    </Link>
                  </Button>
                </div>
                <p className="rise rise-3 mt-4 text-sm text-white/75">
                  R$ 199 por mês, sem comissão por venda.
                </p>
              </div>

              <div className="rise rise-4">
                <HeroPhone />
              </div>
            </div>

            <div className="marquee relative border-white/20 border-t py-3" aria-hidden>
              <div className="marquee-track">
                {[0, 1].map((half) => (
                  <div key={half} className="flex shrink-0 items-center">
                    {TICKER.map((item) => (
                      <span
                        key={`${half}-${item}`}
                        className="flex items-center gap-2.5 pr-9 font-medium text-sm text-white/85"
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-white/60" />
                        {item}
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ═══ TRÊS FORMAS DE REUNIR RECURSOS ═════════════════════════════════ */}
        <section className="shell py-16 md:py-20">
          <p className="kicker">Formas de reunir recursos</p>
          <h2 className="mt-3 max-w-2xl text-title">
            Uma necessidade, três caminhos para a comunidade.
          </h2>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            <WayCard
              icon={<GlyphSacola className="h-5 w-5" />}
              tone="bg-brand-soft text-brand-deep"
              title="Vender"
              body="Produtos com página própria, estoque e lista de espera para o que é sob encomenda."
              items={["Pix e cartão", "Sob encomenda", "Página no Google"]}
            />
            <WayCard
              icon={<GlyphCoracao className="h-5 w-5" />}
              tone="bg-plum/15 text-plum"
              title="Apoiar"
              body="Doação avulsa ou todo mês, com ou sem campanha, e sempre com recibo por e-mail."
              items={["Doação única", "Apoio mensal", "Anônimo se quiser"]}
            />
            <WayCard
              icon={<GlyphBilhete className="h-5 w-5" />}
              tone="bg-lavender/18 text-lavender"
              title="Participar"
              body="Campanha com meta à vista e sorteio auditável entre quem ajudou a chegar lá."
              items={["Meta pública", "Números da sorte", "Resultado verificável"]}
            />
          </div>
        </section>

        {/* ═══ COMO FUNCIONA: números como elemento visual ════════════════════ */}
        <section id="como-funciona" className="shell scroll-mt-24 py-16 md:py-24">
          <p className="kicker">Como funciona</p>
          <h2 className="mt-3 max-w-xl text-title">Três passos, uma tarde.</h2>

          <div className="mt-12 grid gap-x-8 gap-y-12 md:grid-cols-3">
            <StepBig
              n="01"
              title="Crie sua loja"
              body="Nome, endereço próprio e pronto. Você já entra com o catálogo esperando."
            >
              <div className="grid gap-2">
                <div className="rounded-xl border border-line bg-bg px-3 py-2.5 text-sm">
                  Loja Boa Colheita
                </div>
                <span className="rounded-full bg-brand px-4 py-2.5 text-center font-semibold text-sm text-white">
                  Criar loja
                </span>
              </div>
            </StepBig>

            <StepBig
              n="02"
              title="Compartilhe o link"
              body="A loja abre bonita no grupo, com foto e tudo — e aparece no Google."
            >
              <div className="grid gap-2">
                <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-bg p-3 shadow-sm">
                  <p className="text-sm">Gente, a lojinha tá no ar! 🍊</p>
                </div>
                <div className="ml-auto max-w-[90%] rounded-2xl rounded-br-md bg-brand-soft p-3">
                  <p className="font-semibold text-brand-deep text-sm">/loja/boa-colheita</p>
                  <p className="mt-0.5 text-muted text-xs">Loja Boa Colheita</p>
                </div>
              </div>
            </StepBig>

            <StepBig
              n="03"
              title="Receba direto"
              body="Pix na hora ou cartão. O valor cai na sua conta, sem passar por terceiros."
            >
              <div className="grid gap-2">
                <p className="flex items-center justify-between rounded-xl bg-bg px-3 py-2.5 text-sm">
                  <span className="text-muted">Caneca · Pix</span>
                  <span className="font-bold font-display tabular-nums">R$ 45,00</span>
                </p>
                <p className="flex items-center gap-2 rounded-xl bg-success-soft px-3 py-2.5 font-medium text-sm text-success">
                  <Check className="h-4 w-4" aria-hidden /> caiu na sua conta
                </p>
              </div>
            </StepBig>
          </div>
        </section>

        {/* ═══ CAMPANHAS: a seção emocional ═══════════════════════════════════ */}
        <section className="bg-surface py-16 md:py-24">
          <div className="shell grid items-center gap-10 md:grid-cols-2 md:gap-14">
            <Reveal>
              <div>
                <p className="kicker">Campanhas</p>
                <h2 className="mt-3 text-title">Metas que a comunidade abraça.</h2>
                <p className="mt-4 max-w-[46ch] text-lede text-muted">
                  Conte para onde vai o dinheiro, acompanhe a barra subir e receba doações avulsas
                  ou mensais. A lista de quem doou fica só com você.
                </p>
                <ul className="mt-6 grid gap-3">
                  {CAMPAIGN_POINTS.map(({ label, Icon }) => (
                    <li key={label} className="flex items-center gap-3 text-[0.98rem]">
                      <span className="inline-grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-soft text-brand-deep">
                        <Icon className="h-4.5 w-4.5" />
                      </span>
                      {label}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>

            <Reveal delay={0.1}>
              <CampaignShowcase />
            </Reveal>
          </div>
        </section>

        {/* ═══ O DINHEIRO VAI DIRETO: a promessa central ══════════════════════ */}
        <section className="shell py-16 md:py-24">
          <Reveal>
            <div className="rounded-[1.75rem] border border-brand/15 bg-brand-pale px-6 py-12 md:px-14 md:py-16">
              <p className="kicker">A promessa</p>
              <h2 className="mt-3 max-w-[18ch] text-title">
                O dinheiro vai direto para quem organiza.
              </h2>

              <div className="mt-10 grid gap-6 md:grid-cols-[1fr_auto_1fr_auto_1fr] md:items-center">
                <MoneyNode
                  icon={<GlyphCoracao className="h-5 w-5" />}
                  label="Alguém compra ou doa"
                />
                <FlowArrow />
                <MoneyNode icon={<GlyphPix className="h-5 w-5" />} label="Pagamento aprovado" />
                <FlowArrow />
                <MoneyNode
                  icon={<GlyphSacola className="h-5 w-5" />}
                  label="Conta de quem organiza"
                  strong
                />
              </div>

              <p className="mt-10 font-bold font-display text-2xl text-brand-deep md:text-3xl">
                Sem intermediário.
              </p>

              <div className="mt-8 grid gap-8 border-line border-t pt-8 sm:grid-cols-3">
                <BigFact value={0} suffix="%" label="de comissão sobre o que você vende" />
                <BigFact value={199} prefix="R$ " label="por mês, com tudo incluído" />
                <BigFact value={100} suffix="%" label="do repasse direto na sua conta" />
              </div>
            </div>
          </Reveal>
        </section>

        {/* ═══ SORTEIO: confiável, não cassino ════════════════════════════════ */}
        <section className="shell pb-16 md:pb-24">
          <div className="grid items-center gap-10 md:grid-cols-2 md:gap-14">
            <Reveal className="md:order-2">
              <div>
                <p className="kicker">Sorteios</p>
                <h2 className="mt-3 text-title">Cada doação gera números da sorte.</h2>
                <p className="mt-4 max-w-[46ch] text-lede text-muted">
                  O sorteio roda na plataforma, com regra pública e resultado auditável. Quem doou
                  recebe os números na hora — e o resultado por e-mail.
                </p>
              </div>
            </Reveal>
            <Reveal delay={0.1} className="md:order-1">
              <RaffleDemo />
            </Reveal>
          </div>
        </section>

        {/* ═══ ASSINATURA: um preço só, sem comissão ══════════════════════════ */}
        <section className="shell pb-16 md:pb-24">
          <Reveal>
            <div className="card grid gap-8 p-6 md:grid-cols-[0.9fr_1.1fr] md:items-center md:p-10">
              <div>
                <p className="kicker">Quanto custa</p>
                <h2 className="mt-3 text-title">Um preço só, sem surpresa.</h2>
                <p className="mt-4 max-w-[40ch] text-lede text-muted">
                  A plataforma se sustenta pela assinatura da loja. Nada é descontado das suas
                  vendas nem das doações que você recebe.
                </p>
                <div className="mt-7 flex items-end gap-2">
                  <p className="font-bold font-display text-5xl text-brand-deep tabular-nums md:text-6xl">
                    R$ 199
                  </p>
                  <p className="pb-2 font-semibold text-muted">/mês</p>
                </div>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <Button asChild size="lg" className="w-full sm:w-auto">
                    <Link to="/criar-conta">
                      Criar minha loja
                      <ArrowRight className="h-4 w-4" aria-hidden />
                    </Link>
                  </Button>
                </div>
                <p className="mt-4 text-muted text-sm">
                  Cancele quando quiser, direto no painel da loja.
                </p>
              </div>

              <ul className="grid gap-3 rounded-[1.25rem] border border-brand/15 bg-brand-pale p-5 md:p-6">
                {PLAN_INCLUDES.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-[0.98rem]">
                    <span className="mt-0.5 inline-grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand text-white">
                      <Check className="h-3 w-3" aria-hidden />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </section>

        {/* ═══ LOJAS REAIS ════════════════════════════════════════════════════ */}
        <section className="shell pb-16 md:pb-24">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="kicker">Para quem compra</p>
              <h2 className="mt-3 text-title">Lojas abertas agora</h2>
            </div>
            <Link
              to="/lojas"
              className="inline-flex items-center gap-1.5 font-medium text-brand-deep text-sm hover:text-brand-hover"
            >
              ver todas <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>

          {stores.length === 0 ? (
            <p className="mt-8 text-muted">
              Nenhuma loja aberta ainda. Quer ser a primeira?{" "}
              <Link to="/criar-conta" className="text-brand-deep underline underline-offset-4">
                crie a loja
              </Link>
              .
            </p>
          ) : (
            <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {stores.map((store, index) => (
                <Reveal key={store.id} delay={index * 0.05}>
                  <li className="h-full list-none">
                    <Link
                      to="/loja/$slug"
                      params={{ slug: store.slug }}
                      className="card card-hover group flex h-full flex-col p-6"
                    >
                      <span className="inline-grid h-12 w-12 place-items-center rounded-full bg-brand font-bold font-display text-white text-xl">
                        {store.name.charAt(0)}
                      </span>
                      <h3 className="mt-4 font-bold font-display text-lg group-hover:text-brand-deep">
                        {store.name}
                      </h3>
                      {store.description && (
                        <p className="mt-1 line-clamp-2 text-muted text-sm">{store.description}</p>
                      )}
                      <p className="mt-auto inline-flex items-center gap-1.5 pt-4 font-medium text-brand-deep text-sm">
                        visitar loja
                        <ArrowRight
                          className="h-3.5 w-3.5 transition-transform [transition-duration:var(--dur)] group-hover:translate-x-0.5"
                          aria-hidden
                        />
                      </p>
                    </Link>
                  </li>
                </Reveal>
              ))}
            </ul>
          )}
        </section>

        {/* ═══ FECHO ══════════════════════════════════════════════════════════ */}
        <section className="shell pb-4 md:pb-8">
          <div className="bloco px-6 py-14 text-center md:py-20">
            <div className="relative">
              <h2 className="mx-auto max-w-xl text-title">
                Tudo o que sua comunidade cultiva, cresce junto.
              </h2>
              <div className="mt-8 flex justify-center">
                <Button asChild size="lg" variant="inverse" className="w-full sm:w-auto">
                  <Link to="/criar-conta">
                    Criar minha loja
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                </Button>
              </div>
              <p className="mt-4 text-sm text-white/80">Você começa em poucos minutos.</p>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}

/** Bandeirinha inline (evita import circular no map acima). */
function GlyphCampanhaInline({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <title>Campanha</title>
      <path d="M5 17V3.5" />
      <path d="M5 4h9.6l-2.2 3.2 2.2 3.2H5" />
    </svg>
  );
}

/**
 * O telefone do hero: a loja acontecendo — produto, campanha, Pix recebido e
 * números da sorte, com avisos flutuando fora da moldura. Ilustrativo, em HTML.
 */
function HeroPhone() {
  return (
    <div className="relative mx-auto w-fit" aria-hidden>
      <div className="phone">
        <div className="flex justify-center pt-2.5 pb-2">
          <span className="h-1.5 w-14 rounded-full bg-line" />
        </div>
        <div className="grid gap-2.5 bg-surface px-3.5 pb-5 pt-1">
          <div className="flex items-center gap-2.5">
            <span className="inline-grid h-8 w-8 place-items-center rounded-full bg-brand font-bold font-display text-sm text-white">
              B
            </span>
            <p className="font-bold font-display text-sm">Loja Boa Colheita</p>
          </div>

          <div className="rounded-xl bg-elevated p-2.5 shadow-sm">
            <div className="aspect-[16/9] rounded-lg bg-[linear-gradient(140deg,#f7b98d,#b45f31)]" />
            <div className="mt-2 flex items-center justify-between">
              <p className="font-bold font-display text-sm">Caneca Esperança</p>
              <p className="font-bold font-display text-sm tabular-nums">R$ 45,00</p>
            </div>
          </div>

          <div className="rounded-xl bg-elevated p-2.5 shadow-sm">
            <div className="flex items-baseline justify-between">
              <p className="font-semibold text-xs">Reforma da cozinha</p>
              <p className="text-muted text-xs tabular-nums">72%</p>
            </div>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-surface">
              <div className="progress-fill h-full w-[72%] rounded-full bg-brand" />
            </div>
          </div>

          <div className="flex gap-1.5">
            {["#1842", "#1843"].map((n) => (
              <span
                key={n}
                className="rounded-lg bg-brand-soft px-2 py-1 font-bold font-display text-brand-deep text-xs tabular-nums"
              >
                {n}
              </span>
            ))}
            <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-success-soft px-2 py-1 font-semibold text-success text-xs">
              <Check className="h-3 w-3" aria-hidden /> Pix
            </span>
          </div>
        </div>
      </div>

      <p className="float absolute top-6 -left-8 flex items-center gap-2 rounded-full bg-white px-3.5 py-2 font-semibold text-[#1e7a4f] text-sm shadow-lg">
        <Check className="h-4 w-4" aria-hidden /> Pix recebido · R$ 45,00
      </p>
      <p className="float-late absolute -right-4 bottom-10 flex items-center gap-2 rounded-full bg-white px-3.5 py-2 font-semibold text-[#8a4a20] text-sm shadow-lg">
        <GlyphBilhete className="h-4 w-4" /> nº da sorte #1844
      </p>
    </div>
  );
}

/** Passo com o número como elemento visual (§10 do brief). */
function StepBig({
  n,
  title,
  body,
  children,
}: {
  n: string;
  title: string;
  body: string;
  children: React.ReactNode;
}) {
  return (
    <Reveal className="h-full">
      <div className="flex h-full flex-col">
        <p className="font-bold font-display text-7xl text-brand-soft leading-none md:text-8xl dark:text-brand/45">
          {n}
        </p>
        <h3 className="-mt-4 font-bold font-display text-xl">{title}</h3>
        <p className="mt-1.5 max-w-[36ch] text-[0.95rem] text-muted">{body}</p>
        {/* o contexto cresce para os três cards terminarem na mesma linha */}
        <div className="mt-4 flex flex-1 flex-col justify-center rounded-[1rem] border border-line bg-surface p-3">
          {children}
        </div>
      </div>
    </Reveal>
  );
}

/** Meta de campanha que anima 0 → 72% quando entra na tela (§12). */
function CampaignShowcase() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const reduce = useReducedMotion();
  const pct = 72;
  const raised = 14350;
  const [shownPct, setShownPct] = useState(reduce ? pct : 0);
  const [shownRaised, setShownRaised] = useState(reduce ? raised : 0);

  useEffect(() => {
    if (!inView) return;
    if (reduce) {
      setShownPct(pct);
      setShownRaised(raised);
      return;
    }
    const a = animate(0, pct, {
      duration: 0.9,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setShownPct(Math.round(v)),
    });
    const b = animate(0, raised, {
      duration: 1.1,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setShownRaised(Math.round(v)),
    });
    return () => {
      a.stop();
      b.stop();
    };
  }, [inView, reduce]);

  return (
    <div ref={ref} className="card p-6 shadow-[var(--shadow-card)] md:p-8">
      <div className="flex items-center gap-3">
        <span className="inline-grid h-11 w-11 place-items-center rounded-full bg-brand text-white">
          <GlyphCoracao className="h-5 w-5" />
        </span>
        <div>
          <p className="font-bold font-display text-lg">Reforma da cozinha</p>
          <p className="text-muted text-sm">87 pessoas apoiando</p>
        </div>
      </div>

      <p className="mt-6 font-bold font-display text-4xl tabular-nums md:text-5xl">
        R$ {shownRaised.toLocaleString("pt-BR")}
      </p>
      <p className="mt-1 text-muted text-sm tabular-nums">
        de R$ 20.000 · <span className="font-semibold text-brand-deep">{shownPct}%</span>
      </p>

      <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-surface">
        <div
          className="h-full rounded-full bg-brand transition-[width] duration-200"
          style={{ width: `${shownPct}%` }}
        />
      </div>
    </div>
  );
}

function MoneyNode({
  icon,
  label,
  strong,
}: {
  icon: React.ReactNode;
  label: string;
  strong?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-[1rem] p-4 ${
        strong ? "bg-brand text-white" : "bg-elevated shadow-sm"
      }`}
    >
      <span
        className={`inline-grid h-10 w-10 shrink-0 place-items-center rounded-full ${
          strong ? "bg-white/15 text-white" : "bg-brand-soft text-brand-deep"
        }`}
      >
        {icon}
      </span>
      <p className={`font-semibold text-sm ${strong ? "" : "text-ink"}`}>{label}</p>
    </div>
  );
}

function FlowArrow() {
  return (
    <span className="mx-auto rotate-90 text-brand-deep md:rotate-0" aria-hidden>
      <GlyphDireto className="h-6 w-6" />
    </span>
  );
}

/** Doação virando números da sorte, um a um (§14 — sem estética de cassino). */
function RaffleDemo() {
  const reduce = useReducedMotion();
  const numbers = ["#1842", "#1843", "#1844"];
  return (
    <div className="card p-6 md:p-8">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-muted text-sm">Doação</p>
          <p className="font-bold font-display text-3xl tabular-nums">R$ 50</p>
        </div>
        <span className="inline-grid h-11 w-11 place-items-center rounded-full bg-brand-soft text-brand-deep">
          <GlyphBilhete className="h-5 w-5" />
        </span>
      </div>
      <p className="mt-6 text-muted text-sm">vira</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {numbers.map((n, i) => (
          <motion.span
            key={n}
            initial={reduce ? false : { opacity: 0, scale: 0.6, y: 8 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: true, amount: 0.6 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1], delay: 0.15 + i * 0.12 }}
            className="inline-grid h-12 min-w-16 place-items-center rounded-[0.8rem] bg-brand px-3 font-bold font-display text-lg text-white tabular-nums"
          >
            {n}
          </motion.span>
        ))}
      </div>
      <p className="mt-4 text-muted text-sm">
        Regra pública: 1 número a cada R$ 10. Resultado sai por e-mail.
      </p>
    </div>
  );
}

/** Número grande que conta até o valor quando entra na tela. */
function BigFact({
  value,
  prefix = "",
  suffix = "",
  label,
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  label: string;
}) {
  const ref = useRef<HTMLParagraphElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(reduce ? value : 0);

  useEffect(() => {
    if (!inView) return;
    if (reduce) {
      setDisplay(value);
      return;
    }
    const controls = animate(0, value, {
      duration: 1.1,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (latest) => setDisplay(Math.round(latest)),
    });
    return () => controls.stop();
  }, [inView, reduce, value]);

  return (
    <div>
      <p
        ref={ref}
        className="font-bold font-display text-5xl text-brand-deep tabular-nums md:text-6xl"
      >
        {prefix}
        {display}
        {suffix}
      </p>
      <p className="mt-2 max-w-[24ch] text-muted text-sm">{label}</p>
    </div>
  );
}

/** Uma das três formas de reunir recursos: o que é, e o que já dá para fazer hoje. */
function WayCard({
  icon,
  tone,
  title,
  body,
  items,
}: {
  icon: React.ReactNode;
  tone: string;
  title: string;
  body: string;
  items: string[];
}) {
  return (
    <Reveal className="h-full">
      <div className="card flex h-full flex-col p-6">
        <span
          className={`inline-grid h-11 w-11 shrink-0 place-items-center rounded-[0.9rem] ${tone}`}
        >
          {icon}
        </span>
        <h3 className="mt-4 font-bold font-display text-xl">{title}</h3>
        <p className="mt-2 text-[0.95rem] text-muted">{body}</p>
        <ul className="mt-4 grid gap-1.5 text-sm">
          {items.map((item) => (
            <li key={item} className="flex items-center gap-2 text-muted">
              <Check className="h-3.5 w-3.5 shrink-0 text-success" aria-hidden />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </Reveal>
  );
}
