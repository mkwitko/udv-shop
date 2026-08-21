import { expect, test } from "@playwright/test";
import { STORE_SLUG } from "./helpers";

/**
 * Página do produto: trilha, quantidade e o caminho de volta para a vitrine. O que este
 * teste protege é a conversão — o botão tem de dizer o total certo e a gaveta tem de
 * levar de volta à vitrine já filtrada.
 */
test("visitante escolhe quantidade e o botão acompanha o total", async ({ page }) => {
  await page.goto(`/loja/${STORE_SLUG}/p/mel-silvestre`);
  await page.waitForLoadState("networkidle");

  await expect(page.getByRole("heading", { name: "Mel silvestre", level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: "Comprar — R$ 48,00" })).toBeVisible();

  await page.getByRole("button", { name: "Aumentar quantidade" }).click();
  await expect(page.getByRole("link", { name: "Comprar — R$ 96,00" })).toBeVisible();

  // a quantidade escolhida viaja para o checkout
  await page.getByRole("link", { name: /^Comprar/ }).click();
  await expect(page).toHaveURL(/produto=mel-silvestre&qtd=2|qtd=2/);
});

test("trilha leva de volta à vitrine filtrada pela categoria", async ({ page }) => {
  await page.goto(`/loja/${STORE_SLUG}/p/mel-silvestre`);
  await page.waitForLoadState("networkidle");

  const trilha = page.getByRole("navigation", { name: "Trilha" });
  await expect(trilha).toContainText("Casa");
  await trilha.getByRole("link", { name: "Casa" }).click();

  await expect(page).toHaveURL(/\?categoria=casa/);
  await expect(
    page.getByRole("navigation", { name: "Categorias da loja" }).getByRole("button", {
      name: /^Casa/,
    }),
  ).toHaveAttribute("aria-current", "true");
});

test("produto mostra outros da mesma categoria", async ({ page }) => {
  await page.goto(`/loja/${STORE_SLUG}/p/mel-silvestre`);
  await page.waitForLoadState("networkidle");

  const relacionados = page.getByRole("heading", { name: "Mais de Casa", level: 2 });
  await expect(relacionados).toBeVisible();

  // o próprio produto não pode aparecer entre os relacionados
  const bloco = page.locator("section").filter({ has: relacionados });
  await expect(bloco.getByRole("heading", { name: "Mel silvestre" })).toHaveCount(0);
  await expect(bloco.locator("li")).not.toHaveCount(0);
});
