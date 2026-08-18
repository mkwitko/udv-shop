import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Bell, Check, PartyPopper, Ticket } from "lucide-react";
import { animate, useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { SiteFooter } from "#/components/site/site-footer";
import { SiteHeader } from "#/components/site/site-header";
import { Button } from "#/components/ui/button";
import { Reveal } from "#/components/ui/reveal";
import { listStoresQueryOptions, useListStores } from "#/lib/api/gen/hooks/useListStores";
import { publicRequest } from "#/lib/api/public";
import { seo } from "#/lib/seo";

export const Route = createFileRoute("/")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(listStoresQueryOptions({ limit: 12 }, publicRequest)),
  head: () =>
    seo({
      title: "Sua loja no ar hoje",
      description:
        "Sua loja, campanhas, doações e sorteios num lugar só. Pix e cartão, com o dinheiro caindo direto na sua conta.",
      path: "/",
    }),
  component: Landing,
});

const TICKER = [
  "Pix aprovado na hora",
  "o dinheiro cai direto na sua conta",
  "sorteio auditável",
  "catálogo com página própria",
  "doação mensal sem burocracia",
  "taxa declarada antes da venda",
  "sua loja aparece no Google",
];

function Landing() {
  const { data } = useListStores({ limit: 12 }, { client: publicRequest });
  const stores = data?.items ?? [];

  return (
    <>
      <SiteHeader />

      <main>
        {/* ═══ Hero: bloco tangerina com colagem viva + ticker ═══════════════ */}
        <section className="shell pt-4 md:pt-6">
          <div className="bloco">
            <div className="relative grid gap-12 px-6 pt-12 pb-8 md:grid-cols-[1fr_0.9fr] md:items-center md:gap-8 md:px-12 md:pt-20 md:pb-12">
              <div>
                <h1 className="rise rise-1 text-display">
                  Sua loja
                  <br />
                  no ar hoje.
                </h1>
                <p className="rise rise-2 mt-5 max-w-[36ch] text-lede text-white/90">
                  Venda, receba doações e faça sorteios sem planilha. O dinheiro cai direto na sua
                  conta.
                </p>
                <div className="rise rise-3 mt-8 flex flex-col gap-3 sm:flex-row">
                  <Button asChild size="lg" variant="inverse" className="w-full sm:w-auto">
                    <Link to="/criar-conta">
                      Criar minha loja grátis
                      <ArrowRight className="h-4 w-4" aria-hidden />
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="inverse-outline" className="w-full sm:w-auto">
                    <Link to="/lojas">Ver uma loja aberta</Link>
                  </Button>
                </div>
                <p className="rise rise-3 mt-4 text-sm text-white/75">
                  Grátis para começar. Só cobramos quando você vende.
                </p>
              </div>

              <HeroCollage />
            </div>

            {/* ticker: o que a plataforma garante, correndo no pé do bloco */}
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

        {/* ═══ Bento: metades em cima, terços embaixo — tudo claro e quente ══ */}
        <section id="recursos" className="shell scroll-mt-24 py-16 md:py-24">
          <p className="kicker">O que já vem pronto</p>
          <h2 className="mt-3 max-w-2xl text-title">
            Tudo que hoje vive na planilha e no caderninho.
          </h2>

          <div className="mt-10 grid gap-4 md:grid-cols-6">
            {/* campanha com meta — UI real, barra animando */}
            <Reveal className="md:col-span-3">
              <div className="card card-hover h-full p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold font-display text-xl">Campanhas com meta</h3>
                    <p className="mt-1 max-w-[40ch] text-[0.95rem] text-muted">
                      Doação avulsa ou mensal, barra de progresso pública e a lista de quem doou só
                      para a gestão.
                    </p>
                  </div>
                  <span className="inline-grid h-11 w-11 shrink-0 place-items-center rounded-[0.9rem] bg-brand text-white">
                    <PartyPopper className="h-5 w-5" aria-hidden />
                  </span>
                </div>
                <div className="mt-6 rounded-[0.9rem] bg-surface p-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="font-bold font-display">Reforma da cozinha</p>
                    <p className="text-muted text-sm tabular-nums">62%</p>
                  </div>
                  <div className="mt-2.5 h-2.5 w-full overflow-hidden rounded-full bg-line">
                    <div className="progress-fill h-full w-[62%] rounded-full bg-brand" />
                  </div>
                  <p className="mt-2 text-muted text-sm tabular-nums">
                    <span className="font-semibold text-ink">R$ 12.400</span> de R$ 20.000 · 87
                    doações
                  </p>
                </div>
              </div>
            </Reveal>

            {/* pix — a tela de pagamento em miniatura, quente */}
            <Reveal delay={0.06} className="md:col-span-3">
              <div className="card card-hover h-full p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold font-display text-xl">Pix na hora</h3>
                    <p className="mt-1 max-w-[40ch] text-[0.95rem] text-muted">
                      QR na tela, aprovação em segundos. Cartão no mesmo checkout — quem compra
                      escolhe.
                    </p>
                  </div>
                  <span className="inline-grid h-11 w-11 shrink-0 place-items-center rounded-[0.9rem] bg-brand-soft text-brand-deep">
                    <PixGlyph />
                  </span>
                </div>
                <div className="mt-6 flex items-center gap-4 rounded-[0.9rem] bg-surface p-4">
                  <QrIllustration />
                  <div className="min-w-0">
                    <p className="font-bold font-display tabular-nums">R$ 45,00</p>
                    <p className="mt-0.5 text-muted text-sm">Caneca Esperança</p>
                    <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-success-soft px-2.5 py-1 font-semibold text-success text-xs">
                      <Check className="h-3.5 w-3.5" aria-hidden /> aprovado em 4s
                    </p>
                  </div>
                </div>
              </div>
            </Reveal>

            {/* sorteio */}
            <Reveal className="md:col-span-2">
              <div className="card card-hover h-full p-6">
                <span className="inline-grid h-11 w-11 place-items-center rounded-[0.9rem] bg-brand text-white">
                  <Ticket className="h-5 w-5" aria-hidden />
                </span>
                <h3 className="mt-4 font-bold font-display text-xl">Sorteio auditável</h3>
                <p className="mt-1 text-[0.95rem] text-muted">
                  Cada doação vira número da sorte. O resultado sai por e-mail.
                </p>
                <div className="mt-4 flex gap-2">
                  {[7, 33, 41].map((n) => (
                    <span
                      key={n}
                      className="inline-grid h-10 w-10 place-items-center rounded-[0.7rem] bg-brand-soft font-bold font-display text-brand-deep tabular-nums"
                    >
                      {n}
                    </span>
                  ))}
                </div>
              </div>
            </Reveal>

            {/* encomenda */}
            <Reveal delay={0.06} className="md:col-span-2">
              <div className="card card-hover h-full p-6">
                <span className="inline-grid h-11 w-11 place-items-center rounded-[0.9rem] bg-success text-white">
                  <Bell className="h-5 w-5" aria-hidden />
                </span>
                <h3 className="mt-4 font-bold font-display text-xl">Encomenda sem grupo</h3>
                <p className="mt-1 text-[0.95rem] text-muted">
                  Produto sob encomenda junta a lista de interessados. Chegou, todo mundo é avisado
                  de uma vez.
                </p>
              </div>
            </Reveal>

            {/* catálogo */}
            <Reveal delay={0.12} className="md:col-span-2">
              <div className="card card-hover h-full p-6">
                <h3 className="font-bold font-display text-xl">Catálogo que se cuida</h3>
                <p className="mt-1 text-[0.95rem] text-muted">
                  Foto, preço, estoque, página própria. Esgotou, some da vitrine sozinho.
                </p>
                <div className="mt-4 grid grid-cols-3 gap-2" aria-hidden>
                  {["#f7b98d", "#e8a06b", "#d98b52"].map((hue) => (
                    <div
                      key={hue}
                      className="aspect-square rounded-[0.7rem]"
                      style={{ background: `linear-gradient(140deg, ${hue}, #b45f31)` }}
                    />
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ═══ Como funciona: três telefones, o produto onde ele vive ════════ */}
        <section id="como-funciona" className="scroll-mt-24 bg-surface py-16 md:py-24">
          <div className="shell text-center">
            <p className="kicker">Como funciona</p>
            <h2 className="mx-auto mt-3 max-w-xl text-title">Três passos, uma tarde.</h2>
          </div>

          <div className="snap-row mt-10 px-5 md:justify-center md:px-8">
            <Reveal>
              <PhoneStep n={1} title="Crie a loja">
                <div className="grid gap-2.5">
                  <p className="font-bold font-display text-lg">Vamos abrir a sua loja</p>
                  <div className="rounded-xl border border-line bg-bg px-3 py-2.5 text-sm">
                    Loja Boa Colheita
                  </div>
                  <div className="rounded-xl border border-line bg-bg px-3 py-2.5 text-muted text-sm">
                    prospera.app/loja/boa-colheita
                  </div>
                  <span className="mt-1 rounded-full bg-brand px-4 py-2.5 text-center font-semibold text-sm text-white">
                    Criar loja
                  </span>
                </div>
              </PhoneStep>
            </Reveal>

            <Reveal delay={0.08}>
              <PhoneStep n={2} title="Ligue o recebimento">
                <div className="grid gap-2.5">
                  <p className="font-bold font-display text-lg">Receber por Pix</p>
                  <div className="rounded-xl border border-line bg-bg px-3 py-2.5 text-sm">
                    chave@boacolheita.org
                  </div>
                  <p className="flex items-center gap-2 rounded-xl bg-success-soft px-3 py-2.5 font-medium text-sm text-success">
                    <Check className="h-4 w-4" aria-hidden /> Pix ligado. Já pode vender.
                  </p>
                  <p className="text-muted text-xs">
                    O valor não passa por terceiros — cai na conta da chave.
                  </p>
                </div>
              </PhoneStep>
            </Reveal>

            <Reveal delay={0.16}>
              <PhoneStep n={3} title="Divulgue o link">
                <div className="grid gap-2.5">
                  <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-bg p-3 shadow-sm">
                    <p className="text-sm">Gente, a lojinha tá no ar! 🍊</p>
                  </div>
                  <div className="ml-auto max-w-[90%] rounded-2xl rounded-br-md bg-brand-soft p-3">
                    <p className="font-semibold text-brand-deep text-sm">
                      prospera.app/loja/boa-colheita
                    </p>
                    <p className="mt-1 text-muted text-xs">
                      Loja Boa Colheita — produtos e campanhas
                    </p>
                  </div>
                  <p className="text-center text-muted text-xs">
                    abre bonito no grupo, com foto e tudo
                  </p>
                </div>
              </PhoneStep>
            </Reveal>
          </div>

          <div className="shell mt-12 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link to="/criar-conta">
                Começar agora
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </Button>
            <Button asChild size="lg" variant="secondary" className="w-full sm:w-auto">
              <Link to="/entrar">Já tenho conta</Link>
            </Button>
          </div>
        </section>

        {/* ═══ A conta, sem letra miúda ═══════════════════════════════════════ */}
        <section className="shell py-16 md:py-24">
          <Reveal>
            <div className="grid gap-8 rounded-[1.5rem] bg-brand-soft px-6 py-10 sm:grid-cols-3 md:px-12 md:py-14">
              <BigFact
                value={0}
                prefix="R$ "
                label="para começar — só cobramos quando você vende"
              />
              <BigFact value={5} suffix="%" label="de taxa, declarada antes de cada venda" />
              <BigFact value={100} suffix="%" label="do repasse direto na sua conta, sem parada" />
            </div>
          </Reveal>
        </section>

        {/* ═══ Lojas abertas ══════════════════════════════════════════════════ */}
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

        {/* ═══ Fecho ═══════════════════════════════════════════════════════════ */}
        <section className="shell pb-4 md:pb-8">
          <div className="bloco px-6 py-14 text-center md:py-20">
            <div className="relative">
              <h2 className="mx-auto max-w-2xl text-title">
                Você vende melhor do que organiza. A gente resolve a segunda parte.
              </h2>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button asChild size="lg" variant="inverse" className="w-full sm:w-auto">
                  <Link to="/criar-conta">
                    Criar minha loja grátis
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="inverse-outline" className="w-full sm:w-auto">
                  <Link to="/entrar">Entrar</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}

/**
 * Colagem do hero: dois cards reais sobrepostos e dois avisos flutuando —
 * a loja acontecendo, não uma ilustração parada. Tudo desenhado em HTML.
 */
function HeroCollage() {
  return (
    <div className="relative mx-auto h-[24rem] w-full max-w-sm sm:h-[26rem]" aria-hidden>
      {/* produto, levemente inclinado */}
      <div className="-rotate-3 absolute top-2 left-0 w-[70%] rounded-[1.1rem] bg-elevated p-4 text-ink shadow-[0_24px_50px_-24px_rgb(0_0_0/0.5)]">
        <div className="aspect-[4/3] rounded-[0.8rem] bg-[linear-gradient(140deg,#f7b98d,#b45f31)]" />
        <p className="mt-3 font-bold font-display">Caneca Esperança</p>
        <div className="mt-1 flex items-center justify-between">
          <p className="font-bold font-display tabular-nums">R$ 45,00</p>
          <span className="rounded-full bg-brand px-3 py-1.5 font-semibold text-white text-xs">
            Comprar
          </span>
        </div>
      </div>

      {/* campanha, sobreposta à direita */}
      <div className="absolute right-0 bottom-10 w-[64%] rotate-2 rounded-[1.1rem] bg-elevated p-4 text-ink shadow-[0_24px_50px_-24px_rgb(0_0_0/0.5)]">
        <p className="font-bold font-display text-sm">Reforma da cozinha</p>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface">
          <div className="progress-fill h-full w-[62%] rounded-full bg-brand" />
        </div>
        <p className="mt-1.5 text-muted text-xs tabular-nums">R$ 12.400 de R$ 20.000</p>
      </div>

      {/* avisos flutuando: a plataforma trabalhando */}
      <p className="float absolute top-0 right-2 flex items-center gap-2 rounded-full bg-white px-3.5 py-2 font-semibold text-[#1e7a4f] text-sm shadow-lg">
        <Check className="h-4 w-4" aria-hidden /> Pix aprovado
      </p>
      <p className="float-late absolute bottom-0 left-6 flex items-center gap-2 rounded-full bg-white px-3.5 py-2 font-semibold text-[#8a4a20] text-sm shadow-lg">
        <Ticket className="h-4 w-4" aria-hidden /> 3 números da sorte
      </p>
    </div>
  );
}

/** QR ilustrativo em tangerina — padrão determinístico, só forma. */
function QrIllustration() {
  const cells: boolean[] = Array.from({ length: 49 }, (_, i) => (i * 7 + 3) % 5 !== 0);
  return (
    <div className="grid aspect-square w-20 shrink-0 grid-cols-7 gap-[2px] rounded-lg bg-white p-2 shadow-sm">
      {cells.map((on, i) => (
        <span
          // biome-ignore lint/suspicious/noArrayIndexKey: padrão estático
          key={i}
          className={`rounded-[1px] ${on ? "bg-[#b4400e]" : "bg-transparent"}`}
        />
      ))}
    </div>
  );
}

/** Losango do Pix, desenhado — o glifo que todo brasileiro reconhece. */
function PixGlyph() {
  return (
    <svg viewBox="0 0 16 16" className="h-5 w-5" fill="none" stroke="currentColor">
      <title>Pix</title>
      <rect
        x="3.2"
        y="3.2"
        width="9.6"
        height="9.6"
        rx="2.4"
        strokeWidth="1.4"
        transform="rotate(45 8 8)"
      />
    </svg>
  );
}

function PhoneStep({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="w-[17rem]">
      <p className="flex items-center gap-2.5 px-1">
        <span className="inline-grid h-8 w-8 place-items-center rounded-full bg-brand font-bold font-display text-sm text-white">
          {n}
        </span>
        <span className="font-bold font-display">{title}</span>
      </p>
      <div className="phone mt-3">
        <div className="flex justify-center pt-2.5 pb-3">
          <span className="h-1.5 w-14 rounded-full bg-line" />
        </div>
        <div className="min-h-64 bg-surface px-3.5 pb-5">{children}</div>
      </div>
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
      ease: [0.2, 0.7, 0.2, 1],
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
