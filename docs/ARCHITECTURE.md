# Arquitetura do udv-shop-web

TanStack Start (React 19) + Vite, servido no Cloudflare Workers. Consome a
`udv-shop-api`; não tem banco nem sessão própria no servidor.

## Estrutura

```
src/
  routes/              rotas file-based (inclui server routes: sitemap.xml, robots.txt)
  components/
    site/              cabeçalho e rodapé
    store/             blocos de loja (card de produto)
    ui/                base funcional (button, tag) — shadcn re-tematizado
  lib/
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

## SEO

- `seo()` monta title/description/og/twitter/canonical por rota SSR
- JSON-LD `Organization` na loja e `Product` na página do produto
- `/sitemap.xml` é server route: varre lojas, produtos e campanhas da API a cada request
  (cache de 1h), então loja nova entra no índice sem deploy
- `/robots.txt` bloqueia `/gestao/`, `/conta` e `/plataforma`

## Ainda não existe

Checkout, doação, autenticação de tela, `/gestao/:slug`, `/conta` e `/plataforma` — são
os planos 8 e 9 da spec. Os botões de comprar e doar já estão nas telas, desabilitados.
