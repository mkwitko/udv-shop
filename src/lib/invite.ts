import type { SessionStatus } from "#/lib/auth/session";

export type InviteState = "loading" | "anonymous" | "ready" | "mismatch";

/**
 * Em que pé a pessoa está diante do convite. O convite é pessoal: só a conta com o mesmo
 * e-mail aceita — a API recusa o resto, e a tela avisa antes de a pessoa tentar.
 */
export function inviteState(
  status: SessionStatus,
  userEmail: string | null | undefined,
  invite: { email: string },
): InviteState {
  if (status === "loading") return "loading";
  if (status === "anonymous") return "anonymous";
  if (userEmail && userEmail.toLowerCase() === invite.email.toLowerCase()) return "ready";
  return "mismatch";
}

const ROLE_LABEL: Record<string, string> = {
  owner: "Dono",
  admin: "Administrador",
  staff: "Equipe",
};

export function roleLabel(role: string): string {
  return ROLE_LABEL[role] ?? role;
}

/** O que cada papel pode, na linguagem de quem convida. */
export const ROLE_HELP: Record<"admin" | "staff", string> = {
  admin: "Faz tudo, menos convidar gente e mexer no recebimento.",
  staff: "Cuida de produtos, pedidos e agenda. Não vê dinheiro.",
};
