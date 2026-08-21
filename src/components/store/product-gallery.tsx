import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef, useState } from "react";

/**
 * Fotos do produto. Antes elas eram empilhadas na vertical: quatro fotos empurravam nome,
 * preço e botão de comprar para 1.000px abaixo da dobra. Aqui a foto é uma só na tela —
 * arrasta no celular, clica na miniatura no desktop.
 */
export function ProductGallery({ images, name }: { images: string[]; name: string }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState(0);
  const many = images.length > 1;
  // limitado na renderização em vez de zerado por efeito: produto com menos fotos que o
  // anterior não pode ficar apontando para uma foto que não existe mais
  const index = Math.min(position, Math.max(0, images.length - 1));

  // índice pelo scroll, para o dedo e a miniatura contarem a mesma história
  function handleScroll() {
    const node = trackRef.current;
    if (!node || node.clientWidth === 0) return;
    setPosition(
      Math.min(images.length - 1, Math.max(0, Math.round(node.scrollLeft / node.clientWidth))),
    );
  }

  function go(to: number) {
    const node = trackRef.current;
    if (!node) return;
    const clamped = Math.min(images.length - 1, Math.max(0, to));
    node.scrollTo({ left: clamped * node.clientWidth, behavior: "smooth" });
    setPosition(clamped);
  }

  // sem foto o campo de cor é mais baixo: um retângulo de 544px vazio só faz a página
  // parecer quebrada
  if (images.length === 0) {
    return (
      <div className="aspect-4/3 w-full rounded-[1.25rem] bg-[radial-gradient(circle_at_30%_25%,var(--glow),transparent_65%)] md:max-h-[22rem]" />
    );
  }

  return (
    <div className="grid gap-3">
      <div className="relative">
        {/* `section` com nome acessível em vez de div com tabIndex: quem usa teclado
            navega pelos botões de seta, que já são focáveis */}
        <section
          ref={trackRef}
          onScroll={handleScroll}
          aria-label={`Fotos de ${name}`}
          className="flex snap-x snap-mandatory overflow-x-auto rounded-[1.25rem] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {images.map((url, position) => (
            <img
              key={url}
              src={url}
              alt={images.length > 1 ? `${name} — foto ${position + 1} de ${images.length}` : name}
              // a primeira foto é o maior elemento da tela: carrega sem esperar
              loading={position === 0 ? "eager" : "lazy"}
              // `contain`, não `cover`: foto de produto cortada esconde justamente o que a
              // pessoa quer ver. O teto de altura existe porque 4/5 numa coluna larga
              // virava uma foto de 875px que empurrava o resto da página para fora da tela.
              className="aspect-square w-full shrink-0 snap-center bg-surface object-contain md:aspect-4/5 md:max-h-[34rem]"
            />
          ))}
        </section>

        {many && (
          <>
            <button
              type="button"
              onClick={() => go(index - 1)}
              disabled={index === 0}
              aria-label="Foto anterior"
              className="absolute top-1/2 left-2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-elevated/85 text-ink shadow-[var(--shadow-card)] backdrop-blur-sm transition hover:bg-elevated disabled:opacity-0 md:left-3"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => go(index + 1)}
              disabled={index === images.length - 1}
              aria-label="Próxima foto"
              className="absolute top-1/2 right-2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-elevated/85 text-ink shadow-[var(--shadow-card)] backdrop-blur-sm transition hover:bg-elevated disabled:opacity-0 md:right-3"
            >
              <ChevronRight className="h-5 w-5" aria-hidden />
            </button>
            {/* pontos no celular, miniaturas no desktop: o mesmo estado, duas leituras.
                A cápsula escura existe porque foto de fundo claro engolia os pontos. */}
            <div className="absolute inset-x-0 bottom-3 flex justify-center md:hidden">
              <div className="flex items-center gap-1.5 rounded-full bg-ink/45 px-2.5 py-1.5 backdrop-blur-sm">
                {images.map((url, position) => (
                  <span
                    key={url}
                    aria-hidden
                    className={`h-1.5 rounded-full bg-white/55 transition-all ${
                      position === index ? "w-5 bg-white" : "w-1.5"
                    }`}
                  />
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {many && (
        <nav className="scroll-row hidden md:flex" aria-label={`Miniaturas de ${name}`}>
          {images.map((url, position) => (
            <button
              key={url}
              type="button"
              onClick={() => go(position)}
              aria-label={`Ver foto ${position + 1}`}
              aria-current={position === index ? "true" : undefined}
              className={`h-20 w-20 shrink-0 overflow-hidden rounded-md border-2 transition-colors [transition-duration:var(--dur)] ${
                position === index ? "border-brand" : "border-line hover:border-line-strong"
              }`}
            >
              <img src={url} alt="" loading="lazy" className="h-full w-full object-cover" />
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}
