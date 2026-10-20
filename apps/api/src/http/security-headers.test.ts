import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import Fastify from "fastify";
import { describe, expect, it } from "vitest";
import {
  apiContentSecurityPolicy,
  registerSecurityHeaders,
  webContentSecurityPolicy,
} from "./security-headers.js";

const read = (path: string): string => readFileSync(new URL(path, import.meta.url), "utf8");

async function answer(contentSecurityPolicy?: string) {
  const app = Fastify();
  registerSecurityHeaders(app);
  app.get("/", (_request, reply) => {
    if (contentSecurityPolicy !== undefined)
      reply.header("content-security-policy", contentSecurityPolicy);
    return reply.send({ ok: true });
  });
  return app.inject({ method: "GET", url: "/" });
}

describe("security headers", () => {
  it("locks every JSON answer down with a deny-all policy", async () => {
    const response = await answer();
    expect(response.headers["content-security-policy"]).toBe(apiContentSecurityPolicy);
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.headers["x-frame-options"]).toBe("DENY");
  });

  it("keeps the policy a page sets for itself", async () => {
    const response = await answer(webContentSecurityPolicy);
    expect(response.headers["content-security-policy"]).toBe(webContentSecurityPolicy);
  });

  it("allows the inline theme script of the web shell by its hash only", () => {
    const script = /<script>([\s\S]*?)<\/script>/.exec(read("../../../web/index.html"))?.[1] ?? "";
    const hash = createHash("sha256").update(script).digest("base64");
    expect(webContentSecurityPolicy).toContain(`'sha256-${hash}'`);
    expect(webContentSecurityPolicy).not.toContain("unsafe-inline");
  });

  it("is the same policy the example proxy sends with HSTS", () => {
    const caddy = read("../../../../deploy/Caddyfile.example");
    expect(caddy).toContain(webContentSecurityPolicy);
    expect(caddy).toContain("Strict-Transport-Security");
  });
});
