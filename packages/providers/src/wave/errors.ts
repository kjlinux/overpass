import type { SimResponse } from "@overpass/simulator";
import protocol from "./protocol.json" with { type: "json" };

export type Detail = { loc: string[]; msg: string };

const fail = (status: number, code: string, text: string): SimResponse => ({
  status,
  body: { code, message: text },
});

/** Codes and texts of the Checkout reference; empty bodies where none is documented. */
export const waveErrors = {
  missingAuth: () => fail(401, "missing-auth-header", protocol.missingAuth),
  invalidAuth: () => fail(401, "invalid-auth", protocol.invalidAuth),
  unknownKey: () => fail(401, "no-matching-api-key", protocol.unknownKey),
  sessionNotFound: () => fail(404, "checkout-session-not-found", protocol.sessionNotFound),
  refundFailed: () => fail(400, "checkout-refund-failed", protocol.refundFailed),
  invalid: (details: Detail[]): SimResponse => ({
    status: 400,
    body: { code: "request-validation-error", message: protocol.requestInvalid, details },
  }),
  conflict: (): SimResponse => ({ status: 409, body: null }),
  unknownRoute: (): SimResponse => ({ status: 404, body: null }),
  tooManyRequests: (): SimResponse => ({ status: 429, body: null }),
};

export const missing = (field: string): Detail => ({ loc: [field], msg: protocol.fieldRequired });

/** Wording of the simulator: the reference only documents the missing-field case. */
export const invalidValue = (field: string): Detail => ({
  loc: [field],
  msg: "value is not valid",
});
