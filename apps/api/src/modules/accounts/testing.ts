import { randomUUID } from "node:crypto";
import type { Language, RegisterInput } from "@overpass/shared";
import type { MailMessage } from "../../mail/mailer.js";
export { captureMailer } from "../../mail/testing.js";
import { UniqueViolation } from "./model.js";
import type { AccountsRepository, TokenRecord, UserRecord } from "./model.js";
import type { AccountsService } from "./service.js";

const defaults = {
  ...{ role: "member", sessionVersion: 0, newsletterConsentAt: null, suspendedAt: null },
  stacks: [],
};

type StoredToken = TokenRecord & { tokenHash: string; revokedAt: Date | null };
type UserPart = Pick<
  AccountsRepository,
  | "createUser"
  | "findUserById"
  | "findUserByEmail"
  | "findUserByHandle"
  | "updateUser"
  | "deleteUser"
>;

/** Runs synchronous code as a promise, so a throw becomes a rejection like in SQL. */
const settle = <T>(run: () => T): Promise<T> =>
  new Promise<T>((resolve) => {
    resolve(run());
  });

function clash(
  users: Map<string, UserRecord>,
  field: "email" | "handle",
  value: string,
  id?: string,
) {
  for (const user of users.values()) {
    if (user[field] === value && user.id !== id) throw new UniqueViolation(field);
  }
}

function memoryUsers(users: Map<string, UserRecord>, tokens: Map<string, StoredToken>): UserPart {
  const find = (test: (user: UserRecord) => boolean) =>
    settle(() => [...users.values()].find(test) ?? null);
  return {
    createUser: (input) =>
      settle(() => {
        clash(users, "email", input.email);
        clash(users, "handle", input.handle);
        const user: UserRecord = {
          ...input,
          ...defaults,
          id: randomUUID(),
          createdAt: new Date(),
        } as UserRecord;
        users.set(user.id, user);
        return user;
      }),
    findUserById: (id) => find((user) => user.id === id),
    findUserByEmail: (email) => find((user) => user.email === email),
    findUserByHandle: (handle) => find((user) => user.handle === handle),
    updateUser: (id, patch) =>
      settle(() => {
        const current = users.get(id);
        if (current === undefined) throw new Error("missing user");
        if (patch.handle !== undefined) clash(users, "handle", patch.handle, id);
        const defined = Object.entries(patch).filter(([, value]) => value !== undefined);
        const next: UserRecord = { ...current, ...Object.fromEntries(defined) };
        users.set(id, { ...next, stacks: [...next.stacks].sort() });
        return users.get(id) as UserRecord;
      }),
    deleteUser: (id) =>
      settle(() => {
        users.delete(id);
        for (const [key, token] of tokens) if (token.userId === id) tokens.delete(key);
      }),
  };
}

function memoryCredentials(users: Map<string, UserRecord>) {
  return {
    rotateCredentials: (id, change) =>
      settle(() => {
        const current = users.get(id);
        if (current === undefined) throw new Error("missing user");
        const next = { ...current, ...change, sessionVersion: current.sessionVersion + 1 };
        users.set(id, next);
        return next;
      }),
  } satisfies Pick<AccountsRepository, "rotateCredentials">;
}

function memoryTokens(users: Map<string, UserRecord>, tokens: Map<string, StoredToken>) {
  const active = (test: (token: StoredToken) => boolean) =>
    [...tokens.values()].filter((token) => token.revokedAt === null && test(token));
  return {
    createToken: ({ tokenHash, ...input }) =>
      settle(() => {
        const token = { ...input, id: randomUUID(), createdAt: new Date(), lastUsedAt: null };
        tokens.set(token.id, { ...token, tokenHash, revokedAt: null });
        return token;
      }),
    listActiveTokens: (userId, now) =>
      settle(() =>
        active((token) => token.userId === userId && token.expiresAt > now).map(
          ({ id, userId: owner, name, usage, createdAt, lastUsedAt, expiresAt }) => ({
            ...{ id, userId: owner, name, usage, createdAt, lastUsedAt, expiresAt },
          }),
        ),
      ),
    revokeToken: (userId, tokenId, at) =>
      settle(() => {
        const [token] = active((t) => t.id === tokenId && t.userId === userId);
        if (token !== undefined) tokens.set(tokenId, { ...token, revokedAt: at });
        return token !== undefined;
      }),
    revokeAllTokens: (userId, at) =>
      settle(() => {
        for (const token of active((t) => t.userId === userId)) {
          tokens.set(token.id, { ...token, revokedAt: at });
        }
      }),
    findUserByActiveTokenHash: (hash, usedAt) =>
      settle(() => {
        const [token] = active((t) => t.tokenHash === hash && t.expiresAt > usedAt);
        if (token === undefined) return null;
        tokens.set(token.id, { ...token, lastUsedAt: usedAt });
        return users.get(token.userId) ?? null;
      }),
  } satisfies Omit<AccountsRepository, keyof UserPart | "rotateCredentials">;
}

/** In-memory repository with the same unique rules and ordering as the SQL schema. */
export function memoryRepository(): AccountsRepository {
  const users = new Map<string, UserRecord>();
  const tokens = new Map<string, StoredToken>();
  return {
    ...memoryUsers(users, tokens),
    ...memoryCredentials(users),
    ...memoryTokens(users, tokens),
  };
}

export const testSecret = "test-secret-with-at-least-32-characters!";

/** The token carried in the fragment of the link of a mail. */
export function linkToken(text: string): string {
  const token = /#token=([\w.-]+)/.exec(text)?.[1];
  if (token === undefined) throw new Error("no token in mail");
  return token;
}

/** Signs up through the confirmation e-mail, as a member would. */
export async function signUp(
  service: AccountsService,
  mailer: { sent: MailMessage[] },
  input: RegisterInput,
  language: Language = "fr",
) {
  await service.register(input, language);
  return service.confirmSignUp(linkToken(mailer.sent.at(-1)?.text ?? ""));
}
