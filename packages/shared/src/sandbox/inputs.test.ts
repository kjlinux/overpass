import { describe, expect, it } from "vitest";
import { sandboxKeyCreateInput, sandboxKeyUpdateInput } from "./inputs.js";

const key = { provider: "wave", target: "url" };

describe("webhook URL of a test key", () => {
  it("accepts an https URL", () => {
    const parsed = sandboxKeyCreateInput.safeParse({
      ...key,
      webhookUrl: "https://shop.example/hook",
    });
    expect(parsed.success).toBe(true);
  });

  it("refuses plain http, on creation and on update", () => {
    const created = sandboxKeyCreateInput.safeParse({
      ...key,
      webhookUrl: "http://shop.example/hook",
    });
    const updated = sandboxKeyUpdateInput.safeParse({ webhookUrl: "http://shop.example/hook" });
    expect(created.error?.issues[0]?.message).toBe("webhook_url_invalid");
    expect(updated.error?.issues[0]?.message).toBe("webhook_url_invalid");
  });

  it("needs no URL for the local relay, which reaches localhost from the developer's machine", () => {
    expect(sandboxKeyCreateInput.safeParse({ provider: "wave", target: "relay" }).success).toBe(
      true,
    );
  });
});
