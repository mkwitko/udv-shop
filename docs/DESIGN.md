# Identidade visual — Prospera · Tangerina

Marca: **Prospera**. Conceito: **Tangerina** — clara, colorida e humana (referências do
usuário: Nubank e Airbnb). A regra que define tudo: **a cor é usada com coragem, em
bloco grande — cor em detalhe é "corzinha", cor em massa é marca.** A tela precisa
parecer alegre, confiável e fácil, para gente que resolve a vida pelo WhatsApp.

Escolhida pelo Mauricio em 2026-08-18 na página de propostas
(https://claude.ai/code/artifact/d5feb2fd-bbc9-4aa5-b4b9-9317b59a9366), colorway T.

## Regras de ouro

- **Mobile-first**: layout nasce em ~390px; `sm:`/`md:` só adicionam. Tap targets ≥ 44px.
- **Público leigo**: uma decisão por tela, botão grande com verbo claro, passo indicado,
  status em linguagem de gente. Nada de jargão técnico.
- **Copy sem "núcleo"**: fala-se de "sua loja", "sua conta", "quem organiza".

## Assinatura: o bloco tangerina

`.bloco` — um painel inteiro da cor (gradiente `#F26527 → #DD4712`, halo de luz branca),
de onde o conteúdo real "sobe" (card de produto, vitrine). É o hero da landing, o topo
da página da loja e o fecho de conversão. **A cor do bloco é fixa nos dois temas** — o
bloco É a marca. Dentro dele: texto branco, botões `variant="inverse"` (branco cheio) e
`variant="inverse-outline"`; tokens do tema não valem lá dentro.

`.halo-top` — brilho suave da marca no topo, para telas de confirmação (pedido pago,
doação recebida). Festivo sem virar bloco.

## Paleta

| Token | Claro | Escuro | Papel |
|---|---|---|---|
| `--bg` | `#FDFCFA` | `#17130F` | fundo |
| `--surface` | `#F6F4EF` | `#201B15` | faixa, campo |
| `--elevated` | `#FFFFFF` | `#27211A` | card |
| `--ink` | `#1C1A17` | `#F4EFE7` | texto |
| `--brand` | `#E8541E` | `#F0602A` | tangerina: preenchimentos, botão primário, blocos |
| `--brand-deep` | `#A63D0E` | `#FFA471` | **texto/link na cor** (AA garantido) |
| `--brand-hover` | `#C9430F` | `#FF7A42` | hover |
| `--success` | `#2A9D68` | `#4CC38F` | pago, confirmado |
| `--accent` | `#8A6D1F` | `#D9B04F` | aviso, pendente |
| `--danger` | `#C94B3C` | `#FF8B7E` | erro |
| secundárias | coral `#F28B67` · plum `#70405A` · lavender `#8D7BB8` · sky `#72AFC4` · sand `#E8D4B8` | versões claras | pequenas surpresas: badge, ilustração, número — regra 70% neutros / 20% tangerina / 10% secundárias |

**Regra de contraste:** `bg-brand` (vivo) é só para preenchimento com texto branco;
texto tangerina sobre fundo claro usa SEMPRE `text-brand-deep`. Nunca `text-brand` puro
em texto corrido.

Regra dos temas (não pode quebrar): toda cor nasce em `:root`;
`@media (prefers-color-scheme: dark)` redefine só os tokens dentro de
`:root:not([data-theme="light"])`; `:root[data-theme="dark"]` redefine de novo para o
botão vencer a preferência do sistema nos dois sentidos. `themeBootScript` inline no
`<head>`.

## Tipografia

- **Gabarito Variable** no display (h1–h3, números, preços de destaque) — redonda,
  quente, peso 700–800.
- **Figtree Variable** no corpo e UI.
- Self-hosted via fontsource; nenhuma chamada ao Google Fonts em runtime.
- Dinheiro sempre `tabular-nums` via `money()` — centavos inteiros da API.

| Classe | Uso |
|---|---|
| `text-display` | h1 — até 4.6rem, peso 800 |
| `text-title` | h1/h2 de seção, peso 800 |
| `text-lede` | parágrafo de abertura |
| `.kicker` | rótulo acima do título, caixa alta, Gabarito, em `--brand-deep` |

## Forma

- `--radius: 1rem`. Card `radius-lg` (1rem), bloco `+0.5rem` (24px), campo `radius-md`,
  **botão pill** (`rounded-full`), ícone em quadrado `rounded-[0.9rem]` colorido cheio.
- Ícones de feature: quadrado 44px CHEIO de cor (brand/success/ink) com glifo branco.
- Elevação: borda + `--shadow-card` no hover; no escuro card ganha fio de luz (`--edge`).
- Inicial da loja vira medalhão redondo tangerina com letra branca.
- Imagem que não existe vira campo com gradiente quente, nunca ícone de "sem foto".

## Movimento

- Entrada em cascata: `.rise` + `.rise-1..5` (fade + 14px, 550ms).
- Progresso de campanha preenche da esquerda (`.progress-fill`), tangerina.
- Hover de card sobe 2px e ganha sombra; foto de produto escala 3%.
- Curvas: entrada `cubic-bezier(0.22,1,0.36,1)` (`--ease`), saída `--ease-exit`. Micro
  120–180ms, componente 300–450ms, seção 500–700ms, contadores 700–1200ms.
- Scroll-reveal via `<Reveal>` (motion/react), uma vez só, sem scroll-jacking.
- Botão: hover scale 1.015, active 0.98. `prefers-reduced-motion` zera tudo.
- Ícones: Lucide é infraestrutura; momentos de marca usam os glifos próprios de
  `components/ui/glyphs.tsx` (Pix, coração, bandeirinha, bilhete, sacola, estrela, seta
  direta) — stroke 1.4, geometria arredondada.

## Proibido

- cor da marca em detalhe tímido (a marca aparece em massa ou não aparece)
- gradiente roxo/azul, glassmorphism, sombra colorida "plástica" fora do botão primário
- jargão de startup na copy; número inventado como prova social
- texto `text-brand` vivo sobre fundo claro (usar `text-brand-deep`)

## Copy

Direta, em português do Brasil, sem religiosidade explícita e sem gíria. Fala do que a
ferramenta faz e do que custa: "o valor cai direto na sua conta" vale mais que "gestão
inteligente".
