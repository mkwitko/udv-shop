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
