import { expect, test } from "@playwright/test";
import { login, STORE_SLUG } from "./helpers";

test("dono cadastra um produto e ele aparece na vitrine da gestão", async ({ page }) => {
  await login(page, "dono@nucleo.local");

  await page.goto(`/gestao/${STORE_SLUG}/produtos`);
  await page.getByRole("button", { name: "Novo produto" }).click();

  const name = `Caneca E2E ${Date.now()}`;
  await page.getByRole("textbox", { name: "Nome do produto" }).fill(name);
  await page.getByRole("textbox", { name: "Preço" }).fill("35,00");
  await page.getByRole("spinbutton", { name: "Quantidade em estoque" }).fill("5");

  await page.getByRole("button", { name: "Publicar produto" }).click();

  // volta para a lista com o produto novo publicado
  await expect(page.getByText(name)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Produtos" })).toBeVisible();
});
