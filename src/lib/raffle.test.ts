import { describe, expect, it } from "vitest";
import {
  buildPrizes,
  dayEndIso,
  dayStartIso,
  emptyPrize,
  isoEndToLocalDate,
  isoToLocalDate,
  type PrizeDraft,
} from "./raffle";

function draft(over: Partial<PrizeDraft> = {}): PrizeDraft {
  return { ...emptyPrize(), title: "Cesta de produtos", ...over };
}

describe("buildPrizes", () => {
  it("numera pela ordem da lista", () => {
    const built = buildPrizes([draft({ title: "Cesta" }), draft({ title: "Camiseta" })]);
    expect(built).toEqual({
      prizes: [
        { position: 1, title: "Cesta", description: undefined, images: [] },
        { position: 2, title: "Camiseta", description: undefined, images: [] },
      ],
    });
  });

  it("manda só as keys das fotos e omite descrição vazia", () => {
    const built = buildPrizes([
      draft({
        description: "   ",
        images: [{ key: "stores/nx/a.jpg", url: "https://cdn/a.jpg" }],
      }),
    ]);
    expect(built).toEqual({
      prizes: [
        {
          position: 1,
          title: "Cesta de produtos",
          description: undefined,
          images: ["stores/nx/a.jpg"],
        },
      ],
    });
  });

  it("apara espaços de título e descrição", () => {
    const built = buildPrizes([draft({ title: "  Cesta  ", description: "  com café  " })]);
    expect(built).toEqual({
      prizes: [{ position: 1, title: "Cesta", description: "com café", images: [] }],
    });
  });

  it("recusa lista vazia e prêmio sem nome", () => {
    expect(buildPrizes([])).toEqual({ error: "Adicione pelo menos um prêmio." });
    expect(buildPrizes([draft({ title: " " })])).toEqual({ error: "Diga o que é cada prêmio." });
  });
});

describe("janela em dia local", () => {
  it("início do dia local vira ISO UTC", () => {
    expect(dayStartIso("2026-09-01")).toBe(new Date(2026, 8, 1, 0, 0, 0, 0).toISOString());
  });

  it("fim do dia local é a meia-noite do dia seguinte, para a janela ser semiaberta", () => {
    expect(dayEndIso("2026-09-30")).toBe(new Date(2026, 9, 1, 0, 0, 0, 0).toISOString());
  });

  it("fim de um mês emenda no início do seguinte sem sobrepor", () => {
    expect(dayEndIso("2026-08-31")).toBe(dayStartIso("2026-09-01"));
  });

  it("dia vazio devolve string vazia", () => {
    expect(dayStartIso("")).toBe("");
    expect(dayEndIso("")).toBe("");
  });

  it("ida e volta preserva o dia digitado", () => {
    expect(isoToLocalDate(dayStartIso("2026-09-01"))).toBe("2026-09-01");
    expect(isoEndToLocalDate(dayEndIso("2026-09-30"))).toBe("2026-09-30");
  });

  it("data nula não vira dia", () => {
    expect(isoToLocalDate(null)).toBe("");
    expect(isoEndToLocalDate(undefined)).toBe("");
  });
});
