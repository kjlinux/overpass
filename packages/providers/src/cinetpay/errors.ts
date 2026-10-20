import type { SimResponse } from "@overpass/simulator";
import protocol from "./protocol.json" with { type: "json" };

const { statuses, texts } = protocol;

// The README names apiCode and apiStatus on refusals; the body shape is a simulator choice.
const fail = (code: number, status: string, message: string): SimResponse => ({
  status: code,
  body: { code, status, message },
});

export const cinetpayErrors = {
  invalid: (field: string) => fail(422, statuses.invalid, `${texts.invalid}${field}`),
  duplicate: (id: string) => fail(422, statuses.invalid, `${texts.duplicate}${id}`),
  invalidToken: () => fail(401, statuses.invalidToken, texts.invalidToken),
  expiredToken: () => fail(401, statuses.expiredToken, texts.expiredToken),
  notFound: () => fail(404, statuses.notFound, texts.notFound),
  tooManyRequests: () => fail(429, statuses.tooManyRequests, texts.tooManyRequests),
};
