import type { ZodType } from "zod";

/** The five scenarios every simulated provider must answer. */
export const scenarios = [
  "success",
  "insufficient_funds",
  "timeout",
  "duplicate_webhook",
  "late_webhook",
] as const;

export type Scenario = (typeof scenarios)[number];

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

/** A call to a simulated provider, with the path after the provider prefix. */
export type SimRequest = {
  method: HttpMethod;
  path: string;
  query: Readonly<Record<string, string>>;
  headers: Readonly<Record<string, string | undefined>>;
  rawBody: string;
  body: unknown;
};

export type SimResponse = {
  status: number;
  headers?: Readonly<Record<string, string>>;
  body: unknown;
};

/** Simulated objects, scoped by the caller to one test key and one provider. */
export type ObjectStore = {
  get(kind: string, id: string): Promise<unknown>;
  put(kind: string, id: string, value: unknown): Promise<void>;
  list(kind: string): Promise<unknown[]>;
};

/** A webhook event before the provider gives it its wire shape and signature. */
export type ProviderEvent = { id: string; type: string; payload: unknown };

export type EndpointInput<Outcome> = {
  request: SimRequest;
  params: Readonly<Record<string, string>>;
  scenario: Scenario;
  outcome: Outcome;
  store: ObjectStore;
  now: Date;
  newId: () => string;
  /** Where links meant for a browser point, never to the real provider. */
  webOrigin: string;
};

export type EndpointResult = { response: SimResponse; events?: readonly ProviderEvent[] };

/** The schemas OpenAPI is generated from; null marks a documented empty body. */
export type EndpointDocs = {
  query?: ZodType;
  body?: ZodType;
  responses: Readonly<Record<number, ZodType | null>>;
};

/** Part 1: an entry point copied from the provider's public documentation. */
export type Endpoint<Outcome> = {
  method: HttpMethod;
  path: string;
  docs?: EndpointDocs;
  handle(input: EndpointInput<Outcome>): Promise<EndpointResult>;
};

/** Part 3: the wire body and headers of a webhook, signed as documented. */
export type RenderedWebhook = { body: string; headers: Readonly<Record<string, string>> };

export type WebhookSpec = {
  /** Mirrors the documented secret format, such as a provider's key prefix. */
  secretPrefix?: string;
  /** Payload schema of each documented event type, for the OpenAPI webhooks section. */
  events?: Readonly<Record<string, ZodType>>;
  signatureHeader?: string;
  render(event: ProviderEvent, options: { secret: string; now: Date }): RenderedWebhook;
};

/** endpoints maps "METHOD /path" to a one-line summary for the generated reference. */
export type ProviderCopy = {
  summary: string;
  notes: readonly string[];
  endpoints?: Readonly<Record<string, string>>;
};

/** How a developer presents the test key, as the provider documents its credential. */
export type AuthDoc = { type: "bearer" } | { type: "header"; name: string };

/** Part 4: who the provider is and which documentation the simulation follows. */
export type ProviderIdentity = {
  id: string;
  name: string;
  countries: readonly string[];
  docsUrl: string;
  docsVersion: string;
  consultedAt: string;
  officialSandboxUrl?: string;
  unofficial: true;
  copy: Readonly<Record<string, ProviderCopy>>;
};

export type Refusal = "notFound" | "unauthorized" | "tooManyRequests";

/** The four-part contract: endpoints, outcome per scenario, webhooks, identity. */
export type ProviderAdapter<Outcome = unknown> = {
  identity: ProviderIdentity;
  endpoints: readonly Endpoint<Outcome>[];
  scenarios: Readonly<Record<Scenario, Outcome>>;
  webhooks: WebhookSpec;
  credential(request: SimRequest): string | undefined;
  auth?: AuthDoc;
  errors: Readonly<Record<Refusal, (request: SimRequest) => SimResponse>>;
};
