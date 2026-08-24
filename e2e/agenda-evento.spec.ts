import { expect, test } from "@playwright/test";
import { FAKE_PIX_CONFIRM_TIMEOUT, login, STORE_SLUG } from "./helpers";

/**
 * Evento de ponta a ponta: a loja cria na Agenda, o cliente garante vaga pelo endereço
 * próprio do evento, e a vaga sai da conta. É o fluxo que só passou a existir quando evento
 * saiu de dentro de produto (ADR-028) — antes disso a Agenda não criava nada.
 */
test("dono cria evento na agenda e cliente garante vaga", async ({ page }) => {
  const suffix = Date.now();
  const name = `Curso E2E ${suffix}`;
  const slug = `curso-e2e-${suffix}`;

  await login(page, "dono@nucleo.local");
  await page.goto(`/gestao/${STORE_SLUG}/agenda`);
  await page.getByRole("button", { name: "Criar evento" }).click();

  await page.getByRole("textbox", { name: "Nome do evento" }).fill(name);
  await page.getByRole("textbox", { name: "Valor por vaga" }).fill("30,00");
  // data no futuro, com hora de fim: é o caso que mantém o evento na agenda enquanto acontece
  await page.locator("#at").fill("2027-03-14T19:00");
  await page.locator("#endsAt").fill("2027-03-14T22:00");
  await page.getByRole("textbox", { name: "Onde" }).fill("Salão do núcleo");
  await page.getByRole("spinbutton", { name: "Quantas vagas?" }).fill("3");
  await page.getByRole("button", { name: "Criar evento" }).click();

  await expect(page.getByText(name)).toBeVisible();
  await expect(page.getByText("3 vagas livres")).toBeVisible();

  // agora como quem compra: a página do evento vive em /e/, não em /p/
  await page.goto(`/loja/${STORE_SLUG}/e/${slug}`);
  await expect(page.getByRole("heading", { name, level: 1 })).toBeVisible();
  await page.getByRole("link", { name: /Garantir minha vaga/ }).click();

  await expect(page).toHaveURL(new RegExp(`evento=${slug}`));
  // quem já está logado só confirma o telefone; entrega não entra em vaga de evento
  await page.getByRole("textbox", { name: "Telefone com DDD" }).fill("48999995678");
  await expect(page.getByText("Como a loja entrega:")).toHaveCount(0);
  await page.getByRole("button", { name: "Continuar" }).click();

  // Pix falso confirma sozinho em alguns segundos
  await expect(page.getByRole("heading", { name: "Pedido confirmado!" })).toBeVisible({
    timeout: FAKE_PIX_CONFIRM_TIMEOUT,
  });
  await expect(page.getByText("a loja confere a lista na entrada")).toBeVisible();

  // a vaga saiu da conta e quem comprou está na lista de presença
  await page.goto(`/gestao/${STORE_SLUG}/agenda`);
  const linha = page.locator("li", { hasText: name }).first();
  await expect(linha.getByText("2 vagas livres")).toBeVisible();
  await linha.getByRole("button", { name: "Lista de presença" }).click();
  await expect(linha.getByText("0 de 1 chegaram")).toBeVisible();
  await linha.getByRole("button", { name: "Marcar chegada" }).click();
  await expect(linha.getByText("1 de 1 chegaram")).toBeVisible();

  // e o resultado fecha a conta: vaga paga, quem chegou e o que ficou com a loja
  await page.goto(`/gestao/${STORE_SLUG}/resultado`);
  // o evento é no futuro, então entra só com o filtro ligado
  await page.getByRole("checkbox", { name: /Incluir os que ainda vão acontecer/ }).check();
  const resultado = page.locator("li", { hasText: name }).first();
  await expect(resultado.getByText("R$ 30,00")).toBeVisible();
  await expect(resultado.getByText("1 de 1")).toBeVisible();
});

/**
 * Venda em lotes: o 1º esgota e o 2º assume sozinho, mais caro. É o que faz alguém comprar
 * hoje em vez de "semana que vem", e o preço tem de virar sem ninguém mexer.
 */
test("dono vende em lotes e o segundo assume quando o primeiro esgota", async ({ page }) => {
  const suffix = Date.now();
  const name = `Festa E2E ${suffix}`;
  const slug = `festa-e2e-${suffix}`;

  await login(page, "dono@nucleo.local");
  await page.goto(`/gestao/${STORE_SLUG}/agenda`);
  await page.getByRole("button", { name: "Criar evento" }).click();
  await page.getByRole("textbox", { name: "Nome do evento" }).fill(name);
  await page.locator("#at").fill("2027-06-12T19:00");

  await page.getByRole("button", { name: "Vender em lotes" }).click();
  await page.locator("#batch-name-0").fill("1º lote");
  await page.locator("#batch-price-0").fill("30,00");
  await page.locator("#batch-seats-0").fill("1");
  await page.getByRole("button", { name: "Adicionar outro lote" }).click();
  await page.locator("#batch-name-1").fill("2º lote");
  await page.locator("#batch-price-1").fill("45,00");
  await page.locator("#batch-seats-1").fill("5");
  await page.getByRole("button", { name: "Criar evento" }).click();

  const linha = page.locator("li", { hasText: name }).first();
  await expect(linha.getByText("1º lote")).toBeVisible();
  await expect(linha.getByText("1 vaga livre de 6")).toBeVisible();

  // quem chega agora vê o 1º lote e o aviso de que vai subir
  await page.goto(`/loja/${STORE_SLUG}/e/${slug}`);
  await expect(page.getByText("Depois deste lote, a vaga passa a R$ 45,00.")).toBeVisible();
  await page.getByRole("link", { name: /Garantir minha vaga — R\$ 30,00/ }).click();
  await page.getByRole("textbox", { name: "Telefone com DDD" }).fill("48999995678");
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.getByRole("heading", { name: "Pedido confirmado!" })).toBeVisible({
    timeout: FAKE_PIX_CONFIRM_TIMEOUT,
  });

  // 1º lote esgotou: o 2º assume, sem ninguém mexer, e não há mais aumento anunciado
  await page.goto(`/loja/${STORE_SLUG}/e/${slug}`);
  await expect(page.getByText("2º lote")).toBeVisible();
  await expect(page.getByRole("link", { name: /Garantir minha vaga — R\$ 45,00/ })).toBeVisible();
  await expect(page.getByText(/Depois deste lote/)).toHaveCount(0);
});
