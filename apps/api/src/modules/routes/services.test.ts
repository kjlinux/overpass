import type { Service } from "@overpass/shared";
import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { call } from "../../testing-routes.js";
import { createTestApp } from "../../testing.js";

let app: FastifyInstance;
let close: () => Promise<void>;

const service = async (slug: string): Promise<Service | undefined> => {
  const services = (await call(app, "GET", "/v1/services")).body.data as unknown as Service[];
  return services.find((candidate) => candidate.slug === slug);
};

beforeEach(async () => {
  ({ app, close } = await createTestApp());
});
afterEach(() => close());

describe("GET /v1/services and covered countries", () => {
  it("shows only the confirmed countries of each operator", async () => {
    expect((await service("pi-spi"))?.countries).toEqual([
      "BF",
      "BJ",
      "CI",
      "GW",
      "ML",
      "NE",
      "SN",
      "TG",
    ]);
    expect((await service("wave"))?.countries).toEqual(["CI", "SN"]);
    expect((await service("moov-money"))?.countries).toEqual(["CI"]);
    expect((await service("orange-money"))?.countries).not.toContain("LR");
  });

  it("gives the source and the consultation date of each confirmed country", async () => {
    expect((await service("wave"))?.coverage).toEqual([
      expect.objectContaining({ country: "CI", basis: "source", consultedOn: "2026-10-13" }),
      expect.objectContaining({ country: "SN", basis: "source", consultedOn: "2026-10-13" }),
    ]);
    expect((await service("wave"))?.coverage[0]?.source).toMatch(/^https:\/\//);
  });
});
