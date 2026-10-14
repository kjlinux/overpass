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
