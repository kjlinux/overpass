import { createHmac } from "node:crypto";
import type {
  ProviderEndpoint,
  ProviderIdentity,
  SimulatedProvider,
  SimulatedWebhook,
  SimulationOutcome,
  SimulationRequest,
} from "@overpass/simulator";

const pispiIdentity: ProviderIdentity = {
  id: "pispi",
  name: "PI-SPI (BCEAO)",
  countries: ["BJ", "BF", "CI", "GW", "ML", "NE", "SN", "TG"],
  docsVersion: "2026-10-12",
  unofficial: true,
};

const pispiEndpoints: readonly ProviderEndpoint[] = [
  {
    method: "POST",
    path: "/v1/instant-transfers",
    summary: "Initiate BCEAO instant transfer",
  },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export class PiSpiProvider implements SimulatedProvider {
  readonly identity = pispiIdentity;
  readonly endpoints = pispiEndpoints;

  signWebhook(payload: string, secret: string): Record<string, string> {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex");
    return {
      "pispi-signature": `t=${timestamp},v1=${signature}`,
    };
  }

  simulate(request: SimulationRequest): Promise<SimulationOutcome> {
    if (request.scenario === "operator_timeout") {
      return Promise.resolve({
        response: {
          status: 504,
          headers: { "content-type": "application/json" },
          body: { error: "operator_timeout", detail: "pispi_switch_timeout" },
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
    const secret = request.secret ?? "pispi_secret_test";
    const body = isRecord(request.body) ? request.body : {};
    const amount = typeof body.amount === "string" ? body.amount : "5000";
    const currency = typeof body.currency === "string" ? body.currency : "XOF";
    const transferId = "trf_pispi_" + Math.random().toString(36).slice(2, 10);
    const isSuccess = request.scenario !== "insufficient_funds";

    return {
      secret,
      responseBody: {
        id: transferId,
        amount,
        currency,
        status: isSuccess ? "ACCEPTED" : "REJECTED",
        settlement_system: "BCEAO_PI_SPI",
        created_at: new Date().toISOString(),
      },
      webhookPayload: {
        event: isSuccess ? "TRANSFER_COMPLETED" : "TRANSFER_FAILED",
        transfer_id: transferId,
        amount,
        currency,
        reason_code: isSuccess ? "ACCP" : "AM04",
        timestamp: new Date().toISOString(),
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
