import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { afterAll, describe, expect, it } from "vitest";
import { discoverProviders } from "./discover.js";
import { providers } from "./index.js";

const root = mkdtempSync(join(tmpdir(), "operators-"));

function operator(folder: string, rank: number, id = folder, base = root): void {
  mkdirSync(join(base, folder));
  const adapter = { rank, identity: { id }, endpoints: [], scenarios: {}, webhooks: {} };
  writeFileSync(
    join(base, folder, "index.js"),
    `export const ${folder} = ${JSON.stringify(adapter)};\nexport const helper = 1;\n`,
  );
}

afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});

describe("discoverProviders", () => {
  it("registers every operator folder, in rank order, without touching the core", async () => {
    operator("zeta", 1);
    operator("acme", 2);
    mkdirSync(join(root, "notes"));
    writeFileSync(join(root, "testing.js"), "export const loose = 1;\n");
    const found = await discoverProviders(pathToFileURL(`${root}/`));
    expect(found.map((adapter) => adapter.identity.id)).toEqual(["zeta", "acme"]);
  });

  it("keeps the documented order for the real operators", async () => {
    const found = await discoverProviders(new URL("./", import.meta.url));
    const ids = ["wave", "pi-spi", "paydunya", "cinetpay"];
    expect(found.map((adapter) => adapter.identity.id)).toEqual(ids);
    expect(providers.map((adapter) => adapter.identity.id)).toEqual(ids);
  });

  it("refuses two folders that declare the same operator, such as a stale build output", async () => {
    const stale = mkdtempSync(join(tmpdir(), "operators-stale-"));
    operator("pispi", 2, "pi-spi", stale);
    operator("pi_spi", 2, "pi-spi", stale);
    await expect(discoverProviders(pathToFileURL(`${stale}/`))).rejects.toThrow(/pi-spi/);
    rmSync(stale, { recursive: true, force: true });
  });
});
