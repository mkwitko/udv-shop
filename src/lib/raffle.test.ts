import { describe, expect, it } from "vitest";
import {
  buildPrizes,
  buildRafflePayload,
  dayEndIso,
  dayStartIso,
  emptyPrize,
  emptyRaffle,
  isoEndToLocalDate,
  isoToLocalDate,
  monthKeyOfWindow,
  monthOptions,
  type PrizeDraft,
  type RaffleDraft,
} from "./raffle";

function draft(over: Partial<PrizeDraft> = {}): PrizeDraft {
  return { ...emptyPrize(), title: "Cesta de produtos", ...over };
}

function raffle(over: Partial<RaffleDraft> = {}): RaffleDraft {
  return { ...emptyRaffle(), title: "Sorteio de setembro", prizes: [draft()], ...over };
}

describe("buildPrizes", () => {
  it("numera pela ordem da lista", () => {
    const built = buildPrizes([draft({ title: "Cesta" }), draft({ title: "Camiseta" })]);
    expect(built).toEqual({
      prizes: [
        { position: 1, title: "Cesta", description: undefined, images: [] },
        { position: 2, title: "Camiseta", description: undefined, images: [] },
      ],
    });
  });

  it("manda só as keys das fotos e omite descrição vazia", () => {
    const built = buildPrizes([
      draft({
        description: "   ",
        images: [{ key: "stores/nx/a.jpg", url: "https://cdn/a.jpg" }],
      }),
    ]);
    expect(built).toEqual({
      prizes: [
        {
          position: 1,
          title: "Cesta de produtos",
          description: undefined,
          images: ["stores/nx/a.jpg"],
        },
      ],
    });
  });

  it("apara espaços de título e descrição", () => {
    const built = buildPrizes([draft({ title: "  Cesta  ", description: "  com café  " })]);
    expect(built).toEqual({
      prizes: [{ position: 1, title: "Cesta", description: "com café", images: [] }],
    });
  });

  it("recusa lista vazia e prêmio sem nome", () => {
    expect(buildPrizes([])).toEqual({ error: "Adicione pelo menos um prêmio." });
    expect(buildPrizes([draft({ title: " " })])).toEqual({ error: "Diga o que é cada prêmio." });
  });
});

describe("janela em dia local", () => {
  it("início do dia local vira ISO UTC", () => {
    expect(dayStartIso("2026-09-01")).toBe(new Date(2026, 8, 1, 0, 0, 0, 0).toISOString());
  });

  it("fim do dia local é a meia-noite do dia seguinte, para a janela ser semiaberta", () => {
    expect(dayEndIso("2026-09-30")).toBe(new Date(2026, 9, 1, 0, 0, 0, 0).toISOString());
  });

  it("fim de um mês emenda no início do seguinte sem sobrepor", () => {
    expect(dayEndIso("2026-08-31")).toBe(dayStartIso("2026-09-01"));
  });

  it("dia vazio devolve string vazia", () => {
    expect(dayStartIso("")).toBe("");
    expect(dayEndIso("")).toBe("");
  });

  it("ida e volta preserva o dia digitado", () => {
    expect(isoToLocalDate(dayStartIso("2026-09-01"))).toBe("2026-09-01");
    expect(isoEndToLocalDate(dayEndIso("2026-09-30"))).toBe("2026-09-30");
  });

  it("data nula não vira dia", () => {
    expect(isoToLocalDate(null)).toBe("");
    expect(isoEndToLocalDate(undefined)).toBe("");
  });
});

describe("monthOptions", () => {
  it("começa no mês de referência e cobre o mês inteiro", () => {
    const [first] = monthOptions(new Date(2026, 8, 17), 3);
    expect(first).toEqual({
      key: "2026-09",
      label: "Setembro",
      startDate: "2026-09-01",
      endDate: "2026-09-30",
      raffleTitle: "Sorteio de setembro",
    });
  });

  it("acerta o último dia de mês curto e de fevereiro bissexto", () => {
    expect(monthOptions(new Date(2027, 1, 1), 1)[0]?.endDate).toBe("2027-02-28");
    expect(monthOptions(new Date(2028, 1, 1), 1)[0]?.endDate).toBe("2028-02-29");
  });

  it("marca o ano quando o mês cai fora do ano de referência", () => {
    const options = monthOptions(new Date(2026, 11, 1), 2);
    expect(options[1]).toMatchObject({
      key: "2027-01",
      label: "Janeiro 2027",
      raffleTitle: "Sorteio de janeiro de 2027",
    });
  });

  it("emenda um mês no outro sem sobrepor", () => {
    const [setembro, outubro] = monthOptions(new Date(2026, 8, 1), 2);
    expect(dayEndIso(setembro?.endDate ?? "")).toBe(dayStartIso(outubro?.startDate ?? ""));
  });

  it("devolve a quantidade pedida", () => {
    expect(monthOptions(new Date(2026, 8, 1), 12)).toHaveLength(12);
  });
});

describe("monthKeyOfWindow", () => {
  it("reconhece a janela que é exatamente um mês", () => {
    expect(monthKeyOfWindow("2026-09-01", "2026-09-30")).toBe("2026-09");
  });

  it("não reconhece janela parcial, invertida ou que atravessa meses", () => {
    expect(monthKeyOfWindow("2026-09-01", "2026-09-29")).toBeNull();
    expect(monthKeyOfWindow("2026-09-02", "2026-09-30")).toBeNull();
    expect(monthKeyOfWindow("2026-09-01", "2026-10-31")).toBeNull();
    expect(monthKeyOfWindow("", "2026-09-30")).toBeNull();
    expect(monthKeyOfWindow("2026-09-01", "")).toBeNull();
  });
});

describe("buildRafflePayload", () => {
  it("monta o payload com a janela em ISO", () => {
    const built = buildRafflePayload(
      raffle({ startDate: "2026-09-01", endDate: "2026-09-30", centsPerNumberInput: "R$ 10,00" }),
    );
    expect(built).toEqual({
      payload: {
        title: "Sorteio de setembro",
        centsPerNumber: 1000,
        startsAt: dayStartIso("2026-09-01"),
        endsAt: dayEndIso("2026-09-30"),
        prizes: [{ position: 1, title: "Cesta de produtos", description: undefined, images: [] }],
      },
    });
  });

  it("sem janela: começa agora e fica aberto até sortear", () => {
    const built = buildRafflePayload(raffle({ centsPerNumberInput: "R$ 10,00" }));
    expect(built).toMatchObject({ payload: { endsAt: null } });
    expect(built).not.toHaveProperty("payload.startsAt");
  });

  it("recusa nome curto, número barato demais e fim antes do início", () => {
    expect(buildRafflePayload(raffle({ title: " " }))).toEqual({
      error: "Dê um nome ao sorteio: por exemplo, “Sorteio de setembro”.",
    });
    expect(buildRafflePayload(raffle({ centsPerNumberInput: "R$ 0,50" }))).toEqual({
      error: "Diga quanto custa um número: no mínimo R$ 1,00.",
    });
    expect(
      buildRafflePayload(
        raffle({
          startDate: "2026-09-30",
          endDate: "2026-09-01",
          centsPerNumberInput: "R$ 10,00",
        }),
      ),
    ).toEqual({ error: "O fim da janela tem de ser depois do início." });
  });

  it("propaga o erro dos prêmios", () => {
    expect(buildRafflePayload(raffle({ centsPerNumberInput: "R$ 10,00", prizes: [] }))).toEqual({
      error: "Adicione pelo menos um prêmio.",
    });
  });
});
