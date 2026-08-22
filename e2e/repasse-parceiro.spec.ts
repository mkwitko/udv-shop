import { expect, test } from "@playwright/test";
import { login, STORE_SLUG } from "./helpers";

/**
 * Repasse: cadastra um parceiro, combina quanto do preço é dele e confere que a prévia mostra
 * para onde vai o dinheiro antes de salvar.
 */
test("dono cadastra parceiro e combina repasse num produto", async ({ page }) => {
  await login(page, "dono@nucleo.local");

  const partner = `Parceira Teste ${Date.now()}`;
  await page.goto(`/gestao/${STORE_SLUG}/repasses`);
  await page.getByRole("button", { name: "Novo parceiro" }).click();
  await page.getByRole("textbox", { name: "Nome" }).fill(partner);
  await page.getByRole("textbox", { name: "Chave Pix (opcional)" }).fill("parceira@example.org");
  await page.getByRole("button", { name: "Salvar parceiro" }).click();

  const row = page.locator("li").filter({ hasText: partner });
  await expect(row).toBeVisible({ timeout: 15_000 });
  await expect(row).toContainText("em dia");

  // agora o acordo, na página do produto
  const product = `Cesto Repasse ${Date.now()}`;
  await page.goto(`/gestao/${STORE_SLUG}/produtos`);
  await page.getByRole("button", { name: "Novo produto" }).click();
  await page.getByRole("textbox", { name: "Nome do produto" }).fill(product);
  await page.getByRole("textbox", { name: "Preço" }).fill("60,00");
  await page.getByRole("spinbutton", { name: "Quantos você tem agora?" }).fill("2");
  await page
    .getByLabel("Quem recebe parte deste produto")
    .selectOption({ label: partner });
  await page.getByLabel("Como combinar").selectOption("percent");
  await page.getByRole("textbox", { name: "Porcentagem" }).fill("50");

  // A plataforma cobra mensalidade, não comissão: com a taxa em zero são duas linhas, e a loja
  // fica com tudo o que não é do parceiro. R$ 60,00 com 50% → parceiro 30,00, loja 30,00.
  const preview = page.locator("dl");
  await expect(preview).toContainText("R$ 60,00");
  await expect(preview).toContainText("R$ 30,00");
  await expect(preview).not.toContainText("Taxa da plataforma");

  await page.getByRole("button", { name: "Publicar produto" }).click();

  // o acordo volta preenchido quando a pessoa abre o produto de novo
  const created = page.locator("li").filter({ hasText: product });
  await expect(created).toBeVisible({ timeout: 15_000 });
  await created.getByRole("button", { name: "Editar" }).click();
  await expect(page.getByLabel("Quem recebe parte deste produto")).toHaveValue(/.+/);
  await expect(page.getByRole("textbox", { name: "Porcentagem" })).toHaveValue("50");
});
