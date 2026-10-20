import { defineConfig, devices } from "@playwright/test";
import type { LanguageOptions } from "./e2e/i18n.js";
import { apiEnv, retries } from "./e2e/paths.js";

const desktop = devices["Desktop Chrome"];

export default defineConfig<LanguageOptions>({
  testDir: "e2e",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: false,
  retries,
  // This machine is short on memory: a first render can take longer than the 5 s default.
  expect: { timeout: 10_000 },
  use: { baseURL: "http://127.0.0.1:5173", trace: "retain-on-failure" },
  projects: [
    { name: "desktop-fr", use: { ...desktop, language: "fr" } },
    { name: "desktop-en", use: { ...desktop, language: "en" } },
    {
      name: "phone-360-fr",
      use: { ...desktop, language: "fr", viewport: { width: 360, height: 760 } },
    },
  ],
  webServer: [
    {
      command: "npm run db:migrate && npm run dev:api",
      url: "http://127.0.0.1:3000/v1/health",
      env: apiEnv,
      timeout: 120_000,
      reuseExistingServer: false,
    },
    {
      command: "npm run dev:mcp",
      port: 3100,
      timeout: 120_000,
      reuseExistingServer: false,
    },
    {
      command: "npm run dev -w @overpass/web",
      url: "http://127.0.0.1:5173",
      timeout: 120_000,
      reuseExistingServer: false,
    },
  ],
});
