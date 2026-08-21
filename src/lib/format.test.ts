import { describe, expect, it } from "vitest";
import { formatPhone, formatStoredPhone } from "./format";

describe("formatPhone", () => {
  it("formata celular conforme a pessoa digita", () => {
    expect(formatPhone("11988887777")).toBe("(11) 98888-7777");
  });

  it("formata fixo de 10 dígitos", () => {
    expect(formatPhone("1133334444")).toBe("(11) 3333-4444");
  });
});

describe("formatStoredPhone", () => {
  // A API guarda com DDI para o telefone servir de chave de identidade; a tela mostra do
  // jeito que a pessoa reconhece.
  it("tira o DDI de um celular guardado", () => {
    expect(formatStoredPhone("5548999995678")).toBe("(48) 99999-5678");
  });

  it("tira o DDI de um fixo guardado", () => {
    expect(formatStoredPhone("551133334444")).toBe("(11) 3333-4444");
  });

  it("não confunde DDD 55 com DDI", () => {
    expect(formatStoredPhone("5533334444")).toBe("(55) 3333-4444");
  });
});
