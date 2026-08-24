import { maskAmountInput, parseAmount } from "#/lib/pay/amount";

export type PayoutMode = "fixed" | "percent";

/** "60" e "60,5" viram basis points; fora de 0–100 é recusado. */
export function parsePercentBps(raw: string): number | null {
  const clean = raw.trim().replace("%", "").replace(",", ".");
  if (clean === "") return null;
  const value = Number(clean);
  if (!Number.isFinite(value) || value < 0 || value > 100) return null;
  return Math.round(value * 100);
}

/**
 * Quanto vai para o parceiro em uma unidade. Espelha `unitPayoutCents` da API — se
 * as duas contas divergirem, a tela promete um número e o extrato mostra outro.
 */
export function payoutUnitCents(mode: PayoutMode, raw: string, priceCents: number): number | null {
  if (mode === "fixed") {
    const cents = parseAmount(raw);
    if (cents === null || cents < 0) return null;
    return Math.min(cents, priceCents);
  }
  const bps = parsePercentBps(raw);
  if (bps === null) return null;
  return Math.floor((priceCents * bps) / 10000);
}

/** O que a API vai gravar: `value` é centavos no modo fixo e basis points no percentual. */
export function payoutValueForApi(mode: PayoutMode, raw: string): number | null {
  return mode === "fixed" ? parseAmount(raw) : parsePercentBps(raw);
}

export type PayoutBreakdown = {
  priceCents: number;
  payoutCents: number;
  feeCents: number;
  storeCents: number;
};

/**
 * A taxa da plataforma sai antes da divisão. Sem mostrar as três linhas juntas a loja
 * combina um repasse que não caberia no que ela recebe.
 */
export function payoutBreakdown(
  priceCents: number,
  payoutCents: number,
  applicationFeeBps: number,
): PayoutBreakdown {
  const feeCents = Math.floor((priceCents * applicationFeeBps) / 10000);
  return {
    priceCents,
    payoutCents,
    feeCents,
    storeCents: priceCents - feeCents - payoutCents,
  };
}

export function formatPercentFromBps(bps: number): string {
  const percent = bps / 100;
  return `${percent.toString().replace(".", ",")}%`;
}

/**
 * Volta do formato da API para o que a pessoa digitou: centavos mascarados no modo fixo,
 * porcentagem no percentual. Valor fixo já entra mascarado porque o campo é MoneyInput e um
 * "45,90" cru ficaria fora do formato que a máscara escreve.
 */
export function payoutValueToInput(
  payout: { kind: string; value: number } | null | undefined,
): string {
  if (!payout) return "";
  return payout.kind === "percent_bps"
    ? String(payout.value / 100).replace(".", ",")
    : maskAmountInput(String(payout.value));
}
