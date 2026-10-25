import type { SandboxDelivery } from "@overpass/shared";
import { describe, expect, it } from "vitest";
import { curlOf, relayCommand } from "./command";
import { repeatsPrevious, tripOf } from "./trip";

const base: SandboxDelivery = {
  id: "d1",
  eventType: "checkout.session.completed",
  target: "relay",
  status: "scheduled",
  attempts: 0,
  body: "",
  headers: {},
  responseStatus: null,
  durationMs: null,
  dueAt: "2026-10-14T10:00:01Z",
  deliveredAt: null,
};
const time = (iso: string) => iso.slice(11, 19);
const keys = (delivery: Partial<SandboxDelivery>) =>
  tripOf({ ...base, ...delivery }, time).map((stop) => [
    stop.name.key,
    stop.state.key,
    stop.reached,
  ]);

describe("tripOf", () => {
  it("shows a scheduled webhook as leaving later, nothing reached", () => {
    expect(keys({})).toEqual([
      ["overpass", "leaves", false],
      ["relay", "waiting", false],
      ["server", "notYet", false],
    ]);
    expect(tripOf(base, time)[0]?.state.values).toEqual({ time: "10:00:01" });
  });

  it("stops at the relay until the local server answered", () => {
    expect(keys({ status: "sent" })).toEqual([
      ["overpass", "sent", true],
      ["relay", "relayWait", false],
      ["server", "notYet", false],
    ]);
  });

  it("reaches the developer's server with its status and duration", () => {
    const trip = tripOf(
      { ...base, status: "delivered", responseStatus: 204, durationMs: 31 },
      time,
    );
    expect(trip.every((stop) => stop.reached)).toBe(true);
    expect(trip[2]?.state).toEqual({ key: "received", values: { status: "204", duration: "31" } });
  });

  it("names a failed public URL delivery with its status, or no answer", () => {
    const url = { target: "url" as const, status: "failed" as const };
    expect(tripOf({ ...base, ...url, responseStatus: 500 }, time)[2]?.state).toEqual({
      key: "failed",
      values: { reason: "HTTP 500" },
    });
    expect(keys({ ...url })[1]).toEqual(["internet", "passed", true]);
    expect(tripOf({ ...base, ...url }, time)[2]?.state.values?.reason).toBe("noAnswer");
  });

  it("goes straight from Overpass to the built-in receiver", () => {
    expect(
      keys({ target: "inbox", status: "delivered", responseStatus: null, durationMs: 0 }),
    ).toEqual([
      ["overpass", "sent", true],
      ["inbox", "passed", true],
    ]);
  });
});

describe("relayCommand", () => {
  it("prints one line, which bash, zsh, PowerShell and cmd all accept as pasted", () => {
    expect(relayCommand({ origin: "https://overpass.example", key: "ovp_test_abc" })).toBe(
      "npx overpass-cli listen --forward-to http://localhost:3000/webhook --key ovp_test_abc --api https://overpass.example",
    );
  });
});

describe("curlOf", () => {
  const origin = "https://overpass.example";
  const token = {
    method: "POST",
    path: "/oauth/token",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials&client_id=overpass&client_secret=overpass",
  };

  it("puts the key where the provider expects it and keeps a form body raw", () => {
    const auth = { type: "header" as const, name: "x-api-key" };
    expect(
      curlOf({ origin, provider: "pi-spi", step: token, auth, key: "ovp_test_k", vars: {} }),
    ).toBe(
      [
        'curl -X POST "https://overpass.example/v1/sandbox/pi-spi/oauth/token"',
        '-H "x-api-key: ovp_test_k"',
        '-H "content-type: application/x-www-form-urlencoded"',
        "--data 'grant_type=client_credentials&client_id=overpass&client_secret=overpass'",
      ].join(" \\\n  "),
    );
  });

  it("fills captured values and sends JSON bodies as JSON", () => {
    const step = {
      method: "POST",
      path: "/piz/v1/demandes",
      headers: { authorization: "Bearer {{token}}" },
      body: { txId: "ovp-{{fresh}}" },
    };
    const auth = { type: "header" as const, name: "x-api-key" };
    const curl = curlOf({
      origin,
      provider: "pi-spi",
      step,
      auth,
      key: "k",
      vars: { token: "tok", fresh: "a1" },
    });
    expect(curl).toContain('-H "authorization: Bearer tok"');
    expect(curl).toContain('-H "content-type: application/json"');
    expect(curl).toContain(`--data '{"txId":"ovp-a1"}'`);
  });

  it("keeps hostile captured values inside their quotes when pasted in a shell", () => {
    const step = {
      method: "POST",
      path: "/x/{{id}}",
      headers: { authorization: "Bearer {{token}}" },
      body: { note: "{{token}}" },
    };
    const auth = { type: "header" as const, name: "x-api-key" };
    const token = "a\"$(id)`b'c\\";
    const curl = curlOf({
      origin,
      provider: "p",
      step,
      auth,
      key: "k",
      vars: { token, id: "$HOME" },
    });
    expect(curl).toContain('"https://overpass.example/v1/sandbox/p/x/\\$HOME"');
    expect(curl).toContain('-H "authorization: Bearer a\\"\\$(id)\\`b\'c\\\\"');
    expect(curl).toContain("--data '{\"note\":\"a\\\"$(id)`b'\\''c\\\\\"}'");
  });

  it("uses the bearer header for bearer providers", () => {
    const step = {
      method: "GET",
      path: "/v1/checkout/sessions/{{sessionId}}",
      headers: {},
      body: null,
    };
    const curl = curlOf({
      origin,
      provider: "wave",
      step,
      auth: { type: "bearer" },
      key: "k",
      vars: {},
    });
    expect(curl).toBe(
      'curl -X GET "https://overpass.example/v1/sandbox/wave/v1/checkout/sessions/{{sessionId}}" \\\n  -H "Authorization: Bearer k"',
    );
  });
});

describe("repeatsPrevious", () => {
  const wave = (id: string) => JSON.stringify({ id, type: "checkout.session.completed" });
  const pispi = JSON.stringify({ data: [{ txId: "t1" }], meta: { total: 1 } });

  it("flags a delivery with the same event id as the one before", () => {
    expect(repeatsPrevious([wave("a"), wave("a")], 1)).toBe(true);
    expect(repeatsPrevious([wave("a"), wave("b")], 1)).toBe(false);
  });

  it("flags a byte-identical body when the provider sends no event id", () => {
    expect(repeatsPrevious([pispi, pispi], 1)).toBe(true);
    expect(repeatsPrevious([pispi, pispi.replace("t1", "t2")], 1)).toBe(false);
  });

  it("never flags the first delivery", () => {
    expect(repeatsPrevious([pispi], 0)).toBe(false);
  });
});
