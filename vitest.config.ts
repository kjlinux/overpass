import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: [
      "scripts/**/*.test.ts",
      "apps/*/src/**/*.test.{ts,tsx}",
      "packages/*/src/**/*.test.ts",
    ],
    testTimeout: 60000,
    hookTimeout: 60000,
    exclude: ["**/node_modules/**", "**/dist/**", ".references/**", ".claude/**"],
    coverage: {
      provider: "v8",
      include: ["apps/api/src/**/*.ts", "apps/cli/src/**/*.ts", "packages/*/src/**/*.ts"],
      exclude: [
        "**/*.test.{ts,tsx}",
        "**/testing.ts",
        "**/testing-*.ts",
        "**/fixtures.ts",
        "apps/cli/src/cli.ts",
      ],
      reporter: ["text-summary", "html"],
      // The web pages are covered by the end-to-end suite; the API and shared packages here.
      thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 },
    },
  },
});
