import type { SandboxEvent } from "@overpass/shared";

export type StageState = "pending" | "done" | "failed";
export type Stages = { request: StageState; response: StageState; webhook: StageState };

/** The three states of the embedded demo, read from the real demo event. */
export function stagesOf(event: SandboxEvent | undefined, busy: boolean): Stages {
  if (event === undefined) {
    return { request: busy ? "done" : "pending", response: "pending", webhook: "pending" };
  }
  const statuses = event.deliveries.map((delivery) => delivery.status);
  const failed = statuses.length > 0 && statuses.every((status) => status === "failed");
  const delivered = statuses.some((status) => status === "delivered");
  const webhook: StageState = delivered ? "done" : failed ? "failed" : "pending";
  return { request: "done", response: "done", webhook };
}

/** Whether polling can stop: every delivery has landed or given up. */
export function settled(event: SandboxEvent): boolean {
  return event.deliveries.every(
    (delivery) => delivery.status === "delivered" || delivery.status === "failed",
  );
}

/** Shows only the telling fields of a request or response body, pretty-printed. */
export function excerpt(body: unknown, keys: readonly string[]): string {
  let value: unknown = body;
  if (typeof body === "string") {
    try {
      value = JSON.parse(body);
    } catch {
      return body;
    }
  }
  if (typeof value !== "object" || value === null) return String(body);
  const fields = value as Record<string, unknown>;
  const kept = keys.filter((key) => key in fields).map((key) => [key, fields[key]]);
  return JSON.stringify(Object.fromEntries(kept), null, 2);
}
