import { sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Database } from "../../db/client.js";
import { call } from "../../testing-routes.js";
import { createTestApp } from "../../testing.js";

let app: FastifyInstance;
let db: Database;
let close: () => Promise<void>;

type ServiceBody = { slug: string; countries: string[] }[];

beforeEach(async () => {
  ({ app, db, close } = await createTestApp());
});
afterEach(() => close());

describe("GET /v1/services and covered countries", () => {
  it("shows no country until somebody has confirmed it", async () => {
    const services = (await call(app, "GET", "/v1/services")).body.data as unknown as ServiceBody;
    expect(services.map((service) => service.countries)).toEqual(services.map(() => []));
  });

  it("shows only the confirmed countries of a service", async () => {
    await db.execute(
      sql`update service_countries set confirmed = true where country in ('SN', 'CI') and service_id = (select id from services where slug = 'pi-spi')`,
    );
    const services = (await call(app, "GET", "/v1/services")).body.data as unknown as ServiceBody;
    expect(services.find((service) => service.slug === "pi-spi")?.countries).toEqual(["CI", "SN"]);
  });
});
