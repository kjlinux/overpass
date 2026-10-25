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

/** Rankings show the top hundred: members left by earlier runs must not push new ones out. */
export function forgetPastMembers(): Promise<void> {
  return run("delete from users where email like 'e2e-%@example.com'");
}

/** Lets a fresh member write a post; the cache entry holds until their next contribution. */
export function confirmMember(name: string): Promise<void> {
  return run(
    `insert into member_points (user_id, routes, points)
      select id, 2, 20 from users where email = $1
      on conflict (user_id) do update set routes = 2, points = 20`,
    [`e2e-${name}@example.com`],
  );
}
