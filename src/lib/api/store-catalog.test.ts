import { describe, expect, it } from "vitest";
import {
  CatalogSearchSchema,
  cleanSearch,
  hasActiveFilters,
  storeCatalogInfiniteOptions,
} from "./store-catalog";

describe("filtros da vitrine", () => {
  it("tira da URL o que não filtra nada", () => {
    expect(cleanSearch({ categoria: "", q: "   ", ordem: "recentes" })).toEqual({});
  });

  it("mantém categoria, termo aparado e ordem diferente do padrão", () => {
    expect(cleanSearch({ categoria: "chas", q: "  mel ", ordem: "preco-asc" })).toEqual({
      categoria: "chas",
      q: "mel",
      ordem: "preco-asc",
    });
  });

  it("ordem padrão não vira parâmetro", () => {
    expect(cleanSearch({ ordem: "recentes" })).toEqual({});
    expect(hasActiveFilters({ ordem: "recentes" })).toBe(false);
    expect(hasActiveFilters({ categoria: "chas" })).toBe(true);
  });

  it("recusa ordem que não existe — link torto não vira query estranha na API", () => {
    expect(CatalogSearchSchema.safeParse({ ordem: "mais-barato" }).success).toBe(false);
    expect(CatalogSearchSchema.safeParse({ ordem: "preco-desc" }).success).toBe(true);
  });

  it("traduz a ordem da URL para o contrato da API", () => {
    const key = (ordem: "recentes" | "preco-asc" | "preco-desc" | undefined) =>
      storeCatalogInfiniteOptions("nx", { ordem }).queryKey[2];

    expect(key(undefined)).toMatchObject({ sort: "recent" });
    expect(key("recentes")).toMatchObject({ sort: "recent" });
    expect(key("preco-asc")).toMatchObject({ sort: "price_asc" });
    expect(key("preco-desc")).toMatchObject({ sort: "price_desc" });
  });

  it("filtros diferentes são queries diferentes — uma não reaproveita a página da outra", () => {
    const a = storeCatalogInfiniteOptions("nx", { categoria: "chas" }).queryKey;
    const b = storeCatalogInfiniteOptions("nx", { categoria: "arte" }).queryKey;
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(b));
  });

  it("só manda para a API o parâmetro que existe", () => {
    const params = storeCatalogInfiniteOptions("nx", {}).queryKey[2] as Record<string, unknown>;
    expect(params).not.toHaveProperty("category");
    expect(params).not.toHaveProperty("q");
  });
});
