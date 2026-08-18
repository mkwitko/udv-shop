import { describe, expect, it } from "vitest";
import { parseAmount } from "./amount";
import { formatRemaining, isExpired } from "./countdown";

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
