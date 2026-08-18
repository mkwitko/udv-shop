import { describe, expect, it } from "vitest";
import { errorMessage } from "./error-message";
import { ApiError } from "./fetch-client";

describe("errorMessage", () => {
  it("traduz código conhecido da API", () => {
    const error = new ApiError(401, "invalid_credentials", "invalid credentials");
    expect(errorMessage(error)).toBe("E-mail ou senha não conferem.");
  });

  it("não joga mensagem crua de servidor na tela em erro 5xx", () => {
    const error = new ApiError(500, "internal", "Cannot read properties of undefined");
    expect(errorMessage(error)).not.toContain("undefined");
  });

  it("429 vira aviso de tentativa em excesso mesmo sem código", () => {
    expect(errorMessage(new ApiError(429, "http_429", "Too Many Requests"))).toContain(
      "tentativas",
    );
  });

  it("falha de rede não vira erro genérico", () => {
    expect(errorMessage(new TypeError("Failed to fetch"))).toContain("Sem conexão");
  });

  it("erro desconhecido cai no texto padrão", () => {
    expect(errorMessage({ nope: true })).toBe("Não deu para concluir agora.");
  });
});
