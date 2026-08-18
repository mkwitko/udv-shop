# Identidade visual — Prospera

Marca: **Prospera**. Conceito: **Cobre & Porcelana** — dinheiro feito à mão. O carvão
espresso e o marfim são o produto (ferramenta séria, premium); o **cobre** é o metal da
moeda: o valor que passa direto de quem compra para quem faz. A tela precisa parecer
ferramenta cara e acolhedora — não folder, não template de startup, não fintech fria.
Antes de qualquer tela nova, leia isto.

## Regras de ouro

- **Mobile-first**: todo layout nasce em ~390px; `sm:`/`md:` só adicionam. Tap targets
  ≥ 44px (botão `md` = h-11).
- **Público leigo**: uma decisão por tela, botão grande com verbo claro ("Pagar com
  Pix"), passo indicado ("Passo 1 de 2"), status em linguagem de gente ("esperando o
  banco confirmar"). Nada de jargão técnico na tela.
- **Copy sem "núcleo"**: fala-se de "sua loja", "sua conta", "quem organiza".

## Assinatura: o fio de cobre

`.thread` — uma linha-gradiente de cobre que se desenha da esquerda no load
(`thread-draw`); `.thread-glow` adiciona o brilho de base. Onde usar: hero da landing,
topo da página da loja, confirmação de pagamento. Nunca em tela utilitária.

`.copper-word` — UMA palavra do display em gradiente de cobre por página, nunca mais
que isso.

## Paleta

| Token | Claro | Escuro | Papel |
|---|---|---|---|
| `--bg` | `#fbfaf8` | `#0f0d0b` | fundo (porcelana / espresso) |
| `--surface` | `#f3f1ec` | `#161310` | faixa, campo, imagem vazia |
| `--elevated` | `#ffffff` | `#1d1915` | card |
| `--ink` | `#1a1713` | `#f2ede4` | texto |
| `--ink-muted` | `#6b6459` | `#a59c8d` | texto secundário (≥ 4.5:1) |
| `--brand` | `#a04c22` | `#e0956a` | **cobre**: link, kicker, progresso, foco, detalhe |
| `--cta` | `#1a1713` | `#f2ede4` | ação primária monocromática invertida |
| `--accent` | `#8a6d1f` | `#d9b04f` | aviso, pendente (semântica, não marca) |
| `--danger` | `#b3261e` | `#ff8b7e` | erro |

O botão primário NÃO é cobre: é tinta no claro e marfim no escuro (`--cta`/`--cta-ink`),
como peça de metal polido. O cobre é raro de propósito — é o que faz ele valer.

Regra dos temas (não pode quebrar): toda cor nasce em `:root`;
`@media (prefers-color-scheme: dark)` redefine só os tokens dentro de
`:root:not([data-theme="light"])`; `:root[data-theme="dark"]` redefine de novo para o
botão vencer a preferência do sistema nos dois sentidos. O `themeBootScript` roda inline
no `<head>`.

## Tipografia

- **Bricolage Grotesque Variable** no display (h1–h3, números de destaque) — a voz da
  marca, peso 620–640, tracking apertado.
- **Instrument Sans Variable** no corpo e UI.
- Self-hosted via fontsource; nenhuma chamada ao Google Fonts em runtime.
- Dinheiro sempre `tabular-nums`, via `money()` — centavos inteiros da API, divididos só
  na hora de mostrar.

| Classe | Uso |
|---|---|
| `text-display` | h1 de landing — até 5rem, peso 640 |
| `text-title` | h1/h2 de seção |
| `text-lede` | parágrafo de abertura |
| `.kicker` | rótulo acima do título, caixa alta, em cobre |

## Forma

- `--radius: 0.75rem`. Card `radius-lg`, campo `radius-md`, **botão pill**
  (`rounded-full`), tag `rounded-full`.
- Elevação é borda; `--shadow-card` só em card destacado e no hover.
- No escuro, card ganha fio de luz no topo (`--edge`).
- Fundo do hero: `.grid-field` (malha 1px mascarada) — a única textura do sistema.
- Imagem que não existe vira campo com brilho da marca, nunca ícone de "sem foto".

## Movimento

- Fio de cobre se desenha no load (`thread-draw`, 1s).
- Entrada em cascata: `.rise` + `.rise-1..5` (fade + 14px, 550ms).
- Progresso de campanha preenche da esquerda (`.progress-fill`), em cobre.
- Hover de card sobe 2px e ganha sombra; foto de produto escala 3%.
- Uma curva e uma duração: `--ease`, `--dur: 180ms`. `prefers-reduced-motion` zera tudo.

## Proibido

- gradiente roxo/azul, blob decorativo, glassmorphism, sombra colorida "plástica"
- hero centrado com dois botões sem nada em volta que prove o produto
- grid de cards com ícone lucide gigante como enfeite (ícone aqui é 20px, dentro de um
  quadrado de 40px, e sempre ao lado de texto que explica)
- jargão de startup na copy ("turbine", "supercharge", "descomplique", "revolucione")
- número inventado como prova social
- cobre em área grande (fundo de seção, botão primário): o cobre é detalhe, não tinta

## Copy

Direta, em português do Brasil, sem religiosidade explícita e sem gíria. Fala do que a
ferramenta faz e do que custa: "o valor cai direto na sua conta" vale mais que "gestão
inteligente".
