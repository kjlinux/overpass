import { buildApp } from "./app.js";
import { loadConfig } from "./config.js";
import { connectOrFallbackDatabase } from "./db/client.js";

const config = loadConfig();
const database = await connectOrFallbackDatabase(config.DATABASE_URL, config.NODE_ENV);
const app = await buildApp({ config, db: database.db });
app.addHook("onClose", () => database.close());

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => void app.close());
}

await app.listen({ host: config.API_HOST, port: config.API_PORT });
