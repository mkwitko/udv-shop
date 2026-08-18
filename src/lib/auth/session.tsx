import { useRouter } from "@tanstack/react-router";
import { createContext, type ReactNode, use, useCallback, useEffect, useState } from "react";
import { setAccessToken, subscribeUnauthorized } from "#/lib/api/auth-token";
import { login as loginRequest } from "#/lib/api/gen/clients/login";
import { logout as logoutRequest } from "#/lib/api/gen/clients/logout";
import { refresh as refreshRequest } from "#/lib/api/gen/clients/refresh";
import { register as registerRequest } from "#/lib/api/gen/clients/register";
import type { Login200 } from "#/lib/api/gen/types/Login";

export type SessionUser = Login200["user"];
export type SessionStatus = "loading" | "authenticated" | "anonymous";

interface SessionValue {
  user: SessionUser | null;
  status: SessionStatus;
  login: (input: { email: string; password: string }) => Promise<SessionUser>;
  register: (input: { name: string; email: string; password: string }) => Promise<SessionUser>;
  logout: () => Promise<void>;
}

const SessionContext = createContext<SessionValue | null>(null);

/** Só uma pista de "já houve login aqui" — o que autentica continua sendo o cookie httpOnly. */
const SESSION_HINT_KEY = "udv-session";

export function SessionProvider({ children }: { children: ReactNode }) {
  // pelo router e não pelo useQueryClient: o provider monta na shell, acima da árvore
  // onde a integração de query injeta o contexto do React Query.
  const { queryClient } = useRouter().options.context;
  const [user, setUser] = useState<SessionUser | null>(null);
  const [status, setStatus] = useState<SessionStatus>("loading");

  const adopt = useCallback((result: { accessToken: string; user: SessionUser }) => {
    setAccessToken(result.accessToken);
    localStorage.setItem(SESSION_HINT_KEY, "1");
    setUser(result.user);
    setStatus("authenticated");
    return result.user;
  }, []);

  const clear = useCallback(() => {
    setAccessToken(null);
    localStorage.removeItem(SESSION_HINT_KEY);
    setUser(null);
    setStatus("anonymous");
  }, []);

  // O access token vive em memória e morre no reload. Quem devolve a sessão é o cookie
  // httpOnly de refresh, então a primeira coisa que o app faz no cliente é trocá-lo —
  // mas só se esta máquina já teve sessão. Visitante novo não gasta um 401 por página.
  useEffect(() => {
    if (localStorage.getItem(SESSION_HINT_KEY) !== "1") {
      setStatus("anonymous");
      return;
    }
    let alive = true;
    refreshRequest()
      .then((result) => {
        if (alive) adopt(result);
      })
      .catch(() => {
        if (alive) setStatus("anonymous");
      });
    return () => {
      alive = false;
    };
  }, [adopt]);

  useEffect(() => subscribeUnauthorized(clear), [clear]);

  const value: SessionValue = {
    user,
    status,
    login: async (input) => adopt(await loginRequest(input)),
    register: async (input) => adopt(await registerRequest(input)),
    logout: async () => {
      try {
        await logoutRequest();
      } finally {
        clear();
        // limpa cache autenticado para a próxima sessão não ver dados da anterior
        queryClient.clear();
      }
    },
  };

  return <SessionContext value={value}>{children}</SessionContext>;
}

export function useSession(): SessionValue {
  const value = use(SessionContext);
  if (!value) throw new Error("useSession precisa estar dentro de <SessionProvider>");
  return value;
}
