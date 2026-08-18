import { expect, test } from "@playwright/test";
import { FAKE_PIX_CONFIRM_TIMEOUT, login, STORE_SLUG } from "./helpers";

test("cliente compra por Pix e vê o pedido confirmado", async ({ page }) => {
  await login(page, "cliente@example.org");

  await page.goto(`/loja/${STORE_SLUG}/comprar?produto=camiseta-uniao`);
  await page.getByRole("textbox", { name: "Telefone com DDD" }).fill("(11) 98765-4321");

  // Pix já é a forma de pagamento padrão
  await page.getByRole("button", { name: "Continuar" }).click();

  // passo 2: QR na tela, com copia-e-cola disponível
  await expect(page.getByRole("heading", { name: "Pague com Pix" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Copiar código Pix" })).toBeVisible();

  // o gateway falso confirma sozinho; o poll da página deve virar para "confirmado"
  await expect(page.getByRole("heading", { name: "Pedido confirmado!" })).toBeVisible({
    timeout: FAKE_PIX_CONFIRM_TIMEOUT,
  });
});
