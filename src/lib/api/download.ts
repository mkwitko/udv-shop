import { getAccessToken } from "./auth-token";
import { ApiError, renewAccessToken, resolveBaseUrl } from "./fetch-client";

/**
 * Baixa um arquivo da API. Fora do cliente gerado de propósito: as rotas de CSV
 * devolvem arquivo, não JSON, e o navegador precisa do Blob para salvar.
 */
export async function downloadFile(path: string, filename: string): Promise<void> {
  let res = await send(path);
  if (res.status === 401) {
    // token de acesso vive em memória e pode ter expirado com a aba aberta; passa pela
    // mesma fila do cliente HTTP para não disparar dois refresh com o mesmo cookie
    if (await renewAccessToken()) res = await send(path);
  }
  if (!res.ok) {
    throw new ApiError(res.status, `http_${res.status}`, "Não foi possível gerar o arquivo.");
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function send(path: string): Promise<Response> {
  const token = getAccessToken();
  return fetch(`${resolveBaseUrl()}${path}`, {
    headers: token ? { authorization: `Bearer ${token}` } : {},
    credentials: "include",
  });
}
