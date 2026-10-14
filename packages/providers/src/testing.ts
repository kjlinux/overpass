import { createSimulator } from "@overpass/simulator";
import type { ObjectStore, ProviderAdapter, Scenario, SimRequest } from "@overpass/simulator";

/** The in-memory twin of the sandbox object store, for adapter tests. */
export function memoryStore(): ObjectStore {
  const objects = new Map<string, unknown>();
  return {
    get: (kind, id) => Promise.resolve(objects.get(`${kind}:${id}`)),
    put: (kind, id, value) => {
      objects.set(`${kind}:${id}`, value);
      return Promise.resolve();
    },
    list: (kind) =>
      Promise.resolve(
        [...objects].filter(([key]) => key.startsWith(`${kind}:`)).map(([, value]) => value),
      ),
  };
}

type Call = Partial<SimRequest> & Pick<SimRequest, "method" | "path">;

/** Drives one adapter through the engine, as the sandbox gateway does. */
export function harness(adapter: ProviderAdapter, start = "2026-10-14T10:00:00Z") {
  const simulator = createSimulator([adapter]);
  const store = memoryStore();
  let counter = 0;
  const newId = () => (++counter).toString(16).padStart(20, "a");
  const now = new Date(start);
  const id = adapter.identity.id;
  return {
    simulator,
    now,
    async call(scenario: Scenario, partial: Call) {
      const rawBody = partial.body === undefined ? "" : JSON.stringify(partial.body);
      const request: SimRequest = { query: {}, headers: {}, rawBody, body: undefined, ...partial };
      const context = { scenario, store, now, newId, webOrigin: "https://overpass.test" };
      const result = await simulator.handle(id, request, context);
      if (result === undefined) throw new Error(`${id} is not loaded`);
      return result;
    },
  };
}
