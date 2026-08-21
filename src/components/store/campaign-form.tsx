import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Pencil, Plus, Ticket, Trash2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AiCampaignStory } from "#/components/store/ai-text";
import { RaffleFields } from "#/components/store/raffle-fields";
import { RafflePanel } from "#/components/store/raffle-panel";
import { Button } from "#/components/ui/button";
import { Field, FormError, Input, Select, Textarea } from "#/components/ui/field";
import { ImagePicker, type PickedImage } from "#/components/ui/image-picker";
import { MoneyInput } from "#/components/ui/money-input";
import { useToast } from "#/components/ui/toast";
import { errorMessage } from "#/lib/api/error-message";
import { ApiError } from "#/lib/api/fetch-client";
import { createCampaign } from "#/lib/api/gen/clients/createCampaign";
import { createRaffle } from "#/lib/api/gen/clients/createRaffle";
import { updateCampaign } from "#/lib/api/gen/clients/updateCampaign";
import type { ListCampaigns200 } from "#/lib/api/gen/types/ListCampaigns";
import { money } from "#/lib/format";
import { maskAmountInput, parseAmount } from "#/lib/pay/amount";
import {
  buildRafflePayload,
  emptyRaffle,
  type RaffleDraft,
  type RafflePayload,
} from "#/lib/raffle";
import { slugify } from "#/lib/slug";
import { cn } from "#/lib/utils";

const CampaignSchema = z.object({
  title: z.string().min(3, "Título muito curto").max(140),
  story: z.string().max(5000).optional(),
  goal: z.string().optional(),
  acceptedTypes: z.enum(["one_time", "monthly", "both"]),
});
type CampaignFormValues = z.infer<typeof CampaignSchema>;

type Campaign = ListCampaigns200["items"][number];

/** Espelha `CAMPAIGN_MAX_IMAGES` da API: passar disso é 400 na cara de quem subiu a nona. */
const CAMPAIGN_MAX_IMAGES = 8;

const STEPS = ["Sobre a campanha", "Meta e doações", "Sorteios"] as const;

function Stepper({ steps, current }: { steps: readonly string[]; current: number }) {
  return (
    <div className="mt-6 grid gap-2">
      <div className="flex items-center gap-2">
        {steps.map((step, index) => (
          <div
            key={step}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors [transition-duration:var(--dur)]",
              index <= current ? "bg-brand" : "bg-surface",
            )}
          />
        ))}
      </div>
      <p className="text-muted text-sm">
        {/* no celular o rótulo do passo atual basta; a partir de md os três cabem lado a lado */}
        <span className="md:hidden">
          Passo {current + 1} de {steps.length} · {steps[current]}
        </span>
        <span className="hidden md:flex md:gap-4">
          {steps.map((step, index) => (
            <span key={step} className={index === current ? "font-medium text-ink" : undefined}>
              {index + 1}. {step}
            </span>
          ))}
        </span>
      </p>
    </div>
  );
}

/** "01/09 – 30/09", "desde 01/09" ou "sem período definido" a partir dos dias digitados. */
function windowLabel(draft: RaffleDraft): string {
  const day = (value: string) => value.split("-").reverse().slice(0, 2).join("/");
  if (draft.startDate && draft.endDate) return `${day(draft.startDate)} – ${day(draft.endDate)}`;
  if (draft.startDate) return `desde ${day(draft.startDate)}`;
  if (draft.endDate) return `até ${day(draft.endDate)}`;
  return "sem período definido";
}

function RaffleDraftCard({
  slug,
  campaignTitle,
  index,
  draft,
  open,
  onChange,
  onRemove,
  onToggle,
  onUploadingChange,
  onError,
}: {
  slug: string;
  campaignTitle: string;
  index: number;
  draft: RaffleDraft;
  open: boolean;
  onChange: (next: RaffleDraft) => void;
  onRemove: () => void;
  onToggle: (open: boolean) => void;
  onUploadingChange: (uploading: boolean) => void;
  onError: (message: string | null) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const cents = parseAmount(draft.centsPerNumberInput);

  function close() {
    const built = buildRafflePayload(draft);
    if ("error" in built) {
      setError(built.error);
      return;
    }
    setError(null);
    onToggle(false);
  }

  return (
    <div className="grid gap-4 rounded-[1rem] border border-line bg-elevated p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <span className="kicker">{index + 1}º sorteio</span>
          <p className="font-display font-semibold">{draft.title || "Sorteio sem nome"}</p>
          {!open && (
            <p className="text-muted text-sm tabular-nums">
              {windowLabel(draft)} · {cents ? `${money(cents)} por número` : "valor por definir"} ·{" "}
              {draft.prizes.length} {draft.prizes.length === 1 ? "prêmio" : "prêmios"}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1">
          {!open && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              aria-label={`Editar ${index + 1}º sorteio`}
              onClick={() => onToggle(true)}
            >
              <Pencil className="h-4 w-4" aria-hidden />
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            aria-label={`Remover ${index + 1}º sorteio`}
            onClick={onRemove}
          >
            <Trash2 className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      </div>

      {open && (
        <>
          <RaffleFields
            slug={slug}
            idPrefix={draft.id}
            campaignTitle={campaignTitle}
            draft={draft}
            onChange={onChange}
            onUploadingChange={onUploadingChange}
            onError={onError}
          />
          <FormError>{error}</FormError>
          <div>
            <Button type="button" size="sm" variant="secondary" onClick={close}>
              <Check className="h-4 w-4" aria-hidden />
              Pronto
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Campanha em três passos, para criar ou editar. O passo dos sorteios muda de acordo:
 * na criação são rascunhos que só viram sorteio quando a campanha nasce; na edição é o
 * painel dos sorteios que já existem, com números, participantes e o botão de sortear.
 *
 * Na criação, a API aceita no máximo um sorteio embutido, então os demais vão em
 * `POST /raffles` logo depois. Se um deles falhar, a campanha já existe: avisamos qual
 * ficou de fora em vez de descartar o que foi criado.
 */
export function CampaignForm({
  slug,
  campaign,
  onDone,
  onCancel,
}: {
  slug: string;
  campaign?: Campaign;
  onDone: () => Promise<void>;
  onCancel: () => void;
}) {
  const editing = campaign !== undefined;
  const toast = useToast();
  const [step, setStep] = useState(0);
  const [formError, setFormError] = useState<string | null>(null);
  const [gallery, setGallery] = useState<PickedImage[]>(
    campaign?.images.map((key, index) => ({ key, url: campaign.imageUrls[index] ?? "" })) ?? [],
  );
  const [coverKey, setCoverKey] = useState<string | null>(campaign?.coverImage ?? null);
  const [uploading, setUploading] = useState(false);
  const [raffles, setRaffles] = useState<RaffleDraft[]>([]);
  const [openRaffleId, setOpenRaffleId] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    trigger,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<CampaignFormValues>({
    resolver: zodResolver(CampaignSchema),
    defaultValues: {
      title: campaign?.title ?? "",
      story: campaign?.story ?? "",
      goal: campaign?.goalCents ? maskAmountInput(String(campaign.goalCents)) : "",
      acceptedTypes: campaign?.acceptedTypes ?? "both",
    },
  });

  function patchRaffle(id: string, next: RaffleDraft) {
    setRaffles((current) => current.map((draft) => (draft.id === id ? next : draft)));
  }

  function addRaffle() {
    const draft = emptyRaffle();
    setRaffles((current) => [...current, draft]);
    setOpenRaffleId(draft.id);
    setFormError(null);
  }

  async function next() {
    setFormError(null);
    if (step === 0) {
      const ok = await trigger(["title", "story"]);
      if (!ok) return;
    }
    if (step === 1) {
      const goal = getValues("goal");
      if (goal && parseAmount(goal) === null) {
        setFormError("Coloque uma meta maior que zero.");
        return;
      }
    }
    setStep((current) => Math.min(current + 1, STEPS.length - 1));
  }

  async function submit(values: CampaignFormValues) {
    setFormError(null);
    const goalCents = values.goal ? parseAmount(values.goal) : null;
    if (values.goal && goalCents === null) {
      setFormError("Coloque uma meta maior que zero.");
      setStep(1);
      return;
    }

    if (campaign) {
      try {
        // `null` e não `undefined`: apagar a história, a capa ou a meta é uma edição
        // legítima, e `undefined` sumiria do corpo sem mudar nada no servidor.
        await updateCampaign(slug, campaign.slug, {
          title: values.title,
          story: values.story || null,
          images: gallery.map((image) => image.key),
          coverImage: coverKey ?? gallery[0]?.key ?? null,
          goalCents,
          acceptedTypes: values.acceptedTypes,
        });
        toast("Campanha atualizada.");
        await onDone();
      } catch (error) {
        setFormError(errorMessage(error));
      }
      return;
    }

    const payloads: RafflePayload[] = [];
    for (const [index, draft] of raffles.entries()) {
      const built = buildRafflePayload(draft);
      if ("error" in built) {
        setFormError(`${index + 1}º sorteio: ${built.error}`);
        setOpenRaffleId(draft.id);
        return;
      }
      payloads.push(built.payload);
    }

    const [first, ...rest] = payloads;
    let campaignSlug: string;
    try {
      const campaign = await createCampaign(slug, {
        slug: slugify(values.title),
        title: values.title,
        story: values.story || undefined,
        images: gallery.map((image) => image.key),
        coverImage: coverKey ?? gallery[0]?.key,
        goalCents: goalCents ?? undefined,
        acceptedTypes: values.acceptedTypes,
        raffle: first,
      });
      campaignSlug = campaign.slug;
    } catch (error) {
      setFormError(errorMessage(error));
      // o título é quem gera o endereço da campanha: mandar de volta ao passo 1 é o
      // único jeito de corrigir um título repetido sem procurar onde ele ficou
      if (error instanceof ApiError && error.code === "campaign_slug_taken") setStep(0);
      return;
    }

    for (const [index, payload] of rest.entries()) {
      try {
        await createRaffle(slug, campaignSlug, payload);
      } catch (error) {
        // a campanha já está criada: parar aqui e dizer o que ficou faltando é melhor do
        // que sumir com a tela e deixar a pessoa descobrir sozinha no painel
        toast(
          `Campanha criada, mas o ${index + 2}º sorteio não entrou: ${errorMessage(error)} Dá para adicioná-lo pelo botão Sorteio.`,
        );
        await onDone();
        return;
      }
    }

    toast(raffles.length > 1 ? "Campanha e sorteios criados." : "Campanha criada.");
    await onDone();
  }

  const campaignTitle = watch("title") ?? "";
  const isLast = step === STEPS.length - 1;

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold tracking-tight">
          {editing ? "Editar campanha" : "Nova campanha"}
        </h2>
        {/* "Cancelar" e não "Voltar": com passos, dois botões "Voltar" na mesma tela
            deixariam sair da criação e voltar um passo indistinguíveis */}
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancelar
        </Button>
      </div>

      <Stepper steps={STEPS} current={step} />

      <form
        // enquanto não é o último passo, submit nenhum salva: nem o Enter dentro de um
        // campo, nem o clique em "Continuar" — o botão troca de `type` no mesmo nó do DOM
        // e o navegador chegou a submeter o formulário no passo 2
        onSubmit={(event) => {
          if (!isLast) {
            event.preventDefault();
            return;
          }
          void handleSubmit(submit)(event);
        }}
        className="mt-6 grid gap-8"
      >
        {step === 0 && (
          <section className="grid gap-5">
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
              title={campaignTitle}
              story={watch("story") ?? ""}
              onApply={(text) =>
                setValue("story", text, { shouldDirty: true, shouldValidate: true })
              }
            />

            <div className="grid gap-2">
              <span className="font-medium text-sm">Fotos (opcional)</span>
              <p className="text-muted text-sm">
                Elas viram um carrossel na página. A capa é a que aparece no link compartilhado —
                toque em "Usar de capa" para escolher.
              </p>
              <ImagePicker
                storeSlug={slug}
                images={gallery}
                onChange={(next) => {
                  setGallery(next);
                  // capa apagada da galeria deixa de ser capa: senão a página mostraria
                  // uma foto que a loja não vê mais para trocar
                  if (coverKey && !next.some((image) => image.key === coverKey)) {
                    setCoverKey(next[0]?.key ?? null);
                  }
                }}
                max={CAMPAIGN_MAX_IMAGES}
                coverKey={coverKey ?? gallery[0]?.key ?? null}
                onCoverChange={setCoverKey}
                onUploadingChange={setUploading}
                onError={setFormError}
                label="Arraste as fotos da campanha"
              />
            </div>
          </section>
        )}

        {step === 1 && (
          <section className="grid gap-5">
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
        )}

        {/* campanha que já existe usa o painel de verdade: ele lista os sorteios com
            números e participantes, e sabe sortear, cancelar e reabrir — coisas que um
            rascunho de formulário não teria como fazer. Ali cada sorteio salva na hora */}
        {step === 2 && editing && campaign && (
          <section className="grid gap-3">
            <p className="text-muted text-sm">
              Os sorteios abaixo são salvos na hora, separados do resto do formulário.
            </p>
            <RafflePanel
              slug={slug}
              campaignSlug={campaign.slug}
              campaignTitle={campaignTitle || campaign.title}
            />
          </section>
        )}

        {step === 2 && !editing && (
          <section className="grid gap-5">
            {raffles.length === 0 ? (
              <div className="rounded-[1rem] border border-line border-dashed p-5 text-center">
                <Ticket className="mx-auto h-6 w-6 text-muted" aria-hidden />
                <p className="mt-2 font-medium">Sorteio é opcional.</p>
                <p className="mt-1 text-muted text-sm">
                  Cada doação vira números da sorte no sorteio do período em que ela foi paga.
                  Campanha longa costuma ter um por mês — dá para criar todos agora ou depois.
                </p>
              </div>
            ) : (
              raffles.map((draft, index) => (
                <RaffleDraftCard
                  key={draft.id}
                  slug={slug}
                  campaignTitle={campaignTitle}
                  index={index}
                  draft={draft}
                  open={openRaffleId === draft.id}
                  onChange={(next) => patchRaffle(draft.id, next)}
                  onRemove={() => setRaffles((current) => current.filter((r) => r.id !== draft.id))}
                  onToggle={(open) => setOpenRaffleId(open ? draft.id : null)}
                  onUploadingChange={setUploading}
                  onError={setFormError}
                />
              ))
            )}

            <div>
              <Button type="button" size="sm" variant="secondary" onClick={addRaffle}>
                <Plus className="h-4 w-4" aria-hidden />
                {raffles.length === 0 ? "Adicionar sorteio" : "Adicionar outro sorteio"}
              </Button>
            </div>
          </section>
        )}

        <FormError>{formError}</FormError>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          {step > 0 && (
            <Button
              type="button"
              size="lg"
              variant="secondary"
              onClick={() => {
                setFormError(null);
                setStep((current) => current - 1);
              }}
            >
              Voltar
            </Button>
          )}
          {/* `key` distinta de propósito: sem ela o React reaproveita o mesmo <button> e
              só troca o `type`, e o clique que avançava o passo virava submit */}
          {isLast ? (
            <Button key="salvar" size="lg" type="submit" disabled={isSubmitting || uploading}>
              {isSubmitting
                ? "Salvando…"
                : editing
                  ? "Salvar alterações"
                  : "Criar campanha (começa como rascunho)"}
            </Button>
          ) : (
            <Button key="continuar" type="button" size="lg" disabled={uploading} onClick={next}>
              Continuar
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
