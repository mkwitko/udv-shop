import { createFileRoute, useRouter } from "@tanstack/react-router";
import { Archive, ArchiveRestore, Pencil, Plus, Ticket, Trash2 } from "lucide-react";
import { useState } from "react";
import { CampaignForm } from "#/components/store/campaign-form";
import { RafflePanel } from "#/components/store/raffle-panel";
import { Button } from "#/components/ui/button";
import { ConfirmDialog } from "#/components/ui/confirm";
import { EmptyState } from "#/components/ui/empty-state";
import { FormError } from "#/components/ui/field";
import { ShareButton } from "#/components/ui/share-button";
import { SkeletonRows } from "#/components/ui/skeleton";
import { Tag } from "#/components/ui/tag";
import { useToast } from "#/components/ui/toast";
import { errorMessage } from "#/lib/api/error-message";
import { archiveCampaign } from "#/lib/api/gen/clients/archiveCampaign";
import { deleteCampaign } from "#/lib/api/gen/clients/deleteCampaign";
import { updateCampaignStatus } from "#/lib/api/gen/clients/updateCampaignStatus";
import { listCampaignsQueryKey, useListCampaigns } from "#/lib/api/gen/hooks/useListCampaigns";
import type { ListCampaigns200 } from "#/lib/api/gen/types/ListCampaigns";
import { campaignShareText, remainingCents } from "#/lib/campaign";
import { money, percent } from "#/lib/format";

export const Route = createFileRoute("/gestao/$slug/campanhas")({
  component: CampaignsAdmin,
});

type Campaign = ListCampaigns200["items"][number];

const STATUS_META: Record<string, { label: string; tone: "brand" | "accent" | "neutral" }> = {
  draft: { label: "rascunho", tone: "neutral" },
  active: { label: "no ar", tone: "brand" },
  paused: { label: "pausada", tone: "accent" },
  finished: { label: "encerrada", tone: "neutral" },
};

// `all` porque campanha nasce rascunho: sem isso a tela de gestão não mostrava a
// campanha que a pessoa acabou de criar — só apareceria depois de publicada.
const LIST_QUERY = { limit: 50, all: "true" } as const;
const ARCHIVED_QUERY = { limit: 50, all: "true", archived: "true" } as const;

function CampaignsAdmin() {
  const { slug } = Route.useParams();
  const { queryClient } = useRouter().options.context;
  const [showArchived, setShowArchived] = useState(false);
  const query = showArchived ? ARCHIVED_QUERY : LIST_QUERY;
  const { data, isPending } = useListCampaigns(slug, query);
  const [creating, setCreating] = useState(false);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const campaigns = data?.items ?? [];
  const editing = campaigns.find((campaign) => campaign.slug === editingSlug);

  async function refresh() {
    // as duas listas mudam ao arquivar: invalidar só a atual deixaria a outra mentindo
    await queryClient.invalidateQueries({ queryKey: listCampaignsQueryKey(slug, LIST_QUERY) });
    await queryClient.invalidateQueries({ queryKey: listCampaignsQueryKey(slug, ARCHIVED_QUERY) });
  }

  if (creating || editing) {
    return (
      <CampaignForm
        slug={slug}
        campaign={editing}
        onDone={async () => {
          await refresh();
          setCreating(false);
          setEditingSlug(null);
        }}
        onCancel={() => {
          setCreating(false);
          setEditingSlug(null);
        }}
      />
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold tracking-tight">
          {showArchived ? "Campanhas arquivadas" : "Campanhas"}
        </h2>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={() => setShowArchived((v) => !v)}>
            <Archive className="h-4 w-4" aria-hidden />
            {showArchived ? "Ver as ativas" : "Ver arquivadas"}
          </Button>
          {!showArchived && (
            <Button size="sm" onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" aria-hidden />
              Nova campanha
            </Button>
          )}
        </div>
      </div>

      {isPending ? (
        <SkeletonRows rows={2} className="mt-6" />
      ) : campaigns.length === 0 ? (
        <EmptyState
          className="mt-6"
          title={showArchived ? "Nada arquivado por aqui." : "Sua primeira campanha começa aqui."}
          action={
            showArchived ? (
              <Button variant="secondary" onClick={() => setShowArchived(false)}>
                Ver as ativas
              </Button>
            ) : (
              <Button onClick={() => setCreating(true)}>Criar campanha</Button>
            )
          }
        >
          {showArchived
            ? "Campanha encerrada pode ser arquivada para sair da lista principal. Ela continua aqui e o link dela segue abrindo."
            : "Crie uma meta e convide sua comunidade para participar. Dá para ligar um sorteio entre quem doa."}
        </EmptyState>
      ) : (
        <ul className="mt-6 grid gap-3">
          {campaigns.map((campaign) => (
            <CampaignRow
              key={campaign.id}
              slug={slug}
              campaign={campaign}
              onChanged={refresh}
              onEdit={() => setEditingSlug(campaign.slug)}
            />
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
  onEdit,
}: {
  slug: string;
  campaign: Campaign;
  onChanged: () => Promise<void>;
  onEdit: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showRaffle, setShowRaffle] = useState(false);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
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

  async function setArchived(archived: boolean) {
    setBusy(true);
    setError(null);
    try {
      await archiveCampaign(slug, campaign.slug, { archived });
      await onChanged();
      toast(archived ? "Campanha arquivada." : "Campanha de volta à lista.");
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setConfirmDelete(false);
    setBusy(true);
    setError(null);
    try {
      await deleteCampaign(slug, campaign.slug);
      await onChanged();
      toast("Campanha apagada.");
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
        {/* arquivar é só encerrada: campanha que ainda recebe doação sumindo da lista
            esconderia dinheiro entrando */}
        {campaign.archivedAt ? (
          <Button size="sm" variant="secondary" disabled={busy} onClick={() => setArchived(false)}>
            <ArchiveRestore className="h-4 w-4" aria-hidden />
            Desarquivar
          </Button>
        ) : (
          campaign.status === "finished" && (
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => setArchived(true)}>
              <Archive className="h-4 w-4" aria-hidden />
              Arquivar
            </Button>
          )
        )}
        {/* rascunho não tem página pública: compartilhar o link daria 404 em quem recebesse */}
        {campaign.status !== "draft" && (
          <ShareButton
            size="sm"
            variant="secondary"
            title={campaign.title}
            text={campaignShareText(
              campaign.title,
              campaign.store.name,
              remainingCents(campaign.raisedCents, campaign.goalCents),
            )}
            path={`/loja/${slug}/campanhas/${campaign.slug}`}
            label="Compartilhar"
          />
        )}
        <Button size="sm" variant="secondary" onClick={onEdit}>
          <Pencil className="h-4 w-4" aria-hidden />
          Editar
        </Button>
        <Button size="sm" variant="secondary" onClick={() => setShowRaffle((v) => !v)}>
          <Ticket className="h-4 w-4" aria-hidden />
          Sorteio
        </Button>
        {/* apagar de vez só no rascunho: campanha que foi ao ar tem link compartilhado e
            doação atrás — para ela o caminho é encerrar */}
        {campaign.status === "draft" && (
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => setConfirmDelete(true)}>
            <Trash2 className="h-4 w-4" aria-hidden />
            Excluir
          </Button>
        )}
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

      <ConfirmDialog
        open={confirmDelete}
        title="Excluir este rascunho?"
        confirmLabel="Excluir campanha"
        dismissLabel="Voltar"
        busy={busy}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={remove}
      >
        Some com a campanha e com os sorteios que você montou nela. Não dá para desfazer.
      </ConfirmDialog>
    </li>
  );
}
