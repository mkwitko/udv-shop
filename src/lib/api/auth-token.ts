// Access token vive só em memória: nada de localStorage (XSS lê localStorage, não lê
// closure). A persistência da sessão é o cookie httpOnly de refresh, que o navegador
// manda sozinho para /auth/refresh.
let accessToken: string | null = null;
const listeners = new Set<() => void>();

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

/** Chamado pelo cliente HTTP em qualquer 401 — a UI decide se manda para /entrar. */
export function onUnauthorized(): void {
  accessToken = null;
  for (const listener of listeners) listener();
}

export function subscribeUnauthorized(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
