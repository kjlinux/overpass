import { createHash, createHmac } from "node:crypto";
import type {
  ProviderEndpoint,
  ProviderIdentity,
  SimulatedProvider,
  SimulatedWebhook,
  SimulationOutcome,
  SimulationRequest,
} from "@overpass/simulator";

const paydunyaIdentity: ProviderIdentity = {
  id: "paydunya",
  name: "PayDunya",
  countries: ["SN", "CI", "BJ", "TG"],
  docsVersion: "2026-10-12",
  unofficial: true,
};

const paydunyaEndpoints: readonly ProviderEndpoint[] = [
  {
    method: "POST",
    path: "/api/v1/checkout-invoice/create",
    summary: "Create PayDunya checkout invoice",
  },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export class PayDunyaProvider implements SimulatedProvider {
  readonly identity = paydunyaIdentity;
  readonly endpoints = paydunyaEndpoints;

  signWebhook(payload: string, secret: string): Record<string, string> {
    const signature = createHmac("sha512", secret).update(payload).digest("hex");
    return {
      "x-paydunya-signature": signature,
    };
  }

  simulate(request: SimulationRequest): Promise<SimulationOutcome> {
    if (request.scenario === "operator_timeout") {
      return Promise.resolve({
        response: {
          status: 504,
          headers: { "content-type": "application/json" },
          body: { response_code: "504", response_text: "operator_timeout" },
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
    const secret = request.secret ?? "paydunya_secret_test";
    const body = isRecord(request.body) ? request.body : {};
    const invoice = isRecord(body.invoice) ? body.invoice : {};
    const amount = typeof invoice.total_amount === "string" ? invoice.total_amount : "2000";
    const token = "inv_pd_" + Math.random().toString(36).slice(2, 12);
    const isSuccess = request.scenario !== "insufficient_funds";
    const hash = createHash("sha512").update(secret).digest("hex");

    return {
      secret,
      responseBody: {
        response_code: "00",
        response_text: `https://paydunya.com/checkout/invoice/${token}`,
        token,
        ["description"]: "invoice_created",
      },

      webhookPayload: {
        data: {
          status: isSuccess ? "completed" : "failed",
          invoice: {
            token,
            total_amount: amount,
          },
          fail_reason: isSuccess ? undefined : "insufficient_funds",
        },
        hash,
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
