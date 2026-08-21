import { money } from "#/lib/format";

/** O mínimo que a página de divulgação precisa saber de um sorteio. */
export type RaffleLike = {
  status: string;
  title: string;
  centsPerNumber: number;
  prizes: Array<{ title: string; imageUrls: string[] }>;
};

/** Quanto falta para a meta, ou `null` quando a campanha não tem meta. */
export function remainingCents(raisedCents: number, goalCents: number | null): number | null {
  if (!goalCents) return null;
  return Math.max(0, goalCents - raisedCents);
}

/** O sorteio que ainda aceita doação. É ele que vira chamariz no topo da página. */
export function openRaffle<T extends { status: string }>(raffles: T[] | undefined): T | null {
  return raffles?.find((raffle) => raffle.status === "open") ?? null;
}

/**
 * Imagem do link compartilhado. Sem capa, a foto do prêmio serve — link sem imagem no
 * WhatsApp aparece como uma linha de texto e quase ninguém abre.
 */
export function pickOgImage(
  coverImageUrl: string | null,
  raffles: RaffleLike[] | undefined,
): string | undefined {
  if (coverImageUrl) return coverImageUrl;
  for (const raffle of raffles ?? []) {
    for (const prize of raffle.prizes) {
      if (prize.imageUrls[0]) return prize.imageUrls[0];
    }
  }
  return undefined;
}

/**
 * Texto que vai junto do link. "Faltam R$ X" é o que faz alguém abrir: número concreto
 * convida mais do que um pedido genérico.
 */
export function campaignShareText(
  title: string,
  storeName: string,
  remaining: number | null,
): string {
  const head = `${title}, do ${storeName}.`;
  if (remaining === null) return `${head} Qualquer valor auxilia.`;
  if (remaining === 0) return `${head} A meta foi batida e a campanha segue aberta.`;
  return `${head} Faltam ${money(remaining)} para a meta — qualquer valor auxilia.`;
}
