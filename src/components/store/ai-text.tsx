import { Sparkles } from "lucide-react";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import { errorMessage } from "#/lib/api/error-message";
import { ApiError } from "#/lib/api/fetch-client";
import { suggestCampaignStory } from "#/lib/api/gen/clients/suggestCampaignStory";
import { suggestPrizeDescription } from "#/lib/api/gen/clients/suggestPrizeDescription";
import { suggestProductDescription } from "#/lib/api/gen/clients/suggestProductDescription";
import { suggestStoreDescription } from "#/lib/api/gen/clients/suggestStoreDescription";

type AskInput = { mode: "create" | "improve"; draft?: string };

/**
 * Ajuda de IA para texto que a loja escreve (descrição de produto, história de
 * campanha). A IA nunca escreve direto no campo: propõe e quem aplica é a pessoa — o
 * texto é da loja, não da plataforma. Se a plataforma está sem credencial, o bloco some
 * em vez de virar erro na cara de quem só queria cadastrar.
 */
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
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [off, setOff] = useState(false);

  const clean = draft.trim();
  // texto curto é anotação, não rascunho: aí a IA escreve em vez de "melhorar" duas linhas
  const mode: AskInput["mode"] = clean.length >= 12 ? "improve" : "create";

  if (off) return null;

  async function run() {
    setBusy(true);
    setError(null);
    try {
      const result = await ask(clean ? { mode, draft: clean } : { mode });
      setSuggestion(result.text);
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

  const label = busy
    ? "Escrevendo…"
    : mode === "improve"
      ? `Melhorar ${subject} com IA`
      : `Escrever ${subject} com IA`;

  return (
    <div className="grid gap-2">
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
        <span className="text-muted text-xs">{canAsk ? hint : blockedHint}</span>
      </div>

      {error && <p className="text-danger text-sm">{error}</p>}

      {suggestion && (
        <div className="grid gap-3 rounded-[1rem] border border-brand/25 bg-brand-pale p-4">
          <p className="whitespace-pre-line text-[0.95rem]">{suggestion}</p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => {
                onApply(suggestion);
                setSuggestion(null);
              }}
            >
              Usar este texto
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={run} disabled={busy}>
              Tentar outro
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setSuggestion(null)}>
              Descartar
            </Button>
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
