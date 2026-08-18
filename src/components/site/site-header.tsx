import { Link } from "@tanstack/react-router";
import { Button } from "#/components/ui/button";

export function SiteHeader({ storeSlug, storeName }: { storeSlug?: string; storeName?: string }) {
  return (
    <header className="border-b border-[var(--line)]">
      <div className="shell flex items-center justify-between gap-6 py-5">
        <Link
          to={storeSlug ? "/loja/$slug" : "/"}
          params={storeSlug ? { slug: storeSlug } : undefined}
          className="font-display text-xl leading-none tracking-tight"
        >
          {storeName ?? "Lojinha dos Núcleos"}
        </Link>

        <nav className="flex items-center gap-1 text-sm">
          {storeSlug ? (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/loja/$slug" params={{ slug: storeSlug }}>
                  Produtos
                </Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link to="/loja/$slug/campanhas" params={{ slug: storeSlug }}>
                  Campanhas
                </Link>
              </Button>
            </>
          ) : (
            <Button asChild variant="ghost" size="sm">
              <Link to="/lojas">Lojas</Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
