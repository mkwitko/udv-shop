import { expect, test } from "@playwright/test";
import { FAKE_PIX_CONFIRM_TIMEOUT, login, STORE_SLUG } from "./helpers";

test("cliente doa por Pix e recebe o obrigado", async ({ page }) => {
  await login(page, "cliente@example.org");

  await page.goto(`/loja/${STORE_SLUG}/doar`);
  await page.getByRole("textbox", { name: "Outro valor" }).fill("25,00");

  // frequência "Uma vez" e Pix já são o padrão
  await page.getByRole("button", { name: /Continuar/ }).click();

  await expect(page.getByRole("button", { name: "Copiar código Pix" })).toBeVisible();

  await expect(page.getByRole("heading", { name: "Obrigado por ajudar!" })).toBeVisible({
    timeout: FAKE_PIX_CONFIRM_TIMEOUT,
  });
});
