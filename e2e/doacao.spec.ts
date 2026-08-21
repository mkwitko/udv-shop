import { expect, test } from "@playwright/test";
import { FAKE_PIX_CONFIRM_TIMEOUT, login, STORE_SLUG } from "./helpers";

test("cliente doa por Pix e recebe o obrigado", async ({ page }) => {
  await login(page, "cliente@example.org");

  await page.goto(`/loja/${STORE_SLUG}/doar`);
  await page.getByRole("textbox", { name: "Outro valor" }).fill("25,00");

  // frequência "Uma vez" e Pix já são o padrão
  await page.getByRole("button", { name: /Continuar/ }).click();

  await expect(page.getByRole("button", { name: "Copiar código Pix" })).toBeVisible();

  await expect(page.getByRole("heading", { name: "Obrigado por auxiliar!" })).toBeVisible({
    timeout: FAKE_PIX_CONFIRM_TIMEOUT,
  });
});

// O Pix não faz cobrança recorrente (a Woovi não tem split em assinatura), então
// escolher "Todo mês" tem que fechar a porta do Pix na hora — e não com um 400
// depois do formulário preenchido.
test("doação mensal desabilita o Pix e passa para o cartão", async ({ page }) => {
  await login(page, "cliente@example.org");

  await page.goto(`/loja/${STORE_SLUG}/doar?campanha=reforma-do-templo`);

  const pix = page.getByRole("radio", { name: /Pix/ });
  const cartao = page.getByRole("radio", { name: /Cartão/ });
  await expect(pix).toBeChecked();

  // o input é sr-only; quem recebe o clique é o label
  await page.getByText("Todo mês", { exact: true }).click();

  await expect(pix).toBeDisabled();
  await expect(cartao).toBeChecked();
  await expect(page.getByText("O Pix não faz cobrança automática todo mês")).toBeVisible();
});
