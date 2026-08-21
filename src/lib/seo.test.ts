import { describe, expect, it } from "vitest";
import { money, percent } from "./format";
import { breadcrumbLd, organizationLd, productLd, seo } from "./seo";

type Meta = Array<Record<string, string>>;

/** conteúdo de uma meta por `name` ou `property` */
function content(meta: Meta, key: string) {
  return meta.find((entry) => entry.name === key || entry.property === key)?.content;
}
function title(meta: Meta) {
  return meta.find((entry) => "title" in entry)?.title;
}

describe("formatação", () => {
  // Intl separa R$ do número com espaço não-quebrável — normalizado aqui, não na fonte.
  const plain = (value: string) => value.replace(/ /g, " ");

  it("mostra centavos como real, sem dividir antes da hora", () => {
    expect(plain(money(8900))).toBe("R$ 89,00");
    expect(plain(money(0))).toBe("R$ 0,00");
  });

  it("progresso nunca passa de 100% nem divide por zero", () => {
    expect(percent(30000, 5000000)).toBe(1);
    expect(percent(9000, 5000)).toBe(100);
    expect(percent(100, 0)).toBe(0);
  });
});

describe("seo", () => {
  it("monta og/twitter e canonical a partir do caminho", () => {
    const head = seo({
      title: "Camiseta União",
      description: "Algodão, estampa serigrafada.",
      path: "/loja/nucleo-demo/p/camiseta-uniao",
      type: "product",
    });

    expect(title(head.meta)).toBe("Camiseta União · Colheita");
    expect(content(head.meta, "og:type")).toBe("product");
    expect(head.links[0]?.href).toContain("/loja/nucleo-demo/p/camiseta-uniao");
    // sem imagem o card do Twitter é o pequeno — o grande com placeholder fica feio
    expect(content(head.meta, "twitter:card")).toBe("summary");
  });

  it("noIndex marca robots — usado em página que não pode indexar", () => {
    const head = seo({ title: "x", description: "y", path: "/x", noIndex: true });
    expect(content(head.meta, "robots")).toBe("noindex,nofollow");
  });

  it("JSON-LD de produto sai com preço em reais e disponibilidade correta", () => {
    const ld = JSON.parse(
      productLd({
        name: "Camiseta União",
        description: null,
        priceCents: 8900,
        currency: "BRL",
        images: [],
        inStock: false,
        url: "http://localhost:3000/x",
      }).children,
    );

    expect(ld["@type"]).toBe("Product");
    expect(ld.offers.price).toBe("89.00");
    expect(ld.offers.availability).toBe("https://schema.org/PreOrder");
    expect(ld.description).toBeUndefined();
  });

  it("JSON-LD de organização aponta para a página da loja", () => {
    const ld = JSON.parse(
      organizationLd({ name: "Núcleo Demo", slug: "nucleo-demo", description: null }).children,
    );
    expect(ld["@type"]).toBe("Organization");
    expect(ld.url).toContain("/loja/nucleo-demo");
  });

  it("trilha numera os degraus na ordem em que a pessoa lê", () => {
    const ld = JSON.parse(
      breadcrumbLd([
        { name: "Núcleo Demo", path: "/loja/nucleo-demo" },
        { name: "Chás", path: "/loja/nucleo-demo?categoria=chas" },
        { name: "Chá verde", path: "/loja/nucleo-demo/p/cha-verde" },
      ]).children,
    );

    expect(ld["@type"]).toBe("BreadcrumbList");
    expect(ld.itemListElement.map((item: { position: number }) => item.position)).toEqual([
      1, 2, 3,
    ]);
    expect(ld.itemListElement[1].item).toContain("/loja/nucleo-demo?categoria=chas");
    expect(ld.itemListElement[2].name).toBe("Chá verde");
  });
});
