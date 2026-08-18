# udv-shop-web

Front da plataforma de lojas e doações dos núcleos. TanStack Start + Tailwind v4,
publicado no Cloudflare Workers. Fala com a `udv-shop-api`.

## Rodar local
1. Suba a API (`../udv-shop-api`, `pnpm dev`) e semeie o banco lá (`pnpm db:seed`)
2. `cp .env.example .env`
3. `pnpm install && pnpm dev` → http://localhost:3000

Loja de exemplo depois do seed: http://localhost:3000/loja/nucleo-demo

## Contrato da API
`pnpm api:generate` regenera `src/lib/api/gen/` a partir de
`../udv-shop-api/docs/openapi.json`. Nada dentro de `gen/` é editado à mão. Mexeu em rota
na API? Roda `pnpm openapi:export` lá e `pnpm api:generate` aqui.

## Comandos
- `pnpm dev` / `pnpm build` / `pnpm deploy` (wrangler)
- `pnpm typecheck`, `pnpm test`, `pnpm check` (biome), `pnpm lint:fix`

## Antes de mexer em UI
Leia `docs/DESIGN.md`. O sistema visual é explícito e tem proibições — não instale
componente de terceiro sem re-tematizar. Arquitetura e fluxo de dados: `docs/ARCHITECTURE.md`.
