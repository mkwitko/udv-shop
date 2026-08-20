import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { Pencil, Plus, Ticket, Trash2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AiCampaignStory, AiPrizeDescription } from "#/components/store/ai-text";
import { Button } from "#/components/ui/button";
import { ConfirmDialog } from "#/components/ui/confirm";
import { EmptyState } from "#/components/ui/empty-state";
import { Field, FormError, Input, Select, Textarea } from "#/components/ui/field";
import { ImagePicker, type PickedImage } from "#/components/ui/image-picker";
import { MoneyInput } from "#/components/ui/money-input";
import { Skeleton, SkeletonRows } from "#/components/ui/skeleton";
import { Tag } from "#/components/ui/tag";
import { useToast } from "#/components/ui/toast";
import { errorMessage } from "#/lib/api/error-message";
import { createCampaign } from "#/lib/api/gen/clients/createCampaign";
import { drawRaffle } from "#/lib/api/gen/clients/drawRaffle";
import { putRaffle } from "#/lib/api/gen/clients/putRaffle";
import { updateCampaignStatus } from "#/lib/api/gen/clients/updateCampaignStatus";
import { useGetRaffle } from "#/lib/api/gen/hooks/useGetRaffle";
import { listCampaignsQueryKey, useListCampaigns } from "#/lib/api/gen/hooks/useListCampaigns";
import type { ListCampaigns200 } from "#/lib/api/gen/types/ListCampaigns";
import { money, percent } from "#/lib/format";
import { maskAmountInput, parseAmount } from "#/lib/pay/amount";
import {
  buildPrizes,
  emptyPrize,
  PRIZE_MAX_IMAGES,
  type PrizeDraft,
  RAFFLE_MIN_CENTS_PER_NUMBER,
} from "#/lib/raffle";
import { slugify } from "#/lib/slug";

export const Route = createFileRoute("/gestao/$slug/campanhas")({
  component: CampaignsAdmin,
});

type Campaign = ListCampaigns200["items"][number];

const CampaignSchema = z.object({
  title: z.string().min(3, "Título muito curto").max(140),
  story: z.string().max(5000).optional(),
  goal: z.string().optional(),
  acceptedTypes: z.enum(["one_time", "monthly", "both"]),
});
type CampaignFormValues = z.infer<typeof CampaignSchema>;

const STATUS_META: Record<string, { label: string; tone: "brand" | "accent" | "neutral" }> = {
  draft: { label: "rascunho", tone: "neutral" },
  active: { label: "no ar", tone: "brand" },
  paused: { label: "pausada", tone: "accent" },
  finished: { label: "encerrada", tone: "neutral" },
};

// `all` porque campanha nasce rascunho: sem isso a tela de gestão não mostrava a
// campanha que a pessoa acabou de criar — só apareceria depois de publicada.
const LIST_QUERY = { limit: 50, all: "true" } as const;

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

/** Valor do número + prêmios. Mesmo bloco na criação da campanha e na edição do sorteio. */
function RaffleFields({
  slug,
  idPrefix,
  campaignTitle,
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
  centsPerNumberInput: string;
  onCentsPerNumberChange: (value: string) => void;
  prizes: PrizeDraft[];
  onPrizesChange: (prizes: PrizeDraft[]) => void;
  onUploadingChange: (uploading: boolean) => void;
  onError: (message: string | null) => void;
}) {
  return (
    <div className="grid gap-5">
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

function CampaignsAdmin() {
  const { slug } = Route.useParams();
  const { queryClient } = useRouter().options.context;
  const { data, isPending } = useListCampaigns(slug, LIST_QUERY);
  const [creating, setCreating] = useState(false);
  const campaigns = data?.items ?? [];

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: listCampaignsQueryKey(slug, LIST_QUERY) });
  }

  if (creating) {
    return (
      <CampaignCreate
        slug={slug}
        onDone={async () => {
          await refresh();
          setCreating(false);
        }}
        onCancel={() => setCreating(false)}
      />
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold tracking-tight">Campanhas</h2>
        <Button size="sm" onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" aria-hidden />
          Nova campanha
        </Button>
      </div>

      {isPending ? (
        <SkeletonRows rows={2} className="mt-6" />
      ) : campaigns.length === 0 ? (
        <EmptyState
          className="mt-6"
          title="Sua primeira campanha começa aqui."
          action={<Button onClick={() => setCreating(true)}>Criar campanha</Button>}
        >
          Crie uma meta e convide sua comunidade para participar. Dá para ligar um sorteio entre
          quem doa.
        </EmptyState>
      ) : (
        <ul className="mt-6 grid gap-3">
          {campaigns.map((campaign) => (
            <CampaignRow key={campaign.id} slug={slug} campaign={campaign} onChanged={refresh} />
          ))}
        </ul>
      )}
    </div>
  );
}

function CampaignRow({
  slug,
  campaign,
  onChanged,
}: {
  slug: string;
  campaign: Campaign;
  onChanged: () => Promise<void>;
}) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showRaffle, setShowRaffle] = useState(false);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const toast = useToast();
  const meta = STATUS_META[campaign.status] ?? { label: campaign.status, tone: "neutral" as const };
  const pct = campaign.goalCents ? percent(campaign.raisedCents, campaign.goalCents) : null;

  async function setStatus(status: "active" | "paused" | "finished") {
    setBusy(true);
    setError(null);
    try {
      await updateCampaignStatus(slug, campaign.slug, { status });
      await onChanged();
      toast(
        status === "active"
          ? "Campanha no ar."
          : status === "paused"
            ? "Campanha pausada."
            : "Campanha encerrada.",
      );
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h3 className="font-display font-semibold">{campaign.title}</h3>
          <Tag tone={meta.tone}>{meta.label}</Tag>
        </div>
        <p className="text-sm tabular-nums">
          <span className="font-display font-semibold">{money(campaign.raisedCents)}</span>
          <span className="text-muted">
            {campaign.goalCents ? ` de ${money(campaign.goalCents)}` : " arrecadados"}
          </span>
        </p>
      </div>

      {pct !== null && (
        <div className="mt-3 flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface">
            <div
              className="progress-fill h-full rounded-full bg-brand"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="shrink-0 text-muted text-xs tabular-nums">{pct}%</span>
        </div>
      )}

      <FormError>{error}</FormError>

      <div className="mt-3 flex flex-wrap gap-2">
        {campaign.status !== "active" && campaign.status !== "finished" && (
          <Button size="sm" disabled={busy} onClick={() => setStatus("active")}>
            Colocar no ar
          </Button>
        )}
        {campaign.status === "active" && (
          <Button size="sm" variant="secondary" disabled={busy} onClick={() => setStatus("paused")}>
            Pausar
          </Button>
        )}
        {/* rascunho não encerra: a API só aceita draft → active, e oferecer o botão
            devolvia 409 invalid_campaign_transition na cara de quem clicou. Rascunho
            não está no ar, então não há o que encerrar. */}
        {campaign.status !== "finished" && campaign.status !== "draft" && (
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => setConfirmFinish(true)}>
            Encerrar
          </Button>
        )}
        <Button size="sm" variant="secondary" onClick={() => setShowRaffle((v) => !v)}>
          <Ticket className="h-4 w-4" aria-hidden />
          Sorteio
        </Button>
      </div>

      {showRaffle && (
        <RafflePanel slug={slug} campaignSlug={campaign.slug} campaignTitle={campaign.title} />
      )}

      <ConfirmDialog
        open={confirmFinish}
        title="Encerrar esta campanha?"
        confirmLabel="Encerrar campanha"
        busy={busy}
        onCancel={() => setConfirmFinish(false)}
        onConfirm={() => {
          setConfirmFinish(false);
          void setStatus("finished");
        }}
      >
        Ela sai do ar e deixa de aceitar doações. O que já foi arrecadado continua valendo.
      </ConfirmDialog>
    </li>
  );
}

function RafflePanel({
  slug,
  campaignSlug,
  campaignTitle,
}: {
  slug: string;
  campaignSlug: string;
  campaignTitle: string;
}) {
  const { queryClient } = useRouter().options.context;
  const {
    data: raffle,
    isPending,
    refetch,
  } = useGetRaffle(slug, campaignSlug, {
    query: { retry: false },
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [centsPerNumberInput, setCentsPerNumberInput] = useState(maskAmountInput("1000"));
  const [prizes, setPrizes] = useState<PrizeDraft[]>([emptyPrize()]);

  /** Abre a edição com o que está no ar: sem isso, salvar apagaria fotos e descrições. */
  function startEditing() {
    if (raffle) {
      setCentsPerNumberInput(maskAmountInput(String(raffle.centsPerNumber)));
      setPrizes(
        raffle.prizes.map((prize, index) => ({
          id: `prize-current-${index}`,
          title: prize.title,
          description: prize.description ?? "",
          images: prize.images.map((key, i) => ({ key, url: prize.imageUrls[i] ?? "" })),
        })),
      );
    }
    setError(null);
    setEditing(true);
  }

  async function save() {
    const per = parseAmount(centsPerNumberInput);
    if (per === null || per < RAFFLE_MIN_CENTS_PER_NUMBER) {
      setError("Diga quanto custa um número: no mínimo R$ 1,00.");
      return;
    }
    const built = buildPrizes(prizes);
    if ("error" in built) {
      setError(built.error);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await putRaffle(slug, campaignSlug, { centsPerNumber: per, prizes: built.prizes });
      await refetch();
      await queryClient.invalidateQueries();
      setEditing(false);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  const [confirmDraw, setConfirmDraw] = useState(false);

  async function draw() {
    setConfirmDraw(false);
    setBusy(true);
    setError(null);
    try {
      await drawRaffle(slug, campaignSlug);
      await refetch();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  if (isPending) return <Skeleton className="mt-4 h-16" />;

  if (!raffle || editing) {
    return (
      <div className="mt-4 rounded-lg border border-line bg-surface p-4">
        <p className="text-sm text-muted">
          {raffle
            ? "Mude o valor do número e os prêmios. O que está aqui é o que a vitrine mostra."
            : "Esta campanha ainda não tem sorteio. Cada doação vira números da sorte — defina o valor de um número e os prêmios."}
        </p>
        <div className="mt-4 grid gap-5">
          <RaffleFields
            slug={slug}
            idPrefix={campaignSlug}
            campaignTitle={campaignTitle}
            centsPerNumberInput={centsPerNumberInput}
            onCentsPerNumberChange={setCentsPerNumberInput}
            prizes={prizes}
            onPrizesChange={setPrizes}
            onUploadingChange={setUploading}
            onError={setError}
          />
          <FormError>{error}</FormError>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" disabled={busy || uploading} onClick={save}>
              {raffle ? "Salvar sorteio" : "Ligar sorteio"}
            </Button>
            {raffle && (
              <Button size="sm" variant="ghost" disabled={busy} onClick={() => setEditing(false)}>
                Cancelar
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-lg border border-line bg-surface p-4">
      <p className="text-sm">
        <span className="font-medium">
          Sorteio {raffle.status === "drawn" ? "realizado" : "no ar"}
        </span>{" "}
        <span className="text-muted tabular-nums">
          · 1 número a cada {money(raffle.centsPerNumber)} · {raffle.totalEntries} números com{" "}
          {raffle.totalParticipants} participantes
        </span>
      </p>
      <ul className="mt-3 grid gap-3 text-sm">
        {raffle.prizes.map((prize) => (
          <li key={prize.position} className="flex gap-3">
            {prize.imageUrls[0] ? (
              <img
                src={prize.imageUrls[0]}
                alt=""
                className="h-14 w-14 shrink-0 rounded-md border border-line bg-surface object-cover"
              />
            ) : null}
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-2">
                <span className="text-muted">{prize.position}º</span>
                <span className="font-medium">{prize.title}</span>
                {prize.winner && <Tag tone="brand">número sorteado: {prize.winner.number}</Tag>}
              </p>
              {prize.description && <p className="text-muted">{prize.description}</p>}
            </div>
          </li>
        ))}
      </ul>
      <FormError>{error}</FormError>
      {raffle.status === "open" && (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" disabled={busy} onClick={() => setConfirmDraw(true)}>
            Sortear
          </Button>
          <Button size="sm" variant="secondary" disabled={busy} onClick={startEditing}>
            <Pencil className="h-4 w-4" aria-hidden />
            Editar sorteio
          </Button>
        </div>
      )}
      {raffle.seed && (
        <p className="mt-3 break-all text-muted text-xs">
          Código de auditoria: {raffle.seed} · algoritmo {raffle.algorithm}
          <span className="block">
            Usado para tornar o sorteio verificável por qualquer pessoa.
          </span>
        </p>
      )}

      <ConfirmDialog
        open={confirmDraw}
        title="Sortear agora?"
        confirmLabel="Realizar sorteio"
        busy={busy}
        onCancel={() => setConfirmDraw(false)}
        onConfirm={draw}
      >
        {raffle.totalParticipants} participantes · {raffle.totalEntries} números ·{" "}
        {raffle.prizes.length} prêmios. Depois de realizado, o resultado não pode ser alterado.
      </ConfirmDialog>
    </div>
  );
}

function CampaignCreate({
  slug,
  onDone,
  onCancel,
}: {
  slug: string;
  onDone: () => Promise<void>;
  onCancel: () => void;
}) {
  const [formError, setFormError] = useState<string | null>(null);
  const [cover, setCover] = useState<PickedImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [raffleOn, setRaffleOn] = useState(false);
  const [centsPerNumberInput, setCentsPerNumberInput] = useState(maskAmountInput("1000"));
  const [prizes, setPrizes] = useState<PrizeDraft[]>([emptyPrize()]);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CampaignFormValues>({
    resolver: zodResolver(CampaignSchema),
    defaultValues: { acceptedTypes: "both" },
  });

  async function submit(values: CampaignFormValues) {
    setFormError(null);
    const goalCents = values.goal ? parseAmount(values.goal) : null;
    if (values.goal && goalCents === null) {
      setFormError("Coloque uma meta maior que zero.");
      return;
    }

    let raffle: Parameters<typeof createCampaign>[1]["raffle"];
    if (raffleOn) {
      const per = parseAmount(centsPerNumberInput);
      if (per === null || per < RAFFLE_MIN_CENTS_PER_NUMBER) {
        setFormError("No sorteio, diga quanto custa um número: no mínimo R$ 1,00.");
        return;
      }
      const built = buildPrizes(prizes);
      if ("error" in built) {
        setFormError(built.error);
        return;
      }
      raffle = { centsPerNumber: per, prizes: built.prizes };
    }

    try {
      await createCampaign(slug, {
        slug: slugify(values.title),
        title: values.title,
        story: values.story || undefined,
        coverImage: cover[0]?.key,
        goalCents: goalCents ?? undefined,
        acceptedTypes: values.acceptedTypes,
        raffle,
      });
      await onDone();
    } catch (error) {
      setFormError(errorMessage(error));
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold tracking-tight">Nova campanha</h2>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Voltar
        </Button>
      </div>

      <form onSubmit={handleSubmit(submit)} className="mt-6 grid gap-8">
        <section className="grid gap-5">
          <h3 className="kicker">Sobre a campanha</h3>

          <Field label="Título" htmlFor="title" error={errors.title?.message}>
            <Input id="title" placeholder="Reforma da cozinha" {...register("title")} />
          </Field>

          <Field
            label="História (opcional)"
            htmlFor="story"
            hint="Conte para onde vai o dinheiro — quem entende a causa doa mais."
            error={errors.story?.message}
          >
            <Textarea id="story" rows={4} {...register("story")} />
          </Field>

          <AiCampaignStory
            slug={slug}
            title={watch("title") ?? ""}
            story={watch("story") ?? ""}
            onApply={(text) => setValue("story", text, { shouldDirty: true, shouldValidate: true })}
          />

          <div className="grid gap-2">
            <span className="font-medium text-sm">Foto de capa (opcional)</span>
            <ImagePicker
              storeSlug={slug}
              images={cover}
              onChange={setCover}
              max={1}
              multiple={false}
              onUploadingChange={setUploading}
              onError={setFormError}
              label="Arraste a foto de capa"
            />
          </div>
        </section>

        <section className="grid gap-5">
          <h3 className="kicker">Meta e doações</h3>

          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Meta (opcional)" htmlFor="goal" error={errors.goal?.message}>
              <MoneyInput id="goal" placeholder="R$ 20.000,00" {...register("goal")} />
            </Field>

            <Field label="Tipos de doação aceitos" htmlFor="acceptedTypes" error={undefined}>
              <Select id="acceptedTypes" {...register("acceptedTypes")}>
                <option value="both">Única e mensal</option>
                <option value="one_time">Só doação única</option>
                <option value="monthly">Só doação mensal</option>
              </Select>
            </Field>
          </div>
        </section>

        <section className="grid gap-5">
          <h3 className="kicker">Sorteio</h3>

          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              className="mt-0.5 h-5 w-5 accent-(--brand)"
              checked={raffleOn}
              onChange={(event) => setRaffleOn(event.target.checked)}
            />
            <span>
              <span className="font-medium text-ink">Sortear prêmios entre quem doar</span>
              <span className="block text-muted">
                Cada doação vira números da sorte. Você decide quanto custa um número e o que entra
                na lista de prêmios — dá para mudar tudo enquanto o sorteio não for realizado.
              </span>
            </span>
          </label>

          {raffleOn && (
            <RaffleFields
              slug={slug}
              idPrefix="nova-campanha"
              campaignTitle={watch("title") ?? ""}
              centsPerNumberInput={centsPerNumberInput}
              onCentsPerNumberChange={setCentsPerNumberInput}
              prizes={prizes}
              onPrizesChange={setPrizes}
              onUploadingChange={setUploading}
              onError={setFormError}
            />
          )}
        </section>

        <FormError>{formError}</FormError>

        <Button size="lg" type="submit" disabled={isSubmitting || uploading}>
          {isSubmitting ? "Criando…" : "Criar campanha (começa como rascunho)"}
        </Button>
      </form>
    </div>
  );
}
