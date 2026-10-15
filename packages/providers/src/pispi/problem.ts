import type { SimResponse } from "@overpass/simulator";
import type { z } from "zod";
import protocol from "./protocol.json" with { type: "json" };

export type InvalidParam = { name: string; reason: string };

/** RFC 7807 problem details, as every PI-SPI error example writes them. */
export function problem(
  status: number,
  title: string,
  detail: string,
  invalid?: InvalidParam[],
): SimResponse {
  const body = {
    type: "about:blank",
    title,
    status,
    detail,
    ...(invalid === undefined ? {} : { "invalid-params": invalid }),
  };
  return { status, headers: { "content-type": "application/problem+json" }, body };
}

export const problems = {
  badRequest: (invalid: InvalidParam[]) =>
    problem(400, "Bad Request", protocol.badRequest, invalid),
  unauthorized: () => problem(401, "Unauthorized", protocol.unauthorized),
  forbidden: (detail: string, invalid?: InvalidParam[]) =>
    problem(403, "Forbidden", detail, invalid),
  notFound: (detail: string = protocol.notFound) => problem(404, "NotFound", detail),
  conflict: () => problem(409, "Conflict", protocol.conflict),
  tooManyRequests: () => problem(429, "Too Many Requests", protocol.tooMany),
};

/** One invalid-params entry per offending top-level field. */
export function invalidParams(error: z.ZodError): InvalidParam[] {
  const names = new Set(error.issues.map((issue) => String(issue.path[0] ?? "body")));
  return [...names].map((name) => ({ name, reason: protocol.simulatorInvalidField }));
}

/** Parses a body or answers the documented 400 problem. */
export function parseBody<T>(
  schema: z.ZodType<T>,
  body: unknown,
): { value: T } | { refusal: SimResponse } {
  const parsed = schema.safeParse(body ?? {});
  return parsed.success
    ? { value: parsed.data }
    : { refusal: problems.badRequest(invalidParams(parsed.error)) };
}

export const noContent = (): SimResponse => ({ status: 204, body: null });
export const json = (status: number, body: unknown): SimResponse => ({ status, body });
