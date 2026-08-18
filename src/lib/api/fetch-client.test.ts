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

  it("401 derruba o token em memória — a sessão morreu do lado do servidor", async () => {
    server.use(
      http.get(`${BASE}/auth/me`, () =>
        HttpResponse.json({ error: "unauthorized" }, { status: 401 }),
      ),
    );
    setAccessToken("tok-velho");

    await client({ method: "GET", url: "/auth/me", baseURL: BASE }).catch(() => undefined);

    expect(getAccessToken()).toBeNull();
  });
});
