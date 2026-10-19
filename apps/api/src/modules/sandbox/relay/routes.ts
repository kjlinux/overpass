import { ok } from "@overpass/shared";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { AppError } from "../../../http/app-error.js";
import { sendError } from "../../../http/errors.js";
import { parseInput } from "../../../http/validate.js";
import { requireAccount } from "../../accounts/index.js";
import type { AccountResolver } from "../../accounts/index.js";
import { digestKey, looksLikeKey } from "../keys.js";
import { toDelivery } from "../outputs.js";
import type { CounterStore } from "../../../limits/index.js";
import type { KeyRow, KeysRepository } from "../repository.js";
import { relayResultInput, sandboxIdParams } from "../schemas.js";
import { maxConnectionsPerKey } from "./hub.js";
import type { RelayHub } from "./hub.js";
import type { RelayDelivery, RelayRepository } from "./repository.js";
import { heartbeatMs, openEventStream, writeDelivery, writeEvent, writeHeartbeat } from "./sse.js";

export type RelayRouteDeps = {
  keys: KeysRepository;
  relays: RelayRepository;
  hub: RelayHub;
  resolve: AccountResolver;
  counters: CounterStore;
  now: () => Date;
};

const minute = 60_000;
const dayMs = 86_400_000;
const limits = {
  listen: { max: 30, timeWindow: minute },
  result: { max: 600, timeWindow: minute },
  replay: { max: 30, timeWindow: minute },
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

function startStream(deps: RelayRouteDeps, key: KeyRow, reply: FastifyReply) {
  reply.hijack();
  const raw = reply.raw;
  openEventStream(raw);
  const backlog: RelayDelivery[] = [];
  let ready = false;
  const stream = deps.hub.attach(key.id, (delivery) => {
    if (ready) writeDelivery(raw, delivery);
    else backlog.push(delivery);
  });
  const heartbeat = setInterval(() => {
    writeHeartbeat(raw);
  }, heartbeatMs);
  const release = () => {
    clearInterval(heartbeat);
    stream.detach();
  };
  raw.on("close", release);
  return {
    raw,
    release,
    open() {
      writeEvent(raw, "ready", { provider: key.provider, keyPrefix: key.prefix });
      ready = true;
      stream.replay(backlog.splice(0));
    },
    replay: stream.replay,
  };
}

async function listen(deps: RelayRouteDeps, request: FastifyRequest, reply: FastifyReply) {
  const key = await keyOf(deps, request);
  if (deps.hub.count(key.id) >= maxConnectionsPerKey) {
    return sendError(request, reply, { code: "rate_limited", status: 429 });
  }
  // Attached before any await, so the connection cap cannot be raced.
  const stream = startStream(deps, key, reply);
  try {
    await deps.relays.useRelay(key.id);
    stream.open();
    stream.replay(await deps.relays.pending(key.id, lastSeen(request), deps.now()));
  } catch {
    stream.release();
    stream.raw.destroy();
  }
}

async function replayDelivery(deps: RelayRouteDeps, request: FastifyRequest) {
  const account = await requireAccount(deps.resolve, request);
  const { id } = parseInput(sandboxIdParams, request.params);
  const key = await deps.keys.findByDelivery(account.id, id, deps.now());
  if (key === undefined) throw new AppError("not_found", 404);
  const usage = await deps.counters.hit(`sandbox:key:${key.id}`, dayMs);
  if (usage.count > key.quota) throw new AppError("rate_limited", 429);
  const row = await deps.relays.replay(account.id, id, deps.now());
  if (row === undefined) throw new AppError("not_found", 404);
  return toDelivery(row);
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
  app.post(
    "/v1/sandbox/deliveries/:id/replay",
    { config: { rateLimit: limits.replay } },
    async (request, reply) => reply.code(201).send(ok(await replayDelivery(deps, request))),
  );
}
