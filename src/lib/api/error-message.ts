import { ApiError } from "./fetch-client";

// A API devolve `{ error: "codigo" }`. Mensagem em inglês de servidor não vai para a tela.
const MESSAGES: Record<string, string> = {
  invalid_credentials: "E-mail ou senha não conferem.",
  email_in_use: "Já existe uma conta com esse e-mail.",
  slug_in_use: "Esse endereço de loja já está em uso. Escolha outro.",
  invalid_token: "Esse link expirou. Peça outro.",
  rate_limited: "Muitas tentativas seguidas. Espere um minuto e tente de novo.",
  validation_error: "Confira os campos destacados.",
};

export function errorMessage(error: unknown, fallback = "Não deu para concluir agora."): string {
  if (error instanceof ApiError) {
    if (MESSAGES[error.code]) return MESSAGES[error.code];
    if (error.status === 429) return MESSAGES.rate_limited as string;
    if (error.status >= 500) return "A plataforma falhou nessa hora. Tente de novo em instantes.";
    return error.message || fallback;
  }
  if (error instanceof TypeError) return "Sem conexão com o servidor. Verifique a internet.";
  return fallback;
}
