import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const compose = readFileSync("docker-compose.yml", "utf8");
const example = readFileSync(".env.example", "utf8");
const hasDocker = spawnSync("docker", ["compose", "version"]).status === 0;

describe("database password", () => {
  it("has no default in docker-compose.yml and is required instead", () => {
    expect(compose).not.toMatch(/POSTGRES_PASSWORD:-/);
    expect(compose).toMatch(/POSTGRES_PASSWORD: \$\{POSTGRES_PASSWORD:\?/);
  });

  it("is left blank in .env.example, so nobody runs on a published password", () => {
    expect(example).toMatch(/^POSTGRES_PASSWORD=$/m);
    expect(example).not.toMatch(/postgres:\/\/[^:]+:overpass@/);
  });

  it.runIf(hasDocker)("makes docker compose refuse to start without the variable", () => {
    const empty = join(mkdtempSync(join(tmpdir(), "overpass-env-")), "empty.env");
    writeFileSync(empty, "");
    const run = spawnSync("docker", ["compose", "--env-file", empty, "config"], {
      env: { ...process.env, POSTGRES_PASSWORD: "" },
      encoding: "utf8",
    });
    expect(run.status).not.toBe(0);
    expect(run.stderr).toContain("POSTGRES_PASSWORD");
  });
});
