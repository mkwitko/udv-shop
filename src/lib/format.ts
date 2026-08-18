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
