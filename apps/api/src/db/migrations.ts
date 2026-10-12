import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

/** The two operations the runner needs, so it works on node-postgres and PGlite alike. */
export type SqlExecutor = {
  exec(sql: string): Promise<void>;
  query<Row>(sql: string, params?: unknown[]): Promise<Row[]>;
};

export const migrationsDirectory = fileURLToPath(new URL("../../migrations", import.meta.url));

const versionPattern = /^\d{4}_[a-z0-9_]+$/;

async function listVersions(directory: string): Promise<string[]> {
  const files = await readdir(directory);
  return files
    .filter((file) => file.endsWith(".up.sql"))
    .map((file) => file.slice(0, -".up.sql".length))
    .filter((version) => versionPattern.test(version))
    .sort();
}

async function appliedVersions(executor: SqlExecutor): Promise<string[]> {
  await executor.exec(
    "create table if not exists schema_migrations (version text primary key, applied_at timestamptz not null default now())",
  );
  const rows = await executor.query<{ version: string }>(
    "select version from schema_migrations order by version",
  );
  return rows.map((row) => row.version);
}

async function readScript(directory: string, version: string, direction: "up" | "down") {
  return readFile(`${directory}/${version}.${direction}.sql`, "utf8");
}

/** Applies every pending migration in order; each runs as one implicit transaction. */
export async function migrateUp(executor: SqlExecutor, directory: string): Promise<string[]> {
  const applied = new Set(await appliedVersions(executor));
  const pending = (await listVersions(directory)).filter((version) => !applied.has(version));
  for (const version of pending) {
    const script = await readScript(directory, version, "up");
    await executor.exec(`${script};\ninsert into schema_migrations (version) values ('${version}');`);
  }
  return pending;
}

/** Reverts the most recent migrations, one step by default. */
export async function migrateDown(
  executor: SqlExecutor,
  directory: string,
  steps = 1,
): Promise<string[]> {
  const reverted = (await appliedVersions(executor)).reverse().slice(0, steps);
  for (const version of reverted) {
    if (!versionPattern.test(version)) throw new Error(`Unexpected version ${version}`);
    const script = await readScript(directory, version, "down");
    await executor.exec(`${script};\ndelete from schema_migrations where version = '${version}';`);
  }
  return reverted;
}
