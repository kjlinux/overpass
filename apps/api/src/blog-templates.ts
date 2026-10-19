import { z } from "zod";
import { connectDatabase } from "./db/client.js";
import { seedNewsTemplates } from "./modules/blog/index.js";

const flag = process.argv.indexOf("--admin");
const handle = z
  .string()
  .min(1)
  .parse(flag === -1 ? undefined : process.argv[flag + 1]);
const url = z.url().parse(process.env["DATABASE_URL"]);
const connection = connectDatabase(url);

try {
  const { created } = await seedNewsTemplates(connection.db, handle, new Date());
  process.stdout.write(`news templates created: ${String(created)}\n`);
} finally {
  await connection.close();
}
