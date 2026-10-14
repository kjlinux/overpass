import { STATUS_CODES } from "node:http";
import { z } from "zod";
import type { ZodType } from "zod";

export type JsonObject = Record<string, unknown>;

/** JSON Schema 2020-12, the dialect of OpenAPI 3.1, without the $schema marker. */
export function jsonSchema(schema: ZodType, io: "input" | "output"): JsonObject {
  const generated = z.toJSONSchema(schema, { io, unrepresentable: "any" }) as JsonObject;
  return Object.fromEntries(Object.entries(generated).filter(([key]) => key !== "$schema"));
}

export function jsonBody(schema: ZodType, io: "input" | "output"): JsonObject {
  return { content: { "application/json": { schema: jsonSchema(schema, io) } } };
}

/** Standard reason phrases describe responses; the schema carries the meaning. */
export function responses(entries: Readonly<Record<number, ZodType | null>>): JsonObject {
  return Object.fromEntries(
    Object.entries(entries).map(([status, schema]) => {
      const description = STATUS_CODES[Number(status)] ?? status;
      return [
        status,
        schema === null ? { description } : { description, ...jsonBody(schema, "output") },
      ];
    }),
  );
}

/** Query parameters from an object schema, one per property. */
export function queryParameters(schema: ZodType | undefined): JsonObject[] {
  if (schema === undefined) return [];
  const object = jsonSchema(schema, "input") as { properties?: JsonObject; required?: string[] };
  return Object.entries(object.properties ?? {}).map(([name, property]) => ({
    name,
    in: "query",
    required: object.required?.includes(name) ?? false,
    schema: property,
  }));
}
