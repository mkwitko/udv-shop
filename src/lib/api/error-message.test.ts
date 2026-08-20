import { describe, expect, it } from "vitest";
import { errorMessage, fieldErrors } from "./error-message";
import { ApiError } from "./fetch-client";

const validationError = () =>
  new ApiError(400, "validation_error", "validation_error", {
    code: "VALIDATION",
    message: "validation_error",
    details: [
      {
        keyword: "too_small",
        instancePath: "/password",
        message: "Too small: expected string to have >=10 characters",
        params: { origin: "string", minimum: 10, inclusive: true },
      },
    ],
    trace_id: "req-w",
  });

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

  it("slug cru da API não vaza para a tela", () => {
    expect(errorMessage(new ApiError(409, "algo_novo", "algo_novo"))).toBe(
      "Não deu para concluir agora.",
    );
  });

  it("validação da API vira aviso de campos destacados", () => {
    expect(errorMessage(validationError())).toBe("Confira os campos destacados.");
  });
});

describe("fieldErrors", () => {
  it("traduz o detalhe do zod no campo certo", () => {
    expect(fieldErrors(validationError())).toEqual([
      { field: "password", message: "Use pelo menos 10 caracteres na senha." },
    ]);
  });

  it("e-mail malformado vira mensagem de e-mail", () => {
    const error = new ApiError(400, "validation_error", "validation_error", {
      details: [{ keyword: "invalid_format", instancePath: "/email", params: { format: "email" } }],
    });
    expect(fieldErrors(error)).toEqual([{ field: "email", message: "E-mail inválido." }]);
  });

  it("erro sem details não inventa campo", () => {
    expect(fieldErrors(new ApiError(409, "email_in_use", "email_in_use"))).toEqual([]);
    expect(fieldErrors(new TypeError("Failed to fetch"))).toEqual([]);
  });
});
