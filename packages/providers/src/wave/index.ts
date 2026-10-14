import type { ProviderAdapter, SimRequest } from "@overpass/simulator";
import { waveEndpoints } from "./endpoints.js";
import { waveErrors } from "./errors.js";
import en from "./locales/en.json" with { type: "json" };
import fr from "./locales/fr.json" with { type: "json" };
import protocol from "./protocol.json" with { type: "json" };
import type { WaveOutcome } from "./session.js";
import { signWave, waveJson } from "./wire.js";

const bearer = /^Bearer (\S+)$/;
const insufficient = { code: "insufficient-funds", message: protocol.insufficientBalance };

function unauthorized(request: SimRequest) {
  const header = request.headers.authorization;
  if (header === undefined) return waveErrors.missingAuth();
  return bearer.test(header) ? waveErrors.unknownKey() : waveErrors.invalidAuth();
}

/** Unofficial Wave Checkout simulator, built from the public reference only. */
export const wave: ProviderAdapter<WaveOutcome> = {
  identity: {
    id: "wave",
    name: "Wave",
    countries: ["SN", "CI", "ML", "BF", "UG"],
    docsUrl: "https://docs.wave.com/checkout",
    docsVersion: "Changelog 2024-03-29",
    consultedAt: "2026-10-14",
    unofficial: true,
    copy: { fr, en },
  },
  scenarios: {
    success: { payment: "succeeded" },
    insufficient_funds: { payment: "failed", error: insufficient },
    timeout: { payment: "expired" },
    duplicate_webhook: { payment: "succeeded" },
    late_webhook: { payment: "succeeded" },
  },
  credential: (request) => bearer.exec(request.headers.authorization ?? "")?.[1],
  errors: {
    notFound: waveErrors.unknownRoute,
    unauthorized,
    tooManyRequests: waveErrors.tooManyRequests,
  },
  endpoints: waveEndpoints,
  webhooks: {
    secretPrefix: "wave_sn_WHS_",
    render(event, { secret, now }) {
      const body = waveJson({ id: event.id, type: event.type, data: event.payload });
      const signature = signWave(secret, Math.floor(now.getTime() / 1000), body);
      return {
        body,
        headers: {
          "content-type": "application/json",
          "user-agent": "Wave/1.0",
          "wave-signature": signature,
        },
      };
    },
  },
};
