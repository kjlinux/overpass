import { sql } from "drizzle-orm";
import type { Database } from "../../../db/client.js";
import type { SubscriberRow, SubscribersPart } from "../model.js";
import { at, rows, toDate, toDateOrNull } from "./sql.js";

type RawSubscriber = Omit<SubscriberRow, "confirmedAt" | "unsubscribedAt" | "updatedAt"> & {
  confirmedAt: Date | string | null;
  unsubscribedAt: Date | string | null;
  updatedAt: Date | string;
};

const columns = sql`id, email, language, confirm_token_hash as "confirmTokenHash",
  confirmed_at as "confirmedAt", unsubscribed_at as "unsubscribedAt", updated_at as "updatedAt"`;

const toSubscriber = (raw: RawSubscriber): SubscriberRow => ({
  ...raw,
  confirmedAt: toDateOrNull(raw.confirmedAt),
  unsubscribedAt: toDateOrNull(raw.unsubscribedAt),
  updatedAt: toDate(raw.updatedAt),
});

async function one(db: Database, where: ReturnType<typeof sql>) {
  const [raw] = await rows<RawSubscriber>(
    db,
    sql`select ${columns} from newsletter_subscribers where ${where}`,
  );
  return raw === undefined ? null : toSubscriber(raw);
}

export function subscriberQueries(db: Database): SubscribersPart {
  return {
    subscriberByEmail: (email) => one(db, sql`email = ${email}`),
    subscriberById: (id) => one(db, sql`id = ${id}`),
    insertSubscriber: async (email, link) => {
      const inserted = await rows(
        db,
        sql`insert into newsletter_subscribers
            (email, language, confirm_token_hash, confirm_expires_at, created_at, updated_at)
          values (${email}, ${link.language}, ${link.tokenHash}, ${at(link.expiresAt)},
            ${at(link.at)}, ${at(link.at)})
          on conflict (email) do nothing returning id`,
      );
      return inserted.length > 0;
    },
    refreshSubscriber: async (id, link) => {
      await db.execute(sql`update newsletter_subscribers set language = ${link.language},
          confirm_token_hash = ${link.tokenHash}, confirm_expires_at = ${at(link.expiresAt)},
          confirmed_at = null, unsubscribed_at = null, updated_at = ${at(link.at)}
        where id = ${id}`);
    },
    confirm: async (tokenHash, now) => {
      const [row] = await rows<Pick<SubscriberRow, "language">>(
        db,
        sql`update newsletter_subscribers set confirmed_at = ${at(now)}, confirm_token_hash = null,
            confirm_expires_at = null, updated_at = ${at(now)}
          where confirm_token_hash = ${tokenHash} and confirm_expires_at > ${at(now)}
          returning language`,
      );
      return row?.language ?? null;
    },
    unsubscribe: async (id, when) => {
      await db.execute(sql`update newsletter_subscribers
        set unsubscribed_at = ${at(when)}, updated_at = ${at(when)}
        where id = ${id} and unsubscribed_at is null`);
    },
  };
}
