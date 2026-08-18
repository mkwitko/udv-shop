import { Link } from "@tanstack/react-router";
import { LogoMark } from "#/components/site/logo";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-line bg-surface">
      <div className="shell grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <p className="flex items-center gap-2.5 font-display font-semibold tracking-tight">
            <LogoMark />
            lojinha
          </p>
          <p className="mt-3 max-w-xs text-sm text-muted">
            Loja, campanhas e doações para cada núcleo, com o dinheiro caindo direto na conta de
            quem organiza.
          </p>
        </div>

        <nav className="grid gap-2 text-sm">
          <p className="kicker mb-1">Plataforma</p>
          <Link to="/" hash="recursos" className="text-muted hover:text-ink">
            Recursos
          </Link>
          <Link to="/" hash="como-funciona" className="text-muted hover:text-ink">
            Como funciona
          </Link>
          <Link to="/criar-conta" className="text-muted hover:text-ink">
            Criar conta
          </Link>
        </nav>

        <nav className="grid gap-2 text-sm">
          <p className="kicker mb-1">Comprar</p>
          <Link to="/lojas" className="text-muted hover:text-ink">
            Todas as lojas
          </Link>
          <Link to="/entrar" className="text-muted hover:text-ink">
            Entrar
          </Link>
        </nav>
      </div>

      <div className="shell flex flex-col gap-2 border-t border-line py-6 text-sm text-muted sm:flex-row sm:justify-between">
        <p>Cada loja é cuidada pelo seu próprio núcleo.</p>
        <p>© {new Date().getFullYear()} lojinha</p>
      </div>
    </footer>
  );
}
