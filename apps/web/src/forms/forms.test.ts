import { loginInput, registerInput } from "@overpass/shared";
import { describe, expect, it } from "vitest";
import { safeNext } from "../session/next";
import { firstInvalid, validateAll, validateField } from "./validation";

describe("validateField", () => {
  it("returns the stable code of one field only", () => {
    const values = { email: "nope", password: "short", country: "" };
    expect(validateField(registerInput, values, "email")).toBe("email_invalid");
    expect(validateField(registerInput, values, "password")).toBe("password_too_short");
  });

  it("returns undefined for a valid field even when others are invalid", () => {
    const values = { email: "awa@example.com", password: "", country: "" };
    expect(validateField(registerInput, values, "email")).toBeUndefined();
  });

  it("treats an empty select as required", () => {
    const values = { email: "awa@example.com", password: "x".repeat(12), country: "" };
    expect(validateField(registerInput, values, "country")).toBe("required");
  });
});

describe("validateAll", () => {
  it("returns parsed data when every field is valid", () => {
    const result = validateAll(loginInput, { email: " Awa@Example.com", password: "x" });
    expect(result).toEqual({ ok: true, data: { email: "awa@example.com", password: "x" } });
  });

  it("returns every field code otherwise, in form order for focus", () => {
    const result = validateAll(registerInput, { email: "", password: "", country: "" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(firstInvalid(["email", "password", "country"], result.errors)).toBe("email");
  });
});

describe("safeNext", () => {
  it("keeps a path inside the site, with its query", () => {
    expect(safeNext("/fr/settings?tab=tokens", "/fr/dashboard")).toBe("/fr/settings?tab=tokens");
  });

  it.each([
    "https://evil.test",
    "//evil.test",
    "/\\evil.test",
    "/\t/evil.test",
    "/\n/evil.test",
    "javascript:alert(1)",
    null,
  ])("falls back for %s", (next) => {
    expect(safeNext(next, "/fr/dashboard")).toBe("/fr/dashboard");
  });
});
