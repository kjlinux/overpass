import { beforeEach, describe, expect, it } from "vitest";
import { AppError } from "../../http/app-error.js";
import { createAccountsService } from "./service.js";
import type { AccountsService } from "./service.js";
import { captureMailer, memoryRepository, testSecret } from "./testing.js";

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

function resetTokenFrom(text: string): string {
  const token = /#token=([\w.-]+)/.exec(text)?.[1];
  if (token === undefined) throw new Error("no token in mail");
  return token;
}

describe("register", () => {
  it("stores an Argon2id hash, never the password", async () => {
    const { user } = await service.register(awa, "fr");
    expect(user.passwordHash).toMatch(/^\$argon2id\$/);
    expect(user.passwordHash).not.toContain(awa.password);
  });

  it("gives a generated public handle and the request language", async () => {
    const { user } = await service.register(awa, "en");
    expect(user.handle).toMatch(/^dev-[0-9a-f]{6}$/);
    expect(user.language).toBe("en");
  });

  it("returns a session that authenticates the new user", async () => {
    const { user, session } = await service.register(awa, "fr");
    expect((await service.authenticateSession(session))?.id).toBe(user.id);
  });

  it("refuses an e-mail already in use with email_taken", async () => {
    await service.register(awa, "fr");
    const error = await rejection(service.register(awa, "fr"));
    expect([error.code, error.status]).toEqual(["email_taken", 409]);
  });
});

describe("login", () => {
  beforeEach(async () => {
    await service.register(awa, "fr");
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
    const { session } = await service.register(awa, "fr");
    expect(await service.authenticateSession(`${session}x`)).toBeNull();
    expect(await service.authenticateSession("not-a-jwt")).toBeNull();
  });

  it("rejects the session of a deleted account", async () => {
    const { user, session } = await service.register(awa, "fr");
    await repository.deleteUser(user.id);
    expect(await service.authenticateSession(session)).toBeNull();
  });
});

describe("password reset", () => {
  beforeEach(async () => {
    await service.register(awa, "fr");
  });

  it("mails a link in the account language, token in the fragment", async () => {
    await service.requestReset({ email: awa.email });
    expect(mailer.sent).toHaveLength(1);
    expect(mailer.sent[0]?.to).toBe(awa.email);
    expect(mailer.sent[0]?.text).toContain("https://overpass.test/fr/reset-password#token=");
  });

  it("stays silent for an unknown e-mail, so accounts cannot be guessed", async () => {
    await service.requestReset({ email: "ghost@example.com" });
    expect(mailer.sent).toHaveLength(0);
  });

  it("changes the password and closes every open session", async () => {
    const { session } = await service.login({ email: awa.email, password: awa.password });
    await service.requestReset({ email: awa.email });
    const token = resetTokenFrom(mailer.sent[0]?.text ?? "");
    await service.resetPassword({ token, password: "a brand new passphrase" });
    expect(await service.authenticateSession(session)).toBeNull();
    await expect(
      service.login({ email: awa.email, password: "a brand new passphrase" }),
    ).resolves.toBeDefined();
  });

  it("refuses to use the same link twice", async () => {
    await service.requestReset({ email: awa.email });
    const token = resetTokenFrom(mailer.sent[0]?.text ?? "");
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
});
