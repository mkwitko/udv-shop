/** Teto do campo: R$ 99.999.999,99 — acima disso é dedo escorregando, não preço. */
const MAX_DIGITS = 10;

const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
});

/**
 * Máscara de dinheiro que preenche da direita para a esquerda: cada dígito
 * digitado empurra o valor uma casa. "2990" → "R$ 29,90". Colar "R$ 1.250,00"
 * também funciona, porque só os dígitos importam.
 * String vazia continua vazia — placeholder é mais claro que um "R$ 0,00" fixo.
 */
export function maskAmountInput(raw: string): string {
  const digits = raw
    .replace(/\D/g, "")
    .replace(/^0+(?=\d)/, "")
    .slice(0, MAX_DIGITS);
  if (!digits) return "";
  return BRL.format(Number(digits) / 100);
}

/** "25", "25,50", "R$ 25,50", "1.250,00" → centavos; null quando não dá para entender. */
export function parseAmount(raw: string): number | null {
  const cleaned = raw
    .replace(/[^\d,.]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  if (!cleaned) return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.round(value * 100);
}
