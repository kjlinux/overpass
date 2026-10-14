import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { providers } from "@overpass/providers";
import { supportedLanguages } from "@overpass/shared";
import { buildSandboxOpenApi, openApiFile } from "./modules/sandbox/index.js";

for (const language of supportedLanguages) {
  const file = openApiFile(language);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(buildSandboxOpenApi(providers, language), null, 2)}\n`);
  process.stdout.write(`${file}\n`);
}
