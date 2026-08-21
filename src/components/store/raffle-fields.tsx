import { Plus, Trash2 } from "lucide-react";
import { useMemo } from "react";
import { AiPrizeDescription } from "#/components/store/ai-text";
import { Button } from "#/components/ui/button";
import { Field, Input, Textarea } from "#/components/ui/field";
import { ImagePicker } from "#/components/ui/image-picker";
import { MoneyInput } from "#/components/ui/money-input";
import {
  emptyPrize,
  monthKeyOfWindow,
  monthOptions,
  PRIZE_MAX_IMAGES,
  type PrizeDraft,
  type RaffleDraft,
} from "#/lib/raffle";
import { cn } from "#/lib/utils";

function PrizeFields({
  slug,
  campaignTitle,
  prizes,
  onChange,
  onUploadingChange,
  onError,
}: {
  slug: string;
  campaignTitle?: string;
  prizes: PrizeDraft[];
  onChange: (prizes: PrizeDraft[]) => void;
  onUploadingChange: (uploading: boolean) => void;
  onError: (message: string | null) => void;
}) {
  function patch(id: string, next: Partial<PrizeDraft>) {
    onChange(prizes.map((prize) => (prize.id === id ? { ...prize, ...next } : prize)));
  }

  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= prizes.length) return;
    const reordered = [...prizes];
    const [moved] = reordered.splice(index, 1);
    if (moved) reordered.splice(target, 0, moved);
    onChange(reordered);
  }

  return (
    <div className="grid gap-4">
      {prizes.map((prize, index) => (
        <div
          key={prize.id}
          className="grid gap-4 rounded-[1rem] border border-line bg-elevated p-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="kicker">{index + 1}º prêmio</span>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                aria-label="Subir prêmio"
                disabled={index === 0}
                onClick={() => move(index, -1)}
              >
                ↑
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                aria-label="Descer prêmio"
                disabled={index === prizes.length - 1}
                onClick={() => move(index, 1)}
              >
                ↓
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                aria-label="Remover prêmio"
                onClick={() => onChange(prizes.filter((candidate) => candidate.id !== prize.id))}
              >
                <Trash2 className="h-4 w-4" aria-hidden />
              </Button>
            </div>
          </div>

          <Field label="O que é" htmlFor={`prize-title-${prize.id}`} error={undefined}>
            <Input
              id={`prize-title-${prize.id}`}
              placeholder="Cesta de produtos"
              value={prize.title}
              onChange={(event) => patch(prize.id, { title: event.target.value })}
            />
          </Field>

          <Field
            label="Descrição (opcional)"
            htmlFor={`prize-desc-${prize.id}`}
            hint="Diga o que vem junto e o tamanho — quem sabe o que vai ganhar participa mais."
            error={undefined}
          >
            <Textarea
              id={`prize-desc-${prize.id}`}
              rows={2}
              value={prize.description}
              onChange={(event) => patch(prize.id, { description: event.target.value })}
            />
          </Field>

          <AiPrizeDescription
            slug={slug}
            prizeTitle={prize.title}
            campaignTitle={campaignTitle}
            description={prize.description}
            onApply={(text) => patch(prize.id, { description: text })}
          />

          <div className="grid gap-2">
            <span className="font-medium text-sm">Fotos</span>
            <ImagePicker
              storeSlug={slug}
              images={prize.images}
              onChange={(images) => patch(prize.id, { images })}
              max={PRIZE_MAX_IMAGES}
              onUploadingChange={onUploadingChange}
              onError={onError}
              label="Arraste a foto do prêmio"
            />
          </div>
        </div>
      ))}

      <Button
        type="button"
        size="sm"
        variant="secondary"
        onClick={() => onChange([...prizes, emptyPrize()])}
      >
        <Plus className="h-4 w-4" aria-hidden />
        Adicionar prêmio
      </Button>
    </div>
  );
}

/**
 * Atalho de mês: preenche a janela inteira com um toque, que é como a campanha longa
 * costuma ser dividida ("sorteio de setembro", "de outubro"). O datepicker ao lado continua
 * mandando — mexeu num dia, o chip desmarca sozinho porque a janela deixa de ser um mês.
 */
function MonthChips({
  idPrefix,
  draft,
  onPick,
}: {
  idPrefix: string;
  draft: RaffleDraft;
  onPick: (next: Partial<RaffleDraft>) => void;
}) {
  const options = useMemo(() => monthOptions(new Date(), 12), []);
  const activeKey = monthKeyOfWindow(draft.startDate, draft.endDate);
  const generatedTitles = useMemo(
    () => new Set(options.map((option) => option.raffleTitle)),
    [options],
  );

  return (
    // `min-w-0` nos dois: item de grid não encolhe abaixo do próprio min-content por
    // padrão, então a fila de 12 chips esticava o card inteiro para fora da tela em vez
    // de rolar por dentro
    <div className="grid min-w-0 gap-2">
      <span className="font-medium text-sm">Período do sorteio</span>
      {/* rolagem horizontal no celular: 12 meses não cabem em 390px e quebrar em 4 linhas
          empurra o resto do formulário para fora da tela */}
      <div className="flex min-w-0 snap-x gap-2 overflow-x-auto pb-1">
        {options.map((option) => {
          const active = option.key === activeKey;
          return (
            <button
              key={option.key}
              type="button"
              aria-pressed={active}
              id={`month-${option.key}-${idPrefix}`}
              className={cn(
                "h-9 shrink-0 snap-start rounded-full border px-3.5 text-sm transition-colors",
                "[transition-duration:var(--dur)]",
                active
                  ? "border-brand bg-brand text-brand-ink"
                  : "border-line bg-surface text-muted hover:border-line-strong hover:text-ink",
              )}
              onClick={() =>
                onPick({
                  startDate: option.startDate,
                  endDate: option.endDate,
                  // só renomeia o que ainda não foi escrito à mão: trocar de chip corrige
                  // "Sorteio de setembro" para outubro, mas não apaga um nome próprio
                  ...((!draft.title.trim() || generatedTitles.has(draft.title)) && {
                    title: option.raffleTitle,
                  }),
                })
              }
            >
              {option.label}
            </button>
          );
        })}
      </div>
      <p className="text-muted text-xs">
        Um toque preenche o mês inteiro. Para outro recorte, use as datas abaixo.
      </p>
    </div>
  );
}

/**
 * Nome, janela, valor do número e prêmios. Mesmo bloco na criação da campanha, na criação
 * de um sorteio novo e na edição de um existente.
 *
 * A janela é em dia local: quem preenche pensa em "setembro", não em UTC. A conversão para
 * ISO fica com quem submete (`buildRafflePayload`).
 */
export function RaffleFields({
  slug,
  idPrefix,
  campaignTitle,
  draft,
  onChange,
  onUploadingChange,
  onError,
}: {
  slug: string;
  idPrefix: string;
  campaignTitle?: string;
  draft: RaffleDraft;
  onChange: (next: RaffleDraft) => void;
  onUploadingChange: (uploading: boolean) => void;
  onError: (message: string | null) => void;
}) {
  function patch(next: Partial<RaffleDraft>) {
    onChange({ ...draft, ...next });
  }

  return (
    <div className="grid gap-5">
      <Field label="Nome do sorteio" htmlFor={`title-${idPrefix}`} error={undefined}>
        <Input
          id={`title-${idPrefix}`}
          placeholder="Sorteio de setembro"
          value={draft.title}
          onChange={(event) => patch({ title: event.target.value })}
        />
      </Field>

      <MonthChips idPrefix={idPrefix} draft={draft} onPick={patch} />

      <div className="grid gap-5 md:grid-cols-2">
        <Field
          label="Vale para doações a partir de"
          htmlFor={`start-${idPrefix}`}
          hint="Em branco: a partir de agora."
          error={undefined}
        >
          <Input
            id={`start-${idPrefix}`}
            type="date"
            value={draft.startDate}
            onChange={(event) => patch({ startDate: event.target.value })}
          />
        </Field>

        <Field
          label="Até"
          htmlFor={`end-${idPrefix}`}
          hint="Em branco: vale até você sortear."
          error={undefined}
        >
          <Input
            id={`end-${idPrefix}`}
            type="date"
            value={draft.endDate}
            onChange={(event) => patch({ endDate: event.target.value })}
          />
        </Field>
      </div>

      <Field
        label="Quanto custa um número da sorte?"
        htmlFor={`per-${idPrefix}`}
        hint="A R$ 10 por número, quem doa R$ 50 recebe 5 números."
        error={undefined}
      >
        <MoneyInput
          id={`per-${idPrefix}`}
          value={draft.centsPerNumberInput}
          onChange={(event) => patch({ centsPerNumberInput: event.target.value })}
        />
      </Field>

      <PrizeFields
        slug={slug}
        campaignTitle={campaignTitle}
        prizes={draft.prizes}
        onChange={(prizes) => patch({ prizes })}
        onUploadingChange={onUploadingChange}
        onError={onError}
      />
    </div>
  );
}
