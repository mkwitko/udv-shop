# Identidade visual

Regra de ouro: **nada aqui pode parecer template**. A §9 da spec lista as proibições e
esta é a tradução delas em tokens. Antes de qualquer tela nova, leia isto.

## Proibido

- Inter, Poppins ou a fonte default do sistema como tipografia principal
- gradiente roxo/azul, blob decorativo, glassmorphism, sombra colorida "plástica"
- grid de cards com ícone lucide cru como enfeite
- hero centrado com dois botões clichê
- jargão de startup na copy ("turbine", "supercharge", "descomplique")

## Tipografia

| Papel | Fonte | Onde |
|---|---|---|
| Títulos | **Fraunces Variable** (serifa humanista, eixos SOFT/WONK) | `h1`–`h3`, `.font-display` |
| Interface e corpo | **Archivo Variable** | resto |

Ambas são self-hosted (`@fontsource-variable/*`) — nenhuma chamada ao Google Fonts em
runtime. A escala é marcada de propósito: `text-display` (até 5.25rem) salta do corpo,
`text-title` e `text-lede` ficam entre os dois.

## Paleta

Terra e verde profundo sobre off-white. Os tokens vivem em `src/styles.css` e os tokens
do shadcn (`--primary`, `--muted`, …) são **remapeados** para eles — por isso um
componente shadcn instalado depois já nasce no tema certo.

| Token | Claro | Papel |
|---|---|---|
| `--paper` | `#f6f1e7` | fundo |
| `--paper-deep` | `#ece4d4` | superfície, imagem sem foto |
| `--ink` | `#1e1a16` | texto (15:1 sobre paper) |
| `--ink-soft` | `#5c5347` | texto secundário (≥ 6:1) |
| `--clay` | `#a34527` | ação primária, preço |
| `--moss` | `#22453a` | ação secundária, progresso |
| `--ocre` | `#b8801f` | numeral, destaque — **nunca** como texto pequeno sobre paper |

Modo escuro inverte papel e tinta e clareia clay/moss para manter contraste AA.

## Textura e forma

- Grão de papel em `body::before` (SVG `feTurbulence`, `mix-blend-mode: multiply`). É a
  única "decoração" do sistema — no lugar de sombra.
- Raio de canto quase reto (`--radius: 0.25rem`). Nada de pílula.
- Separação por régua (`.rule`, 1px) em vez de card com sombra.
- Layout editorial: `.shell` com 12 colunas e blocos assimétricos (o texto do hero começa
  na coluna 6, não no centro).

## Movimento

Uma curva e uma duração para o app inteiro: `--ease: cubic-bezier(0.2,0.7,0.2,1)` e
`--dur: 220ms`. Micro-interação só onde comunica estado (hover de link, escala leve da
foto do produto). `prefers-reduced-motion` zera tudo.

## Copy

Calorosa e direta, em português do Brasil, sem religiosidade explícita e sem gíria. "A
lojinha do seu núcleo, aberta o ano inteiro" é o tom. Preço sempre formatado por
`money()` — centavos inteiros vindo da API, divididos só na hora de mostrar.
