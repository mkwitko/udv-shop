// Cliente HTTP único do app. Todo código gerado pelo Kubb passa por aqui — é o lugar
// onde vivem base URL, credenciais, token de acesso e a tradução de erro da API.
import { getAccessToken, onUnauthorized } from "./auth-token";

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

/** Formato de erro do udv-shop-api: `{ error: "codigo", message?: string }`. */
export type ApiErrorBody = { error?: string; message?: string; issues?: unknown };

export class ApiError<TError = unknown> extends Error {
  readonly status: number;
  readonly code: string;
  readonly body: TError | ApiErrorBody | undefined;

  constructor(status: number, code: string, message: string, body?: TError | ApiErrorBody) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.body = body;
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

async function request<TData>(config: RequestConfig<unknown>): Promise<ResponseConfig<TData>> {
  const base = config.baseURL ?? resolveBaseUrl();
  const url = `${base}${config.url ?? ""}${toSearchParams(config.params)}`;
  const isForm = config.data instanceof FormData;
  const headers = new Headers(config.headers);
  if (!isForm && config.data !== undefined && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  if (!config.anonymous) {
    const token = getAccessToken();
    if (token && !headers.has("authorization")) headers.set("authorization", `Bearer ${token}`);
  }

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
  const body = await parseBody(res);

  if (!res.ok) {
    const parsed = (body ?? {}) as ApiErrorBody;
    if (res.status === 401) onUnauthorized();
    throw new ApiError(
      res.status,
      parsed.error ?? `http_${res.status}`,
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
