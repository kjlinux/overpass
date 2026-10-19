import { asc, eq, inArray, sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import type { Database } from "../../../db/client.js";
import { UniqueViolation } from "../model.js";
import type { NewUser, UserPatch, UserRecord } from "../model.js";
import { users, userStacks } from "../tables.js";

type UserRow = typeof users.$inferSelect;

const uniqueConstraints: Record<string, UniqueViolation["field"]> = {
  users_email_key: "email",
  users_handle_key: "handle",
};

/** Maps a PostgreSQL unique violation, wrapped or not by Drizzle, to UniqueViolation. */
export function asUniqueViolation(error: unknown): unknown {
  const candidates = [error, (error as { cause?: unknown } | null)?.cause];
  for (const candidate of candidates) {
    const { code, constraint } = (candidate ?? {}) as { code?: string; constraint?: string };
    const field = constraint === undefined ? undefined : uniqueConstraints[constraint];
    if (code === "23505" && field !== undefined) return new UniqueViolation(field);
  }
  return error;
}

function toRecord(row: UserRow, stacks: string[]): UserRecord {
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.passwordHash,
    handle: row.handle,
    country: row.country,
    language: row.language,
    role: row.role,
    sessionVersion: row.sessionVersion,
    newsletterConsentAt: row.newsletterConsentAt,
    suspendedAt: row.suspendedAt,
    createdAt: row.createdAt,
    stacks,
  };
}

function userReads(db: Database) {
  const withStacks = async (rows: UserRow[]): Promise<UserRecord[]> => {
    if (rows.length === 0) return [];
    const ids = rows.map((row) => row.id);
    const stackRows = await db
      .select()
      .from(userStacks)
      .where(inArray(userStacks.userId, ids))
      .orderBy(asc(userStacks.stack));
    const stacksOf = (id: string) => stackRows.filter((s) => s.userId === id).map((s) => s.stack);
    return rows.map((row) => toRecord(row, stacksOf(row.id)));
  };
  const findOne = async (where: SQL) => {
    const [user] = await withStacks(await db.select().from(users).where(where).limit(1));
    return user ?? null;
  };
  return {
    findUserById: (id: string) => findOne(eq(users.id, id)),
    findUserByEmail: (email: string) => findOne(eq(users.email, email)),
    findUserByHandle: (handle: string) => findOne(eq(users.handle, handle)),
  };
}

async function writePatch(db: Database, id: string, patch: UserPatch): Promise<void> {
  const { stacks, ...fields } = patch;
  const defined = Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined));
  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({ ...defined, updatedAt: new Date() })
      .where(eq(users.id, id));
    if (stacks === undefined) return;
    await tx.delete(userStacks).where(eq(userStacks.userId, id));
    if (stacks.length > 0) {
      await tx.insert(userStacks).values(stacks.map((stack) => ({ userId: id, stack })));
    }
  });
}

export function userQueries(db: Database) {
  const reads = userReads(db);
  return {
    ...reads,
    createUser: async (input: NewUser): Promise<UserRecord> => {
      const [row] = await db
        .insert(users)
        .values(input)
        .returning()
        .catch((error: unknown) => {
          throw asUniqueViolation(error);
        });
      if (row === undefined) throw new Error("insert returned no row");
      return toRecord(row, []);
    },
    updateUser: async (id: string, patch: UserPatch): Promise<UserRecord> => {
      await writePatch(db, id, patch).catch((error: unknown) => {
        throw asUniqueViolation(error);
      });
      const user = await reads.findUserById(id);
      if (user === null) throw new Error("updated user vanished");
      return user;
    },
    rotateCredentials: async (id: string, change: { passwordHash?: string }) => {
      await db
        .update(users)
        .set({ ...change, sessionVersion: sql`${users.sessionVersion} + 1`, updatedAt: new Date() })
        .where(eq(users.id, id));
      const user = await reads.findUserById(id);
      if (user === null) throw new Error("rotated user vanished");
      return user;
    },
    deleteUser: async (id: string) => {
      await db.delete(users).where(eq(users.id, id));
    },
  };
}
