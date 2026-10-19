import pg from "pg";
import { databaseUrl } from "./paths.js";

async function run(sql: string, params: unknown[] = []): Promise<void> {
  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    await client.query(sql, params);
  } finally {
    await client.end();
  }
}

/** Gives a test member the admin role, as an operator would with SQL; there is no UI for it. */
export function promoteAdmin(name: string): Promise<void> {
  return run("update users set role = 'admin' where email = $1", [`e2e-${name}@example.com`]);
}

/** Every test signs members up from one address; the throwaway database forgets past sign-ups. */
export function resetRateLimits(): Promise<void> {
  return run("delete from rate_limit_counters");
}
