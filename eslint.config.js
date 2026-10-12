import js from "@eslint/js";
import i18next from "eslint-plugin-i18next";
import globals from "globals";
import tseslint from "typescript-eslint";

const technicalAttributes = [
  "path",
  "to",
  "className",
  "href",
  "id",
  "type",
  "role",
  "name",
  "src",
  "lang",
  "aria-busy",
  "data-testid",
  "for",
  "scope",
  "autocomplete",
  "inputMode",
  "value",
  "class",
  "aria-controls",
  "aria-labelledby",
  "aria-describedby",
  "language",
];

const userMessageRule = {
  selector:
    "Property[key.name=/^(message|title|description|label)$/] > :matches(Literal, TemplateLiteral)",
  message: "User-facing text must come from the translation files.",
};

export default tseslint.config(
  { ignores: [".references/**", ".claude/**", "**/dist/**", "coverage/**"] },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      globals: { ...globals.node },
      parserOptions: {
        projectService: { allowDefaultProject: ["eslint.config.js", "vitest.config.ts"] },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "max-lines": ["error", { max: 200 }],
      "max-lines-per-function": ["error", { max: 40, skipBlankLines: true, skipComments: true }],
      "@typescript-eslint/consistent-type-imports": "error",
    },
  },
  {
    files: ["apps/web/src/**/*.tsx"],
    languageOptions: { globals: { ...globals.browser } },
    plugins: { i18next },
    rules: {
      "i18next/no-literal-string": [
        "error",
        { mode: "jsx-only", "jsx-attributes": { exclude: technicalAttributes } },
      ],
    },
  },
  {
    files: ["apps/api/src/**/*.ts", "apps/mcp/src/**/*.ts", "packages/*/src/**/*.ts"],
    ignores: ["**/*.test.ts"],
    rules: { "no-restricted-syntax": ["error", userMessageRule] },
  },
  {
    files: ["**/*.test.ts", "**/*.test.tsx"],
    rules: { "max-lines-per-function": "off", "i18next/no-literal-string": "off" },
  },
  { files: ["**/*.js"], ...tseslint.configs.disableTypeChecked },
);
