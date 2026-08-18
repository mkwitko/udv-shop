# Identidade visual

Produto de software vendido para quem organiza um núcleo. A tela precisa parecer
ferramenta confiável — não folder de igreja, não template de startup. Antes de qualquer
tela nova, leia isto.

## Proibido

- gradiente roxo/azul, blob decorativo, glassmorphism, sombra colorida "plástica"
- hero centrado com dois botões sem nada em volta que prove o produto
- grid de cards com ícone lucide gigante como enfeite (ícone aqui é 20px, dentro de um
  quadrado de 40px, e sempre ao lado de texto que explica)
- jargão de startup na copy ("turbine", "supercharge", "descomplique", "revolucione")
- número inventado como prova social (nada de "+500 núcleos" enquanto não houver 500)

## Tema claro e escuro

Os dois existem e o usuário escolhe. A regra que não pode quebrar:

- toda cor nasce em `:root` (paleta clara)
- `@media (prefers-color-scheme: dark)` redefine **só** os tokens, dentro de
  `:root:not([data-theme="light"])`
- `:root[data-theme="dark"]` redefine os mesmos tokens de novo, para o botão vencer a
  preferência do sistema nos dois sentidos

Cor definida apenas dentro da media query some quando alguém troca no botão. O
`themeBootScript` roda inline no `<head>`: sem ele a página escura pisca branca antes de
hidratar.

## Paleta

| Token | Claro | Escuro | Papel |
|---|---|---|---|
| `--bg` | `#ffffff` | `#070a09` | fundo da página |
| `--surface` | `#f6f7f7` | `#0d1211` | faixa, campo de formulário, imagem vazia |
| `--elevated` | `#ffffff` | `#121917` | card |
| `--ink` | `#0a0f0d` | `#e9efec` | texto |
| `--ink-muted` | `#56635e` | `#93a29c` | texto secundário (≥ 4.5:1 nos dois temas) |
| `--line` | `#e3e7e5` | `#1c2622` | borda padrão |
| `--brand` | `#0d7a5f` | `#2ed3a3` | ação primária, link, progresso |
| `--accent` | `#b7791f` | `#e0a63a` | aviso, estado pendente |
| `--danger` | `#b42318` | `#ff8b7e` | erro |

O verde clareia no escuro porque `#0d7a5f` sobre `#070a09` não passa em contraste. Os
tokens do shadcn (`--primary`, `--muted`, `--border`, …) são remapeados para estes, então
componente instalado depois já nasce no tema certo.

## Tipografia

**Archivo Variable** em tudo, self-hosted (`@fontsource-variable/archivo`) — nenhuma
chamada ao Google Fonts em runtime. O peso e o tracking é que separam papel:

| Classe | Uso |
|---|---|
| `text-display` | h1 de landing — até 4.5rem, `letter-spacing: -0.035em`, peso 620 |
| `text-title` | h1/h2 de seção |
| `text-lede` | parágrafo de abertura |
| `.kicker` | rótulo acima do título, caixa alta, 0.78rem |

## Forma e textura

- `--radius: 0.625rem`. Card `radius-lg`, botão e campo `radius-md`, tag `rounded-full`.
- Elevação é borda, não sombra. `--shadow-card` só entra em card destacado (prévia do
  painel, caixa de login).
- Fundo do hero: `.grid-field` (malha 1px com máscara radial) + `.glow-field` (brilho da
  marca). É a única decoração do sistema — no lugar do blob.
- Imagem que não existe vira campo de cor da marca, nunca ícone de "sem foto".

## Movimento

Uma curva e uma duração: `--ease: cubic-bezier(0.2,0.7,0.2,1)`, `--dur: 180ms`.
Micro-interação só onde comunica estado — hover de card sobe 2px e escurece a borda,
foto de produto escala 3%. `prefers-reduced-motion` zera tudo.

## Copy

Direta, em português do Brasil, sem religiosidade explícita e sem gíria. Fala do que a
ferramenta faz e do que custa: "o valor cai direto na conta do núcleo" vale mais que
"gestão inteligente". Preço sempre por `money()` — centavos inteiros vindos da API,
divididos só na hora de mostrar.
