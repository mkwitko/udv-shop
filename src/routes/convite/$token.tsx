import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AuthShell } from "#/components/site/auth-shell";
import { Button } from "#/components/ui/button";
import { FormError } from "#/components/ui/field";
import { SkeletonRows } from "#/components/ui/skeleton";
import { errorMessage } from "#/lib/api/error-message";
import { ApiError } from "#/lib/api/fetch-client";
import { acceptInvite } from "#/lib/api/gen/clients/acceptInvite";
import { useGetInvite } from "#/lib/api/gen/hooks/useGetInvite";
import { publicRequest } from "#/lib/api/public";
import { useSession } from "#/lib/auth/session";
import { inviteState, roleLabel } from "#/lib/invite";
import { seo } from "#/lib/seo";

export const Route = createFileRoute("/convite/$token")({
  head: () =>
    seo({
      title: "Convite para cuidar de uma loja",
      description: "Aceite o convite e passe a cuidar da loja junto com quem convidou.",
      path: "/convite",
      noIndex: true,
    }),
  component: InvitePage,
});

function InvitePage() {
  const { token } = Route.useParams();
  const {
    data: invite,
    isPending,
    error,
  } = useGetInvite(token, {
    client: publicRequest,
    query: { retry: false },
  });

  if (isPending) {
    return (
      <AuthShell title="Convite" subtitle="Conferindo o convite…" footer={null}>
        <SkeletonRows rows={2} />
      </AuthShell>
    );
  }

  if (error || !invite) {
    const expired = error instanceof ApiError && error.status === 410;
    return (
      <AuthShell
        title={expired ? "Convite vencido" : "Convite não encontrado"}
        subtitle={
          expired
            ? "Esse link passou do prazo de 7 dias. Peça para quem te convidou mandar outro."
            : "Esse link já foi usado, foi cancelado, ou veio incompleto. Peça um novo para quem te convidou."
        }
        footer={
          <Link to="/" className="text-brand-deep underline underline-offset-4">
            ir para o início
          </Link>
        }
      >
        <p className="text-muted text-sm">Nada a fazer por aqui.</p>
      </AuthShell>
    );
  }

  return <InviteBody token={token} invite={invite} />;
}

function InviteBody({
  token,
  invite,
}: {
  token: string;
  invite: { storeName: string; storeSlug: string; role: "admin" | "staff"; email: string };
}) {
  const { status, user, reload, logout } = useSession();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const state = inviteState(status, user?.email, invite);
  const here = `/convite/${token}`;

  async function accept() {
    setBusy(true);
    setError(null);
    try {
      await acceptInvite(token);
      // O papel vive no token: a API já girou o refresh, aqui só puxamos o access novo.
      await reload();
      await navigate({ to: "/gestao/$slug", params: { slug: invite.storeSlug }, replace: true });
    } catch (cause) {
      setError(errorMessage(cause));
      setBusy(false);
    }
  }

  return (
    <AuthShell
      title={`Cuidar da loja ${invite.storeName}`}
      subtitle={`Você foi convidado(a) como ${roleLabel(invite.role).toLowerCase()}.`}
      footer={
        <Link to="/" className="text-brand-deep underline underline-offset-4">
          não era pra mim
        </Link>
      }
    >
      <div className="grid gap-4">
        <p className="text-sm">
          Convite para <strong className="font-medium">{invite.email}</strong>.
        </p>

        {state === "loading" && <SkeletonRows rows={1} />}

        {state === "anonymous" && (
          <>
            <p className="text-muted text-sm">
              Entre com esse e-mail — ou crie uma conta com ele — para aceitar.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button asChild>
                <Link to="/entrar" search={{ redirect: here }}>
                  Entrar
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/criar-conta" search={{ redirect: here }}>
                  Criar conta
                </Link>
              </Button>
            </div>
          </>
        )}

        {state === "mismatch" && (
          <>
            <p className="text-muted text-sm">
              Você está como <strong className="font-medium">{user?.email ?? user?.name}</strong>, e
              o convite é pessoal. Saia e entre com o e-mail do convite.
            </p>
            <Button
              variant="outline"
              onClick={async () => {
                await logout();
              }}
            >
              Sair desta conta
            </Button>
          </>
        )}

        {state === "ready" && (
          <>
            <FormError>{error}</FormError>
            <Button size="lg" onClick={accept} disabled={busy}>
              {busy ? "Aceitando…" : "Aceitar convite"}
            </Button>
          </>
        )}
      </div>
    </AuthShell>
  );
}
