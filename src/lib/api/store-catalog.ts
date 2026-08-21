import { infiniteQueryOptions } from "@tanstack/react-query";
import { z } from "zod";
import type { Client, RequestConfig } from "#/lib/api/fetch-client";
import { listProducts } from "#/lib/api/gen/clients/listProducts";
import type { ListProducts200 } from "#/lib/api/gen/types/ListProducts";

/** Quantos produtos por página. Cabe uma tela e sobra motivo para o "Ver mais". */
export const CATALOG_PAGE_SIZE = 12;

/**
 * Ordem da vitrine em português na URL e em inglês na API: o link que a pessoa copia é
 * do site dela, o contrato é do backend.
 */
export const ORDER_OPTIONS = [
  { value: "recentes", label: "Novidades", api: "recent" },
  { value: "preco-asc", label: "Menor preço", api: "price_asc" },
  { value: "preco-desc", label: "Maior preço", api: "price_desc" },
] as const;

export type CatalogOrder = (typeof ORDER_OPTIONS)[number]["value"];

export const CatalogSearchSchema = z.object({
  categoria: z.string().max(80).optional(),
  q: z.string().max(80).optional(),
  ordem: z.enum(["recentes", "preco-asc", "preco-desc"]).optional(),
});
export type CatalogSearch = z.infer<typeof CatalogSearchSchema>;

export type CatalogFilters = {
  categoria?: string | undefined;
  q?: string | undefined;
  ordem?: CatalogOrder | undefined;
};

function apiSort(ordem: CatalogOrder | undefined) {
  return ORDER_OPTIONS.find((option) => option.value === ordem)?.api ?? "recent";
}

/**
 * Vitrine paginada por cursor. Fica como opções de query (e não um hook gerado) porque o
 * Kubb não gera infinite query e porque o loader do SSR precisa das mesmas chaves que a
 * página usa depois — chave diferente faria o servidor renderizar e o cliente buscar de novo.
 */
export function storeCatalogInfiniteOptions(
  slug: string,
  filters: CatalogFilters,
  config: Partial<RequestConfig> & { client?: Client } = {},
) {
  const params = {
    limit: CATALOG_PAGE_SIZE,
    ...(filters.categoria ? { category: filters.categoria } : {}),
    ...(filters.q ? { q: filters.q } : {}),
    sort: apiSort(filters.ordem),
  } as const;

  return infiniteQueryOptions({
    queryKey: ["store-catalog", slug, params] as const,
    queryFn: ({ pageParam, signal }) =>
      listProducts(
        slug,
        { ...params, ...(pageParam ? { cursor: pageParam } : {}) },
        { ...config, signal },
      ),
    initialPageParam: "" as string,
    getNextPageParam: (last: ListProducts200) => last.nextCursor ?? undefined,
  });
}

/** Só os filtros que valem — parâmetro vazio não entra na URL. */
export function cleanSearch(search: CatalogSearch): CatalogSearch {
  return {
    ...(search.categoria ? { categoria: search.categoria } : {}),
    ...(search.q?.trim() ? { q: search.q.trim() } : {}),
    ...(search.ordem && search.ordem !== "recentes" ? { ordem: search.ordem } : {}),
  };
}

export function hasActiveFilters(search: CatalogSearch): boolean {
  const clean = cleanSearch(search);
  return Boolean(clean.categoria || clean.q || clean.ordem);
}
