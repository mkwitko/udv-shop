import { expect, type Page, test } from "@playwright/test";
import { FAKE_PIX_CONFIRM_TIMEOUT, STORE_SLUG } from "./helpers";

const NOME = "Maria Visitante";
const FONE = "11988887777";

/** Nenhum destes testes chama `login`: o ponto é justamente não ter conta. */
async function preencherContato(page: Page) {
  await page.getByRole("textbox", { name: "Seu nome" }).fill(NOME);
  await page.getByRole("textbox", { name: "Telefone com DDD" }).fill(FONE);
}

test.use({ viewport: { width: 390, height: 844 } });

test("visitante pede aviso de produto sem criar conta", async ({ page }) => {
  // livro-doutrina é o produto sob encomenda do seed
  await page.goto(`/loja/${STORE_SLUG}/p/livro-doutrina`);
  await preencherContato(page);
  await page.getByRole("button", { name: "Quero ser avisado" }).click();
  await expect(page.getByText("Pronto, você está na lista!")).toBeVisible();
  await expect(page.getByText(/pelo telefone que deixou/)).toBeVisible();
});

test("visitante doa por Pix sem criar conta", async ({ page }) => {
  await page.goto(`/loja/${STORE_SLUG}/doar`);
  await page.getByRole("textbox", { name: "Outro valor" }).fill("25,00");
  await preencherContato(page);
  await page.getByRole("button", { name: /Continuar/ }).click();

  await expect(page.getByRole("button", { name: "Copiar código Pix" })).toBeVisible();
  // o "paid" chega pelo recibo público: sem sessão, é o único jeito de a tela saber
  await expect(page.getByRole("heading", { name: "Obrigado por auxiliar!" })).toBeVisible({
    timeout: FAKE_PIX_CONFIRM_TIMEOUT,
  });
  // e não oferece atalho para uma conta que a pessoa não tem
  await expect(page.getByRole("link", { name: "Ver minhas doações" })).toHaveCount(0);
});

test("doação mensal continua pedindo conta", async ({ page }) => {
  await page.goto(`/loja/${STORE_SLUG}/doar?campanha=reforma-do-templo`);
  const mensal = page.getByRole("radio", { name: /Todo mês/ });
  await expect(mensal).toBeDisabled();
  await expect(page.getByText(/Precisa de conta/)).toBeVisible();
});

test("visitante compra por Pix sem criar conta", async ({ page }) => {
  await page.goto(`/loja/${STORE_SLUG}/comprar?produto=camiseta-uniao&qtd=1`);
  await preencherContato(page);
  await page.getByRole("button", { name: "Continuar" }).click();

  await expect(page.getByRole("button", { name: "Copiar código Pix" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Pedido confirmado!" })).toBeVisible({
    timeout: FAKE_PIX_CONFIRM_TIMEOUT,
  });
  await expect(page.getByRole("link", { name: "Ver meus pedidos" })).toHaveCount(0);
});

// Sem conta não existe "meus pedidos" para reencontrar um Pix. Se o recarregamento perder a
// cobrança, a pessoa fica com um pendente que não tem como pagar.
test("Pix sobrevive a um recarregamento da página", async ({ page }) => {
  await page.goto(`/loja/${STORE_SLUG}/comprar?produto=camiseta-uniao&qtd=1`);
  await preencherContato(page);
  await page.getByRole("button", { name: "Continuar" }).click();
  await expect(page.getByRole("button", { name: "Copiar código Pix" })).toBeVisible();

  // o id e a chave do recibo entraram na URL
  await expect(page).toHaveURL(/pedido=[0-9a-f-]{36}.*recibo=[0-9a-f-]{36}/);

  await page.reload();
  await expect(page.getByRole("button", { name: "Copiar código Pix" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Pedido confirmado!" })).toBeVisible({
    timeout: FAKE_PIX_CONFIRM_TIMEOUT,
  });
});

test("link com recibo inválido não finge que existe um pagamento", async ({ page }) => {
  await page.goto(
    `/loja/${STORE_SLUG}/comprar?produto=camiseta-uniao&qtd=1` +
      "&pedido=00000000-0000-4000-8000-000000000000" +
      "&recibo=00000000-0000-4000-8000-000000000001",
  );
  await expect(page.getByRole("heading", { name: "Não encontramos este pedido" })).toBeVisible();
});

test("formulário cobra nome e telefone antes de mandar", async ({ page }) => {
  await page.goto(`/loja/${STORE_SLUG}/p/livro-doutrina`);
  await page.getByRole("textbox", { name: "Seu nome" }).fill("Ma");
  await page.getByRole("button", { name: "Quero ser avisado" }).click();
  await expect(page.getByText("Coloque um telefone com DDD.")).toBeVisible();
});
