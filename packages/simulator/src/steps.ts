import type { HttpMethod } from "./contract.js";

/** One call of a provider walkthrough; "{{name}}" placeholders take values captured earlier. */
export type ExampleStep = {
  id: string;
  method: HttpMethod;
  path: string;
  headers?: Readonly<Record<string, string>>;
  /** An object is sent as JSON; a string is sent as is, for form bodies. */
  body?: unknown;
  /** Variable name to read from a top-level field of the response body. */
  capture?: Readonly<Record<string, string>>;
  /** Played by the trial page's launch button, in order. */
  launch?: boolean;
};

export type FilledStep = {
  method: HttpMethod;
  path: string;
  headers: Record<string, string>;
  rawBody: string;
};

export type StepVars = Readonly<Record<string, string>>;

const placeholder = /\{\{(\w+)\}\}/g;

function fill(
  text: string,
  vars: StepVars,
  encode: (value: string) => string = (value) => value,
): string {
  return text.replace(placeholder, (match, name: string) => {
    const value = vars[name];
    return value === undefined ? match : encode(value);
  });
}

function fillDeep(value: unknown, vars: StepVars): unknown {
  if (typeof value === "string") return fill(value, vars);
  if (Array.isArray(value)) return value.map((item) => fillDeep(item, vars));
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, fillDeep(item, vars)]),
    );
  }
  return value;
}

/** Turns a step into the request the gateway plays. */
export function fillStep(step: ExampleStep, vars: StepVars): FilledStep {
  const headers = Object.fromEntries(
    Object.entries(step.headers ?? {}).map(([name, value]) => [name, fill(value, vars)]),
  );
  const path = fill(step.path, vars, encodeURIComponent);
  if (step.body === undefined) return { method: step.method, path, headers, rawBody: "" };
  if (typeof step.body === "string")
    return { method: step.method, path, headers, rawBody: fill(step.body, vars) };
  return {
    method: step.method,
    path,
    headers: { ...headers, "content-type": headers["content-type"] ?? "application/json" },
    rawBody: JSON.stringify(fillDeep(step.body, vars)),
  };
}

/** Reads the variables a step captures from its response, when they are there. */
export function captureVars(step: ExampleStep, body: unknown): Record<string, string> {
  if (body === null || typeof body !== "object") return {};
  const fields = body as Record<string, unknown>;
  const captured: Record<string, string> = {};
  for (const [name, field] of Object.entries(step.capture ?? {})) {
    const value = fields[field];
    if (typeof value === "string" || typeof value === "number") captured[name] = String(value);
  }
  return captured;
}

export const launchSteps = (steps: readonly ExampleStep[]): ExampleStep[] =>
  steps.filter((step) => step.launch === true);
