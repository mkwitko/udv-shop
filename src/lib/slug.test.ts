import { describe, expect, it } from "vitest";
import { slugify } from "./slug";

describe("slugify", () => {
  it("tira acento, caixa e pontuação", () => {
    expect(slugify("Núcleo Estrela do Norte")).toBe("nucleo-estrela-do-norte");
    expect(slugify("São João — 2026!")).toBe("sao-joao-2026");
  });

  it("não deixa hífen sobrando nas pontas", () => {
    expect(slugify("  --Loja--  ")).toBe("loja");
  });

  it("respeita o limite de 60 do schema da API sem terminar em hífen", () => {
    const long = slugify("a".repeat(58) + " bc");
    expect(long.length).toBeLessThanOrEqual(60);
    expect(long.endsWith("-")).toBe(false);
  });

  it("aceita o que a regex da API aceita", () => {
    const apiRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    for (const name of ["Núcleo Céu Azul", "Loja 24h", "Amazônia & Cia"]) {
      expect(slugify(name)).toMatch(apiRegex);
    }
  });
});
