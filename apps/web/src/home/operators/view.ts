import { serviceSchema } from "@overpass/shared";
import type { Service } from "@overpass/shared";
import { z } from "zod";

export type Operator = {
  slug: string;
  name: string;
  category: Service["category"];
  countries: number;
};

export type OperatorsState =
  { status: "loading" } | { status: "ready"; operators: Operator[] } | { status: "error" };

export type OperatorsView =
  { kind: "loading" } | { kind: "hidden" } | { kind: "shown"; operators: Operator[] };

const servicesSchema = z.array(serviceSchema);

/** Reads GET /v1/services against the shared contract and keeps the services the database marks simulated. */
export function parseOperators(data: unknown): Operator[] | null {
  const parsed = servicesSchema.safeParse(data);
  if (!parsed.success) return null;
  return parsed.data
    .filter((service) => service.simulated)
    .map(({ slug, name, category, countries }) => ({
      slug,
      name,
      category,
      countries: countries.length,
    }));
}

/** A failed or empty answer hides the list: the home page never shows an error for it. */
export function operatorsView(state: OperatorsState): OperatorsView {
  if (state.status === "loading") return { kind: "loading" };
  if (state.status === "error" || state.operators.length === 0) return { kind: "hidden" };
  return { kind: "shown", operators: state.operators };
}
