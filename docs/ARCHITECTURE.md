# Arquitetura do udv-shop-web

TanStack Start (React 19) + Vite, servido no Cloudflare Workers. Consome a
`udv-shop-api`; não tem banco nem sessão própria no servidor.

## Estrutura

```
src/
  routes/              rotas file-based (inclui server routes: sitemap.xml, robots.txt)
  components/
    auth/              guarda de rota privada
    site/              cabeçalho, rodapé, shell das telas de autenticação
    store/             blocos de loja (card de produto)
    ui/                base funcional (button, input, tag, tema) — shadcn re-tematizado
  lib/
    auth/              contexto de sessão (login, registro, refresh, logout)
    theme.ts           preferência clara/escura + script anti-flash
    slug.ts            sugestão de endereço de loja a partir do nome
    api/
      gen/             GERADO pelo Kubb — não editar à mão
      fetch-client.ts  cliente HTTP único (base URL, token, erros)
      auth-token.ts    access token em memória
      public.ts        config das chamadas públicas
    format.ts          dinheiro e data em pt-BR
    seo.ts             meta/og/canonical e JSON-LD
  styles.css           sistema visual inteiro (ver docs/DESIGN.md)
```

## Contrato com a API

O front **não escreve tipo de request/response à mão**. O fluxo é:

1. na API: `pnpm openapi:export` → `docs/openapi.json` (commitado lá)
2. aqui: `pnpm api:generate` → `src/lib/api/gen/` (types, schemas Zod, clients, hooks)

Toda rota da API vira `useXxx` + `xxxQueryOptions` + função de client. Mexeu em schema de
rota lá, roda os dois comandos aqui.

O codegen depende de `operationId` em cada operação do spec — a API gera isso
automaticamente a partir do método e da URL. Sem operationId o Kubb não nomeia nada e
gera zero arquivos.

## Dados e SSR

Rota SSR carrega no `loader` com `queryClient.ensureQueryData(...QueryOptions(...))` e o
componente lê o mesmo cache com o hook. O `setupRouterSsrQueryIntegration` desidrata o
cache para o cliente — a página chega pronta no HTML e não pisca ao hidratar.

Rotas públicas passam `publicRequest` (`anonymous: true`): sem cookie e sem
`Authorization`. Isso mantém a resposta cacheável e garante que nenhum dado de sessão
apareça numa página que pode ser compartilhada.

## Sessão

Access token vive **em memória** (`auth-token.ts`), nunca em `localStorage`. A
persistência é o cookie httpOnly de refresh que a API grava em `/auth`. Qualquer 401
limpa o token em memória. Se o front for servido de outro registrable domain que a API, a
API precisa subir com `COOKIE_CROSS_SITE=true`.

`SessionProvider` (`lib/auth/session.tsx`) monta na shell e, no cliente, troca o cookie
de refresh por um access token novo. Ele só tenta a troca se `localStorage` tiver a pista
`udv-session` — visitante que nunca logou não gasta um 401 por página. A pista **não
autentica nada**: quem autentica é o cookie httpOnly.

Rotas privadas (`/conta`, `/nova-loja`) usam `<RequireSession>`, que é guarda de
cliente. Não dá para checar no `beforeLoad`: o token está na memória do navegador e o
servidor de SSR não o enxerga. Enquanto a sessão é restaurada a rota mostra esqueleto;
anônimo é mandado para `/entrar?redirect=…`, e o `redirect` só aceita caminho interno
(`/algo`, nunca `//outro-site`).

## Tema

Claro e escuro com botão no cabeçalho, tokens em `styles.css`, preferência em
`localStorage` (`udv-theme`). `themeBootScript` roda inline no `<head>` antes da primeira
pintura — sem ele, quem escolheu escuro vê um flash branco a cada carregamento. Regras de
cor em [DESIGN.md](./DESIGN.md).

## SEO

- `seo()` monta title/description/og/twitter/canonical por rota SSR
- JSON-LD `Organization` na loja e `Product` na página do produto
- `/sitemap.xml` é server route: varre lojas, produtos e campanhas da API a cada request
  (cache de 1h), então loja nova entra no índice sem deploy
- `/robots.txt` bloqueia `/gestao/`, `/conta` e `/plataforma`

## Ainda não existe

Checkout, doação, `/gestao/:slug` e `/plataforma` — planos 8 e 9 da spec. Os botões de
comprar, doar e "Gerenciar" já estão nas telas, desabilitados. `/conta` lista as lojas do
usuário via `GET /me/stores`, mas não edita nada ainda.

## Entrada do servidor e domínio próprio

`src/server.ts` é a entrada do worker (`main` do `wrangler.jsonc` aponta para ele). Existe
por um motivo só: quando o Host não é o da plataforma, ele pergunta à API
(`GET /stores/by-domain`, cache de 60s por isolate) de quem é aquele endereço e reescreve
o caminho para `/loja/{slug}{path}` antes de entregar ao roteador. O resto do app não sabe
que isso aconteceu — nenhuma rota nova, nenhum componente duplicado.

Não são reescritos: Host da plataforma (`VITE_SITE_URL`, `localhost`), `/loja/*`,
`/_serverFn*`, `/api/*`, `/assets/*` e qualquer caminho com extensão. API indisponível ou
host desconhecido cai na landing, nunca em erro.

`lib/api/download.ts` baixa os CSVs da API fora do cliente gerado (as rotas devolvem
arquivo, não JSON) e tenta um refresh de sessão antes de desistir num 401.
