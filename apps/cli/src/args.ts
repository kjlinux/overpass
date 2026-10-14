export type ArgError =
  | "missing_forward"
  | "missing_key"
  | "missing_api"
  | "invalid_forward"
  | "invalid_key"
  | "invalid_api"
  | "unknown_command";

export type Parsed =
  | { command: "listen"; forwardTo: string; key: string; api: string }
  | { command: "help" }
  | { command: "error"; error: ArgError };

type Env = Record<string, string | undefined>;

const keyPattern = /^ovp_test_[\w-]+$/;

function isHttpUrl(value: string): boolean {
  try {
    const { protocol } = new URL(value);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

function readFlags(argv: readonly string[]): Map<string, string> {
  const flags = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index] ?? "";
    if (!argument.startsWith("--")) continue;
    const [name, inline] = argument.slice(2).split(/=(.*)/s, 2);
    const value = inline ?? argv[index + 1];
    if (inline === undefined && value !== undefined && !value.startsWith("--")) index += 1;
    flags.set(name ?? "", value !== undefined && !value.startsWith("--") ? value : "");
  }
  return flags;
}

const fail = (error: ArgError): Parsed => ({ command: "error", error });

/** overpass listen --forward-to <url> [--key <key>] [--api <url>] */
export function parseArgs(argv: readonly string[], env: Env): Parsed {
  const [command, ...rest] = argv;
  if (command === undefined || argv.includes("--help") || argv.includes("-h"))
    return { command: "help" };
  if (command !== "listen") return fail("unknown_command");
  const flags = readFlags(rest);
  const forwardTo = flags.get("forward-to");
  const key = flags.get("key") ?? env.OVERPASS_KEY;
  const api = flags.get("api") ?? env.OVERPASS_API_URL;
  if (forwardTo === undefined || forwardTo === "") return fail("missing_forward");
  if (key === undefined || key === "") return fail("missing_key");
  if (api === undefined || api === "") return fail("missing_api");
  if (!isHttpUrl(forwardTo)) return fail("invalid_forward");
  if (!keyPattern.test(key)) return fail("invalid_key");
  if (!isHttpUrl(api)) return fail("invalid_api");
  return { command: "listen", forwardTo, key, api: api.replace(/\/+$/, "") };
}
