import { describe, expect, it } from "vitest";
import type { Database } from "../../db/client.js";
import { captureMailer } from "../../mail/testing.js";
import { newsletterModule } from "./index.js";

describe("sign-up consent", () => {
  it("never fails the profile update when the newsletter store is down", async () => {
    const down = { execute: () => Promise.reject(new Error("database down")) };
    const errors: object[] = [];
    const newsletter = newsletterModule({
      db: down as unknown as Database,
      mailer: captureMailer(),
      secret: "test-secret-with-at-least-32-characters!",
      webOrigin: "http://web.test",
      now: () => new Date(),
      log: { error: (details) => errors.push(details) },
    });
    await expect(newsletter.consent({ email: "ada@example.com", language: "fr" })).resolves.toBe(
      undefined,
    );
    expect(errors).toHaveLength(1);
  });
});
