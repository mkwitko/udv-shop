import { createFileRoute } from "@tanstack/react-router";
import { listCampaigns } from "#/lib/api/gen/clients/listCampaigns";
import { listProducts } from "#/lib/api/gen/clients/listProducts";
import { listStores } from "#/lib/api/gen/clients/listStores";
import { publicRequest } from "#/lib/api/public";
import { siteUrl } from "#/lib/seo";

type Entry = { loc: string; lastmod?: string; changefreq: string };

function xmlEscape(value: string): string {
  return value.replace(/[<>&'"]/g, (c) => `&#${c.charCodeAt(0)};`);
}

// Sitemap por loja, montado a cada request a partir da API — loja nova aparece sem deploy.
export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const base = siteUrl();
        const entries: Entry[] = [
          { loc: `${base}/`, changefreq: "daily" },
          { loc: `${base}/lojas`, changefreq: "daily" },
        ];

        const stores = await listStores({ limit: 50 }, publicRequest);
        for (const store of stores.items) {
          entries.push({ loc: `${base}/loja/${store.slug}`, changefreq: "daily" });
          entries.push({
            loc: `${base}/loja/${store.slug}/campanhas`,
            changefreq: "weekly",
          });

          const [products, campaigns] = await Promise.all([
            listProducts(store.slug, { limit: 50 }, publicRequest),
            listCampaigns(store.slug, { limit: 50 }, publicRequest),
          ]);
          for (const product of products.items) {
            entries.push({
              loc: `${base}/loja/${store.slug}/p/${product.slug}`,
              changefreq: "weekly",
            });
          }
          for (const campaign of campaigns.items) {
            entries.push({
              loc: `${base}/loja/${store.slug}/campanhas/${campaign.slug}`,
              changefreq: "weekly",
            });
          }
        }

        const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries
  .map(
    (entry) =>
      `  <url><loc>${xmlEscape(entry.loc)}</loc><changefreq>${entry.changefreq}</changefreq></url>`,
  )
  .join("\n")}
</urlset>`;

        return new Response(body, {
          headers: {
            "content-type": "application/xml; charset=utf-8",
            "cache-control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
