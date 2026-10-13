import type { FastifyInstance } from "fastify";
import { webOrigin } from "./testing.js";

const day = 86_400_000;

/** A clock that tests move forward by whole days. */
export function testClock(start = "2026-10-13T12:00:00Z") {
  let time = new Date(start).getTime();
  return {
    now: () => new Date(time),
    advanceDays: (days: number) => {
      time += days * day;
    },
  };
}

export const sampleRoute = {
  service: "wave",
  country: "CI",
  stack: "laravel",
  language: "fr",
  title: "Encaisser un paiement Wave Checkout depuis Laravel",
  content: "## Prérequis\n\nUn compte marchand Wave et des webhooks signés.",
};

type Method = "GET" | "POST" | "PATCH" | "DELETE";
export type Body = { data: Record<string, unknown> | null; error: { code: string } | null };

/** Sends a JSON request as the web app would, with an optional session cookie. */
export async function call(
  app: FastifyInstance,
  method: Method,
  url: string,
  options: { cookie?: string; payload?: object; language?: string } = {},
) {
  const response = await app.inject({
    method,
    url,
    headers: {
      origin: webOrigin,
      "accept-language": options.language ?? "fr",
      ...(options.cookie === undefined ? {} : { cookie: options.cookie }),
    },
    ...(options.payload === undefined ? {} : { payload: options.payload }),
  });
  return { status: response.statusCode, body: response.json<Body>() };
}

/** Publishes an itinerary and returns its id. */
export async function publishRoute(
  app: FastifyInstance,
  cookie: string,
  overrides: Record<string, unknown> = {},
): Promise<string> {
  const { status, body } = await call(app, "POST", "/v1/routes", {
    cookie,
    payload: { ...sampleRoute, ...overrides },
  });
  if (status !== 201) throw new Error(`publish failed with ${String(status)}`);
  return String(body.data?.id);
}

/** Reads the computed state of an itinerary. */
export async function stateOf(app: FastifyInstance, id: string): Promise<unknown> {
  return (await call(app, "GET", `/v1/routes/${id}`)).body.data?.state;
}
