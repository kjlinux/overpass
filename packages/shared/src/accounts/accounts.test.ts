import { describe, expect, it } from "vitest";
import {
  africanCountries,
  fieldErrors,
  fieldMessage,
  handleSchema,
  loginInput,
  profileUpdateInput,
  registerInput,
  stackIds,
  tokenCreateInput,
} from "../index.js";

const valid = { email: "awa@example.com", password: "correct horse battery", country: "CI" };

describe("registerInput", () => {
  it("accepts an e-mail, a password and a country", () => {
    expect(registerInput.parse(valid)).toEqual(valid);
  });

  it("normalises the e-mail to lower case without spaces", () => {
    expect(registerInput.parse({ ...valid, email: "  Awa@Example.COM " }).email).toBe(
      "awa@example.com",
    );
  });

  it("returns one stable code per invalid field", () => {
    const result = registerInput.safeParse({ email: "nope", password: "short", country: "FR" });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(fieldErrors(result.error)).toEqual({
      email: "email_invalid",
      password: "password_too_short",
      country: "country_invalid",
    });
  });

  it("reports missing fields as required", () => {
    const result = registerInput.safeParse({});
    if (result.success) throw new Error("expected failure");
    expect(fieldErrors(result.error)).toEqual({
      email: "required",
      password: "required",
      country: "required",
    });
  });

  it("rejects passwords longer than 128 characters", () => {
    const result = registerInput.safeParse({ ...valid, password: "a".repeat(129) });
    if (result.success) throw new Error("expected failure");
    expect(fieldErrors(result.error)).toEqual({ password: "password_too_long" });
  });

  it("rejects unknown keys", () => {
    expect(registerInput.safeParse({ ...valid, role: "admin" }).success).toBe(false);
  });
});

describe("loginInput", () => {
  it("does not apply the password length rule, so old passwords still log in", () => {
    expect(loginInput.safeParse({ email: valid.email, password: "x" }).success).toBe(true);
  });
});

describe("profileUpdateInput", () => {
  it("accepts known stacks without duplicates", () => {
    const parsed = profileUpdateInput.parse({ stacks: ["laravel", "nodejs", "laravel"] });
    expect(parsed.stacks).toEqual(["laravel", "nodejs"]);
  });

  it("rejects an unknown stack", () => {
    const result = profileUpdateInput.safeParse({ stacks: ["cobol-on-cogs"] });
    if (result.success) throw new Error("expected failure");
    expect(fieldErrors(result.error)).toEqual({ stacks: "stacks_invalid" });
  });

  it("records the newsletter consent only as an explicit boolean", () => {
    expect(profileUpdateInput.parse({ newsletter: true }).newsletter).toBe(true);
    expect(profileUpdateInput.safeParse({ newsletter: "yes" }).success).toBe(false);
  });
});

describe("handleSchema", () => {
  it("accepts lower-case letters, digits and inner hyphens", () => {
    expect(handleSchema.safeParse("dev-7f3a2c").success).toBe(true);
  });

  it.each(["ab", "-dev", "dev-", "Dev", "dév", "a".repeat(31)])("rejects %s", (handle) => {
    expect(handleSchema.safeParse(handle).success).toBe(false);
  });
});

describe("tokenCreateInput", () => {
  it("requires a name and a usage among mcp and api", () => {
    expect(tokenCreateInput.safeParse({ name: "Laptop", usage: "mcp" }).success).toBe(true);
    expect(tokenCreateInput.safeParse({ name: "", usage: "mcp" }).success).toBe(false);
    expect(tokenCreateInput.safeParse({ name: "Laptop", usage: "root" }).success).toBe(false);
  });
});

describe("reference lists", () => {
  it("lists the 54 African countries as unique ISO codes", () => {
    expect(africanCountries).toHaveLength(54);
    expect(new Set(africanCountries).size).toBe(54);
  });

  it("keeps stack identifiers unique", () => {
    expect(new Set(stackIds).size).toBe(stackIds.length);
  });

  it("translates every field code in both languages", () => {
    expect(fieldMessage("email_invalid", "en")).toMatch(/e-mail/i);
    expect(fieldMessage("email_invalid", "fr")).toMatch(/e-mail/i);
  });
});
