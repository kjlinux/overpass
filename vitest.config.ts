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
      include: ["apps/*/src/**/*.{ts,tsx}", "packages/*/src/**/*.ts"],
      exclude: ["**/*.test.{ts,tsx}", "**/testing.ts", "**/testing-*.ts", "**/fixtures.ts"],
      reporter: ["text-summary", "html"],
    },
  },
});
