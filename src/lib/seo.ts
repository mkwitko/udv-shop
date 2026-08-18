// Meta tags e JSON-LD das rotas SSR. Tudo que o Google e o WhatsApp leem sai daqui.
const SITE_NAME = "Lojinha dos Núcleos";

export function siteUrl(): string {
  const fromEnv =
    typeof import.meta.env?.VITE_SITE_URL === "string" ? import.meta.env.VITE_SITE_URL : "";
  return (fromEnv || "http://localhost:3000").replace(/\/$/, "");
}

export type SeoInput = {
  title: string;
  description: string;
  /** caminho absoluto do site, ex.: `/loja/nucleo-demo` */
  path: string;
  image?: string | undefined;
  type?: "website" | "article" | "product";
  noIndex?: boolean;
};

export function seo(input: SeoInput) {
  const url = `${siteUrl()}${input.path}`;
  const title = input.title.includes(SITE_NAME) ? input.title : `${input.title} · ${SITE_NAME}`;
  const meta: Array<Record<string, string>> = [
    { title },
    { name: "description", content: input.description },
    { property: "og:title", content: title },
    { property: "og:description", content: input.description },
    { property: "og:type", content: input.type ?? "website" },
    { property: "og:url", content: url },
    { property: "og:site_name", content: SITE_NAME },
    { property: "og:locale", content: "pt_BR" },
    { name: "twitter:card", content: input.image ? "summary_large_image" : "summary" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: input.description },
  ];
  if (input.image) {
    meta.push({ property: "og:image", content: input.image });
    meta.push({ name: "twitter:image", content: input.image });
  }
  if (input.noIndex) meta.push({ name: "robots", content: "noindex,nofollow" });

  return { meta, links: [{ rel: "canonical", href: url }] };
}

/** `<script type="application/ld+json">` — o Google lê, o usuário não vê. */
export function jsonLd(data: Record<string, unknown>) {
  return {
    type: "application/ld+json",
    children: JSON.stringify({ "@context": "https://schema.org", ...data }),
  };
}

export function organizationLd(store: { name: string; slug: string; description: string | null }) {
  return jsonLd({
    "@type": "Organization",
    name: store.name,
    url: `${siteUrl()}/loja/${store.slug}`,
    ...(store.description ? { description: store.description } : {}),
  });
}

export function productLd(input: {
  name: string;
  description: string | null;
  priceCents: number;
  currency: string;
  images: string[];
  inStock: boolean;
  url: string;
}) {
  return jsonLd({
    "@type": "Product",
    name: input.name,
    ...(input.description ? { description: input.description } : {}),
    ...(input.images.length > 0 ? { image: input.images } : {}),
    offers: {
      "@type": "Offer",
      price: (input.priceCents / 100).toFixed(2),
      priceCurrency: input.currency,
      availability: input.inStock ? "https://schema.org/InStock" : "https://schema.org/PreOrder",
      url: input.url,
    },
  });
}
