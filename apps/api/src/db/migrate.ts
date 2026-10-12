import { z } from "zod";
import { connectDatabase } from "./client.js";
import { migrateDown, migrateUp, migrationsDirectory } from "./migrations.js";

const direction = z.enum(["up", "down"]).parse(process.argv[2] ?? "up");
const url = z.url().parse(process.env["DATABASE_URL"]);
const connection = connectDatabase(url);

try {
  const versions =
    direction === "up"
      ? await migrateUp(connection.executor, migrationsDirectory)
      : await migrateDown(connection.executor, migrationsDirectory);
  process.stdout.write(`${direction}: ${versions.length === 0 ? "nothing to do" : versions.join(", ")}\n`);
} finally {
  await connection.close();
}
