import type { SimResponse } from "@overpass/simulator";
import protocol from "./protocol.json" with { type: "json" };

// PayDunya documents only the success code 00, so every refusal carries a code of the simulator.
const fail = (status: number, code: string, text: string): SimResponse => ({
  status,
  body: { response_code: code, response_text: text },
});

export const paydunyaErrors = {
  invalid: (field: string) =>
    fail(400, protocol.codes.invalid, `${protocol.texts.invalid}${field}`),
  unauthorized: () => fail(401, protocol.codes.unauthorized, protocol.texts.unauthorized),
  notFound: () => fail(404, protocol.codes.notFound, protocol.texts.notFound),
  tooManyRequests: () => fail(429, protocol.codes.tooManyRequests, protocol.texts.tooManyRequests),
};
