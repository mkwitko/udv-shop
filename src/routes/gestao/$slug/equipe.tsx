import { createFileRoute, useRouter } from "@tanstack/react-router";
import { Mail, RefreshCw, Trash2, UserPlus, Users } from "lucide-react";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import { ConfirmDialog } from "#/components/ui/confirm";
import { Field, FormError, Input, Select } from "#/components/ui/field";
import { SkeletonRows } from "#/components/ui/skeleton";
import { Tag } from "#/components/ui/tag";
import { useToast } from "#/components/ui/toast";
import { errorMessage } from "#/lib/api/error-message";
import { inviteStoreMember } from "#/lib/api/gen/clients/inviteStoreMember";
import { removeStoreMember } from "#/lib/api/gen/clients/removeStoreMember";
import { revokeStoreInvite } from "#/lib/api/gen/clients/revokeStoreInvite";
import { updateStoreMember } from "#/lib/api/gen/clients/updateStoreMember";
import { getStoreTeamQueryKey, useGetStoreTeam } from "#/lib/api/gen/hooks/useGetStoreTeam";
import type { GetStoreTeam200 } from "#/lib/api/gen/types/GetStoreTeam";
import { useSession } from "#/lib/auth/session";
import { longDate } from "#/lib/format";
import { ROLE_HELP, roleLabel } from "#/lib/invite";

export const Route = createFileRoute("/gestao/$slug/equipe")({
  component: TeamAdmin,
});

type Member = GetStoreTeam200["members"][number];
type Invite = GetStoreTeam200["invites"][number];
type InvitableRole = "admin" | "staff";

function TeamAdmin() {
  const { slug } = Route.useParams();
  const { queryClient } = useRouter().options.context;
  const { data, isPending } = useGetStoreTeam(slug);
  const refresh = () => queryClient.invalidateQueries({ queryKey: getStoreTeamQueryKey(slug) });

  return (
    <div className="grid gap-8">
      <div>
        <h2 className="font-display font-semibold text-lg tracking-tight">Equipe</h2>
        <p className="mt-1 text-muted text-sm">
          Quem mais cuida da loja com você. Convide por e-mail; a pessoa entra com a conta dela e
          passa a ver o painel.
        </p>
      </div>
      <InviteBlock slug={slug} onDone={refresh} />
      {isPending || !data ? (
        <SkeletonRows rows={3} />
      ) : (
        <>
          <MembersBlock slug={slug} members={data.members} onDone={refresh} />
          {data.invites.length > 0 && (
            <InvitesBlock slug={slug} invites={data.invites} onDone={refresh} />
          )}
        </>
      )}
    </div>
  );
}

function InviteBlock({ slug, onDone }: { slug: string; onDone: () => Promise<unknown> }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<InvitableRole>("staff");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await inviteStoreMember(slug, { email: email.trim(), role });
      await onDone();
      toast(`Convite enviado para ${email.trim()}.`);
      setEmail("");
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card p-5">
      <div className="flex items-start gap-3">
        <span className="inline-grid h-11 w-11 shrink-0 place-items-center rounded-[0.9rem] bg-brand-soft text-brand-deep">
          <UserPlus className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-display font-semibold tracking-tight">Convidar alguém</h3>
          <p className="mt-0.5 text-muted text-sm">
            A pessoa recebe um link por e-mail, válido por 7 dias. Se ainda não tem conta, cria na
            hora — com esse mesmo e-mail.
          </p>
        </div>
      </div>
      <form className="mt-4 grid gap-4" onSubmit={submit}>
        <Field label="E-mail" htmlFor="invite-email" error={undefined}>
          <Input
            id="invite-email"
            type="email"
            inputMode="email"
            autoComplete="off"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="pessoa@exemplo.org"
          />
        </Field>
        <Field label="Papel" htmlFor="invite-role" hint={ROLE_HELP[role]} error={undefined}>
          <Select
            id="invite-role"
            value={role}
            onChange={(event) => setRole(event.target.value as InvitableRole)}
          >
            <option value="staff">{roleLabel("staff")}</option>
            <option value="admin">{roleLabel("admin")}</option>
          </Select>
        </Field>
        <FormError>{error}</FormError>
        <Button type="submit" disabled={busy || !email.trim()} className="justify-self-start">
          {busy ? "Enviando…" : "Enviar convite"}
        </Button>
      </form>
    </section>
  );
}

function MembersBlock({
  slug,
  members,
  onDone,
}: {
  slug: string;
  members: Member[];
  onDone: () => Promise<unknown>;
}) {
  const { user } = useSession();
  const [removing, setRemoving] = useState<Member | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const toast = useToast();

  async function changeRole(member: Member, role: InvitableRole) {
    setBusy(member.userId);
    try {
      await updateStoreMember(slug, member.userId, { role });
      await onDone();
      toast(`${member.name} agora é ${roleLabel(role).toLowerCase()}.`);
    } catch (cause) {
      toast(errorMessage(cause));
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    if (!removing) return;
    setBusy(removing.userId);
    try {
      await removeStoreMember(slug, removing.userId);
      await onDone();
      toast(`${removing.name} saiu da equipe.`);
      setRemoving(null);
    } catch (cause) {
      toast(errorMessage(cause));
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="card p-5">
      <div className="flex items-start gap-3">
        <span className="inline-grid h-11 w-11 shrink-0 place-items-center rounded-[0.9rem] bg-brand-soft text-brand-deep">
          <Users className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-display font-semibold tracking-tight">
            Quem cuida da loja <span className="text-muted font-normal">({members.length})</span>
          </h3>
        </div>
      </div>
      <ul className="mt-4 divide-y divide-line">
        {members.map((member) => {
          const isOwner = member.role === "owner";
          const isMe = member.userId === user?.id;
          return (
            <li
              key={member.userId}
              className="grid gap-3 py-4 sm:grid-cols-[1fr_auto] sm:items-center"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">
                  {member.name}
                  {isMe && <span className="ml-2 text-muted text-sm">(você)</span>}
                </p>
                <p className="truncate text-muted text-sm">{member.email ?? "sem e-mail"}</p>
              </div>
              {isOwner ? (
                <Tag tone="brand">{roleLabel("owner")}</Tag>
              ) : (
                <div className="flex items-center gap-2">
                  <Select
                    aria-label={`Papel de ${member.name}`}
                    className="h-11 sm:h-9 sm:w-44"
                    value={member.role}
                    disabled={busy === member.userId}
                    onChange={(event) => changeRole(member, event.target.value as InvitableRole)}
                  >
                    <option value="staff">{roleLabel("staff")}</option>
                    <option value="admin">{roleLabel("admin")}</option>
                  </Select>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Remover ${member.name}`}
                    disabled={busy === member.userId}
                    onClick={() => setRemoving(member)}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </Button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <ConfirmDialog
        open={removing !== null}
        title={`Remover ${removing?.name ?? ""} da equipe?`}
        confirmLabel="Remover da equipe"
        busy={busy !== null}
        onConfirm={remove}
        onCancel={() => setRemoving(null)}
      >
        <p className="text-muted text-sm">
          A pessoa perde o acesso ao painel na hora. Dá para convidar de novo depois.
        </p>
      </ConfirmDialog>
    </section>
  );
}

function InvitesBlock({
  slug,
  invites,
  onDone,
}: {
  slug: string;
  invites: Invite[];
  onDone: () => Promise<unknown>;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const toast = useToast();

  async function resend(invite: Invite) {
    setBusy(invite.id);
    try {
      await inviteStoreMember(slug, { email: invite.email, role: invite.role });
      await onDone();
      toast(`Convite reenviado para ${invite.email}.`);
    } catch (cause) {
      toast(errorMessage(cause));
    } finally {
      setBusy(null);
    }
  }

  async function revoke(invite: Invite) {
    setBusy(invite.id);
    try {
      await revokeStoreInvite(slug, invite.id);
      await onDone();
      toast("Convite cancelado.");
    } catch (cause) {
      toast(errorMessage(cause));
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="card p-5">
      <div className="flex items-start gap-3">
        <span className="inline-grid h-11 w-11 shrink-0 place-items-center rounded-[0.9rem] bg-surface text-muted">
          <Mail className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-display font-semibold tracking-tight">Convites pendentes</h3>
          <p className="mt-0.5 text-muted text-sm">Ainda não aceitos. Reenviar renova o prazo.</p>
        </div>
      </div>
      <ul className="mt-4 divide-y divide-line">
        {invites.map((invite) => (
          <li key={invite.id} className="grid gap-3 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
            <div className="min-w-0">
              <p className="truncate font-medium">{invite.email}</p>
              <p className="text-muted text-sm">
                {roleLabel(invite.role)} · vale até {longDate(invite.expiresAt)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={busy === invite.id}
                onClick={() => resend(invite)}
              >
                <RefreshCw className="h-4 w-4" aria-hidden />
                Reenviar
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={busy === invite.id}
                onClick={() => revoke(invite)}
              >
                Cancelar
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
