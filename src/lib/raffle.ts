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
/**
 * Dia digitado (`"2026-09-01"`, `<input type="date">`) → ISO UTC da meia-noite **local**.
 * `new Date("2026-09-01")` seria interpretado como UTC e o "sorteio de setembro"
 * começaria 21h do dia 31 de agosto em Brasília. Montar por componentes força o fuso de
 * quem está preenchendo.
 */
export function dayStartIso(localDate: string): string {
  const [year, month, day] = localDate.split("-").map(Number);
  if (!year || !month || !day) return "";
  return new Date(year, month - 1, day, 0, 0, 0, 0).toISOString();
}

/**
 * Dia digitado → ISO UTC do primeiro instante do dia seguinte. A janela é semiaberta
 * `[startsAt, endsAt)`, então o fim exclusivo é o que faz "até 30/09" incluir o dia 30
 * inteiro sem sobrepor o sorteio que começa em 01/10.
 */
export function dayEndIso(localDate: string): string {
  const [year, month, day] = localDate.split("-").map(Number);
  if (!year || !month || !day) return "";
  return new Date(year, month - 1, day + 1, 0, 0, 0, 0).toISOString();
}

/** ISO → `"2026-09-01"` no fuso de quem olha, para o `<input type="date">`. */
export function isoToLocalDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * Fim exclusivo que veio da API → último dia incluído, que é o que a pessoa digitou.
 * Sem isso o campo mostraria 01/10 para quem escreveu 30/09.
 */
export function isoEndToLocalDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  date.setDate(date.getDate() - 1);
  return isoToLocalDate(date.toISOString());
}

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
