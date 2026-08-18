import { useNavigate } from "@tanstack/react-router";
import { type ReactNode, useEffect } from "react";
import { useSession } from "#/lib/auth/session";

/**
 * Guarda de rota do lado do cliente. Não dá para checar no `beforeLoad`: o access token
 * mora na memória do navegador e o servidor de SSR não tem como enxergá-lo.
 */
export function RequireSession({
  children,
  redirectTo,
}: {
  children: ReactNode;
  redirectTo: string;
}) {
  const { status } = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (status === "anonymous") {
      void navigate({ to: "/entrar", search: { redirect: redirectTo }, replace: true });
    }
  }, [status, navigate, redirectTo]);

  if (status !== "authenticated") {
    return (
      <div className="shell py-20" aria-busy="true">
        <div className="h-7 w-48 animate-pulse rounded-md bg-surface" />
        <div className="mt-6 grid gap-3">
          <div className="h-24 animate-pulse rounded-lg bg-surface" />
          <div className="h-24 animate-pulse rounded-lg bg-surface" />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
