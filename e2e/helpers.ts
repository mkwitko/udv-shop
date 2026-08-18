import { expect, type Page } from "@playwright/test";

export const SEED_PASSWORD = "senha-forte-123";
export const STORE_SLUG = "nucleo-demo";

/** Entra pela tela de login e espera sair dela. */
export async function login(page: Page, email: string): Promise<void> {
  await page.goto("/entrar");
  // espera a hidratação: sem o handler do React, o submit nativo dispara antes
  await page.waitForLoadState("networkidle");
  await page.getByRole("textbox", { name: "E-mail" }).fill(email);
  await page.getByRole("textbox", { name: "Senha" }).fill(SEED_PASSWORD);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).not.toHaveURL(/\/entrar/, { timeout: 15_000 });
}

/** O gateway Pix falso da API confirma em ~8s; espera folgada para CI lento. */
export const FAKE_PIX_CONFIRM_TIMEOUT = 40_000;
