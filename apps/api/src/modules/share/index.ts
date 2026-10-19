import type { FastifyInstance } from "fastify";
import type { AppConfig } from "../../app.js";
import type { Database } from "../../db/client.js";
import { createShareRepository } from "./repository.js";
import { registerShareRoutes } from "./routes.js";
import { createShareService, loadShellFiles } from "./service.js";

export type ShareOptions = {
  db: Database;
  config: Pick<AppConfig, "WEB_ORIGIN" | "WEB_DIST_DIR">;
  now: () => Date;
};

/** Content pages with their own share tags; not mounted without a web build to serve. */
export async function registerShare(app: FastifyInstance, options: ShareOptions): Promise<void> {
  const distDir = options.config.WEB_DIST_DIR;
  if (distDir === undefined) return;
  const service = createShareService({
    repository: createShareRepository(options.db),
    files: loadShellFiles(distDir),
    origin: new URL(options.config.WEB_ORIGIN).origin,
    now: options.now,
    onError: (error) => {
      app.log.error({ err: error }, "share page fell back to the generic tags");
    },
  });
  await app.register((scope) => {
    registerShareRoutes(scope, service);
    return Promise.resolve();
  });
}
