import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll } from "vitest";

/** Servidor MSW compartilhado: cada teste registra os handlers que precisa. */
export const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
