import { sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import type { Database } from "../../db/client.js";
import type { ImageType } from "./detect.js";

export type StoredMedia = { mime: ImageType; bytes: Buffer };

/** Storage port of the module; the service never sees SQL. */
export type MediaRepository = {
  insert(ownerId: string, mime: ImageType, bytes: Buffer): Promise<string>;
  find(id: string): Promise<StoredMedia | null>;
  ownedBy(id: string, ownerId: string): Promise<boolean>;
};

async function rows<Row>(db: Database, query: SQL): Promise<Row[]> {
  const result: unknown = await db.execute(query);
  return (result as { rows: Row[] }).rows;
}

export function createMediaRepository(db: Database): MediaRepository {
  return {
    insert: async (ownerId, mime, bytes) => {
      const [row] = await rows<{ id: string }>(
        db,
        sql`insert into media (owner_id, mime, bytes, size)
          values (${ownerId}, ${mime}, ${bytes}, ${bytes.length}) returning id`,
      );
      if (row === undefined) throw new Error("media insert returned no row");
      return row.id;
    },
    find: async (id) => {
      const [row] = await rows<{ mime: ImageType; bytes: Uint8Array }>(
        db,
        sql`select mime, bytes from media where id = ${id}`,
      );
      return row === undefined ? null : { mime: row.mime, bytes: Buffer.from(row.bytes) };
    },
    ownedBy: async (id, ownerId) => {
      const found = await rows<{ id: string }>(
        db,
        sql`select id from media where id = ${id} and owner_id = ${ownerId}`,
      );
      return found.length > 0;
    },
  };
}
