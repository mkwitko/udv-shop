import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { Plus, Ticket } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "#/components/ui/button";
import { ConfirmDialog } from "#/components/ui/confirm";
import { Field, FormError, Input, Textarea } from "#/components/ui/field";
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
import { parseAmount } from "#/lib/pay/amount";
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

function CampaignsAdmin() {
  const { slug } = Route.useParams();
  const { queryClient } = useRouter().options.context;
  const { data, isPending } = useListCampaigns(slug, { limit: 50 });
  const [creating, setCreating] = useState(false);
  const campaigns = data?.items ?? [];

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: listCampaignsQueryKey(slug, { limit: 50 }) });
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
        <div className="mt-6 h-32 animate-pulse rounded-lg bg-surface" />
      ) : campaigns.length === 0 ? (
        <div className="card mt-6 px-6 py-14 text-center">
          <h3 className="font-display text-lg font-semibold">Nenhuma campanha ainda</h3>
          <p className="mx-auto mt-2 max-w-sm text-muted">
            Conte para onde vai o dinheiro e acompanhe a meta subir. Dá para ligar um sorteio entre
            quem doa.
          </p>
          <Button className="mt-6" onClick={() => setCreating(true)}>
            Criar campanha
          </Button>
        </div>
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
        {campaign.status !== "finished" && (
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => setConfirmFinish(true)}>
            Encerrar
          </Button>
        )}
        <Button size="sm" variant="secondary" onClick={() => setShowRaffle((v) => !v)}>
          <Ticket className="h-4 w-4" aria-hidden />
          Sorteio
        </Button>
      </div>

      {showRaffle && <RafflePanel slug={slug} campaignSlug={campaign.slug} />}

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

function RafflePanel({ slug, campaignSlug }: { slug: string; campaignSlug: string }) {
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
  const [centsPerNumberInput, setCentsPerNumberInput] = useState("10");
  const [prizesInput, setPrizesInput] = useState("");

  async function save() {
    const per = parseAmount(centsPerNumberInput);
    const prizes = prizesInput
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((title, index) => ({ position: index + 1, title }));
    if (per === null || per <= 0) {
      setError("Diga quanto vale um número: por exemplo, 10 (um número a cada R$ 10).");
      return;
    }
    if (prizes.length === 0) {
      setError("Liste pelo menos um prêmio (um por linha).");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await putRaffle(slug, campaignSlug, { centsPerNumber: per, prizes });
      await refetch();
      await queryClient.invalidateQueries();
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

  if (isPending) return <div className="mt-4 h-16 animate-pulse rounded-md bg-surface" />;

  if (!raffle) {
    return (
      <div className="mt-4 rounded-lg border border-line bg-surface p-4">
        <p className="text-sm text-muted">
          Esta campanha ainda não tem sorteio. Cada doação vira números da sorte — defina o valor de
          um número e os prêmios.
        </p>
        <div className="mt-3 grid gap-3">
          <Field
            label="Um número a cada quantos reais?"
            htmlFor={`per-${campaignSlug}`}
            error={undefined}
          >
            <Input
              id={`per-${campaignSlug}`}
              inputMode="decimal"
              value={centsPerNumberInput}
              onChange={(event) => setCentsPerNumberInput(event.target.value)}
            />
          </Field>
          <Field
            label="Prêmios (um por linha, do 1º para baixo)"
            htmlFor={`prizes-${campaignSlug}`}
            error={undefined}
          >
            <Textarea
              id={`prizes-${campaignSlug}`}
              rows={3}
              placeholder={"Cesta de produtos\nCamiseta bordada"}
              value={prizesInput}
              onChange={(event) => setPrizesInput(event.target.value)}
            />
          </Field>
          <FormError>{error}</FormError>
          <Button size="sm" disabled={busy} onClick={save}>
            Ligar sorteio
          </Button>
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
      <ul className="mt-3 grid gap-1.5 text-sm">
        {raffle.prizes.map((prize) => (
          <li key={prize.position} className="flex flex-wrap items-center gap-2">
            <span className="text-muted">{prize.position}º</span>
            <span>{prize.title}</span>
            {prize.winner && <Tag tone="brand">número sorteado: {prize.winner.number}</Tag>}
          </li>
        ))}
      </ul>
      <FormError>{error}</FormError>
      {raffle.status === "open" && (
        <Button size="sm" className="mt-3" disabled={busy} onClick={() => setConfirmDraw(true)}>
          Sortear
        </Button>
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
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CampaignFormValues>({
    resolver: zodResolver(CampaignSchema),
    defaultValues: { acceptedTypes: "both" },
  });

  async function submit(values: CampaignFormValues) {
    setFormError(null);
    const goalCents = values.goal ? parseAmount(values.goal) : null;
    if (values.goal && goalCents === null) {
      setFormError("Meta inválida. Escreva como no dia a dia: 20000 ou 20.000,00.");
      return;
    }
    try {
      await createCampaign(slug, {
        slug: slugify(values.title),
        title: values.title,
        story: values.story || undefined,
        goalCents: goalCents ?? undefined,
        acceptedTypes: values.acceptedTypes,
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
        </section>

        <section className="grid gap-5">
          <h3 className="kicker">Meta e doações</h3>

          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Meta (opcional)" htmlFor="goal" error={errors.goal?.message}>
              <Input
                id="goal"
                inputMode="decimal"
                placeholder="R$ 20.000,00"
                {...register("goal")}
              />
            </Field>

            <Field label="Tipos de doação aceitos" htmlFor="acceptedTypes" error={undefined}>
              <select
                id="acceptedTypes"
                className="h-11 w-full rounded-md border border-line bg-surface px-3.5 text-[0.95rem] text-ink"
                {...register("acceptedTypes")}
              >
                <option value="both">Única e mensal</option>
                <option value="one_time">Só doação única</option>
                <option value="monthly">Só doação mensal</option>
              </select>
            </Field>
          </div>
        </section>

        <FormError>{formError}</FormError>

        <Button size="lg" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Criando…" : "Criar campanha (começa como rascunho)"}
        </Button>
      </form>
    </div>
  );
}
