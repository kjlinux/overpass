import { beforeEach, describe, expect, it } from "vitest";
import { AppError } from "../../http/app-error.js";
import type { UserRecord } from "./model.js";
import { createAccountsService } from "./service.js";
import type { AccountsService } from "./service.js";
import { captureMailer, memoryRepository, signUp, testSecret } from "./testing.js";

const password = "correct horse battery";

let service: AccountsService;
let mailer: ReturnType<typeof captureMailer>;
let awa: UserRecord;
let session: string;

beforeEach(async () => {
  mailer = captureMailer();
  service = createAccountsService({
    repository: memoryRepository(),
    mailer,
    secret: testSecret,
    webOrigin: "https://overpass.test",
  });
  ({ user: awa, session } = await signUp(
    service,
    mailer,
    { email: "awa@example.com", password, country: "CI" },
    "fr",
  ));
});

async function codeOf(promise: Promise<unknown>): Promise<string> {
  const error: unknown = await promise.then(
    () => undefined,
    (reason: unknown) => reason,
  );
  return error instanceof AppError ? error.code : "no AppError";
}

describe("updateProfile", () => {
  it("changes country, stacks, language and handle together", async () => {
    const user = await service.updateProfile(awa.id, {
      country: "SN",
      stacks: ["laravel", "flutter"],
      language: "en",
      handle: "awa-dev",
    });
    expect(user).toMatchObject({ country: "SN", language: "en", handle: "awa-dev" });
    expect(user.stacks).toEqual(["flutter", "laravel"]);
  });

  it("records the newsletter consent date only when ticked", async () => {
    expect(
      (await service.updateProfile(awa.id, { newsletter: true })).newsletterConsentAt,
    ).toBeInstanceOf(Date);
    expect(
      (await service.updateProfile(awa.id, { newsletter: false })).newsletterConsentAt,
    ).toBeNull();
  });

  it("refuses a handle already taken", async () => {
    const { user: other } = await signUp(
      service,
      mailer,
      { email: "ali@example.com", password, country: "ML" },
      "fr",
    );
    expect(await codeOf(service.updateProfile(other.id, { handle: awa.handle }))).toBe(
      "handle_taken",
    );
  });
});

describe("publicProfile", () => {
  it("shows country, stacks, contributions and points but never the e-mail", async () => {
    await service.updateProfile(awa.id, { stacks: ["django"] });
    const profile = await service.publicProfile(awa.handle);
    expect(profile).toEqual({
      handle: awa.handle,
      country: "CI",
      stacks: ["django"],
      contributions: { routes: 0, checks: 0, potholes: 0 },
      points: 0,
      confirmed: false,
      memberSince: awa.createdAt.toISOString(),
    });
    expect(JSON.stringify(profile)).not.toContain("awa@example.com");
  });

  it("answers not_found for an unknown handle", async () => {
    expect(await codeOf(service.publicProfile("nobody-here"))).toBe("not_found");
  });
});

describe("changePassword", () => {
  it("requires the current password", async () => {
    const result = service.changePassword(awa, {
      currentPassword: "wrong",
      newPassword: "x".repeat(12),
    });
    expect(await codeOf(result)).toBe("wrong_password");
  });

  it("closes the other sessions and returns a fresh one", async () => {
    const result = await service.changePassword(awa, {
      currentPassword: password,
      newPassword: "a brand new passphrase",
    });
    expect(await service.authenticateSession(session)).toBeNull();
    expect(await service.authenticateSession(result.session)).not.toBeNull();
  });
});

describe("deleteAccount", () => {
  it("requires the password, then removes the account for good", async () => {
    expect(await codeOf(service.deleteAccount(awa, { password: "wrong" }))).toBe("wrong_password");
    await service.deleteAccount(awa, { password });
    expect(await service.authenticateSession(session)).toBeNull();
    expect(await codeOf(service.login({ email: awa.email, password }))).toBe("invalid_credentials");
  });
});

describe("api tokens", () => {
  it("shows the clear token once and lists it without the secret", async () => {
    const created = await service.createToken(awa.id, { name: "Laptop", usage: "mcp" });
    expect(created.token).toMatch(/^ovp_[\w-]{43}$/);
    const listed = await service.listTokens(awa.id);
    expect(listed).toEqual([
      {
        id: created.id,
        name: "Laptop",
        usage: "mcp",
        createdAt: created.createdAt,
        lastUsedAt: null,
        expiresAt: created.expiresAt,
      },
    ]);
    expect(JSON.stringify(listed)).not.toContain(created.token);
  });

  it("authenticates a bearer token until it is revoked", async () => {
    const { id, token } = await service.createToken(awa.id, { name: "CI", usage: "api" });
    expect((await service.authenticateToken(token))?.id).toBe(awa.id);
    await service.revokeToken(awa.id, id);
    expect(await service.authenticateToken(token)).toBeNull();
  });

  it("will not revoke another user's token", async () => {
    const { user: other } = await signUp(
      service,
      mailer,
      { email: "ali@example.com", password, country: "ML" },
      "fr",
    );
    const { id } = await service.createToken(awa.id, { name: "Laptop", usage: "mcp" });
    expect(await codeOf(service.revokeToken(other.id, id))).toBe("token_not_found");
  });

  it("ignores strings that do not look like a token", async () => {
    expect(await service.authenticateToken("Bearer nonsense")).toBeNull();
  });
});
