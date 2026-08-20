import type { PickedImage } from "#/components/ui/image-picker";

/** Valor mínimo de um número da sorte, espelhando `RAFFLE_MIN_CENTS_PER_NUMBER` da API. */
export const RAFFLE_MIN_CENTS_PER_NUMBER = 100;
export const PRIZE_MAX_IMAGES = 6;

/** Prêmio em edição. `position` sai da ordem da lista, então não vive aqui. */
export type PrizeDraft = { id: string; title: string; description: string; images: PickedImage[] };

export type PrizePayload = {
  position: number;
  title: string;
  description?: string;
  images: string[];
};

let prizeSeq = 0;
export function emptyPrize(): PrizeDraft {
  prizeSeq += 1;
  return { id: `prize-${prizeSeq}`, title: "", description: "", images: [] };
}

/**
 * Prêmios prontos para a API, ou a mensagem do que falta. Posição vem da ordem na tela:
 * mover um prêmio para cima é o que muda o 1º lugar, não um campo de número — dois
 * prêmios com a mesma posição seriam 400 na API.
 */
export function buildPrizes(drafts: PrizeDraft[]): { prizes: PrizePayload[] } | { error: string } {
  if (drafts.length === 0) return { error: "Adicione pelo menos um prêmio." };
  const prizes = drafts.map((draft, index) => ({
    position: index + 1,
    title: draft.title.trim(),
    description: draft.description.trim() || undefined,
    images: draft.images.map((image) => image.key),
  }));
  if (prizes.some((prize) => prize.title.length < 2)) {
    return { error: "Diga o que é cada prêmio." };
  }
  return { prizes };
}
