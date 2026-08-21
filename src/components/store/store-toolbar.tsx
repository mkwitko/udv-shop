import { Search, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { Input, Select } from "#/components/ui/field";
import { type CatalogSearch, ORDER_OPTIONS } from "#/lib/api/store-catalog";

export type ToolbarCategory = { slug: string; name: string; productCount: number };

const pillBase =
  "shrink-0 rounded-full border px-4 py-2 font-medium text-sm transition-colors [transition-duration:var(--dur)]";

/**
 * Barra de navegação da vitrine: gaveta, busca e ordem. Cola no topo abaixo do cabeçalho
 * porque numa loja de 60 itens a pessoa decide filtrar depois de já ter rolado — voltar
 * ao topo para trocar de categoria é o que fazia todo mundo desistir.
 *
 * O deslocamento do `sticky` acompanha a altura real do cabeçalho: pílula de 3.5rem a
 * 0.75rem da borda no desktop, mais a fileira de abas que só existe no celular.
 */
export function StoreToolbar({
  categories,
  value,
  onChange,
  total,
}: {
  categories: ToolbarCategory[];
  value: CatalogSearch;
  onChange: (patch: CatalogSearch) => void;
  /** Quantos produtos o filtro atual encontrou, quando já se sabe. */
  total?: number | undefined;
}) {
  const searchId = useId();
  const orderId = useId();
  const [term, setTerm] = useState(value.q ?? "");
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  // gaveta vazia não vira botão: prometer "Chás 0" é pior do que não mostrar
  const withProducts = categories.filter((category) => category.productCount > 0);

  // a URL é a fonte da verdade: botão voltar, link colado e SSR têm de reescrever o campo
  useEffect(() => {
    setTerm(value.q ?? "");
  }, [value.q]);

  useEffect(
    () => () => {
      if (debounce.current) clearTimeout(debounce.current);
    },
    [],
  );

  function search(next: string) {
    setTerm(next);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => onChange({ q: next.trim() || undefined }), 350);
  }

  function clearSearch() {
    if (debounce.current) clearTimeout(debounce.current);
    setTerm("");
    onChange({ q: undefined });
  }

  return (
    // no celular a barra encosta logo abaixo da pílula do cabeçalho e o `pt` cobre a
    // faixa onde flutuam as abas da loja — sem isso sobrava um vão com produto passando
    <div className="sticky top-[4.25rem] z-30 border-line border-b bg-bg/92 pt-10 backdrop-blur-md md:top-[4.5rem] md:pt-0">
      {/* no desktop cabe tudo numa linha: gavetas à esquerda, busca e ordem à direita.
          `flex-row-reverse` mantém a busca antes das gavetas no DOM (que é a ordem certa
          no celular) sem inverter o que se lê na tela grande. */}
      <div className="shell grid gap-2.5 py-3 md:flex md:flex-row-reverse md:items-center md:gap-4">
        <div className="flex items-center gap-2 md:shrink-0">
          <div className="relative min-w-0 flex-1 md:w-[20rem] md:flex-none">
            <Search
              className="pointer-events-none absolute inset-y-0 left-3.5 my-auto h-4 w-4 text-muted"
              aria-hidden
            />
            <label className="sr-only" htmlFor={searchId}>
              Buscar na loja
            </label>
            <Input
              id={searchId}
              type="search"
              inputMode="search"
              placeholder="Buscar produto"
              // o X nativo do type=search aparecia ao lado do nosso: dois botões de limpar
              className="pr-10 pl-10 [&::-webkit-search-cancel-button]:hidden"
              value={term}
              onChange={(event) => search(event.target.value)}
            />
            {term && (
              <button
                type="button"
                onClick={clearSearch}
                aria-label="Apagar busca"
                className="absolute inset-y-0 right-2 my-auto grid h-8 w-8 place-items-center rounded-full text-muted transition-colors [transition-duration:var(--dur)] hover:bg-surface hover:text-ink"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            )}
          </div>

          <label className="sr-only" htmlFor={orderId}>
            Ordenar por
          </label>
          {/* a largura vai no invólucro: o Select desenha a seta num wrapper `w-full`,
              e sem isto ele comia o campo de busca */}
          <div className="w-[8.5rem] shrink-0 sm:w-[11rem]">
            <Select
              id={orderId}
              value={value.ordem ?? "recentes"}
              onChange={(event) =>
                onChange({ ordem: event.target.value as CatalogSearch["ordem"] })
              }
            >
              {ORDER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {withProducts.length > 0 && (
          <nav
            className="scroll-row items-center md:min-w-0 md:flex-1"
            aria-label="Categorias da loja"
          >
            <button
              type="button"
              aria-current={value.categoria ? undefined : "true"}
              onClick={() => onChange({ categoria: undefined })}
              className={
                value.categoria
                  ? `${pillBase} border-line bg-elevated text-muted hover:text-ink`
                  : `${pillBase} border-ink bg-ink text-bg`
              }
            >
              Tudo
              {total !== undefined && !value.categoria && (
                <span className="ml-1.5 tabular-nums opacity-70">{total}</span>
              )}
            </button>
            {withProducts.map((category) => {
              const active = value.categoria === category.slug;
              return (
                <button
                  key={category.slug}
                  type="button"
                  aria-current={active ? "true" : undefined}
                  onClick={() => onChange({ categoria: active ? undefined : category.slug })}
                  className={
                    active
                      ? `${pillBase} border-ink bg-ink text-bg`
                      : `${pillBase} border-line bg-elevated text-muted hover:text-ink`
                  }
                >
                  {category.name}
                  <span className="ml-1.5 tabular-nums opacity-70">{category.productCount}</span>
                </button>
              );
            })}
          </nav>
        )}
      </div>
    </div>
  );
}
