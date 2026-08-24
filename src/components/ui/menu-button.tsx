import { ChevronDown } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { cn } from "#/lib/utils";

/** Largura mínima do painel, usada para ele não nascer fora da tela no celular. */
const PANEL_WIDTH = 208;

/**
 * Botão que abre um painel curto de opções. Existe porque a navegação da gestão passou de
 * doze telas: em fileira elas estouravam a largura e viravam uma barra de rolagem onde
 * metade dos nomes ficava escondida sem avisar.
 *
 * O painel é `fixed` com a posição medida na hora, e não `absolute`: a fileira de abas rola
 * na horizontal (`overflow-x`), e dentro de um container que rola o painel absoluto era
 * recortado — abria e não aparecia. Por isso ele também fecha ao rolar ou redimensionar,
 * quando a medida envelhece.
 *
 * Fecha no Escape, no clique fora e em qualquer clique dentro — o painel é de navegação, e
 * quem clicou já está indo embora. Sem essas saídas, um menu aberto no celular fica tapando
 * a tela e a pessoa não descobre como sair.
 */
export function MenuButton({
  label,
  badge,
  active,
  children,
  indicator,
}: {
  label: string;
  /** Soma dos avisos das telas de dentro: fechado, o painel não pode esconder que alguém espera. */
  badge?: ReactNode;
  active: boolean;
  children: ReactNode;
  /** Sublinhado da aba ativa, desenhado por quem chama para o layout animado ser único. */
  indicator?: ReactNode;
}) {
  const [at, setAt] = useState<{ top: number; left: number } | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const open = at !== null;

  function toggle() {
    if (open) {
      setAt(null);
      return;
    }
    const box = trigger.current?.getBoundingClientRect();
    if (!box) return;
    setAt({
      top: box.bottom + 4,
      // no celular o botão pode estar perto da borda: o painel encosta, não vaza
      left: Math.max(8, Math.min(box.left, window.innerWidth - PANEL_WIDTH - 8)),
    });
  }

  useEffect(() => {
    if (!open) return;
    const close = () => setAt(null);
    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (trigger.current?.contains(target) || panel.current?.contains(target)) return;
      close();
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }
    // Escolher um item fecha o painel. O listener vive no ref, não num onClick do container:
    // o clique de verdade é no link, e Enter no teclado dispara este mesmo evento — o
    // handler no container só serviria para o mouse.
    const chosen = panel.current;
    chosen?.addEventListener("click", close);
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    // captura: a rolagem que importa é a da fileira de abas, não só a da página
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      chosen?.removeEventListener("click", close);
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  return (
    <>
      <button
        ref={trigger}
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={toggle}
        className={cn(
          "relative flex items-center gap-1 whitespace-nowrap px-3 pb-3 text-sm transition-colors [transition-duration:var(--dur)]",
          active ? "font-semibold text-ink" : "text-muted hover:text-ink",
        )}
      >
        {label}
        {badge}
        <ChevronDown
          className={cn("h-3.5 w-3.5 transition-transform [transition-duration:var(--dur)]", {
            "rotate-180": open,
          })}
          aria-hidden
        />
        {indicator}
      </button>

      {at && (
        <div
          ref={panel}
          role="menu"
          style={{ top: at.top, left: at.left, width: PANEL_WIDTH }}
          className="fixed z-50 grid gap-0.5 rounded-[0.9rem] border border-line bg-elevated p-1.5 shadow-lg"
        >
          {children}
        </div>
      )}
    </>
  );
}
