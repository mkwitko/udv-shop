import { ApiError } from "./fetch-client";

// A API devolve `{ error: "codigo" }`. Mensagem em inglês de servidor não vai para a tela.
const MESSAGES: Record<string, string> = {
  invalid_credentials: "E-mail ou senha não conferem.",
  email_in_use: "Já existe uma conta com esse e-mail.",
  slug_in_use: "Esse endereço de loja já está em uso. Escolha outro.",
  invalid_token: "Esse link expirou. Peça outro.",
  rate_limited: "Muitas tentativas seguidas. Espere um minuto e tente de novo.",
  validation_error: "Confira os campos destacados.",

  // provedor Pix: sem isso um AppID errado virava "Não deu para concluir agora."
  woovi_error: "A Woovi recusou a chamada. Confira a chave de API (AppID) da plataforma.",
  woovi_withdraw_blocked:
    "Ainda há saldo na chave atual e a Woovi bloqueou o saque, então a troca ficaria com dinheiro preso. Fale com quem cuida da plataforma antes de trocar.",
  woovi_unreachable: "Não conseguimos falar com a Woovi agora. Tente de novo em instantes.",

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

  // sorteio: cada um vale para um período, e período sobreposto deixaria a mesma doação
  // elegível a dois sorteios. Sem estas mensagens a tela dizia só "não deu para concluir"
  // e a pessoa não tinha como descobrir o que corrigir.
  raffle_window_overlap:
    "Esse período se cruza com o de outro sorteio desta campanha. Ajuste as datas para não se sobreporem.",
  raffle_open_ended_conflict:
    "Já existe um sorteio sem data de fim nesta campanha. Coloque uma data de fim nele antes de criar o próximo.",
  raffle_not_found: "Este sorteio não existe mais.",
  raffle_not_open: "Este sorteio já foi realizado e não pode mais ser alterado.",
  raffle_has_entries:
    "Já tem gente com números neste sorteio, então o valor do número não pode mudar. Prêmios e datas você ainda edita.",
  raffle_has_no_entries: "Ninguém tem números neste sorteio ainda, então não há o que sortear.",
  duplicate_prize_position: "Dois prêmios estão na mesma posição. Reordene a lista.",
  monthly_not_supported_for_provider:
    "Doação mensal não está disponível nessa forma de pagamento. Tente a outra opção.",
  subscription_already_cancelled: "Essa contribuição mensal já estava cancelada.",

  // ajuda de IA na descrição — nenhum desses erros impede salvar o produto
  ai_not_configured: "A ajuda de IA está desligada nesta plataforma.",
  ai_quota_exceeded: "A cota de IA do dia acabou. Tente amanhã ou escreva você mesmo.",
  ai_unavailable: "A IA não respondeu agora. Tente de novo em instantes.",
  ai_empty_response: "A IA não conseguiu escrever nada útil. Tente de novo.",
};

/** Slug de erro (snake_case) é código, não frase — nunca vai cru para a tela. */
const SLUG = /^[a-z][a-z0-9_]*$/;

export function errorMessage(error: unknown, fallback = "Não deu para concluir agora."): string {
  if (error instanceof ApiError) {
    if (MESSAGES[error.code]) return MESSAGES[error.code];
    if (error.status === 429) return MESSAGES.rate_limited as string;
    if (error.status >= 500) return "A plataforma falhou nessa hora. Tente de novo em instantes.";
    if (error.status === 400 && fieldErrors(error).length > 0) {
      return MESSAGES.validation_error as string;
    }
    if (!error.message || SLUG.test(error.message)) return fallback;
    return error.message;
  }
  if (error instanceof TypeError) return "Sem conexão com o servidor. Verifique a internet.";
  return fallback;
}

/** Um campo recusado pela validação da API, já com texto de tela. */
export interface ApiFieldError {
  /** nome do campo como está no corpo enviado — `password`, `email`, `name`. */
  field: string;
  message: string;
}

type ValidationIssue = {
  keyword?: string;
  instancePath?: string;
  path?: unknown;
  message?: string;
  params?: Record<string, unknown>;
};

// artigo junto do rótulo: sem ele sai "no senha", e erro de português na tela de
// erro é o pior lugar para ter erro de português.
const FIELD_LABEL: Record<string, { label: string; artigo: "o" | "a" }> = {
  name: { label: "nome", artigo: "o" },
  email: { label: "e-mail", artigo: "o" },
  password: { label: "senha", artigo: "a" },
  confirmPassword: { label: "confirmação de senha", artigo: "a" },
  slug: { label: "endereço da loja", artigo: "o" },
  phone: { label: "telefone", artigo: "o" },
};

const CAMPO = { label: "campo", artigo: "o" } as const;

function fieldFromIssue(issue: ValidationIssue): string | null {
  if (typeof issue.instancePath === "string" && issue.instancePath.length > 0) {
    const parts = issue.instancePath.split("/").filter(Boolean);
    // fastify manda `/password` no body e `/querystring/limit` fora dele
    return parts.at(-1) ?? null;
  }
  if (Array.isArray(issue.path) && issue.path.length > 0) return String(issue.path.at(-1));
  return null;
}

function num(params: Record<string, unknown> | undefined, key: string): number | null {
  const value = params?.[key];
  return typeof value === "number" ? value : null;
}

/** Traduz o motivo do zod/fastify. Mensagem crua da lib é inglês — não sobe para a tela. */
function issueMessage(issue: ValidationIssue, field: string): string {
  const { label, artigo } = FIELD_LABEL[field] ?? CAMPO;
  const em = `n${artigo} ${label}`; // "na senha" / "no nome"
  const o = `${artigo} ${label}`; // "a senha" / "o nome"
  const O = `${artigo.toUpperCase()} ${label}`; // "A senha" / "O nome"
  const min = num(issue.params, "minimum");
  const max = num(issue.params, "maximum");

  switch (issue.keyword) {
    case "too_small":
      if (min !== null && min > 1) return `Use pelo menos ${min} caracteres ${em}.`;
      return `Preencha ${o}.`;
    case "too_big":
      return max !== null ? `${O} passou de ${max} caracteres.` : `${O} é longo demais.`;
    case "invalid_format":
    case "invalid_string":
    case "format":
      return field === "email" ? "E-mail inválido." : `Confira ${o}.`;
    case "invalid_type":
      return `Preencha ${o}.`;
    default:
      return `Confira ${o}.`;
  }
}

/**
 * Lê `details` de um erro VALIDATION e devolve o que dizer em cada campo.
 * É isso que permite grudar o erro da API no input em vez de num aviso solto.
 */
export function fieldErrors(error: unknown): ApiFieldError[] {
  if (!(error instanceof ApiError)) return [];
  const details = error.details;
  if (!Array.isArray(details)) return [];

  const seen = new Set<string>();
  const out: ApiFieldError[] = [];
  for (const raw of details) {
    if (!raw || typeof raw !== "object") continue;
    const issue = raw as ValidationIssue;
    const field = fieldFromIssue(issue);
    if (!field || seen.has(field)) continue;
    seen.add(field);
    out.push({ field, message: issueMessage(issue, field) });
  }
  return out;
}
