import { ChevronLeft, ChevronRight } from "lucide-react";
import { type ReactNode, useRef, useState } from "react";

type HeroGalleryProps = {
  images: string[];
  /** Conteúdo que fica sobre a foto — nome da loja, título, selos. */
  children: ReactNode;
};

/**
 * Faixa de fotos do topo da campanha. O arrasto continua sendo o gesto principal,
 * mas as setas e o contador dizem que existe mais foto — sem eles ninguém descobre.
 */
export function HeroGallery({ images, children }: HeroGalleryProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const many = images.length > 1;

  // o índice vem do scroll, então dedo e seta contam a mesma história
  function handleScroll() {
    const node = trackRef.current;
    if (!node || node.clientWidth === 0) return;
    const next = Math.round(node.scrollLeft / node.clientWidth);
    setIndex(Math.min(images.length - 1, Math.max(0, next)));
  }

  function go(to: number) {
    const node = trackRef.current;
    if (!node) return;
    const clamped = Math.min(images.length - 1, Math.max(0, to));
    node.scrollTo({ left: clamped * node.clientWidth, behavior: "smooth" });
  }

  return (
    <div className="relative">
      <div
        ref={trackRef}
        onScroll={handleScroll}
        className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {images.map((url) => (
          <img
            key={url}
            src={url}
            alt=""
            className="aspect-4/3 w-full shrink-0 snap-center bg-surface object-cover sm:aspect-21/9"
          />
        ))}
      </div>

      {/* pointer-events-none: o degradê é enfeite, não pode roubar o arrasto da foto */}
      <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-ink/80 via-ink/30 to-transparent" />

      {many && (
        <>
          <button
            type="button"
            onClick={() => go(index - 1)}
            disabled={index === 0}
            aria-label="Foto anterior"
            className="absolute top-1/2 left-2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-ink/50 text-white backdrop-blur-sm transition hover:bg-ink/70 disabled:opacity-0 md:left-4"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => go(index + 1)}
            disabled={index === images.length - 1}
            aria-label="Próxima foto"
            className="absolute top-1/2 right-2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-ink/50 text-white backdrop-blur-sm transition hover:bg-ink/70 disabled:opacity-0 md:right-4"
          >
            <ChevronRight className="h-5 w-5" aria-hidden />
          </button>

          {/* pontos: quem só olha o celular vê de longe quantas fotos faltam */}
          <div className="absolute right-4 bottom-7 flex gap-1.5 md:bottom-11">
            {images.map((url, i) => (
              <button
                key={url}
                type="button"
                onClick={() => go(i)}
                aria-label={`Ver foto ${i + 1}`}
                aria-current={i === index}
                className={`h-1.5 rounded-full transition-all ${
                  i === index ? "w-5 bg-white" : "w-1.5 bg-white/50 hover:bg-white/80"
                }`}
              />
            ))}
          </div>
        </>
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-0">
        <div className="shell pb-6 md:pb-10">{children}</div>
      </div>
    </div>
  );
}
