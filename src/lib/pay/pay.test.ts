import { describe, expect, it } from "vitest";
import { maskAmountInput, parseAmount } from "./amount";
import { formatRemaining, isExpired } from "./countdown";

// nbsp: o Intl pt-BR separa "R$" do número com espaço fino, não espaço comum
const brl = (s: string) => s.replace(/ /g, " ");

describe("maskAmountInput", () => {
  it("preenche da direita: cada dígito empurra uma casa", () => {
    expect(brl(maskAmountInput("2"))).toBe("R$ 0,02");
    expect(brl(maskAmountInput("29"))).toBe("R$ 0,29");
    expect(brl(maskAmountInput("299"))).toBe("R$ 2,99");
    expect(brl(maskAmountInput("2990"))).toBe("R$ 29,90");
    expect(brl(maskAmountInput("299000"))).toBe("R$ 2.990,00");
  });

  it("ignora o que não é dígito — colar valor formatado funciona", () => {
    expect(brl(maskAmountInput("R$ 1.250,00"))).toBe("R$ 1.250,00");
    expect(brl(maskAmountInput("abc45,90"))).toBe("R$ 45,90");
  });

  it("campo vazio continua vazio, e zero à esquerda não gruda", () => {
    expect(maskAmountInput("")).toBe("");
    expect(maskAmountInput("abc")).toBe("");
    expect(brl(maskAmountInput("0002990"))).toBe("R$ 29,90");
  });

  it("corta o excesso em vez de estourar o valor", () => {
    expect(brl(maskAmountInput("9".repeat(20)))).toBe("R$ 99.999.999,99");
  });

  it("o que a máscara escreve, parseAmount lê de volta", () => {
    expect(parseAmount(maskAmountInput("2990"))).toBe(2990);
    expect(parseAmount(maskAmountInput("299000"))).toBe(299000);
  });
});

describe("parseAmount", () => {
  it("entende os jeitos comuns de digitar dinheiro no Brasil", () => {
    expect(parseAmount("25")).toBe(2500);
    expect(parseAmount("25,50")).toBe(2550);
    expect(parseAmount("R$ 25,50")).toBe(2550);
    expect(parseAmount("1.250,00")).toBe(125000);
  });

  it("recusa o que não é valor", () => {
    expect(parseAmount("")).toBeNull();
    expect(parseAmount("abc")).toBeNull();
    expect(parseAmount("0")).toBeNull();
    expect(parseAmount("-10")).toBe(1000); // sinal é ignorado, vale o número
  });
});

describe("countdown", () => {
  const base = new Date("2026-08-18T12:00:00Z").getTime();

  it("formata mm:ss e não fica negativo", () => {
    expect(formatRemaining("2026-08-18T12:29:59Z", base)).toBe("29:59");
    expect(formatRemaining("2026-08-18T12:00:05Z", base)).toBe("00:05");
    expect(formatRemaining("2026-08-18T11:59:00Z", base)).toBe("00:00");
  });

  it("sabe quando expirou", () => {
    expect(isExpired("2026-08-18T12:00:01Z", base)).toBe(false);
    expect(isExpired("2026-08-18T12:00:00Z", base)).toBe(true);
  });
});
