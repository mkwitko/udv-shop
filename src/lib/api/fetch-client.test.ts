import { HttpResponse, http } from "msw";
import { afterEach, describe, expect, it } from "vitest";
import { server } from "#/test/setup";
import { getAccessToken, setAccessToken } from "./auth-token";
import client, { ApiError } from "./fetch-client";

const BASE = "http://localhost:3333";

afterEach(() => setAccessToken(null));

describe("cliente HTTP", () => {
  it("manda o access token e credenciais nas chamadas autenticadas", async () => {
    let auth: string | null = null;
    server.use(
      http.get(`${BASE}/auth/me`, ({ request }) => {
        auth = request.headers.get("authorization");
        return HttpResponse.json({ id: "u1" });
      }),
    );
    setAccessToken("tok-123");

    const res = await client<{ id: string }>({ method: "GET", url: "/auth/me", baseURL: BASE });

    expect(auth).toBe("Bearer tok-123");
    expect(res.data).toEqual({ id: "u1" });
  });

  it("rota pública não carrega token — nada de sessão vazar em página cacheável", async () => {
    let auth: string | null = "nao-chamado";
    server.use(
      http.get(`${BASE}/stores`, ({ request }) => {
        auth = request.headers.get("authorization");
        return HttpResponse.json({ items: [], nextCursor: null });
      }),
    );
    setAccessToken("tok-123");

    await client({ method: "GET", url: "/stores", baseURL: BASE, anonymous: true });

    expect(auth).toBeNull();
  });

  it("serializa query params e ignora vazios", async () => {
    let url = "";
    server.use(
      http.get(`${BASE}/stores`, ({ request }) => {
        url = new URL(request.url).search;
        return HttpResponse.json({ items: [], nextCursor: null });
      }),
    );

    await client({
      method: "GET",
      url: "/stores",
      baseURL: BASE,
      params: { limit: 20, cursor: undefined, q: "" },
      anonymous: true,
    });

    expect(url).toBe("?limit=20");
  });

  it("traduz erro da API em ApiError com código legível", async () => {
    server.use(
      http.post(`${BASE}/orders`, () =>
        HttpResponse.json({ error: "out_of_stock", message: "Sem estoque" }, { status: 409 }),
      ),
    );

    const err = await client({ method: "POST", url: "/orders", baseURL: BASE, data: {} }).catch(
      (e: unknown) => e,
    );

    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(409);
    expect((err as ApiError).code).toBe("out_of_stock");
    expect((err as ApiError).message).toBe("Sem estoque");
  });

  it("envelope real da API ({code, message, details}) vira código semântico", async () => {
    server.use(
      http.post(`${BASE}/auth/register`, () =>
        HttpResponse.json(
          {
            code: "VALIDATION",
            message: "validation_error",
            details: [{ keyword: "too_small", instancePath: "/password" }],
            trace_id: "req-w",
          },
          { status: 400 },
        ),
      ),
    );

    const err = (await client({
      method: "POST",
      url: "/auth/register",
      baseURL: BASE,
      data: {},
    }).catch((e: unknown) => e)) as ApiError;

    expect(err.code).toBe("validation_error");
    expect(err.traceId).toBe("req-w");
    expect(Array.isArray(err.details)).toBe(true);
  });

  it("401 derruba o token em memória quando o refresh também falha", async () => {
    server.use(
      http.get(`${BASE}/auth/me`, () =>
        HttpResponse.json({ error: "unauthorized" }, { status: 401 }),
      ),
      http.post(`${BASE}/auth/refresh`, () =>
        HttpResponse.json({ error: "missing_refresh_cookie" }, { status: 401 }),
      ),
    );
    setAccessToken("tok-velho");

    const err = await client({ method: "GET", url: "/auth/me", baseURL: BASE }).catch(
      (e: unknown) => e,
    );

    expect((err as ApiError).status).toBe(401);
    expect(getAccessToken()).toBeNull();
  });

  it("401 renova o access token e repete a chamada — sessão sobrevive à expiração", async () => {
    const seen: string[] = [];
    server.use(
      http.get(`${BASE}/auth/me`, ({ request }) => {
        const auth = request.headers.get("authorization") ?? "";
        seen.push(auth);
        if (auth !== "Bearer tok-novo") {
          return HttpResponse.json({ error: "invalid_token" }, { status: 401 });
        }
        return HttpResponse.json({ id: "u1" });
      }),
      http.post(`${BASE}/auth/refresh`, () =>
        HttpResponse.json({ accessToken: "tok-novo", user: { id: "u1" } }),
      ),
    );
    setAccessToken("tok-velho");

    const res = await client<{ id: string }>({ method: "GET", url: "/auth/me", baseURL: BASE });

    expect(res.data).toEqual({ id: "u1" });
    expect(seen).toEqual(["Bearer tok-velho", "Bearer tok-novo"]);
    expect(getAccessToken()).toBe("tok-novo");
  });

  it("401 em paralelo faz um único refresh — dois derrubariam a família por reuso", async () => {
    let refreshes = 0;
    server.use(
      http.get(`${BASE}/auth/me`, ({ request }) =>
        request.headers.get("authorization") === "Bearer tok-novo"
          ? HttpResponse.json({ id: "u1" })
          : HttpResponse.json({ error: "invalid_token" }, { status: 401 }),
      ),
      http.get(`${BASE}/stores/x/orders`, ({ request }) =>
        request.headers.get("authorization") === "Bearer tok-novo"
          ? HttpResponse.json({ items: [] })
          : HttpResponse.json({ error: "invalid_token" }, { status: 401 }),
      ),
      http.post(`${BASE}/auth/refresh`, () => {
        refreshes += 1;
        return HttpResponse.json({ accessToken: "tok-novo", user: { id: "u1" } });
      }),
    );
    setAccessToken("tok-velho");

    const [me, orders] = await Promise.all([
      client<{ id: string }>({ method: "GET", url: "/auth/me", baseURL: BASE }),
      client<{ items: unknown[] }>({ method: "GET", url: "/stores/x/orders", baseURL: BASE }),
    ]);

    expect(refreshes).toBe(1);
    expect(me.data).toEqual({ id: "u1" });
    expect(orders.data).toEqual({ items: [] });
  });

  it("401 nas rotas de sessão não tenta refresh — credencial errada não é token vencido", async () => {
    let refreshes = 0;
    server.use(
      http.post(`${BASE}/auth/login`, () =>
        HttpResponse.json({ error: "invalid_credentials" }, { status: 401 }),
      ),
      http.post(`${BASE}/auth/refresh`, () => {
        refreshes += 1;
        return HttpResponse.json({ accessToken: "tok-novo", user: { id: "u1" } });
      }),
    );

    const err = await client({
      method: "POST",
      url: "/auth/login",
      baseURL: BASE,
      data: { email: "a@b.c", password: "x" },
    }).catch((e: unknown) => e);

    expect(refreshes).toBe(0);
    expect((err as ApiError).code).toBe("invalid_credentials");
  });
});
