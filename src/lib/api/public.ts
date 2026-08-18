import type { Client, RequestConfig } from "./fetch-client";

/** Config das chamadas de rota pública: sem cookie e sem Authorization, para o SSR
 *  poder ser cacheado e para nenhum dado de sessão vazar em página compartilhada. */
export const publicRequest: Partial<RequestConfig> & { client?: Client } = { anonymous: true };
