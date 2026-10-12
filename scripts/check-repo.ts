import { readFileSync } from "node:fs";
import { findDeepImports } from "./checks/deep-imports.ts";
import { findEmDashes } from "./checks/em-dash.ts";
import { checkFileShape } from "./checks/file-shape.ts";
import { auditLicenses } from "./checks/licenses.ts";
import { isCodeFile, listRepoFiles } from "./checks/repo-files.ts";

const errors: string[] = [];
for (const file of listRepoFiles()) {
  const content = readFileSync(file, "utf8");
  errors.push(...findEmDashes(file, content));
  if (isCodeFile(file)) {
    errors.push(...checkFileShape(file, content));
  }
  if (isCodeFile(file) && /^(apps|packages)\//.test(file)) {
    errors.push(...findDeepImports(file, content));
  }
}
errors.push(...auditLicenses(false));

for (const error of errors) console.error(error);
if (errors.length > 0) process.exitCode = 1;
else console.log("Repository checks passed.");
