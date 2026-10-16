import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { testClock } from "../../testing-routes.js";
import { webOrigin, createTestApp, registerAccount } from "../../testing.js";

let app: FastifyInstance;
let close: () => Promise<void>;
let awa: string;
let moussa: string;

beforeEach(async () => {
  ({ app, close } = await createTestApp({ now: testClock().now }));
  awa = await registerAccount(app, "awa@example.com");
  moussa = await registerAccount(app, "moussa@example.com");
});
afterEach(() => close());

/** PUT and DELETE are not in the shared call helper, so requests are built here. */
async function send(method: "GET" | "PUT" | "DELETE", url: string, cookie?: string) {
  const headers = { origin: webOrigin, ...(cookie === undefined ? {} : { cookie }) };
  const response = await app.inject({ method, url, headers });
  return { status: response.statusCode, body: response.json<{ data: unknown; error: unknown }>() };
}

const voteUrl = (slug: string) => `/v1/services/${slug}/simulator-vote`;

describe("simulator votes", () => {
  it("requires a session to vote", async () => {
    expect((await send("PUT", voteUrl("orange-money"))).status).toBe(401);
  });

  it("counts one vote per account, and lets it be withdrawn", async () => {
    await send("PUT", voteUrl("orange-money"), awa);
    const twice = await send("PUT", voteUrl("orange-money"), awa);
    expect(twice.body.data).toEqual({
      service: "orange-money",
      simulated: false,
      votes: 1,
      voted: true,
    });
    await send("PUT", voteUrl("orange-money"), moussa);
    expect((await send("GET", voteUrl("orange-money"))).body.data).toMatchObject({
      votes: 2,
      voted: false,
    });
    const withdrawn = await send("DELETE", voteUrl("orange-money"), awa);
    expect(withdrawn.body.data).toMatchObject({ votes: 1, voted: false });
  });

  it("refuses a vote for a service that already has a simulator", async () => {
    const response = await send("PUT", voteUrl("wave"), awa);
    expect(response.status).toBe(409);
    expect(response.body.error).toMatchObject({ code: "already_simulated" });
  });

  it("answers 404 for an unknown service", async () => {
    expect((await send("PUT", voteUrl("nope-pay"), awa)).status).toBe(404);
  });
});

describe("GET /v1/simulator-requests", () => {
  it("ranks the requested services by votes", async () => {
    await send("PUT", voteUrl("moov-money"), awa);
    await send("PUT", voteUrl("orange-money"), awa);
    await send("PUT", voteUrl("orange-money"), moussa);
    const ranking = (await send("GET", "/v1/simulator-requests")).body.data;
    expect(ranking).toEqual([
      {
        rank: 1,
        service: { slug: "orange-money", name: "Orange Money", category: "payment" },
        votes: 2,
      },
      { rank: 2, service: { slug: "moov-money", name: "Moov Money", category: "payment" }, votes: 1 },
    ]);
  });
});
