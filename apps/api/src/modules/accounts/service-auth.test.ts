import { beforeEach, describe, expect, it } from "vitest";
import { AppError } from "../../http/app-error.js";
import { createAccountsService } from "./service.js";
import type { AccountsService } from "./service.js";
import { captureMailer, linkToken, memoryRepository, signUp, testSecret } from "./testing.js";

const awa = { email: "awa@example.com", password: "correct horse battery", country: "CI" as const };

let repository: ReturnType<typeof memoryRepository>;
let mailer: ReturnType<typeof captureMailer>;
let service: AccountsService;

beforeEach(() => {
  repository = memoryRepository();
  mailer = captureMailer();
  service = createAccountsService({
    repository,
    mailer,
    secret: testSecret,
    webOrigin: "https://overpass.test",
  });
});

async function rejection(promise: Promise<unknown>): Promise<AppError> {
  const error: unknown = await promise.then(
    () => undefined,
    (reason: unknown) => reason,
  );
  if (!(error instanceof AppError)) throw new Error("expected an AppError");
  return error;
}

describe("register", () => {
  const sealed = (token: string) =>
    token
      .split(".")
      .map((part) => Buffer.from(part, "base64url").toString("latin1"))
      .join("");

  it("answers the same way and sends one mail whether or not the address is taken", async () => {
    await expect(service.register(awa, "fr")).resolves.toBeUndefined();
    await signUp(service, mailer, awa);
    await expect(service.register(awa, "en")).resolves.toBeUndefined();
    expect(mailer.sent.map((mail) => mail.to)).toEqual([awa.email, awa.email, awa.email]);
    expect(mailer.sent.at(-1)?.text).toContain("https://overpass.test/fr/sign-in");
    expect(mailer.sent.at(-1)?.text).not.toContain("#token=");
  });

  it("creates nothing before the link is opened", async () => {
    await service.register(awa, "fr");
    expect(await repository.findUserByEmail(awa.email)).toBeNull();
    expect(mailer.sent[0]?.text).toContain("https://overpass.test/fr/sign-up/confirm#token=");
  });

  it("seals the pending sign-up, so the link never shows the password hash", async () => {
    await service.register(awa, "fr");
    expect(sealed(linkToken(mailer.sent[0]?.text ?? ""))).not.toContain("argon2");
  });

  it("creates the member on confirmation, with an Argon2id hash and an open session", async () => {
    const { user, session } = await signUp(service, mailer, awa, "en");
    expect(user.passwordHash).toMatch(/^\$argon2id\$/);
    expect(user.handle).toMatch(/^dev-[0-9a-f]{6}$/);
    expect(user.language).toBe("en");
    expect((await service.authenticateSession(session))?.id).toBe(user.id);
  });

  it("refuses a link used twice, a tampered link and a session token", async () => {
    await service.register(awa, "fr");
    const token = linkToken(mailer.sent[0]?.text ?? "");
    const { session } = await service.confirmSignUp(token);
    expect((await rejection(service.confirmSignUp(token))).code).toBe("email_taken");
    expect((await rejection(service.confirmSignUp(`${token}x`))).code).toBe("signup_invalid");
    expect((await rejection(service.confirmSignUp(session))).code).toBe("signup_invalid");
  });
});

describe("login", () => {
  beforeEach(async () => {
    await signUp(service, mailer, awa);
  });

  it("opens a session with the right password", async () => {
    const { session } = await service.login({ email: awa.email, password: awa.password });
    expect(await service.authenticateSession(session)).not.toBeNull();
  });

  it("answers the same code for a wrong password and an unknown e-mail", async () => {
    const wrong = await rejection(service.login({ email: awa.email, password: "nope" }));
    const unknown = await rejection(service.login({ email: "x@example.com", password: "nope" }));
    expect([wrong.code, unknown.code]).toEqual(["invalid_credentials", "invalid_credentials"]);
    expect(wrong.status).toBe(401);
  });
});

describe("sessions", () => {
  it("rejects a forged or tampered session", async () => {
    const { session } = await signUp(service, mailer, awa);
    expect(await service.authenticateSession(`${session}x`)).toBeNull();
    expect(await service.authenticateSession("not-a-jwt")).toBeNull();
  });

  it("rejects the session of a deleted account", async () => {
    const { user, session } = await signUp(service, mailer, awa);
    await repository.deleteUser(user.id);
    expect(await service.authenticateSession(session)).toBeNull();
  });
});

describe("logout", () => {
  it("closes every session of the account, copies included", async () => {
    const { session } = await signUp(service, mailer, awa);
    const copy = (await service.login({ email: awa.email, password: awa.password })).session;
    await service.logout(session);
    expect(await service.authenticateSession(copy)).toBeNull();
  });

  it("ignores an invalid session", async () => {
    await expect(service.logout("not-a-jwt")).resolves.toBeUndefined();
  });
});

describe("password reset", () => {
  beforeEach(async () => {
    await signUp(service, mailer, awa);
  });

  it("mails a link in the account language, token in the fragment", async () => {
    await service.requestReset({ email: awa.email });
    expect(mailer.sent).toHaveLength(2);
    expect(mailer.sent.at(-1)?.to).toBe(awa.email);
    expect(mailer.sent.at(-1)?.text).toContain("https://overpass.test/fr/reset-password#token=");
  });

  it("stays silent for an unknown e-mail, so accounts cannot be guessed", async () => {
    await service.requestReset({ email: "ghost@example.com" });
    expect(mailer.sent).toHaveLength(1);
  });

  it("changes the password and closes every open session", async () => {
    const { session } = await service.login({ email: awa.email, password: awa.password });
    await service.requestReset({ email: awa.email });
    const token = linkToken(mailer.sent.at(-1)?.text ?? "");
    await service.resetPassword({ token, password: "a brand new passphrase" });
    expect(await service.authenticateSession(session)).toBeNull();
    await expect(
      service.login({ email: awa.email, password: "a brand new passphrase" }),
    ).resolves.toBeDefined();
  });

  it("refuses to use the same link twice", async () => {
    await service.requestReset({ email: awa.email });
    const token = linkToken(mailer.sent.at(-1)?.text ?? "");
    await service.resetPassword({ token, password: "a brand new passphrase" });
    const error = await rejection(service.resetPassword({ token, password: "another passphrase" }));
    expect([error.code, error.status]).toEqual(["reset_invalid", 400]);
  });

  it("refuses a session token used as a reset token", async () => {
    const { session } = await service.login({ email: awa.email, password: awa.password });
    const error = await rejection(
      service.resetPassword({ token: session, password: "x".repeat(12) }),
    );
    expect(error.code).toBe("reset_invalid");
  });

  it("revokes the personal tokens, so an intruder's token stops working", async () => {
    const { user } = await service.login({ email: awa.email, password: awa.password });
    const { token } = await service.createToken(user.id, { name: "x", usage: "api" });
    await service.requestReset({ email: awa.email });
    const reset = linkToken(mailer.sent.at(-1)?.text ?? "");
    await service.resetPassword({ token: reset, password: "a brand new passphrase" });
    expect(await service.authenticateToken(token)).toBeNull();
  });
});
