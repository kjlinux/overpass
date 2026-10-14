import { ok } from "@overpass/shared";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { AppError } from "../../../http/app-error.js";
import { sendError } from "../../../http/errors.js";
import { parseInput } from "../../../http/validate.js";
import { requireAccount } from "../../accounts/index.js";
import type { AccountResolver } from "../../accounts/index.js";
import { digestKey, looksLikeKey } from "../keys.js";
import { toDelivery } from "../outputs.js";
import type { KeyRow, KeysRepository } from "../repository.js";
import { relayResultInput, sandboxIdParams } from "../schemas.js";
import { maxConnectionsPerKey } from "./hub.js";
import type { RelayHub } from "./hub.js";
import type { RelayRepository } from "./repository.js";
import { heartbeatMs, openEventStream, writeDelivery, writeEvent, writeHeartbeat } from "./sse.js";

export type RelayRouteDeps = {
  keys: KeysRepository;
  relays: RelayRepository;
  hub: RelayHub;
  resolve: AccountResolver;
  now: () => Date;
};

const minute = 60_000;
const limits = {
  listen: { max: 30, timeWindow: minute },
  result: { max: 600, timeWindow: minute },
};

async function keyOf(deps: RelayRouteDeps, request: FastifyRequest): Promise<KeyRow> {
  const presented = /^Bearer (\S+)$/.exec(request.headers.authorization ?? "")?.[1];
  const key =
    presented !== undefined && looksLikeKey(presented)
      ? await deps.keys.findActiveByHash(digestKey(presented), deps.now())
      : undefined;
  if (key === undefined) throw new AppError("unauthorized", 401);
  return key;
}

function lastSeen(request: FastifyRequest): number | undefined {
  const value = Number(request.headers["last-event-id"]);
  return Number.isSafeInteger(value) && value > 0 ? value : undefined;
}

async function listen(deps: RelayRouteDeps, request: FastifyRequest, reply: FastifyReply) {
  const key = await keyOf(deps, request);
  if (deps.hub.count(key.id) >= maxConnectionsPerKey) {
    return sendError(request, reply, { code: "rate_limited", status: 429 });
  }
  await deps.relays.useRelay(key.id);
  reply.hijack();
  const raw = reply.raw;
  openEventStream(raw);
  writeEvent(raw, "ready", { provider: key.provider, keyPrefix: key.prefix });
  const stream = deps.hub.attach(key.id, (delivery) => {
    writeDelivery(raw, delivery);
  });
  const heartbeat = setInterval(() => {
    writeHeartbeat(raw);
  }, heartbeatMs);
  raw.on("close", () => {
    clearInterval(heartbeat);
    stream.detach();
  });
  stream.replay(await deps.relays.pending(key.id, lastSeen(request), deps.now()));
}

/** The CLI side of the relay authenticates with the test key; replay uses the web session. */
export function registerRelayRoutes(app: FastifyInstance, deps: RelayRouteDeps): void {
  app.get("/v1/sandbox/listen", { config: { rateLimit: limits.listen } }, (request, reply) =>
    listen(deps, request, reply),
  );
  app.post(
    "/v1/sandbox/deliveries/:id/result",
    { config: { rateLimit: limits.result } },
    async (request) => {
      const key = await keyOf(deps, request);
      const { id } = parseInput(sandboxIdParams, request.params);
      const result = parseInput(relayResultInput, request.body);
      if ((await deps.relays.awaitingFor(key.id, id)) === undefined)
        throw new AppError("not_found", 404);
      const row = await deps.relays.record(id, result, deps.now());
      if (row === undefined) throw new AppError("not_found", 404);
      return ok(toDelivery(row));
    },
  );
  app.post("/v1/sandbox/deliveries/:id/replay", async (request, reply) => {
    const account = await requireAccount(deps.resolve, request);
    const { id } = parseInput(sandboxIdParams, request.params);
    const row = await deps.relays.replay(account.id, id, deps.now());
    if (row === undefined) throw new AppError("not_found", 404);
    return reply.code(201).send(ok(toDelivery(row)));
  });
}
