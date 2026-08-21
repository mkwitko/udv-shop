import { useRouter } from "@tanstack/react-router";
import { Ban, Pencil, Plus, RotateCcw } from "lucide-react";
import { useState } from "react";
import { RaffleFields } from "#/components/store/raffle-fields";
import { Button } from "#/components/ui/button";
import { ConfirmDialog } from "#/components/ui/confirm";
import { FormError } from "#/components/ui/field";
import { Skeleton } from "#/components/ui/skeleton";
import { Tag } from "#/components/ui/tag";
import { errorMessage } from "#/lib/api/error-message";
import { createRaffle } from "#/lib/api/gen/clients/createRaffle";
import { drawRaffle } from "#/lib/api/gen/clients/drawRaffle";
import { putRaffle } from "#/lib/api/gen/clients/putRaffle";
import { updateRaffleStatus } from "#/lib/api/gen/clients/updateRaffleStatus";
import { useListRaffles } from "#/lib/api/gen/hooks/useListRaffles";
import type { ListRaffles200 } from "#/lib/api/gen/types/ListRaffles";
import { money } from "#/lib/format";
import { maskAmountInput } from "#/lib/pay/amount";
import {
  buildRafflePayload,
  dayStartIso,
  emptyRaffle,
  isoEndToLocalDate,
  isoToLocalDate,
  type RaffleDraft,
} from "#/lib/raffle";

export function RafflePanel({
  slug,
  campaignSlug,
  campaignTitle,
}: {
  slug: string;
  campaignSlug: string;
  campaignTitle: string;
}) {
  const { queryClient } = useRouter().options.context;
  const { data, isPending, refetch } = useListRaffles(slug, campaignSlug, {
    query: { retry: false },
  });
  const [creating, setCreating] = useState(false);
  const raffles = data?.items ?? [];

  async function refresh() {
    await refetch();
    await queryClient.invalidateQueries();
  }

  if (isPending) return <Skeleton className="mt-4 h-16" />;

  return (
    <div className="mt-4 grid gap-3 rounded-lg border border-line bg-surface p-4">
      {raffles.length === 0 && !creating && (
        <p className="text-sm text-muted">
          Esta campanha ainda não tem sorteio. Cada doação vira números da sorte no sorteio da
          janela em que ela foi paga — campanha longa pode ter um por mês.
        </p>
      )}

      {raffles.map((raffle) => (
        <RaffleCard
          key={raffle.sequence}
          slug={slug}
          campaignSlug={campaignSlug}
          campaignTitle={campaignTitle}
          raffle={raffle}
          onChanged={refresh}
        />
      ))}

      {creating ? (
        <RaffleForm
          slug={slug}
          campaignSlug={campaignSlug}
          campaignTitle={campaignTitle}
          raffle={null}
          onDone={async () => {
            await refresh();
            setCreating(false);
          }}
          onCancel={() => setCreating(false)}
        />
      ) : (
        <Button type="button" size="sm" variant="secondary" onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" aria-hidden />
          {raffles.length === 0 ? "Ligar sorteio" : "Novo sorteio"}
        </Button>
      )}
    </div>
  );
}

type Raffle = ListRaffles200["items"][number];

/** "ago 01 – set 01" ou "desde ago 01" quando não tem fim. */
function raffleWindowLabel(raffle: Raffle): string {
  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  // O fim guardado é exclusivo (meia-noite do dia seguinte): mostrar o último dia incluído
  // é o que bate com o que a pessoa digitou.
  return raffle.endsAt
    ? `${fmt(raffle.startsAt)} – ${fmt(dayStartIso(isoEndToLocalDate(raffle.endsAt)))}`
    : `desde ${fmt(raffle.startsAt)}`;
}

function RaffleCard({
  slug,
  campaignSlug,
  campaignTitle,
  raffle,
  onChanged,
}: {
  slug: string;
  campaignSlug: string;
  campaignTitle: string;
  raffle: Raffle;
  onChanged: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDraw, setConfirmDraw] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  async function setStatus(status: "open" | "cancelled") {
    setConfirmCancel(false);
    setBusy(true);
    setError(null);
    try {
      await updateRaffleStatus(slug, campaignSlug, raffle.sequence, { status });
      await onChanged();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  async function draw() {
    setConfirmDraw(false);
    setBusy(true);
    setError(null);
    try {
      await drawRaffle(slug, campaignSlug, raffle.sequence);
      await onChanged();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  if (editing) {
    return (
      <RaffleForm
        slug={slug}
        campaignSlug={campaignSlug}
        campaignTitle={campaignTitle}
        raffle={raffle}
        onDone={async () => {
          await onChanged();
          setEditing(false);
        }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <div className="rounded-[1rem] border border-line bg-elevated p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="kicker">{raffle.sequence}º sorteio</span>
          <h4 className="font-display font-semibold">{raffle.title}</h4>
          <Tag tone={raffle.status === "open" ? "brand" : "neutral"}>
            {raffle.status === "open"
              ? "no ar"
              : raffle.status === "drawn"
                ? "realizado"
                : "cancelado"}
          </Tag>
        </div>
        <p className="text-muted text-sm tabular-nums">{raffleWindowLabel(raffle)}</p>
      </div>

      <p className="mt-2 text-muted text-sm tabular-nums">
        1 número a cada {money(raffle.centsPerNumber)} · {raffle.totalEntries} números com{" "}
        {raffle.totalParticipants} participantes
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
          <Button type="button" size="sm" disabled={busy} onClick={() => setConfirmDraw(true)}>
            Sortear
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={busy}
            onClick={() => setEditing(true)}
          >
            <Pencil className="h-4 w-4" aria-hidden />
            Editar
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() => setConfirmCancel(true)}
          >
            <Ban className="h-4 w-4" aria-hidden />
            Cancelar sorteio
          </Button>
        </div>
      )}

      {raffle.status === "cancelled" && (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={busy}
            onClick={() => setStatus("open")}
          >
            <RotateCcw className="h-4 w-4" aria-hidden />
            Reabrir
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
        open={confirmCancel}
        title="Cancelar este sorteio?"
        confirmLabel="Cancelar sorteio"
        dismissLabel="Voltar"
        busy={busy}
        onCancel={() => setConfirmCancel(false)}
        onConfirm={() => void setStatus("cancelled")}
      >
        Os {raffle.totalEntries} números somem e quem doou volta a concorrer no próximo sorteio que
        cobrir a data da doação. Dá para reabrir depois, se o período ainda estiver livre.
      </ConfirmDialog>

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

function RaffleForm({
  slug,
  campaignSlug,
  campaignTitle,
  raffle,
  onDone,
  onCancel,
}: {
  slug: string;
  campaignSlug: string;
  campaignTitle: string;
  raffle: Raffle | null;
  onDone: () => Promise<void>;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<RaffleDraft>(() =>
    raffle
      ? {
          ...emptyRaffle(),
          title: raffle.title,
          startDate: isoToLocalDate(raffle.startsAt),
          endDate: isoEndToLocalDate(raffle.endsAt),
          centsPerNumberInput: maskAmountInput(String(raffle.centsPerNumber)),
          prizes: raffle.prizes.map((prize, index) => ({
            id: `prize-current-${index}`,
            title: prize.title,
            description: prize.description ?? "",
            images: prize.images.map((key, i) => ({ key, url: prize.imageUrls[i] ?? "" })),
          })),
        }
      : emptyRaffle(),
  );
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    const built = buildRafflePayload(draft);
    if ("error" in built) {
      setError(built.error);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (raffle) await putRaffle(slug, campaignSlug, raffle.sequence, built.payload);
      else await createRaffle(slug, campaignSlug, built.payload);
      await onDone();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-5 rounded-[1rem] border border-line bg-elevated p-4">
      <RaffleFields
        slug={slug}
        idPrefix={raffle ? `s${raffle.sequence}` : "novo"}
        campaignTitle={campaignTitle}
        draft={draft}
        onChange={setDraft}
        onUploadingChange={setUploading}
        onError={setError}
      />
      <FormError>{error}</FormError>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" disabled={busy || uploading} onClick={save}>
          {raffle ? "Salvar sorteio" : "Ligar sorteio"}
        </Button>
        <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
