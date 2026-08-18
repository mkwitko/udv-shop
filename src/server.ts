import handler, { createServerEntry } from "@tanstack/react-start/server-entry";

/**
 * Entrada do servidor. Existe por um motivo só: domínio próprio de loja.
 *
 * Quando alguém abre `loja.suacomunidade.org/`, o pedido chega aqui com esse Host. A
 * API diz de quem é o endereço e a requisição é reescrita para `/loja/{slug}/…` antes
 * de entrar no roteador — o app inteiro segue igual, sem rota nova e sem redirect
 * visível. Host da plataforma, arquivo estático e chamada de server function passam
 * sem tocar em nada.
 */
const CACHE_TTL_MS = 60_000;
const cache = new Map<string, { slug: string | null; at: number }>();

const UNTOUCHED_PREFIXES = ["/loja/", "/_serverFn", "/api/", "/assets/", "/@", "/node_modules/"];

function canonicalHost(): string | null {
  const raw =
    typeof import.meta.env?.VITE_SITE_URL === "string" ? import.meta.env.VITE_SITE_URL : "";
  if (!raw) return null;
  try {
    return new URL(raw).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function isPlatformHost(host: string): boolean {
  if (host === "localhost" || host === "127.0.0.1" || host.endsWith(".localhost")) return true;
  const canonical = canonicalHost();
  return canonical !== null && (host === canonical || host.endsWith(`.${canonical}`));
}

function shouldRewrite(pathname: string): boolean {
  if (UNTOUCHED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return false;
  // qualquer coisa com extensão é arquivo (favicon.svg, robots.txt, sitemap.xml)
  return !/\.[a-z0-9]+$/i.test(pathname);
}

async function storeSlugForHost(host: string): Promise<string | null> {
  const cached = cache.get(host);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.slug;

  const base = (
    typeof import.meta.env?.VITE_API_URL === "string" ? import.meta.env.VITE_API_URL : ""
  ).replace(/\/$/, "");
  let slug: string | null = null;
  try {
    const res = await fetch(
      `${base || "http://localhost:3333"}/stores/by-domain?host=${encodeURIComponent(host)}`,
    );
    if (res.ok) {
      const store = (await res.json()) as { slug?: string };
      slug = store.slug ?? null;
    }
  } catch {
    // API fora do ar não pode derrubar o site: sem resposta, o host cai na landing
    slug = null;
  }
  cache.set(host, { slug, at: Date.now() });
  return slug;
}

export default createServerEntry({
  async fetch(request: Request) {
    const url = new URL(request.url);
    const host = url.hostname.toLowerCase();

    if (!isPlatformHost(host) && shouldRewrite(url.pathname)) {
      const slug = await storeSlugForHost(host);
      if (slug) {
        const rewritten = new URL(url);
        rewritten.pathname = `/loja/${slug}${url.pathname === "/" ? "" : url.pathname}`;
        return handler.fetch(new Request(rewritten, request));
      }
    }

    return handler.fetch(request);
  },
});
