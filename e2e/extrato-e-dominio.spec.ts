import { expect, type Locator, type Page, test } from "@playwright/test";
import { login, STORE_SLUG } from "./helpers";

/** Deixa a loja sem endereço próprio, seja qual for o estado em que ela chegou. */
async function clearDomain(page: Page, field: Locator): Promise<void> {
  if (await field.isVisible().catch(() => false)) return;
  await page.getByRole("button", { name: "Remover endereço" }).first().click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Remover endereço" }).click();
  await expect(field).toBeVisible({ timeout: 15_000 });
}

test("dono vê o extrato do mês e baixa a planilha de pedidos", async ({ page }) => {
  await login(page, "dono@nucleo.local");
  await page.goto(`/gestao/${STORE_SLUG}/extrato`);

  await expect(page.getByRole("heading", { name: "Extrato" })).toBeVisible();
  await expect(page.getByText("Vendas", { exact: true }).first()).toBeVisible({ timeout: 15_000 });
  // a conta fecha: o que ficou com a loja é entrada menos taxa e repasse
  await expect(page.getByText("Ficou com a loja").first()).toBeVisible();

  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Baixar pedidos" }).click();
  const file = await download;
  expect(file.suggestedFilename()).toContain("pedidos");
});

test("dono configura endereço próprio e recebe as instruções de DNS", async ({ page }) => {
  await login(page, "dono@nucleo.local");
  await page.goto(`/gestao/${STORE_SLUG}/configuracoes`);

  await expect(page.getByRole("heading", { name: "Endereço próprio" })).toBeVisible({
    timeout: 15_000,
  });

  // a loja de demonstração pode já ter um endereço: solta antes de configurar de novo
  const field = page.getByRole("textbox", { name: "Endereço da loja" });
  await clearDomain(page, field);

  const domain = `loja-${Date.now()}.exemplo.org`;
  await page.getByRole("textbox", { name: "Endereço da loja" }).fill(domain);
  await page.getByRole("button", { name: "Usar este endereço" }).click();

  await expect(page.getByText(domain).first()).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("esperando o DNS")).toBeVisible();
  await expect(page.getByText("Aponta para")).toBeVisible();

  // endereço inválido é recusado com motivo, não com erro técnico
  await clearDomain(page, field);
  await field.fill("localhost");
  await page.getByRole("button", { name: "Usar este endereço" }).click();
  await expect(page.getByRole("alert")).toBeVisible({ timeout: 15_000 });
});
