import type { IncomingMessage } from "node:http";

export const maxBodyBytes = 64 * 1024;

export class BodyError extends Error {
  constructor(readonly status: 400 | 413) {
    super(String(status));
  }
}

/** Reads a JSON request body, refusing it as soon as it passes the size cap. */
export async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    size += (chunk as Buffer).length;
    if (size > maxBodyBytes) throw new BodyError(413);
    chunks.push(chunk as Buffer);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
  } catch {
    throw new BodyError(400);
  }
}
