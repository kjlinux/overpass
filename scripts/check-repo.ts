import { readFileSync } from "node:fs";
import { supportedLanguages } from "../packages/shared/src/i18n/languages.ts";
import { findDeepImports } from "./checks/deep-imports.ts";
import { findEmDashes } from "./checks/em-dash.ts";
import { checkFileShape } from "./checks/file-shape.ts";
import { auditLicenses } from "./checks/licenses.ts";
import { checkLocaleFolders, findLocaleImports } from "./checks/locales.ts";
import { isCodeFile, listRepoFiles } from "./checks/repo-files.ts";

const files = listRepoFiles();
const errors: string[] = [];
for (const file of files) {
  const content = readFileSync(file, "utf8");
  errors.push(...findEmDashes(file, content));
  errors.push(...findLocaleImports(file, content));
  if (isCodeFile(file)) {
    errors.push(...checkFileShape(file, content));
  }
  if (isCodeFile(file) && /^(apps|packages)\//.test(file)) {
    errors.push(...findDeepImports(file, content));
  }
}
const readJson = (file: string): unknown => JSON.parse(readFileSync(file, "utf8"));
errors.push(...checkLocaleFolders(files, readJson, supportedLanguages));
errors.push(...auditLicenses(false));

for (const error of errors) console.error(error);
if (errors.length > 0) process.exitCode = 1;
else console.log("Repository checks passed.");
