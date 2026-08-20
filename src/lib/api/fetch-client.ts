// Cliente HTTP único do app. Todo código gerado pelo Kubb passa por aqui — é o lugar
// onde vivem base URL, credenciais, token de acesso e a tradução de erro da API.
import { getAccessToken, onUnauthorized, setAccessToken } from "./auth-token";

export type RequestConfig<TData = unknown> = {
  baseURL?: string;
  url?: string;
  method: "GET" | "PUT" | "PATCH" | "POST" | "DELETE" | "OPTIONS";
  params?: unknown;
  data?: TData | FormData;
  headers?: HeadersInit;
  signal?: AbortSignal;
  /** Não anexa Authorization nem cookie — usado no SSR de rota pública. */
  anonymous?: boolean;
};

export type ResponseConfig<TData = unknown> = {
  data: TData;
  status: number;
  statusText: string;
  headers: Headers;
};

export type ResponseErrorConfig<TError = unknown> = ApiError<TError>;

export type Client = <TData, _TError = unknown, TVariables = unknown>(
  config: RequestConfig<TVariables>,
) => Promise<ResponseConfig<TData>>;

/**
 * Formato de erro do udv-shop-api (http/plugins/error-handler.ts):
 * `{ code: "VALIDATION" | "CONFLICT" | …, message: "slug_do_erro", details?, trace_id }`.
 * O slug semântico está em `message` — `code` é só a categoria HTTP. Aceitamos
 * também `{ error: "slug" }` porque parte dos webhooks/gateways responde assim.
 */
export type ApiErrorBody = {
  error?: string;
  code?: string;
  message?: string;
  details?: unknown;
  issues?: unknown;
  trace_id?: string;
};

/** Slug de erro é snake_case sem espaço; frase humana não vira código. */
const SLUG = /^[a-z][a-z0-9_]*$/;

function errorSlug(body: ApiErrorBody, status: number): string {
  if (body.error && SLUG.test(body.error)) return body.error;
  if (body.message && SLUG.test(body.message)) return body.message;
  return body.error ?? `http_${status}`;
}

export class ApiError<TError = unknown> extends Error {
  readonly status: number;
  readonly code: string;
  readonly body: TError | ApiErrorBody | undefined;
  /** `details` do envelope — em VALIDATION, a lista de campos que o zod recusou. */
  readonly details: unknown;
  readonly traceId: string | undefined;

  constructor(status: number, code: string, message: string, body?: TError | ApiErrorBody) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.body = body;
    const envelope = (body ?? {}) as ApiErrorBody;
    this.details = envelope.details ?? envelope.issues;
    this.traceId = envelope.trace_id;
  }
}

export function resolveBaseUrl(): string {
  const fromEnv =
    typeof import.meta.env?.VITE_API_URL === "string" ? import.meta.env.VITE_API_URL : "";
  return (fromEnv || "http://localhost:3333").replace(/\/$/, "");
}

function toSearchParams(params: unknown): string {
  if (!params || typeof params !== "object") return "";
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params as Record<string, unknown>)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) for (const v of value) search.append(key, String(v));
    else search.append(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

async function parseBody(res: Response): Promise<unknown> {
  if (res.status === 204) return undefined;
  const type = res.headers.get("content-type") ?? "";
  if (type.includes("application/json")) return res.json();
  const text = await res.text();
  return text.length > 0 ? text : undefined;
}

/**
 * Rotas onde 401 é a resposta do endpoint, não token vencido. Renovar aqui daria loop
 * (`/auth/refresh` chamando a si mesmo) ou trocaria "senha errada" por uma sessão velha.
 */
const NO_RENEW = new Set(["/auth/refresh", "/auth/login", "/auth/register", "/auth/logout"]);

let renewing: Promise<string | null> | null = null;

async function postRefresh(base: string): Promise<string | null> {
  try {
    const res = await fetch(`${base}/auth/refresh`, { method: "POST", credentials: "include" });
    if (!res.ok) return null;
    const body = (await res.json()) as { accessToken?: unknown };
    return typeof body.accessToken === "string" ? body.accessToken : null;
  } catch {
    return null;
  }
}

/**
 * Um refresh por vez. Sem essa fila, N chamadas que estouram 401 juntas disparam N
 * POST /auth/refresh com o mesmo cookie — e a partir da segunda a API vê um token já
 * rotacionado, trata como roubo e revoga a família inteira. Aí o logout é de verdade.
 */
export function renewAccessToken(base = resolveBaseUrl()): Promise<string | null> {
  renewing ??= postRefresh(base)
    .then((token) => {
      if (token) setAccessToken(token);
      return token;
    })
    .finally(() => {
      renewing = null;
    });
  return renewing;
}

async function send(
  base: string,
  config: RequestConfig<unknown>,
  token: string | null,
): Promise<{ res: Response; body: unknown }> {
  const url = `${base}${config.url ?? ""}${toSearchParams(config.params)}`;
  const isForm = config.data instanceof FormData;
  const headers = new Headers(config.headers);
  if (!isForm && config.data !== undefined && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  if (token && !headers.has("authorization")) headers.set("authorization", `Bearer ${token}`);

  const init: RequestInit = {
    method: config.method,
    headers,
    // o refresh token é cookie httpOnly em /auth — sem isso a sessão não sobrevive ao reload
    credentials: config.anonymous ? "omit" : "include",
  };
  if (config.signal) init.signal = config.signal;
  if (config.data !== undefined) {
    init.body = isForm ? (config.data as FormData) : JSON.stringify(config.data);
  }

  const res = await fetch(url, init);
  return { res, body: await parseBody(res) };
}

async function request<TData>(config: RequestConfig<unknown>): Promise<ResponseConfig<TData>> {
  const base = config.baseURL ?? resolveBaseUrl();
  const authenticated = !config.anonymous;
  const sent = authenticated ? getAccessToken() : null;
  let attempt = await send(base, config, sent);

  // access token vive 15 min em memória: 401 aqui quase sempre é expiração, não fim de
  // sessão. Renova pelo cookie httpOnly e repete a chamada uma vez.
  if (attempt.res.status === 401 && authenticated && !NO_RENEW.has(config.url ?? "")) {
    // outra chamada pode ter renovado enquanto esta estava no ar — nesse caso só repete
    const current = getAccessToken();
    const token = current && current !== sent ? current : await renewAccessToken(base);
    if (token) attempt = await send(base, config, token);
  }

  const { res, body } = attempt;

  if (!res.ok) {
    const parsed = (body ?? {}) as ApiErrorBody;
    if (res.status === 401) onUnauthorized();
    throw new ApiError(
      res.status,
      errorSlug(parsed, res.status),
      parsed.message ?? parsed.error ?? res.statusText,
      body as ApiErrorBody,
    );
  }

  return {
    data: body as TData,
    status: res.status,
    statusText: res.statusText,
    headers: res.headers,
  };
}

const client: Client = (config) => request(config as RequestConfig<unknown>);

export default client;
