import { fileURLToPath } from "node:url";
import { supportedLanguages } from "@overpass/shared";
import { defineConfig, loadEnv } from "vite";
import { sharePlugin } from "./src/share/plugin";

const repositoryRoot = fileURLToPath(new URL("../..", import.meta.url));

export default defineConfig(({ mode }) => {
  // Only WEB_ORIGIN is read from the root .env: canonical and share URLs must be absolute.
  const env = loadEnv(mode, repositoryRoot, "WEB_ORIGIN");
  const origin = (
    process.env["WEB_ORIGIN"] ??
    env["WEB_ORIGIN"] ??
    "http://127.0.0.1:5173"
  ).replace(/\/+$/, "");
  return {
    esbuild: { jsx: "automatic", jsxImportSource: "preact" },
    plugins: [sharePlugin({ origin, languages: supportedLanguages })],
    server: {
      host: "127.0.0.1",
      port: 5173,
      proxy: { "/v1": "http://127.0.0.1:3000", "/mcp": "http://127.0.0.1:3100" },
    },
    build: { manifest: true },
  };
});
