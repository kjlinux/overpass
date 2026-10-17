import { createHmac } from "node:crypto";
import type {
  ProviderEndpoint,
  ProviderIdentity,
  SimulatedProvider,
  SimulatedWebhook,
  SimulationOutcome,
  SimulationRequest,
} from "@overpass/simulator";

const waveIdentity: ProviderIdentity = {
  id: "wave",
  name: "Wave",
  countries: ["SN", "CI"],
  docsVersion: "2026-10-12",
  unofficial: true,
};

const waveEndpoints: readonly ProviderEndpoint[] = [
  {
    method: "POST",
    path: "/v1/checkout/sessions",
    summary: "Create Wave checkout session",
  },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export class WaveProvider implements SimulatedProvider {
  readonly identity = waveIdentity;
  readonly endpoints = waveEndpoints;

  signWebhook(payload: string, secret: string): Record<string, string> {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex");
    return {
      "wave-signature": `t=${timestamp},v1=${signature}`,
    };
  }

  simulate(request: SimulationRequest): Promise<SimulationOutcome> {
    if (request.scenario === "operator_timeout") {
      return Promise.resolve({
        response: {
          status: 504,
          headers: { "content-type": "application/json" },
          body: { error: "operator_timeout", detail: "wave_timeout" },
        },
        webhooks: [],
      });
    }

    const { responseBody, webhookPayload, secret } = this.createPayloads(request);
    const sigHeaders = this.signWebhook(JSON.stringify(webhookPayload), secret);
    const headers = { "content-type": "application/json", ...sigHeaders };

    return Promise.resolve(this.buildWebhooks(request, responseBody, webhookPayload, headers));
  }

  private createPayloads(request: SimulationRequest) {
    const secret = request.secret ?? "wave_secret_test";
    const body = isRecord(request.body) ? request.body : {};
    const amount = typeof body.amount === "string" ? body.amount : "1000";
    const currency = typeof body.currency === "string" ? body.currency : "XOF";
    const clientRef = typeof body.client_reference === "string" ? body.client_reference : "ref_001";
    const sessionId = "cos_sim_" + Math.random().toString(36).slice(2, 10);
    const eventId = "evt_sim_" + Math.random().toString(36).slice(2, 10);
    const isSuccess = request.scenario !== "insufficient_funds";

    return {
      secret,
      responseBody: {
        id: sessionId,
        amount,
        currency,
        checkout_status: isSuccess ? "complete" : "processing",
        client_reference: clientRef,
        wave_launch_url: `https://wave.com/c/${sessionId}`,
      },
      webhookPayload: {
        id: eventId,
        type: isSuccess ? "checkout.session.completed" : "checkout.session.cancelled",
        data: {
          id: sessionId,
          amount,
          currency,
          checkout_status: isSuccess ? "complete" : "cancelled",
          client_reference: clientRef,
        },
      },
    };
  }

  private buildWebhooks(
    request: SimulationRequest,
    responseBody: Record<string, unknown>,
    webhookPayload: Record<string, unknown>,
    headers: Record<string, string>,
  ): SimulationOutcome {
    const primaryDelay = request.scenario === "delayed_webhook" ? 10000 : 0;
    const webhooks: SimulatedWebhook[] = [
      {
        delayMs: primaryDelay,
        headers,
        payload: webhookPayload,
      },
    ];

    if (request.scenario === "duplicate_webhook") {
      webhooks.push({
        delayMs: 2000,
        headers,
        payload: webhookPayload,
        duplicateOf: 0,
      });
    }

    return {
      response: {
        status: 200,
        headers: { "content-type": "application/json" },
        body: responseBody,
      },
      webhooks,
    };
  }
}
