import { defineConfig, devices } from "@playwright/test";

const databaseUrl =
  process.env["E2E_DATABASE_URL"] ?? "postgres://overpass:overpass@127.0.0.1:5432/overpass";

const apiEnv = {
  DATABASE_URL: databaseUrl,
  SESSION_SECRET: "e2e-only-secret-with-more-than-32-characters",
  WEB_ORIGIN: "http://127.0.0.1:5173",
  LOG_LEVEL: "warn",
};

export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  retries: process.env["CI"] === undefined ? 0 : 1,
  use: { baseURL: "http://127.0.0.1:5173", trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    {
      name: "phone-360",
      use: { ...devices["Desktop Chrome"], viewport: { width: 360, height: 760 } },
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
      command: "npm run dev -w @overpass/web",
      url: "http://127.0.0.1:5173",
      timeout: 120_000,
      reuseExistingServer: false,
    },
  ],
});
