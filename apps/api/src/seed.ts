import { z } from "zod";
import { connectDatabase } from "./db/client.js";
import { migrateUp, migrationsDirectory } from "./db/migrations.js";
import { ensureAdmin } from "./modules/accounts/index.js";
import { writeRouteTemplates } from "./route-templates.js";

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
// Read from the environment only, so the password never lands in the shell history.
const password = z.string().min(1).parse(process.env["SEED_ADMIN_PASSWORD"]);
const templatesDir = argument("--templates-dir") ?? "route-templates";
const connection = connectDatabase(url);

try {
  const applied = await migrateUp(connection.executor, migrationsDirectory);
  const admin = await ensureAdmin(connection.db, { email, password, country });
  const templates = writeRouteTemplates(templatesDir);
  const [counts] = await connection.executor.query<Record<string, number>>(
    `select (select count(*)::int from topics) as topics,
      (select count(*)::int from services) as services,
      (select count(*)::int from service_countries) as countries`,
  );
  process.stdout.write(
    `migrations applied: ${String(applied.length)}\nadmin account: ${admin}\nroute templates written to ${templatesDir}: ${String(templates)}\n${JSON.stringify(counts)}\n`,
  );
} finally {
  await connection.close();
}
