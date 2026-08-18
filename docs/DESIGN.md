# Identidade visual — Prospera

Marca: **Prospera**. Conceito: **amanhecer** — prosperidade é o dia nascendo sobre o
campo. O verde é o campo (confiança), o âmbar é o sol (crescimento). A tela precisa
parecer ferramenta confiável e acolhedora — não folder, não template de startup. Antes
de qualquer tela nova, leia isto.

## Regras de ouro

- **Mobile-first**: todo layout nasce em ~390px; `sm:`/`md:` só adicionam. Tap targets
  ≥ 44px (botão `md` = h-11).
- **Público leigo**: uma decisão por tela, botão grande com verbo claro ("Pagar com
  Pix"), passo indicado ("Passo 1 de 2"), status em linguagem de gente ("esperando o
  banco confirmar"). Nada de jargão técnico na tela.
- **Copy sem "núcleo"**: fala-se de "sua loja", "sua conta", "quem organiza". O nome do
  público não aparece.

## Assinatura: o horizonte

`.horizon` — linha fina com um sol de luz subindo atrás (CSS puro, `::before` +
`::after`). Anima no load (`sun-rise`). Onde usar: hero da landing, topo da página da
loja, confirmação de pagamento. Nunca em tela utilitária (formulário, gestão).

## Movimento

- Entrada em cascata: `.rise` + `.rise-1..5` (fade + 14px para cima, 550ms).
- Barra de progresso: `.progress-fill` preenche da esquerda ao montar; gradiente
  verde→âmbar (a arrecadação caminha para o sol).
- Hover de card sobe 2px; foto de produto escala 3%.
- Uma curva e uma duração: `--ease`, `--dur: 180ms`. `prefers-reduced-motion` zera tudo.

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
| `--sun` | `#e18f14` | `#ffb84d` | o sol: logo, horizonte, ponta do progresso |
| `--accent` | `#b7791f` | `#e0a63a` | aviso, estado pendente |
| `--danger` | `#b42318` | `#ff8b7e` | erro |

`--sun` é marca, `--accent` é semântica de aviso — não misturar os papéis.

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
