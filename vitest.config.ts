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
  },
});
