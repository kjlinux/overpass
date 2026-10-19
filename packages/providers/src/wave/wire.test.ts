import { describe, expect, it } from "vitest";
import { signWave, waveJson } from "./wire.js";

/** The signed example published on https://docs.wave.com/webhook, byte for byte. */
const documentedBody =
  '{"id": "AE_ijzo7oGgrlM7", "type": "checkout.session.completed", "data": {"id": "cos-1b01sghpg100j", "amount": "100", "checkout_status": "complete", "client_reference": null, "currency": "XOF", "error_url": "https://example.com/error", "last_payment_error": null, "business_name": "Annas Apiaries", "payment_status": "succeeded", "success_url": "https://example.com/success", "wave_launch_url": "https://pay.wave.com/c/cos-1b01sghpg100j?a=100&c=XOF&m=Annas%20Apiaries", "when_completed": "2022-11-08T15:05:45Z", "when_created": "2022-11-08T15:05:32Z", "when_expires": "2022-11-09T15:05:32Z", "transaction_id": "TCN4Y4ZC3FM"}}';
const documentedSecret = "wave_sn_WHS_xz4m6g8rjs9bshxy05xj4khcvjv7j3hcp4fbpvv6met0zdrjvezg";
const documentedHeader =
  "t=1667920421,v1=53c971695230e9c51b1030d673eee76e70bbcdf8a7c5b8c1d44e0b8b1329647b";

describe("waveJson", () => {
  it("serializes exactly like the documented webhook body", () => {
    expect(waveJson(JSON.parse(documentedBody))).toBe(documentedBody);
  });

  it("separates arrays and nested objects the same way", () => {
    expect(waveJson({ a: [1, "b", null], c: { d: true } })).toBe(
      '{"a": [1, "b", null], "c": {"d": true}}',
    );
  });

  it("escapes strings as JSON does", () => {
    expect(waveJson({ q: 'say "hi"\n' })).toBe('{"q": "say \\"hi\\"\\n"}');
  });
});

describe("signWave", () => {
  it("reproduces the documented Wave-Signature test vector", () => {
    expect(signWave(documentedSecret, 1667920421, documentedBody)).toBe(documentedHeader);
  });
});
