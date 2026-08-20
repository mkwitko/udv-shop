// Regras de senha vivem num lugar só: a API recusa `min(10).max(200)` em
// /auth/register e /auth/reset-password, e a tela precisa dizer isso ANTES do
// envio. Se a API mudar o mínimo, é aqui que muda — não em três telas.
export const PASSWORD_MIN = 10;
export const PASSWORD_MAX = 200;

export interface PasswordRule {
  id: string;
  label: string;
  /** obrigatória = a API recusa sem ela. As outras são dica de força. */
  required: boolean;
  test: (value: string) => boolean;
}

export const PASSWORD_RULES: PasswordRule[] = [
  {
    id: "min",
    label: `Pelo menos ${PASSWORD_MIN} caracteres`,
    required: true,
    test: (v) => v.length >= PASSWORD_MIN,
  },
  {
    id: "max",
    label: `No máximo ${PASSWORD_MAX} caracteres`,
    required: true,
    test: (v) => v.length <= PASSWORD_MAX,
  },
  {
    id: "letter",
    label: "Uma letra (recomendado)",
    required: false,
    test: (v) => /\p{L}/u.test(v),
  },
  {
    id: "number",
    label: "Um número (recomendado)",
    required: false,
    test: (v) => /\d/.test(v),
  },
  {
    id: "symbol",
    label: "Um símbolo, tipo ! ? @ (recomendado)",
    required: false,
    test: (v) => /[^\p{L}\d]/u.test(v),
  },
];

export type PasswordStrength = "vazia" | "fraca" | "media" | "boa" | "forte";

const STRENGTH_LABEL: Record<PasswordStrength, string> = {
  vazia: "",
  fraca: "Senha fraca",
  media: "Senha média",
  boa: "Senha boa",
  forte: "Senha forte",
};

export function passwordStrengthLabel(strength: PasswordStrength): string {
  return STRENGTH_LABEL[strength];
}

/**
 * Força medida por tamanho + variedade. Não é gate: a API só exige o tamanho.
 * Serve para o usuário decidir se quer melhorar, não para bloquear o cadastro.
 */
export function passwordStrength(value: string): PasswordStrength {
  if (value.length === 0) return "vazia";
  if (value.length < PASSWORD_MIN) return "fraca";

  let score = 1;
  if (value.length >= 14) score += 1;
  const variety = PASSWORD_RULES.filter((r) => !r.required && r.test(value)).length;
  if (variety >= 2) score += 1;
  if (variety >= 3) score += 1;

  if (score >= 4) return "forte";
  if (score === 3) return "boa";
  if (score === 2) return "media";
  return "fraca";
}

export interface PasswordCheck {
  rule: PasswordRule;
  ok: boolean;
}

export function checkPassword(value: string): PasswordCheck[] {
  return PASSWORD_RULES.map((rule) => ({ rule, ok: rule.test(value) }));
}

/** As obrigatórias passaram? Espelha o que a API vai aceitar. */
export function passwordMeetsApi(value: string): boolean {
  return PASSWORD_RULES.filter((r) => r.required).every((r) => r.test(value));
}
