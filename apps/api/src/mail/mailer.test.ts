import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createMailer } from "./mailer.js";

const silent = { info: () => undefined };
let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "outbox-"));
});
afterEach(() => rm(dir, { recursive: true, force: true }));

describe("createMailer without SMTP", () => {
  it("writes each message as a JSON file when an outbox folder is set", async () => {
    const mailer = createMailer({ MAIL_OUTBOX_DIR: dir }, silent);
    await mailer.send({ to: "awa@example.com", subject: "Hello", text: "Link: #token=abc" });
    const [file] = await readdir(dir);
    const message: unknown = JSON.parse(await readFile(join(dir, file ?? ""), "utf8"));
    expect(message).toEqual({ to: "awa@example.com", subject: "Hello", text: "Link: #token=abc" });
  });

  it("only logs when no outbox folder is set", async () => {
    const logged: unknown[] = [];
    const mailer = createMailer({}, { info: (details) => logged.push(details) });
    await mailer.send({ to: "a@b.co", subject: "s", text: "t" });
    expect(logged).toHaveLength(1);
  });

  it("refuses every mail in production and never logs its content", async () => {
    const logged: unknown[] = [];
    const mailer = createMailer({ NODE_ENV: "production" }, { info: (d) => logged.push(d) });
    const message = { to: "a@b.co", subject: "Reset", text: "Link: #token=secret" };
    await expect(mailer.send(message)).rejects.toThrow(/SMTP_HOST/);
    expect(JSON.stringify(logged)).not.toContain("secret");
    expect(JSON.stringify(logged)).not.toContain("a@b.co");
  });
});
