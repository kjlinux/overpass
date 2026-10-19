import { providers } from "@overpass/providers";
import { createSimulator } from "@overpass/simulator";
import { pino } from "pino";
import { loadConfig } from "./config.js";
import { connectDatabase } from "./db/client.js";
import { createMailer } from "./mail/mailer.js";
import { createNewsletterWorker } from "./modules/newsletter/index.js";
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
  log,
});
const loop = startWorkerLoop(worker, defaultLoop, log);
log.info("sandbox webhook worker started");

const newsletter = createNewsletterWorker({
  db: database.db,
  mailer: createMailer(config, log),
  secret: config.SESSION_SECRET,
  webOrigin: config.WEB_ORIGIN,
  now: () => new Date(),
  log,
});
// Reporting no work makes the loop wait between batches, which paces the SMTP server.
const paced = {
  runOnce: async () => {
    try {
      await newsletter.runOnce();
    } catch (error) {
      log.error({ err: error }, "newsletter batch failed");
    }
    return 0;
  },
  purge: newsletter.purge,
};
const newsletterLoop = startWorkerLoop(paced, { pollMs: 5000, purgeMs: 3_600_000 }, log);
log.info("newsletter worker started");

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    void Promise.all([loop.stop(), newsletterLoop.stop()]).then(() => database.close());
  });
}
