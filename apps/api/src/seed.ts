import { z } from "zod";
import { connectDatabase } from "./db/client.js";
import { migrateUp, migrationsDirectory } from "./db/migrations.js";
import { ensureAdmin } from "./modules/accounts/index.js";
import { writeRouteTemplates } from "./route-templates.js";
import { seedContent } from "./seed-content.js";

const argument = (name: string): string | undefined => {
  const at = process.argv.indexOf(name);
  return at === -1 ? undefined : process.argv[at + 1];
};

const url = z.url().parse(process.env["DATABASE_URL"]);
const email = z.email().parse(argument("--admin-email"));
const country = z
  .string()
  .length(2)
  .parse(argument("--country") ?? "CI");
// Only needed to create the admin account; read from the environment, never from the history.
const password = z.string().min(1).optional().parse(process.env["SEED_ADMIN_PASSWORD"]);
const templatesDir = argument("--templates-dir") ?? "route-templates";
// The team's itineraries, welcome threads and articles; nothing is written without this flag.
const contentDir = argument("--content-dir");
const connection = connectDatabase(url);

async function adminHandle(): Promise<string> {
  const [row] = await connection.executor.query<{ handle: string }>(
    "select handle from users where email = $1",
    [email],
  );
  if (row === undefined) throw new Error("admin account not found after seeding");
  return row.handle;
}

try {
  const applied = await migrateUp(connection.executor, migrationsDirectory);
  const admin = await ensureAdmin(connection.db, { email, password, country });
  const templates = writeRouteTemplates(templatesDir);
  const content =
    contentDir === undefined
      ? "skipped"
      : JSON.stringify(
          await seedContent(connection.db, await adminHandle(), contentDir, () => new Date()),
        );
  const [counts] = await connection.executor.query<Record<string, number>>(
    `select (select count(*)::int from topics) as topics,
      (select count(*)::int from services) as services,
      (select count(*)::int from service_countries) as countries`,
  );
  process.stdout.write(
    `migrations applied: ${String(applied.length)}\nadmin account: ${admin}\nroute templates written to ${templatesDir}: ${String(templates)}\ncontent: ${content}\n${JSON.stringify(counts)}\n`,
  );
} finally {
  await connection.close();
}
