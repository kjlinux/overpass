import { providers } from "@overpass/providers";
import { createSimulator } from "@overpass/simulator";
import { pino } from "pino";
import { loadConfig } from "./config.js";
import { connectDatabase } from "./db/client.js";
import {
  createDeliveryWorker,
  defaultLoop,
  postgresNotifier,
  startWorkerLoop,
  systemResolver,
} from "./modules/sandbox/index.js";

const config = loadConfig();
const log = pino({ level: config.LOG_LEVEL });
const database = connectDatabase(config.DATABASE_URL);
const worker = createDeliveryWorker({
  db: database.db,
  simulator: createSimulator(providers),
  serverSecret: config.SESSION_SECRET,
  resolveHost: systemResolver,
  notifier: postgresNotifier(database.db),
  now: () => new Date(),
});
const loop = startWorkerLoop(worker, defaultLoop, log);
log.info("sandbox webhook worker started");

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    void loop.stop().then(() => database.close());
  });
}
