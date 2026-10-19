export type Parameter = { name: string; in: string; required: boolean };
export type Operation = {
  method: string;
  path: string;
  summary: string;
  parameters: Parameter[];
  responses: string[];
};
export type Provider = { id: string; name: string; unofficial: boolean; docsVersion: string };
export type Reference = {
  groups: { tag: string; operations: Operation[] }[];
  providers: Provider[];
};

const methods = ["get", "post", "put", "patch", "delete"] as const;

type Raw = Record<string, unknown>;

const record = (value: unknown): Raw =>
  typeof value === "object" && value !== null ? (value as Raw) : {};
const text = (value: unknown): string => (typeof value === "string" ? value : "");

function parameterOf(value: unknown): Parameter {
  const raw = record(value);
  return { name: text(raw.name), in: text(raw.in), required: raw.required === true };
}

function operationOf(path: string, method: string, raw: Raw): Operation {
  return {
    method: method.toUpperCase(),
    path,
    summary: text(raw.summary),
    parameters: Array.isArray(raw.parameters) ? raw.parameters.map(parameterOf) : [],
    responses: Object.keys(record(raw.responses)),
  };
}

function providerOf(value: unknown): Provider {
  const raw = record(value);
  const { id, name, docsVersion } = raw;
  return {
    id: text(id),
    name: text(name),
    unofficial: raw.unofficial === true,
    docsVersion: text(docsVersion),
  };
}

/** Reads the simulator's OpenAPI document defensively: it is rendered, never trusted as shaped. */
export function referenceOf(document: unknown): Reference {
  const groups = new Map<string, Operation[]>();
  for (const [path, item] of Object.entries(record(record(document).paths))) {
    for (const [method, value] of Object.entries(record(item))) {
      if (!(methods as readonly string[]).includes(method)) continue;
      const raw = record(value);
      const tag = text((raw.tags as unknown[] | undefined)?.[0]);
      groups.set(tag, [...(groups.get(tag) ?? []), operationOf(path, method, raw)]);
    }
  }
  const providers = record(record(document).info)["x-providers"];
  return {
    groups: [...groups].map(([tag, operations]) => ({ tag, operations })),
    providers: Array.isArray(providers) ? providers.map(providerOf) : [],
  };
}
