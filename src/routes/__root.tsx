import { TanStackDevtools } from "@tanstack/react-devtools";
import type { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext, HeadContent, Scripts } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { ToastProvider } from "../components/ui/toast";
import TanStackQueryDevtools from "../integrations/tanstack-query/devtools";
import { SessionProvider } from "../lib/auth/session";
import { themeBootScript } from "../lib/theme";
import appCss from "../styles.css?url";

interface RouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "theme-color", content: "#fdfcfa", media: "(prefers-color-scheme: light)" },
      { name: "theme-color", content: "#1c1715", media: "(prefers-color-scheme: dark)" },
      { title: "Colheita — o que sua comunidade cultiva, cresce junto" },
      {
        name: "description",
        content:
          "Venda, receba doações, crie campanhas e sorteios num lugar só. Pix e cartão, com o dinheiro indo direto para quem faz acontecer.",
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
    ],
  }),
  shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
        {/* antes da primeira pintura: sem isto a página escura pisca branca ao carregar */}
        {/** biome-ignore lint/security/noDangerouslySetInnerHtml: script inline de tema, constante do próprio bundle */}
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body>
        <SessionProvider>
          <ToastProvider>{children}</ToastProvider>
        </SessionProvider>
        {import.meta.env.DEV && (
          <TanStackDevtools
            config={{ position: "bottom-right" }}
            plugins={[
              { name: "Tanstack Router", render: <TanStackRouterDevtoolsPanel /> },
              TanStackQueryDevtools,
            ]}
          />
        )}
        <Scripts />
      </body>
    </html>
  );
}
