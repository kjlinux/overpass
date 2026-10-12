import type { ErrorCode } from "@overpass/shared";

/** A failure the client can act on: stable code, HTTP status, optional field codes. */
export class AppError extends Error {
  constructor(
    readonly code: ErrorCode,
    readonly status: number,
    readonly fields?: Record<string, string>,
  ) {
    super(code);
    this.name = "AppError";
  }
}
