import { describe, expect, it } from "vitest";
import { loadConfig } from "./config.js";

const base = {
  DATABASE_URL: "postgres://overpass:overpass@127.0.0.1:5432/overpass",
  SESSION_SECRET: "a".repeat(32),
};

describe("loadConfig", () => {
  it("treats an empty SMTP_HOST as unset, so mails go to the logs", () => {
    expect(loadConfig({ ...base, SMTP_HOST: "" }).SMTP_HOST).toBeUndefined();
  });

  it("requires an SMTP server in production", () => {
    expect(() => loadConfig({ ...base, NODE_ENV: "production" })).toThrow();
    expect(loadConfig({ ...base, NODE_ENV: "production", SMTP_HOST: "smtp.test", TRUST_PROXY: "true" }).SMTP_HOST).toBe(
      "smtp.test",
    );
  });

  it("refuses a session secret shorter than 32 characters", () => {
    expect(() => loadConfig({ ...base, SESSION_SECRET: "short" })).toThrow();
  });

  it("requires TRUST_PROXY to be set explicitly in production", () => {
    const production = { ...base, NODE_ENV: "production", SMTP_HOST: "smtp.test" };
    expect(() => loadConfig(production)).toThrow(/TRUST_PROXY/);
    expect(loadConfig({ ...production, TRUST_PROXY: "true" }).TRUST_PROXY).toBe(true);
  });
});
