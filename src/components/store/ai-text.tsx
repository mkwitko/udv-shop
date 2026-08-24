import { Sparkles } from "lucide-react";
import { useId, useState } from "react";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/field";
import { errorMessage } from "#/lib/api/error-message";
import { ApiError } from "#/lib/api/fetch-client";
import { suggestCampaignStory } from "#/lib/api/gen/clients/suggestCampaignStory";
import { suggestPrizeDescription } from "#/lib/api/gen/clients/suggestPrizeDescription";
import { suggestProductDescription } from "#/lib/api/gen/clients/suggestProductDescription";
import { suggestStoreDescription } from "#/lib/api/gen/clients/suggestStoreDescription";

type AskInput = { mode: "create" | "improve"; draft?: string; instruction?: string };

const INSTRUCTION_MAX = 300;

/**
 * Auxílio de IA para texto que a loja escreve (descrição de produto, história de
 * campanha). A IA nunca escreve direto no campo: propõe e quem aplica é a pessoa — o
 * texto é da loja, não da plataforma. Se a plataforma está sem credencial, o bloco some
 * em vez de virar erro na cara de quem só queria cadastrar.
 */
/**
 * Atalhos de pedido: um toque escreve o que quase todo mundo ia digitar. O que vai para
 * a IA é mais explícito que o rótulo — "Mais curto" sozinho o modelo ignora, já "corte
 * pela metade" ele obedece.
 */
const SHORTCUTS = [
  { label: "Mais curto", text: "Deixe bem mais curto, cortando o que não é essencial." },
  { label: "Mais caloroso", text: "Deixe mais caloroso e próximo, como quem fala com um vizinho." },
  {
    label: "Foque no que a pessoa leva",
    text: "Comece pelo que a pessoa leva ou ganha, logo na primeira frase.",
  },
  { label: "Menos formal", text: "Escreva menos formal, com palavras do dia a dia." },
] as const;

function AiText({
  subject,
  draft,
  canAsk,
  blockedHint,
  hint,
  ask,
  onApply,
}: {
  /** o que a IA vai escrever, para o rótulo do botão. */
  subject: string;
  draft: string;
  canAsk: boolean;
  blockedHint: string;
  hint: string;
  ask: (input: AskInput) => Promise<{ text: string }>;
  onApply: (text: string) => void;
}) {
  const [suggestion, setSuggestion] = useState<{ text: string; instruction: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [off, setOff] = useState(false);
  const [instruction, setInstruction] = useState("");
  const [asking, setAsking] = useState(false);
  const instructionId = useId();

  const clean = draft.trim();
  // texto curto é anotação, não rascunho: aí a IA escreve em vez de "melhorar" duas linhas
  const mode: AskInput["mode"] = clean.length >= 12 ? "improve" : "create";
  const wish = instruction.trim();

  if (off) return null;

  async function run() {
    setBusy(true);
    setError(null);
    try {
      const result = await ask({
        mode,
        ...(clean && { draft: clean }),
        ...(wish && { instruction: wish }),
      });
      // guardado junto do texto: é o que deixa a tela dizer qual pedido gerou aquilo
      setSuggestion({ text: result.text, instruction: wish });
    } catch (err) {
      // feature desligada na plataforma: esconde o bloco, não culpa a loja
      if (err instanceof ApiError && err.code === "ai_not_configured") {
        setOff(true);
        return;
      }
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  function addShortcut(text: string) {
    setInstruction((current) => (current.trim() ? `${current.trim()}. ${text}` : text));
  }

  // o rótulo muda com qualquer coisa escrita, não só com rascunho longo: a anotação curta
  // também vai para a IA (como contexto), então "Escrever" mentiria sobre o que acontece
  const verb = clean ? "Melhorar" : "Escrever";
  const label = busy
    ? "Escrevendo…"
    : wish
      ? `${verb} com esta orientação`
      : `${verb} ${subject} com IA`;

  /** Campo de pedido e atalhos. Aparece antes de gerar (a pedido) e junto da sugestão. */
  const instructionBox = (
    <div className="grid gap-2">
      <label className="font-medium text-sm" htmlFor={instructionId}>
        O que você quer nesse texto?
      </label>
      <Input
        id={instructionId}
        value={instruction}
        maxLength={INSTRUCTION_MAX}
        placeholder="Mais curto e sem drama. Cite a horta."
        onChange={(event) => setInstruction(event.target.value)}
        onKeyDown={(event) => {
          // Enter aqui é "gerar", não "enviar o formulário da página"
          if (event.key === "Enter") {
            event.preventDefault();
            if (!busy && canAsk) void run();
          }
        }}
      />
      <div className="flex flex-wrap gap-2">
        {SHORTCUTS.map((shortcut) => (
          <button
            key={shortcut.label}
            type="button"
            className="h-8 rounded-full border border-line bg-surface px-3 text-muted text-xs transition-colors hover:border-line-strong hover:text-ink"
            onClick={() => addShortcut(shortcut.text)}
          >
            {shortcut.label}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={run}
          disabled={busy || !canAsk}
          title={canAsk ? undefined : blockedHint}
        >
          <Sparkles className="h-3.5 w-3.5" aria-hidden />
          {label}
        </Button>
        {canAsk && !asking && !suggestion && (
          <Button type="button" variant="ghost" size="sm" onClick={() => setAsking(true)}>
            Orientar a IA
          </Button>
        )}
        <span className="text-muted text-xs">{canAsk ? hint : blockedHint}</span>
      </div>

      {/* antes de gerar o campo só aparece a pedido; depois da sugestão ele mora no bloco
          "Quer ajustar?", que é onde a vontade de mudar aparece de verdade */}
      {asking && !suggestion && instructionBox}

      {error && <p className="text-danger text-sm">{error}</p>}

      {suggestion && (
        <div className="grid gap-4 rounded-[1rem] border border-brand/25 bg-brand-pale p-4">
          <div className="grid gap-2">
            <span className="kicker">Sugestão da IA</span>
            {suggestion.instruction && (
              <p className="text-muted text-xs">Seu pedido: {suggestion.instruction}</p>
            )}
            <p className="whitespace-pre-line text-[0.95rem]">{suggestion.text}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => {
                onApply(suggestion.text);
                setSuggestion(null);
                setInstruction("");
                setAsking(false);
              }}
            >
              Usar este texto
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setSuggestion(null);
                setAsking(false);
              }}
            >
              Descartar
            </Button>
          </div>

          <div className="grid gap-3 border-line border-t pt-4">
            <p className="font-medium text-sm">Quer ajustar?</p>
            {instructionBox}
            <div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={run}
                disabled={busy || !wish}
                title={wish ? undefined : "Escreva o ajuste ou toque num atalho."}
              >
                <Sparkles className="h-3.5 w-3.5" aria-hidden />
                {busy ? "Refazendo…" : "Refazer com o ajuste"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function AiDescription({
  slug,
  name,
  description,
  onApply,
}: {
  slug: string;
  name: string;
  description: string;
  onApply: (text: string) => void;
}) {
  return (
    <AiText
      subject="descrição"
      draft={description}
      canAsk={name.trim().length >= 2}
      blockedHint="Escreva o nome do produto primeiro."
      hint="Você revisa antes de usar. A IA não inventa preço nem prazo."
      onApply={onApply}
      ask={(input) => suggestProductDescription(slug, { name: name.trim(), ...input })}
    />
  );
}

export function AiPrizeDescription({
  slug,
  prizeTitle,
  campaignTitle,
  description,
  onApply,
}: {
  slug: string;
  prizeTitle: string;
  /** Título da campanha, quando já foi digitado. Só contexto de tom para a IA. */
  campaignTitle?: string;
  description: string;
  onApply: (text: string) => void;
}) {
  return (
    <AiText
      subject="descrição"
      draft={description}
      canAsk={prizeTitle.trim().length >= 2}
      blockedHint="Escreva o que é o prêmio primeiro."
      hint="Você revisa antes de usar. A IA não diz quanto vale nem inventa marca."
      onApply={onApply}
      ask={(input) =>
        suggestPrizeDescription(slug, {
          prizeTitle: prizeTitle.trim(),
          campaignTitle: campaignTitle?.trim() || undefined,
          ...input,
        })
      }
    />
  );
}

export function AiStoreDescription({
  name,
  description,
  onApply,
}: {
  name: string;
  description: string;
  onApply: (text: string) => void;
}) {
  return (
    <AiText
      subject="descrição"
      draft={description}
      canAsk={name.trim().length >= 2}
      blockedHint="Escreva o nome da loja primeiro."
      hint="Você revisa antes de usar. A IA não inventa história nem número de pessoas."
      onApply={onApply}
      ask={(input) => suggestStoreDescription({ name: name.trim(), ...input })}
    />
  );
}

export function AiCampaignStory({
  slug,
  title,
  story,
  onApply,
}: {
  slug: string;
  title: string;
  story: string;
  onApply: (text: string) => void;
}) {
  return (
    <AiText
      subject="história"
      draft={story}
      canAsk={title.trim().length >= 2}
      blockedHint="Escreva o título da campanha primeiro."
      hint="Você revisa antes de usar. A IA não promete resultado nem inventa destino do dinheiro."
      onApply={onApply}
      ask={(input) => suggestCampaignStory(slug, { title: title.trim(), ...input })}
    />
  );
}
