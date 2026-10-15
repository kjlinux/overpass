export type CommandInput = { origin: string; key: string; forwardTo?: string };

const defaultForward = "http://localhost:3000/webhook";

/** The local relay command, one flag per line so it reads and copies cleanly. */
export function relayCommand({ origin, key, forwardTo = defaultForward }: CommandInput): string {
  return [
    "npx overpass-cli listen \\",
    `  --forward-to ${forwardTo} \\`,
    `  --key ${key} \\`,
    `  --api ${origin}`,
  ].join("\n");
}

export type CurlStep = {
  method: string;
  path: string;
  headers: Record<string, string>;
  body: unknown;
};
export type CurlAuth = { type: "bearer" } | { type: "header"; name: string };
export type CurlInput = {
  origin: string;
  provider: string;
  step: CurlStep;
  auth: CurlAuth;
  key: string;
  vars: Record<string, string>;
};

const fill = (text: string, vars: Record<string, string>) =>
  text.replace(/\{\{(\w+)\}\}/g, (match, name: string) => vars[name] ?? match);

// Captured values come from responses, so they must stay inside their quotes once pasted.
const doubleQuoted = (text: string) => `"${text.replace(/[\\"$`]/g, "\\$&")}"`;
const singleQuoted = (text: string) => `'${text.replaceAll("'", "'\\''")}'`;

function fillDeep(value: unknown, vars: Record<string, string>): unknown {
  if (typeof value === "string") return fill(value, vars);
  if (Array.isArray(value)) return value.map((item) => fillDeep(item, vars));
  if (value === null || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value).map(([name, item]) => [name, fillDeep(item, vars)]),
  );
}

/** One walkthrough step as a curl command, the key where the provider expects it. */
export function curlOf({ origin, provider, step, auth, key, vars }: CurlInput): string {
  const keyHeader =
    auth.type === "bearer" ? `Authorization: Bearer ${key}` : `${auth.name}: ${key}`;
  const headers = Object.entries(step.headers).map(
    ([name, value]) => `${name}: ${fill(value, vars)}`,
  );
  const needsKey = auth.type === "header" || !("authorization" in step.headers);
  const url = `${origin}/v1/sandbox/${provider}${fill(step.path, vars)}`;
  const lines = [`curl -X ${step.method} ${doubleQuoted(url)}`];
  if (needsKey) lines.push(`-H ${doubleQuoted(keyHeader)}`);
  lines.push(...headers.map((header) => `-H ${doubleQuoted(header)}`));
  if (typeof step.body === "string") lines.push(`--data ${singleQuoted(fill(step.body, vars))}`);
  else if (step.body !== null && step.body !== undefined) {
    if (!("content-type" in step.headers)) lines.push('-H "content-type: application/json"');
    lines.push(`--data ${singleQuoted(JSON.stringify(fillDeep(step.body, vars)))}`);
  }
  return lines.join(" \\\n  ");
}
