import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTestApp, password, webOrigin } from "../../testing.js";
import { addressKey } from "./limits.js";

describe("addressKey", () => {
  it("drops case, the +tag and the dots of the local part", () => {
    expect(addressKey(" A.W.A+promo@Example.com ")).toBe("awa@example.com");
    expect(addressKey("awa+a+b@example.com")).toBe("awa@example.com");
  });

  it("keeps the domain as typed, dots included", () => {
    expect(addressKey("awa@mail.example.com")).toBe("awa@mail.example.com");
  });
});

describe("per-address limit on sign-up", () => {
  let app: FastifyInstance;
  let close: () => Promise<void>;
  beforeEach(async () => {
    ({ app, close } = await createTestApp());
  });
  afterEach(() => close());

  const register = (email: string, ip: string) =>
    app.inject({
      method: "POST",
      url: "/v1/auth/register",
      remoteAddress: ip,
      payload: { email, password, country: "CI" },
      headers: { origin: webOrigin },
    });

  it("counts every alias of one inbox against the same budget", async () => {
    const aliases = ["awa@example.com", "a.wa+1@example.com", "AWA+news@example.com"];
    for (const [i, email] of aliases.entries()) await register(email, `10.0.7.${String(i)}`);
    expect((await register("a.w.a+4@example.com", "10.0.8.1")).statusCode).toBe(429);
  });
});
