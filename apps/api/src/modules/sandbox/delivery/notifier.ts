import { sql } from "drizzle-orm";
import type { Database } from "../../../db/client.js";
import type { Notifier } from "./worker.js";

/** NOTIFY reaches every API instance listening on the channel, whichever one holds the client. */
export function postgresNotifier(db: Database): Notifier {
  return {
    async notify(channel, payload) {
      await db.execute(sql`select pg_notify(${channel}, ${payload})`);
    },
  };
}
