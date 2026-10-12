import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTestDatabase } from "../../db/testing.js";
import { UniqueViolation } from "./model.js";
import type { AccountsRepository, NewUser } from "./model.js";
import { createAccountsRepository } from "./repository.js";
import { memoryRepository } from "./testing.js";

type Factory = () => Promise<{ repository: AccountsRepository; close: () => Promise<void> }>;

const factories: [string, Factory][] = [
  [
    "memory",
    () => Promise.resolve({ repository: memoryRepository(), close: () => Promise.resolve() }),
  ],
  [
    "postgres",
    async () => {
      const { db, close } = await createTestDatabase();
      return { repository: createAccountsRepository(db), close };
    },
  ],
];

const awa: NewUser = {
  email: "awa@example.com",
  passwordHash: "$argon2id$hash",
  handle: "dev-aaaaaa",
  country: "CI",
  language: "fr",
};

describe.each(factories)("accounts repository (%s)", (_name, factory) => {
  let repository: AccountsRepository;
  let close: () => Promise<void>;

  beforeEach(async () => {
    ({ repository, close } = await factory());
  });
  afterEach(() => close());

  it("creates a member with no stacks and UTC dates", async () => {
    const user = await repository.createUser(awa);
    expect(user).toMatchObject({ ...awa, role: "member", sessionVersion: 0, stacks: [] });
    expect(user.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(user.createdAt).toBeInstanceOf(Date);
    expect(user.newsletterConsentAt).toBeNull();
  });

  it("names the unique column that clashes", async () => {
    await repository.createUser(awa);
    await expect(repository.createUser({ ...awa, handle: "dev-bbbbbb" })).rejects.toEqual(
      new UniqueViolation("email"),
    );
    await expect(repository.createUser({ ...awa, email: "b@example.com" })).rejects.toEqual(
      new UniqueViolation("handle"),
    );
  });

  it("finds users by id, e-mail and handle", async () => {
    const user = await repository.createUser(awa);
    expect((await repository.findUserById(user.id))?.email).toBe(awa.email);
    expect((await repository.findUserByEmail(awa.email))?.id).toBe(user.id);
    expect((await repository.findUserByHandle(awa.handle))?.id).toBe(user.id);
    expect(await repository.findUserByEmail("nobody@example.com")).toBeNull();
  });

  it("updates given fields only and replaces the stacks, sorted", async () => {
    const user = await repository.createUser(awa);
    await repository.updateUser(user.id, { stacks: ["laravel", "django"] });
    const updated = await repository.updateUser(user.id, { country: "SN", handle: undefined });
    expect(updated).toMatchObject({
      country: "SN",
      handle: awa.handle,
      stacks: ["django", "laravel"],
    });
  });

  it("deletes the user with stacks and tokens", async () => {
    const user = await repository.createUser(awa);
    await repository.updateUser(user.id, { stacks: ["go"] });
    await repository.createToken({ userId: user.id, name: "a", usage: "mcp", tokenHash: "h1" });
    await repository.deleteUser(user.id);
    expect(await repository.findUserById(user.id)).toBeNull();
    expect(await repository.findUserByActiveTokenHash("h1", new Date())).toBeNull();
  });

  it("finds a user by active token hash and records the use", async () => {
    const user = await repository.createUser(awa);
    const token = await repository.createToken({
      userId: user.id,
      name: "a",
      usage: "api",
      tokenHash: "h1",
    });
    const usedAt = new Date("2026-10-12T10:00:00Z");
    expect((await repository.findUserByActiveTokenHash("h1", usedAt))?.id).toBe(user.id);
    const [listed] = await repository.listActiveTokens(user.id);
    expect(listed).toMatchObject({ id: token.id, lastUsedAt: usedAt });
  });

  it("revokes a token once, only for its owner", async () => {
    const user = await repository.createUser(awa);
    const other = await repository.createUser({
      ...awa,
      email: "b@example.com",
      handle: "dev-bbbbbb",
    });
    const token = await repository.createToken({
      userId: user.id,
      name: "a",
      usage: "api",
      tokenHash: "h1",
    });
    expect(await repository.revokeToken(other.id, token.id, new Date())).toBe(false);
    expect(await repository.revokeToken(user.id, token.id, new Date())).toBe(true);
    expect(await repository.revokeToken(user.id, token.id, new Date())).toBe(false);
    expect(await repository.listActiveTokens(user.id)).toEqual([]);
    expect(await repository.findUserByActiveTokenHash("h1", new Date())).toBeNull();
  });
});
