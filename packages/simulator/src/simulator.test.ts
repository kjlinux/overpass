import { describe, expect, it } from "vitest";
import { SimulatorRegistry } from "./registry.js";
import type { SimulatedProvider } from "./types.js";

describe("SimulatorRegistry", () => {
  it("registers and retrieves a simulated provider", () => {
    const registry = new SimulatorRegistry();
    const dummyProvider: SimulatedProvider = {
      identity: {
        id: "dummy",
        name: "Dummy Provider",
        countries: ["SN", "CI"],
        docsVersion: "2026-10-01",
        unofficial: true,
      },
      endpoints: [
        {
          method: "POST",
          path: "/dummy/checkout",
          summary: "Create dummy checkout",
        },
      ],
      simulate: () =>
        Promise.resolve({
          response: { status: 200, headers: {}, body: { ok: true } },
          webhooks: [],
        }),
      signWebhook: () => ({ "x-signature": "dummy-sig" }),
    };

    registry.register(dummyProvider);
    expect(registry.get("dummy")).toBe(dummyProvider);
    expect(registry.get("unknown")).toBeUndefined();
    expect(registry.list()).toHaveLength(1);
    expect(registry.list()[0]?.identity.name).toBe("Dummy Provider");
  });
});
