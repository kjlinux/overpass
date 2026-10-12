import { errorMessage, fail, fieldMessage, pickLanguage } from "@overpass/shared";
import type { ErrorCode } from "@overpass/shared";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { AppError } from "./app-error.js";

function translateFields(fields: Record<string, string>, request: FastifyRequest) {
  const language = pickLanguage(request.headers["accept-language"]);
  return Object.fromEntries(
    Object.entries(fields).map(([field, code]) => [
      field,
      { code, message: fieldMessage(code, language) },
    ]),
  );
}

/** Sends a translated error envelope with a stable code. */
export function sendError(
  request: FastifyRequest,
  reply: FastifyReply,
  error: { code: ErrorCode; status: number; fields?: Record<string, string> | undefined },
) {
  const language = pickLanguage(request.headers["accept-language"]);
  const fields =
    error.fields === undefined ? {} : { fields: translateFields(error.fields, request) };
  return reply
    .code(error.status)
    .send(fail({ code: error.code, message: errorMessage(error.code, language), ...fields }));
}

function statusOf(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null || !("statusCode" in error)) return undefined;
  return typeof error.statusCode === "number" ? error.statusCode : undefined;
}

/** Names the framework's own 4xx answers; anything else in that range is a bad request. */
function clientErrorCodes(status: number): ErrorCode | undefined {
  if (status === 413) return "payload_too_large";
  if (status === 415) return "unsupported_media_type";
  if (status === 429) return "rate_limited";
  return status >= 400 && status < 500 ? "bad_request" : undefined;
}

/** Answers unknown routes and every failure with translated envelopes. */
export function registerErrorHandlers(app: FastifyInstance): void {
  app.setNotFoundHandler((request, reply) =>
    sendError(request, reply, { code: "not_found", status: 404 }),
  );
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof AppError) return sendError(request, reply, error);
    const status = statusOf(error);
    const code = status === undefined ? undefined : clientErrorCodes(status);
    if (status !== undefined && code !== undefined)
      return sendError(request, reply, { code, status });
    request.log.error({ err: error }, "unhandled error");
    return sendError(request, reply, { code: "internal", status: 500 });
  });
}
