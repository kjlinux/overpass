import type {
  AuthDoc,
  ObjectStore,
  ProviderAdapter,
  ProviderEvent,
  ProviderIdentity,
  Refusal,
  RenderedWebhook,
  Scenario,
  SimRequest,
  SimResponse,
} from "./contract.js";
import { matchPath } from "./paths.js";
import type { ExampleStep } from "./steps.js";
import { defaultTiming, scheduleWebhooks } from "./schedule.js";
import type { DeliveryTiming, ScheduledWebhook } from "./schedule.js";

export type CallContext = {
  scenario: Scenario;
  store: ObjectStore;
  now: Date;
  newId: () => string;
  webOrigin: string;
};

export type Simulation = { response: SimResponse; webhooks: ScheduledWebhook[] };

export type Simulator = {
  identities(): ProviderIdentity[];
  has(provider: string): boolean;
  handle(
    provider: string,
    request: SimRequest,
    context: CallContext,
  ): Promise<Simulation | undefined>;
  credential(provider: string, request: SimRequest): string | undefined;
  refusal(provider: string, reason: Refusal, request: SimRequest): SimResponse;
  secretPrefix(provider: string): string;
  secretHeaders(provider: string): readonly string[];
  steps(provider: string): readonly ExampleStep[];
  auth(provider: string): AuthDoc;
  renderWebhook(
    provider: string,
    event: ProviderEvent,
    options: { secret: string; now: Date },
  ): RenderedWebhook;
};

const idPattern = /^[a-z][a-z0-9-]{1,30}$/;

function assertValid(adapter: ProviderAdapter, known: Map<string, ProviderAdapter>): void {
  const { id, docsUrl } = adapter.identity;
  if (!idPattern.test(id)) throw new Error(`Provider id "${id}" must be a lowercase path segment`);
  if (!docsUrl.startsWith("https://")) throw new Error(`Provider ${id} needs an https docsUrl`);
  if (known.has(id)) throw new Error(`Provider ${id} is loaded twice`);
}

async function dispatch(
  adapter: ProviderAdapter,
  request: SimRequest,
  context: CallContext,
  timing: DeliveryTiming,
): Promise<Simulation> {
  for (const endpoint of adapter.endpoints) {
    if (endpoint.method !== request.method) continue;
    const params = matchPath(endpoint.path, request.path);
    if (params === undefined) continue;
    const outcome = adapter.scenarios[context.scenario];
    const result = await endpoint.handle({ ...context, request, params, outcome });
    return {
      response: result.response,
      webhooks: scheduleWebhooks(result.events ?? [], context.scenario, timing),
    };
  }
  return { response: adapter.errors.notFound(request), webhooks: [] };
}

/** The provider-agnostic engine: it only knows the adapters it is given. */
export function createSimulator(
  adapters: readonly ProviderAdapter[],
  timing: DeliveryTiming = defaultTiming,
): Simulator {
  const registry = new Map<string, ProviderAdapter>();
  for (const adapter of adapters) {
    assertValid(adapter, registry);
    registry.set(adapter.identity.id, adapter);
  }
  const require = (provider: string): ProviderAdapter => {
    const adapter = registry.get(provider);
    if (adapter === undefined) throw new Error(`Unknown provider ${provider}`);
    return adapter;
  };
  return {
    identities: () => [...registry.values()].map((adapter) => adapter.identity),
    has: (provider) => registry.has(provider),
    async handle(provider, request, context) {
      const adapter = registry.get(provider);
      return adapter === undefined ? undefined : dispatch(adapter, request, context, timing);
    },
    credential: (provider, request) => registry.get(provider)?.credential(request),
    refusal: (provider, reason, request) => require(provider).errors[reason](request),
    steps: (provider) => registry.get(provider)?.steps ?? [],
    auth: (provider) => registry.get(provider)?.auth ?? { type: "bearer" },
    secretPrefix: (provider) => require(provider).webhooks.secretPrefix ?? "",
    secretHeaders: (provider) => registry.get(provider)?.secretHeaders ?? [],
    renderWebhook: (provider, event, options) => require(provider).webhooks.render(event, options),
  };
}
