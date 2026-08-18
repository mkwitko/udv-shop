import { defineConfig } from "@kubb/core";
import { pluginClient } from "@kubb/plugin-client";
import { pluginOas } from "@kubb/plugin-oas";
import { pluginReactQuery } from "@kubb/plugin-react-query";
import { pluginTs } from "@kubb/plugin-ts";
import { pluginZod } from "@kubb/plugin-zod";

// Fonte: docs/openapi.json do udv-shop-api (gerado lá por `pnpm openapi:export`).
// Nada em src/lib/api/gen é escrito à mão — `pnpm api:generate` regenera tudo.
export default defineConfig({
  root: ".",
  input: { path: "../udv-shop-api/docs/openapi.json" },
  output: { path: "./src/lib/api/gen", clean: true },
  plugins: [
    pluginOas({ validate: false }),
    pluginTs({ output: { path: "types" } }),
    pluginZod({ output: { path: "schemas" }, typed: true }),
    pluginClient({
      output: { path: "clients" },
      importPath: "../../fetch-client.ts",
    }),
    pluginReactQuery({
      output: { path: "hooks" },
      client: { importPath: "../../fetch-client.ts" },
    }),
  ],
});
