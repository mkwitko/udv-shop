import { ApiError } from "./fetch-client";

// A API devolve `{ error: "codigo" }`. Mensagem em inglês de servidor não vai para a tela.
const MESSAGES: Record<string, string> = {
  invalid_credentials: "E-mail ou senha não conferem.",
  email_in_use: "Já existe uma conta com esse e-mail.",
  slug_in_use: "Esse endereço de loja já está em uso. Escolha outro.",
  invalid_token: "Esse link expirou. Peça outro.",
  rate_limited: "Muitas tentativas seguidas. Espere um minuto e tente de novo.",
  validation_error: "Confira os campos destacados.",

  // compra e doação
  payments_not_configured:
    "Esta loja ainda não terminou de configurar o recebimento. Avise quem organiza e tente mais tarde.",
  insufficient_stock: "Não tem essa quantidade em estoque. Diminua e tente de novo.",
  product_not_orderable: "Este produto não está à venda no momento.",
  product_not_on_demand: "Este produto não aceita lista de espera.",
  product_available: "Este produto está disponível — dá para comprar agora.",
  product_not_found: "Este produto não existe mais.",
  store_not_found: "Esta loja não existe mais.",
  campaign_not_found: "Esta campanha não existe mais.",
  campaign_not_open: "Esta campanha já foi encerrada.",
  donation_type_not_accepted: "Esta campanha não aceita esse tipo de doação.",
  monthly_not_supported_for_provider:
    "Doação mensal não está disponível nessa forma de pagamento. Tente a outra opção.",
  subscription_already_cancelled: "Essa contribuição mensal já estava cancelada.",
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
