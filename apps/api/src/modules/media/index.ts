import type { FastifyInstance } from "fastify";
import type { Database } from "../../db/client.js";
import type { AccountResolver } from "../accounts/index.js";
import { storableImage } from "./detect.js";
import { createMediaRepository } from "./repository.js";
import { registerMediaRoutes } from "./routes.js";
import { createMediaService } from "./service.js";

export type MediaOptions = { db: Database; resolveAccount: AccountResolver };

/** Mounts the image store in its own scope, so its raw body parsers stay local. */
export async function registerMedia(app: FastifyInstance, options: MediaOptions): Promise<void> {
  const service = createMediaService(createMediaRepository(options.db));
  await app.register((scope) => {
    registerMediaRoutes(scope, service, options.resolveAccount);
    return Promise.resolve();
  });
}

/** Whether an image belongs to an account, for modules that attach one, such as a post cover. */
export function mediaOwnership(db: Database): (id: string, ownerId: string) => Promise<boolean> {
  const repository = createMediaRepository(db);
  return (id, ownerId) => repository.ownedBy(id, ownerId);
}

/** Stores an image the server already holds, such as a seeded cover, under its owner. */
export function mediaStore(db: Database): (ownerId: string, bytes: Buffer) => Promise<string> {
  const repository = createMediaRepository(db);
  return (ownerId, bytes) => {
    const mime = storableImage(bytes);
    if (mime === null) return Promise.reject(new Error("not a storable image"));
    return repository.insert(ownerId, mime, bytes);
  };
}

export { storableImage } from "./detect.js";
export { mediaUrl } from "./service.js";
