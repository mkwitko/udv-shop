import { describe, expect, it } from "vitest";
import { campaignShareText, openRaffle, pickOgImage, remainingCents } from "./campaign";
import { money } from "./format";

const prize = (over: Partial<{ title: string; imageUrls: string[] }> = {}) => ({
  title: "Cesta de produtos",
  imageUrls: [] as string[],
  ...over,
});

const raffle = (over: Partial<ReturnType<typeof baseRaffle>> = {}) => ({
  ...baseRaffle(),
  ...over,
});
function baseRaffle() {
  return {
    status: "open" as string,
    title: "Sorteio de setembro",
    centsPerNumber: 1000,
    prizes: [prize()],
  };
}

describe("remainingCents", () => {
  it("diz quanto falta para a meta", () => {
    expect(remainingCents(30_000, 100_000)).toBe(70_000);
  });

  it("meta batida ou passada não devolve número negativo", () => {
    expect(remainingCents(100_000, 100_000)).toBe(0);
    expect(remainingCents(120_000, 100_000)).toBe(0);
  });

  it("campanha sem meta não tem quanto falta", () => {
    expect(remainingCents(30_000, null)).toBeNull();
  });
});

describe("openRaffle", () => {
  it("pega o sorteio que ainda está no ar", () => {
    const aberto = raffle({ title: "Sorteio de outubro" });
    expect(openRaffle([raffle({ status: "drawn" }), aberto])).toBe(aberto);
  });

  it("sem sorteio no ar (ou sem sorteio) devolve null", () => {
    expect(openRaffle([raffle({ status: "drawn" }), raffle({ status: "cancelled" })])).toBeNull();
    expect(openRaffle([])).toBeNull();
    expect(openRaffle(undefined)).toBeNull();
  });
});

describe("pickOgImage", () => {
  it("prefere a capa da campanha", () => {
    expect(
      pickOgImage("https://cdn/capa.jpg", [raffle({ prizes: [prize({ imageUrls: ["p.jpg"] })] })]),
    ).toBe("https://cdn/capa.jpg");
  });

  it("sem capa, usa a foto do primeiro prêmio que tiver uma", () => {
    expect(
      pickOgImage(null, [
        raffle({ prizes: [prize(), prize({ imageUrls: ["https://cdn/p2.jpg"] })] }),
      ]),
    ).toBe("https://cdn/p2.jpg");
  });

  it("sem capa e sem foto de prêmio, fica sem imagem", () => {
    expect(pickOgImage(null, [raffle()])).toBeUndefined();
    expect(pickOgImage(null, undefined)).toBeUndefined();
  });
});

describe("campaignShareText", () => {
  it("com meta, diz quanto falta", () => {
    // money() usa espaço fino não-quebrável entre "R$" e o número: montar com ele evita
    // um teste que falha por um caractere que ninguém vê
    expect(campaignShareText("Reforma do templo", "Núcleo", 70_000)).toBe(
      `Reforma do templo, do Núcleo. Faltam ${money(70_000)} para a meta — qualquer valor auxilia.`,
    );
  });

  it("meta batida vira convite a continuar", () => {
    expect(campaignShareText("Reforma do templo", "Núcleo", 0)).toBe(
      "Reforma do templo, do Núcleo. A meta foi batida e a campanha segue aberta.",
    );
  });

  it("sem meta, convida do mesmo jeito", () => {
    expect(campaignShareText("Reforma do templo", "Núcleo", null)).toBe(
      "Reforma do templo, do Núcleo. Qualquer valor auxilia.",
    );
  });
});
