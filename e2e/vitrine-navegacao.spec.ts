import { expect, test } from "@playwright/test";
import { STORE_SLUG } from "./helpers";

/**
 * Vitrine navegável: gaveta, busca, ordem e paginação. O que este teste protege é o
 * contrato da URL — link com filtro tem de abrir filtrado, porque é assim que ele
 * viaja no WhatsApp.
 */
test("visitante filtra por categoria, busca e carrega mais produtos", async ({ page }) => {
  await page.goto(`/loja/${STORE_SLUG}`);
  // espera a hidratação: antes dela os botões da vitrine são só marcação
  await page.waitForLoadState("networkidle");

  const pills = page.getByRole("navigation", { name: "Categorias da loja" });
  await expect(pills).toBeVisible({ timeout: 15_000 });

  // primeira página não traz a loja inteira
  const cards = page.locator("#produtos li");
  await expect(cards).toHaveCount(12);

  await page.getByRole("button", { name: "Ver mais produtos" }).click();
  await expect(cards).toHaveCount(24);

  // gaveta entra na URL: quem compartilha o link compartilha o filtro
  await pills.getByRole("button", { name: /^Casa/ }).click();
  await expect(page).toHaveURL(/categoria=casa/);
  await expect(cards.first()).toBeVisible();
  const nomes = await cards.locator("h3").allInnerTexts();
  expect(nomes.length).toBeGreaterThan(0);

  // busca combina com a gaveta
  await page.getByRole("searchbox", { name: "Buscar na loja" }).fill("mel");
  await expect(page).toHaveURL(/q=mel/, { timeout: 15_000 });
  await expect(cards).toHaveCount(1);

  // busca sem resultado tem estado próprio, com saída
  await page.getByRole("searchbox", { name: "Buscar na loja" }).fill("bicicleta alada");
  await expect(page.getByText(/Nada encontrado para/)).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: "Limpar busca" }).click();
  await expect(page).not.toHaveURL(/q=/);
  await expect(cards.first()).toBeVisible();
});

test("link com filtro abre filtrado, sem depender de clique", async ({ page }) => {
  await page.goto(`/loja/${STORE_SLUG}?categoria=leitura&ordem=preco-desc`);
  await page.waitForLoadState("networkidle");

  const pills = page.getByRole("navigation", { name: "Categorias da loja" });
  await expect(pills.getByRole("button", { name: /^Leitura/ })).toHaveAttribute(
    "aria-current",
    "true",
    { timeout: 15_000 },
  );
  await expect(page.getByLabel("Ordenar por")).toHaveValue("preco-desc");

  const precos = await page.locator("#produtos li p.tabular-nums").allInnerTexts();
  const valores = precos.map((texto) => Number(texto.replace(/\D/g, "")));
  expect(valores).toEqual([...valores].sort((a, b) => b - a));
});
