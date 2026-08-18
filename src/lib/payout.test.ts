import { describe, expect, it } from "vitest";
import {
  formatPercentFromBps,
  parsePercentBps,
  payoutBreakdown,
  payoutUnitCents,
  payoutValueForApi,
} from "./payout";

describe("parsePercentBps", () => {
  it("aceita vírgula, símbolo e espaço", () => {
    expect(parsePercentBps("60")).toBe(6000);
    expect(parsePercentBps("60,5")).toBe(6050);
    expect(parsePercentBps(" 12% ")).toBe(1200);
  });

  it("recusa o que não é porcentagem válida", () => {
    expect(parsePercentBps("")).toBeNull();
    expect(parsePercentBps("abc")).toBeNull();
    expect(parsePercentBps("101")).toBeNull();
    expect(parsePercentBps("-5")).toBeNull();
  });
});

describe("payoutUnitCents", () => {
  it("valor fixo nunca passa do preço", () => {
    expect(payoutUnitCents("fixed", "40", 10000)).toBe(4000);
    expect(payoutUnitCents("fixed", "150", 10000)).toBe(10000);
  });

  it("percentual arredonda para baixo, como a API", () => {
    expect(payoutUnitCents("percent", "60", 10000)).toBe(6000);
    expect(payoutUnitCents("percent", "33,33", 999)).toBe(332);
  });

  it("devolve null quando não dá para entender", () => {
    expect(payoutUnitCents("fixed", "", 10000)).toBeNull();
    expect(payoutUnitCents("percent", "200", 10000)).toBeNull();
  });
});

describe("payoutBreakdown", () => {
  it("desconta a taxa antes de dividir", () => {
    expect(payoutBreakdown(10000, 6000, 500)).toEqual({
      priceCents: 10000,
      payoutCents: 6000,
      feeCents: 500,
      storeCents: 3500,
    });
  });

  it("sobra negativa aparece: é o aviso de que o acordo não cabe", () => {
    expect(payoutBreakdown(10000, 9800, 500).storeCents).toBe(-300);
  });
});

describe("payoutValueForApi", () => {
  it("manda centavos no fixo e basis points no percentual", () => {
    expect(payoutValueForApi("fixed", "40,50")).toBe(4050);
    expect(payoutValueForApi("percent", "60")).toBe(6000);
  });
});

describe("formatPercentFromBps", () => {
  it("volta para o número que a pessoa digitou", () => {
    expect(formatPercentFromBps(6000)).toBe("60%");
    expect(formatPercentFromBps(6050)).toBe("60,5%");
  });
});
