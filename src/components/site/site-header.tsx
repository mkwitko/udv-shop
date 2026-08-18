import { Link } from "@tanstack/react-router";
import { LogoMark } from "#/components/site/logo";
import { Button } from "#/components/ui/button";
import { ThemeToggle } from "#/components/ui/theme-toggle";
import { useSession } from "#/lib/auth/session";

const navLinkClass =
  "rounded-full px-3 py-2 text-sm text-muted transition-colors [transition-duration:var(--dur)] hover:text-ink";

/** Nav em pílula flutuante — descolada da borda, como um controle na mão. */
export function SiteHeader({ storeSlug, storeName }: { storeSlug?: string; storeName?: string }) {
  const { status, user } = useSession();

  return (
    <header className="sticky top-3 z-40">
      <div className="shell">
        <div className="flex h-14 items-center justify-between gap-3 rounded-full border border-line bg-elevated/85 px-3 shadow-[var(--shadow-card)] backdrop-blur-md sm:px-4">
          <div className="flex min-w-0 items-center gap-5">
            <Link
              to={storeSlug ? "/loja/$slug" : "/"}
              params={storeSlug ? { slug: storeSlug } : undefined}
              className="flex min-w-0 items-center gap-2.5 font-bold font-display tracking-tight"
            >
              <LogoMark />
              <span className="truncate">{storeName ?? "Colheita"}</span>
            </Link>

            <nav className="hidden items-center gap-0.5 md:flex">
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

          <div className="flex shrink-0 items-center gap-2">
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

        {storeSlug && (
          <nav
            className="scroll-row mx-auto mt-2 w-fit max-w-full rounded-full border border-line bg-elevated/85 px-2 py-1 backdrop-blur-md md:hidden"
            aria-label="Seções da loja"
          >
            <Link to="/loja/$slug" params={{ slug: storeSlug }} className={navLinkClass}>
              Produtos
            </Link>
            <Link to="/loja/$slug/campanhas" params={{ slug: storeSlug }} className={navLinkClass}>
              Campanhas
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}
