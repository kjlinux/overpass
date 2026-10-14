import { spawn } from "node:child_process";
import type { ChildProcess } from "node:child_process";
import { apiEnv } from "./paths.js";

const tsx = "node_modules/tsx/dist/cli.mjs";

export type Running = { output: () => string; stop: () => void };

/** Runs a TypeScript entry point with the API's environment, the way npm run dev would. */
export function start(
  entry: string,
  args: string[] = [],
  env: Record<string, string> = {},
): Running {
  const child: ChildProcess = spawn(process.execPath, [tsx, entry, ...args], {
    env: { ...process.env, ...apiEnv, ...env },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  child.stdout?.on("data", (chunk: Buffer) => (output += chunk.toString("utf8")));
  child.stderr?.on("data", (chunk: Buffer) => (output += chunk.toString("utf8")));
  return { output: () => output, stop: () => child.kill() };
}

/** The webhook worker: without it nothing leaves the queue. */
export const startWorker = () => start("apps/api/src/worker.ts");
