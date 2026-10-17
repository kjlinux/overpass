export type ScenarioId =
  | "payment_success"
  | "insufficient_funds"
  | "operator_timeout"
  | "duplicate_webhook"
  | "delayed_webhook";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type ProviderIdentity = {
  readonly id: string;
  readonly name: string;
  readonly countries: readonly string[];
  readonly docsVersion: string;
  readonly unofficial: true;
};

export type ProviderEndpoint = {
  readonly method: HttpMethod;
  readonly path: string;
  readonly summary: string;
};

export type SimulationRequest = {
  readonly scenario: ScenarioId;
  readonly method: HttpMethod;
  readonly path: string;
  readonly headers?: Record<string, string> | undefined;
  readonly body?: unknown;
  readonly webhookUrl?: string | undefined;
  readonly secret?: string | undefined;
};

export type SimulatedWebhook = {
  readonly delayMs: number;
  readonly headers: Record<string, string>;
  readonly payload: unknown;
  readonly duplicateOf?: number | undefined;
};

export type SimulationOutcome = {
  readonly response: {
    readonly status: number;
    readonly headers: Record<string, string>;
    readonly body: unknown;
  };
  readonly webhooks: readonly SimulatedWebhook[];
};

export interface SimulatedProvider {
  readonly identity: ProviderIdentity;
  readonly endpoints: readonly ProviderEndpoint[];
  simulate(request: SimulationRequest): Promise<SimulationOutcome>;
  signWebhook(payload: string, secret: string): Record<string, string>;
}
