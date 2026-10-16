import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { MailMessage } from "../../mail/mailer.js";
import { subscribe, subscribeConfirmed, tokenMailedTo } from "../../testing-newsletter.js";
import { call, testClock } from "../../testing-routes.js";
import { createTestApp, registerAccount } from "../../testing.js";

let app: FastifyInstance;
let close: () => Promise<void>;
let sent: MailMessage[];
let clock: ReturnType<typeof testClock>;

beforeEach(async () => {
  clock = testClock();
  const test = await createTestApp({ now: clock.now });
  ({ app, close } = test);
  sent = test.mailer.sent;
});
afterEach(() => close());

const mailsTo = (email: string) => sent.filter((mail) => mail.to === email);
const confirm = (token: string) =>
  call(app, "POST", "/v1/newsletter/confirm", { payload: { token } });

describe("subscribing", () => {
  it("answers the same way and mails a confirmation link in the chosen language", async () => {
    const response = await subscribe(app, "Ada@Example.com", "en");
    expect(response.status).toBe(202);
    expect(response.body.data).toEqual({ status: "pending" });
    const [mail] = mailsTo("ada@example.com");
    expect(mail?.text).toContain("http://web.test/en/newsletter/confirm#token=");
    expect(mail?.subject).not.toBe("");
  });

  it("validates the address and the language", async () => {
    const { body } = await call(app, "POST", "/v1/newsletter/subscribe", {
      payload: { email: "nope", language: "xx" },
    });
    expect(body.error).toMatchObject({
      fields: { email: { code: "email_invalid" }, language: { code: "language_invalid" } },
    });
  });

  it("does not resend a link within ten minutes, nor to a confirmed address", async () => {
    await subscribe(app, "ada@example.com");
    await subscribe(app, "ada@example.com");
    expect(mailsTo("ada@example.com")).toHaveLength(1);
    await confirm(tokenMailedTo(sent, "ada@example.com", "confirm"));
    clock.advanceDays(1);
    expect((await subscribe(app, "ada@example.com")).body.data).toEqual({ status: "pending" });
    expect(mailsTo("ada@example.com")).toHaveLength(1);
  });
});

describe("confirming", () => {
  it("confirms once with the mailed token", async () => {
    await subscribe(app, "ada@example.com");
    const token = tokenMailedTo(sent, "ada@example.com", "confirm");
    expect((await confirm(token)).body.data).toEqual({ language: "fr" });
    expect((await confirm(token)).body.error).toMatchObject({ code: "newsletter_link_invalid" });
  });

  it("refuses an expired link", async () => {
    await subscribe(app, "ada@example.com");
    clock.advanceDays(3);
    const expired = await confirm(tokenMailedTo(sent, "ada@example.com", "confirm"));
    expect(expired.body.error).toMatchObject({ code: "newsletter_link_invalid" });
  });
});

describe("unsubscribing", () => {
  it("refuses a forged token", async () => {
    await subscribeConfirmed(app, sent, "ada@example.com");
    const forged = `00000000-0000-4000-8000-000000000001.${"a".repeat(43)}`;
    const { body } = await call(app, "POST", "/v1/newsletter/unsubscribe", {
      payload: { token: forged },
    });
    expect(body.error).toMatchObject({ code: "newsletter_link_invalid" });
  });
});

describe("sign-up consent", () => {
  it("sends a newsletter confirmation when a member ticks the box", async () => {
    const cookie = await registerAccount(app, "member@example.com");
    await call(app, "PATCH", "/v1/me", { cookie, payload: { newsletter: true } });
    expect(tokenMailedTo(sent, "member@example.com", "confirm")).not.toBe("");
  });
});
