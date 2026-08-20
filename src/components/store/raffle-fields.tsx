import { Plus, Trash2 } from "lucide-react";
import { AiPrizeDescription } from "#/components/store/ai-text";
import { Button } from "#/components/ui/button";
import { Field, Input, Textarea } from "#/components/ui/field";
import { ImagePicker } from "#/components/ui/image-picker";
import { MoneyInput } from "#/components/ui/money-input";
import { emptyPrize, PRIZE_MAX_IMAGES, type PrizeDraft } from "#/lib/raffle";

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
 * Nome, janela, valor do número e prêmios. Mesmo bloco na criação da campanha, na criação
 * de um sorteio novo e na edição de um existente.
 *
 * A janela é em dia local: quem preenche pensa em "setembro", não em UTC. A conversão para
 * ISO fica com quem submete (`dayStartIso`/`dayEndIso`).
 */
export function RaffleFields({
  slug,
  idPrefix,
  campaignTitle,
  title,
  onTitleChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  centsPerNumberInput,
  onCentsPerNumberChange,
  prizes,
  onPrizesChange,
  onUploadingChange,
  onError,
}: {
  slug: string;
  idPrefix: string;
  campaignTitle?: string;
  title: string;
  onTitleChange: (value: string) => void;
  startDate: string;
  onStartDateChange: (value: string) => void;
  endDate: string;
  onEndDateChange: (value: string) => void;
  centsPerNumberInput: string;
  onCentsPerNumberChange: (value: string) => void;
  prizes: PrizeDraft[];
  onPrizesChange: (prizes: PrizeDraft[]) => void;
  onUploadingChange: (uploading: boolean) => void;
  onError: (message: string | null) => void;
}) {
  return (
    <div className="grid gap-5">
      <Field label="Nome do sorteio" htmlFor={`title-${idPrefix}`} error={undefined}>
        <Input
          id={`title-${idPrefix}`}
          placeholder="Sorteio de setembro"
          value={title}
          onChange={(event) => onTitleChange(event.target.value)}
        />
      </Field>

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
            value={startDate}
            onChange={(event) => onStartDateChange(event.target.value)}
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
            value={endDate}
            onChange={(event) => onEndDateChange(event.target.value)}
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
          value={centsPerNumberInput}
          onChange={(event) => onCentsPerNumberChange(event.target.value)}
        />
      </Field>

      <PrizeFields
        slug={slug}
        campaignTitle={campaignTitle}
        prizes={prizes}
        onChange={onPrizesChange}
        onUploadingChange={onUploadingChange}
        onError={onError}
      />
    </div>
  );
}
