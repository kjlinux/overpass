import { and, desc, eq, gt, isNull } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import type { Database } from "../../../db/client.js";
import type { NewToken, TokenRecord } from "../model.js";
import { apiTokens } from "../tables.js";

const summaryColumns = {
  id: apiTokens.id,
  userId: apiTokens.userId,
  name: apiTokens.name,
  usage: apiTokens.usage,
  createdAt: apiTokens.createdAt,
  lastUsedAt: apiTokens.lastUsedAt,
  expiresAt: apiTokens.expiresAt,
};

/** Neither revoked nor past its expiry at this instant. */
const usableAt = (at: Date): SQL | undefined =>
  and(isNull(apiTokens.revokedAt), gt(apiTokens.expiresAt, at));

async function revokeWhere(db: Database, condition: SQL | undefined, at: Date) {
  return db
    .update(apiTokens)
    .set({ revokedAt: at })
    .where(and(condition, isNull(apiTokens.revokedAt)))
    .returning({ id: apiTokens.id });
}

export function tokenQueries(db: Database) {
  return {
    createToken: async (token: NewToken): Promise<TokenRecord> => {
      const [row] = await db.insert(apiTokens).values(token).returning(summaryColumns);
      if (row === undefined) throw new Error("insert returned no row");
      return row;
    },

    listActiveTokens: (userId: string, now: Date): Promise<TokenRecord[]> =>
      db
        .select(summaryColumns)
        .from(apiTokens)
        .where(and(eq(apiTokens.userId, userId), usableAt(now)))
        .orderBy(desc(apiTokens.createdAt)),

    revokeToken: async (userId: string, tokenId: string, at: Date): Promise<boolean> => {
      const owned = and(eq(apiTokens.id, tokenId), eq(apiTokens.userId, userId));
      return (await revokeWhere(db, owned, at)).length === 1;
    },

    revokeAllTokens: async (userId: string, at: Date): Promise<void> => {
      await revokeWhere(db, eq(apiTokens.userId, userId), at);
    },

    /** Marks the token as used and returns its owner id in one statement. */
    touchActiveToken: async (tokenHash: string, usedAt: Date): Promise<string | null> => {
      const [row] = await db
        .update(apiTokens)
        .set({ lastUsedAt: usedAt })
        .where(and(eq(apiTokens.tokenHash, tokenHash), usableAt(usedAt)))
        .returning({ userId: apiTokens.userId });
      return row?.userId ?? null;
    },
  };
}
