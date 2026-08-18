import { Link } from "@tanstack/react-router";
import { LogoMark } from "#/components/site/logo";
import { Button } from "#/components/ui/button";
import { ThemeToggle } from "#/components/ui/theme-toggle";
import { useSession } from "#/lib/auth/session";

const navLinkClass =
  "rounded-md px-3 py-2 text-sm text-muted transition-colors [transition-duration:var(--dur)] hover:text-ink";

export function SiteHeader({ storeSlug, storeName }: { storeSlug?: string; storeName?: string }) {
  const { status, user } = useSession();

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/80 backdrop-blur-md">
      <div className="shell flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <Link
            to={storeSlug ? "/loja/$slug" : "/"}
            params={storeSlug ? { slug: storeSlug } : undefined}
            className="flex items-center gap-2.5 font-display text-[0.98rem] font-semibold tracking-tight"
          >
            <LogoMark />
            {storeName ?? "lojinha"}
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {storeSlug ? (
              <>
                <Link to="/loja/$slug" params={{ slug: storeSlug }} className={navLinkClass}>
                  Produtos
                </Link>
                <Link
                  to="/loja/$slug/campanhas"
                  params={{ slug: storeSlug }}
                  className={navLinkClass}
                >
                  Campanhas
                </Link>
              </>
            ) : (
              <>
                <Link to="/" hash="recursos" className={navLinkClass}>
                  Recursos
                </Link>
                <Link to="/" hash="como-funciona" className={navLinkClass}>
                  Como funciona
                </Link>
                <Link to="/lojas" className={navLinkClass}>
                  Lojas
                </Link>
              </>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          {status === "authenticated" ? (
            <Button asChild size="sm" variant="secondary">
              <Link to="/conta">{user?.name?.split(" ")[0] ?? "Minha conta"}</Link>
            </Button>
          ) : status === "anonymous" ? (
            <>
              <Button asChild size="sm" variant="ghost" className="hidden sm:inline-flex">
                <Link to="/entrar">Entrar</Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/criar-conta">Criar minha loja</Link>
              </Button>
            </>
          ) : (
            // sessão ainda sendo restaurada: espaço reservado para o header não pular
            <div className="h-9 w-32" />
          )}
        </div>
      </div>
    </header>
  );
}
