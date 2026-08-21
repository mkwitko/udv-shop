import type { PickedImage } from "#/components/ui/image-picker";
import { maskAmountInput, parseAmount } from "#/lib/pay/amount";

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

/** Mês inteiro pronto para virar janela de sorteio, do jeito que o chip preenche. */
export type MonthOption = {
  key: string;
  label: string;
  startDate: string;
  endDate: string;
  raffleTitle: string;
};

const MONTH_NAMES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/**
 * Os próximos `count` meses a partir do mês de `from`, cada um como janela fechada
 * (dia 1 ao último dia). O ano só aparece no rótulo quando o mês cai fora do ano de
 * referência — "Setembro" chega mais rápido que "Setembro 2026", e "Janeiro 2027"
 * evita a dúvida de quem monta a campanha em dezembro.
 *
 * `new Date(ano, mês + 1, 0)` é o último dia do mês pedido, incluindo fevereiro bissexto.
 */
export function monthOptions(from: Date, count = 12): MonthOption[] {
  const baseYear = from.getFullYear();
  return Array.from({ length: count }, (_, index) => {
    const first = new Date(from.getFullYear(), from.getMonth() + index, 1);
    const year = first.getFullYear();
    const month = first.getMonth();
    const lastDay = new Date(year, month + 1, 0).getDate();
    const name = MONTH_NAMES[month] ?? "";
    const sameYear = year === baseYear;
    return {
      key: `${year}-${pad(month + 1)}`,
      label: sameYear ? name : `${name} ${year}`,
      startDate: `${year}-${pad(month + 1)}-01`,
      endDate: `${year}-${pad(month + 1)}-${pad(lastDay)}`,
      raffleTitle: sameYear
        ? `Sorteio de ${name.toLowerCase()}`
        : `Sorteio de ${name.toLowerCase()} de ${year}`,
    };
  });
}

/**
 * Chave do mês quando a janela é exatamente um mês (dia 1 ao último dia), senão `null`.
 * É o que deixa o chip marcado e o que o desmarca assim que alguém mexe no datepicker.
 */
export function monthKeyOfWindow(startDate: string, endDate: string): string | null {
  if (!startDate || !endDate) return null;
  const [startYear, startMonth, startDay] = startDate.split("-").map(Number);
  const [endYear, endMonth, endDay] = endDate.split("-").map(Number);
  if (!startYear || !startMonth || !endYear || !endMonth) return null;
  if (startDay !== 1 || startYear !== endYear || startMonth !== endMonth) return null;
  if (endDay !== new Date(endYear, endMonth, 0).getDate()) return null;
  return `${startYear}-${pad(startMonth)}`;
}

/** Sorteio em edição: um por card do passo "Sorteios" e um por formulário do painel. */
export type RaffleDraft = {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  centsPerNumberInput: string;
  prizes: PrizeDraft[];
};

export type RafflePayload = {
  title: string;
  centsPerNumber: number;
  startsAt?: string;
  endsAt: string | null;
  prizes: PrizePayload[];
};

let raffleSeq = 0;
export function emptyRaffle(): RaffleDraft {
  raffleSeq += 1;
  return {
    id: `raffle-${raffleSeq}`,
    title: "",
    startDate: "",
    endDate: "",
    centsPerNumberInput: maskAmountInput("1000"),
    prizes: [emptyPrize()],
  };
}

/**
 * Sorteio pronto para a API, ou a mensagem do que falta. Mesma validação na criação da
 * campanha e no painel — quando ela morava nos dois lugares, o wizard aceitava sorteio sem
 * nome (mandava "Sorteio") e o painel não.
 */
export function buildRafflePayload(
  draft: RaffleDraft,
): { payload: RafflePayload } | { error: string } {
  if (draft.title.trim().length < 2) {
    return { error: "Dê um nome ao sorteio: por exemplo, “Sorteio de setembro”." };
  }
  const centsPerNumber = parseAmount(draft.centsPerNumberInput);
  if (centsPerNumber === null || centsPerNumber < RAFFLE_MIN_CENTS_PER_NUMBER) {
    return { error: "Diga quanto custa um número: no mínimo R$ 1,00." };
  }
  if (
    draft.startDate &&
    draft.endDate &&
    dayEndIso(draft.endDate) <= dayStartIso(draft.startDate)
  ) {
    return { error: "O fim da janela tem de ser depois do início." };
  }
  const built = buildPrizes(draft.prizes);
  if ("error" in built) return built;
  return {
    payload: {
      title: draft.title.trim(),
      centsPerNumber,
      ...(draft.startDate && { startsAt: dayStartIso(draft.startDate) }),
      endsAt: draft.endDate ? dayEndIso(draft.endDate) : null,
      prizes: built.prizes,
    },
  };
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
