import { expect, test } from "@playwright/test";
import { login, STORE_SLUG } from "./helpers";

/**
 * Arquivar não é apagar (§11 do brief): o produto sai da vitrine, aparece em
 * "Arquivados" e volta inteiro pelo botão de restaurar.
 */
test("dono arquiva um produto e restaura ele depois", async ({ page }) => {
  await login(page, "dono@nucleo.local");

  await page.goto(`/gestao/${STORE_SLUG}/produtos`);
  await page.getByRole("button", { name: "Novo produto" }).click();

  const name = `Caneca Arquivo ${Date.now()}`;
  await page.getByRole("textbox", { name: "Nome do produto" }).fill(name);
  await page.getByRole("textbox", { name: "Preço" }).fill("29,90");
  await page.getByRole("spinbutton", { name: "Quantos você tem agora?" }).fill("2");
  await page.getByRole("button", { name: "Publicar produto" }).click();

  const row = page.locator("li").filter({ hasText: name });
  await expect(row).toBeVisible();

  // arquiva pelo formulário de edição, com a confirmação que explica a consequência
  await row.getByRole("button", { name: "Editar" }).click();
  await page.getByRole("button", { name: "Arquivar produto" }).first().click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Arquivar produto" }).click();

  const archivedSection = page.locator("section").filter({ hasText: "Arquivados" });
  await expect(archivedSection.getByText(name)).toBeVisible({ timeout: 15_000 });

  // e volta para a vitrine
  await archivedSection
    .locator("li")
    .filter({ hasText: name })
    .getByRole("button", { name: "Restaurar produto" })
    .click();

  // a seção "Arquivados" segue existindo (o seed tem um produto fora de linha); o que
  // precisa sair de lá é este produto — e voltar para a lista da vitrine, com o botão
  // de editar de novo disponível.
  await expect(archivedSection.locator("li").filter({ hasText: name })).toHaveCount(0, {
    timeout: 15_000,
  });
  await expect(
    page.locator("li").filter({ hasText: name }).getByRole("button", { name: "Editar" }),
  ).toBeVisible({ timeout: 15_000 });
});
