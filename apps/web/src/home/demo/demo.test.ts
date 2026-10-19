import type { SandboxEvent } from "@overpass/shared";
import { describe, expect, it } from "vitest";
import { excerpt, stagesOf } from "./stages";

const delivery = {
  status: "scheduled",
  responseStatus: null,
} as unknown as SandboxEvent["deliveries"][number];
const event = (status: string) =>
  ({ response: { status: 201 }, deliveries: [{ ...delivery, status }] }) as unknown as SandboxEvent;

describe("stagesOf", () => {
  it("is all pending before the first click", () => {
    expect(stagesOf(undefined, false)).toEqual({
      request: "pending",
      response: "pending",
      webhook: "pending",
    });
  });

  it("marks the request sent while the call runs", () => {
    expect(stagesOf(undefined, true).request).toBe("done");
  });

  it("follows the delivery until the webhook lands or fails", () => {
    expect(stagesOf(event("scheduled"), false)).toEqual({
      request: "done",
      response: "done",
      webhook: "pending",
    });
    expect(stagesOf(event("delivered"), false).webhook).toBe("done");
    expect(stagesOf(event("failed"), false).webhook).toBe("failed");
  });
});

describe("excerpt", () => {
  it("keeps only the named fields of a JSON body, in order", () => {
    const body = JSON.stringify({ amount: "2500", currency: "XOF", success_url: "https://x" });
    const expected = JSON.stringify({ currency: "XOF", amount: "2500" }, null, 2);
    expect(excerpt(body, ["currency", "amount"])).toBe(expected);
  });

  it("returns a body that is not JSON as it came", () => {
    expect(excerpt("plain text", ["id"])).toBe("plain text");
    expect(excerpt({ id: "cos-1" }, ["id"])).toBe(JSON.stringify({ id: "cos-1" }, null, 2));
  });
});
