import { createFileRoute } from "@tanstack/react-router";
import { siteUrl } from "#/lib/seo";

// Gestão, conta e plataforma são áreas autenticadas: fora do índice.
export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: () =>
        new Response(
          [
            "User-agent: *",
            "Allow: /",
            "Disallow: /gestao/",
            "Disallow: /conta",
            "Disallow: /plataforma",
            `Sitemap: ${siteUrl()}/sitemap.xml`,
            "",
          ].join("\n"),
          { headers: { "content-type": "text/plain; charset=utf-8" } },
        ),
    },
  },
});
