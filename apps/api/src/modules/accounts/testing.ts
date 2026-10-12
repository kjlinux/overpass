import { randomUUID } from "node:crypto";
import type { MailMessage, Mailer } from "../../mail/mailer.js";
import { UniqueViolation } from "./model.js";
import type { AccountsRepository, TokenRecord, UserRecord } from "./model.js";

type StoredToken = TokenRecord & { tokenHash: string; revokedAt: Date | null };

/** In-memory repository with the same unique rules as the SQL schema. */
export function memoryRepository(): AccountsRepository & { users: Map<string, UserRecord> } {
  const users = new Map<string, UserRecord>();
  const tokens = new Map<string, StoredToken>();
  const clash = (field: "email" | "handle", value: string, id?: string) => {
    for (const user of users.values()) {
      if (user[field] === value && user.id !== id) throw new UniqueViolation(field);
    }
  };
  const find = (test: (user: UserRecord) => boolean) =>
    Promise.resolve([...users.values()].find(test) ?? null);
  return {
    users,
    createUser: (input) => {
      clash("email", input.email);
      clash("handle", input.handle);
      const user: UserRecord = {
        ...input,
        id: randomUUID(),
        role: "member",
        sessionVersion: 0,
        newsletterConsentAt: null,
        createdAt: new Date(),
        stacks: [],
      };
      users.set(user.id, user);
      return Promise.resolve(user);
    },
    findUserById: (id) => Promise.resolve(users.get(id) ?? null),
    findUserByEmail: (email) => find((user) => user.email === email),
    findUserByHandle: (handle) => find((user) => user.handle === handle),
    updateUser: (id, patch) => {
      const current = users.get(id);
      if (current === undefined) throw new Error("missing user");
      if (patch.handle !== undefined) clash("handle", patch.handle, id);
      const next = { ...current, ...patch };
      users.set(id, next);
      return Promise.resolve(next);
    },
    deleteUser: (id) => {
      users.delete(id);
      for (const [key, token] of tokens) if (token.userId === id) tokens.delete(key);
      return Promise.resolve();
    },
    createToken: ({ tokenHash, ...input }) => {
      const token: StoredToken = {
        ...input,
        id: randomUUID(),
        createdAt: new Date(),
        lastUsedAt: null,
        tokenHash,
        revokedAt: null,
      };
      tokens.set(token.id, token);
      return Promise.resolve(token);
    },
    listActiveTokens: (userId) =>
      Promise.resolve(
        [...tokens.values()].filter((t) => t.userId === userId && t.revokedAt === null),
      ),
    revokeToken: (userId, tokenId, at) => {
      const token = tokens.get(tokenId);
      if (token?.userId !== userId || token.revokedAt !== null) return Promise.resolve(false);
      tokens.set(tokenId, { ...token, revokedAt: at });
      return Promise.resolve(true);
    },
    findUserByActiveTokenHash: (hash, usedAt) => {
      const token = [...tokens.values()].find((t) => t.tokenHash === hash && t.revokedAt === null);
      if (token === undefined) return Promise.resolve(null);
      tokens.set(token.id, { ...token, lastUsedAt: usedAt });
      return Promise.resolve(users.get(token.userId) ?? null);
    },
  };
}

/** Mailer that keeps every message for assertions. */
export function captureMailer(): Mailer & { sent: MailMessage[] } {
  const sent: MailMessage[] = [];
  return {
    sent,
    send: (message) => {
      sent.push(message);
      return Promise.resolve();
    },
  };
}

export const testSecret = "test-secret-with-at-least-32-characters!";
