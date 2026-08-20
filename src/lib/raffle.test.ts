import { describe, expect, it } from "vitest";
import { buildPrizes, emptyPrize, type PrizeDraft } from "./raffle";

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
