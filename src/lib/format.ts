const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const dateFmt = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "long",
  timeZone: "America/Sao_Paulo",
});

/** Dinheiro chega sempre em centavos inteiros do backend — nunca dividir antes daqui. */
export function money(cents: number): string {
  return brl.format(cents / 100);
}

export function longDate(iso: string): string {
  return dateFmt.format(new Date(iso));
}

export function percent(part: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.round((part / total) * 100));
}

/**
 * Exibe um telefone guardado pela API — que vem em dígitos com DDI, "5548999995678" — na forma
 * de sempre. Usado onde a loja lê o contato de quem participou sem conta.
 */
export function formatStoredPhone(stored: string): string {
  const digits = stored.replace(/\D/g, "");
  const national = digits.startsWith("55") && digits.length > 11 ? digits.slice(2) : digits;
  return formatPhone(national);
}

/** "(48) 99999-9999" a partir do que a pessoa digitar; guarda só dígitos na API. */
export function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10)
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}
