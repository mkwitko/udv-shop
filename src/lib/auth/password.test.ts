import { describe, expect, it } from "vitest";
import { checkPassword, PASSWORD_MIN, passwordMeetsApi, passwordStrength } from "./password";

describe("regras de senha", () => {
  it("mínimo espelha a API (10 caracteres)", () => {
    expect(PASSWORD_MIN).toBe(10);
    expect(passwordMeetsApi("123456789")).toBe(false);
    expect(passwordMeetsApi("1234567890")).toBe(true);
  });

  it("recusa senha acima do máximo da API", () => {
    expect(passwordMeetsApi("a".repeat(201))).toBe(false);
  });

  it("marca cada exigência de forma independente", () => {
    const checks = checkPassword("colheita10");
    const byId = Object.fromEntries(checks.map((c) => [c.rule.id, c.ok]));
    expect(byId.min).toBe(true);
    expect(byId.letter).toBe(true);
    expect(byId.number).toBe(true);
    expect(byId.symbol).toBe(false);
  });

  it("força cresce com tamanho e variedade", () => {
    expect(passwordStrength("")).toBe("vazia");
    expect(passwordStrength("abc")).toBe("fraca");
    expect(passwordStrength("aaaaaaaaaa")).toBe("fraca");
    expect(passwordStrength("abcdefgh10")).toBe("media");
    expect(passwordStrength("abcdefgh10!")).toBe("boa");
    expect(passwordStrength("colheita-tangerina-10!")).toBe("forte");
  });

  it("exigências opcionais não bloqueiam o cadastro", () => {
    expect(passwordMeetsApi("aaaaaaaaaaaa")).toBe(true);
  });
});
