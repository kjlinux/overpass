import { createHmac } from "node:crypto";
import type {
  ProviderEndpoint,
  ProviderIdentity,
  SimulatedProvider,
  SimulatedWebhook,
  SimulationOutcome,
  SimulationRequest,
} from "@overpass/simulator";

const cinetpayIdentity: ProviderIdentity = {
  id: "cinetpay",
  name: "CinetPay",
  countries: ["CI", "SN", "BF", "BJ", "TG", "ML", "NE", "CD", "CM"],
  docsVersion: "2026-10-12",
  unofficial: true,
};

const cinetpayEndpoints: readonly ProviderEndpoint[] = [
  {
    method: "POST",
    path: "/v1/payment",
    summary: "Initialize CinetPay payment",
  },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export class CinetPayProvider implements SimulatedProvider {
  readonly identity = cinetpayIdentity;
  readonly endpoints = cinetpayEndpoints;

  signWebhook(payload: string, secret: string): Record<string, string> {
    const signature = createHmac("sha256", secret).update(payload).digest("hex");
    return {
      "x-token": signature,
    };
  }

  simulate(request: SimulationRequest): Promise<SimulationOutcome> {
    if (request.scenario === "operator_timeout") {
      return Promise.resolve({
        response: {
          status: 504,
          headers: { "content-type": "application/json" },
          body: { code: "504", error: "operator_timeout", detail: "cinetpay_timeout" },
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
    const secret = request.secret ?? "cinetpay_secret_test";
    const body = isRecord(request.body) ? request.body : {};
    const amount = typeof body.amount === "string" ? body.amount : "1000";
    const currency = typeof body.currency === "string" ? body.currency : "XOF";
    const transId =
      typeof body.transaction_id === "string" ? body.transaction_id : `cp_tx_${String(Date.now())}`;
    const token = "tok_cp_" + Math.random().toString(36).slice(2, 12);
    const isSuccess = request.scenario !== "insufficient_funds";

    return {
      secret,
      responseBody: {
        code: "201",
        status: "CREATED",
        data: {
          payment_token: token,
          payment_url: `https://checkout.cinetpay.com/payment/${token}`,
        },
      },
      webhookPayload: {
        cpm_site_id: typeof body.site_id === "string" ? body.site_id : "123456",
        cpm_trans_id: transId,
        cpm_trans_date: new Date().toISOString(),
        cpm_amount: amount,
        cpm_currency: currency,
        cpm_result: isSuccess ? "00" : "602",
        cpm_trans_status: isSuccess ? "ACCEPTED" : "REFUSED",
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
