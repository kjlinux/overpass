import { and, desc, eq, isNull } from "drizzle-orm";
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
};

export function tokenQueries(db: Database) {
  return {
    createToken: async (token: NewToken): Promise<TokenRecord> => {
      const [row] = await db.insert(apiTokens).values(token).returning(summaryColumns);
      if (row === undefined) throw new Error("insert returned no row");
      return row;
    },

    listActiveTokens: (userId: string): Promise<TokenRecord[]> =>
      db
        .select(summaryColumns)
        .from(apiTokens)
        .where(and(eq(apiTokens.userId, userId), isNull(apiTokens.revokedAt)))
        .orderBy(desc(apiTokens.createdAt)),

    revokeToken: async (userId: string, tokenId: string, at: Date): Promise<boolean> => {
      const rows = await db
        .update(apiTokens)
        .set({ revokedAt: at })
        .where(
          and(eq(apiTokens.id, tokenId), eq(apiTokens.userId, userId), isNull(apiTokens.revokedAt)),
        )
        .returning({ id: apiTokens.id });
      return rows.length === 1;
    },

    revokeAllTokens: async (userId: string, at: Date): Promise<void> => {
      await db
        .update(apiTokens)
        .set({ revokedAt: at })
        .where(and(eq(apiTokens.userId, userId), isNull(apiTokens.revokedAt)));
    },

    /** Marks the token as used and returns its owner id in one statement. */
    touchActiveToken: async (tokenHash: string, usedAt: Date): Promise<string | null> => {
      const [row] = await db
        .update(apiTokens)
        .set({ lastUsedAt: usedAt })
        .where(and(eq(apiTokens.tokenHash, tokenHash), isNull(apiTokens.revokedAt)))
        .returning({ userId: apiTokens.userId });
      return row?.userId ?? null;
    },
  };
}
