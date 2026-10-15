import type {
  ApiError,
  SandboxEvent,
  SandboxKey,
  SandboxKeyCreated,
  SandboxTarget,
  Scenario,
} from "@overpass/shared";
import { useEffect, useState } from "preact/hooks";
import { apiRequest } from "../../session";
import { useApi } from "../routes/useApi";

const pollMs = 2000;

/** Polls the key's history while a webhook is still on its way. */
function useEvents(keyId: string | undefined) {
  const events = useApi<SandboxEvent[]>(
    keyId === undefined ? null : `/v1/sandbox/events?keyId=${keyId}`,
  );
  const latest = events.state.status === "ready" ? events.state.data[0] : undefined;
  const pending =
    latest?.deliveries.some(
      (delivery) => delivery.status === "scheduled" || delivery.status === "sent",
    ) ?? false;
  useEffect(() => {
    if (!pending) return undefined;
    const timer = setInterval(() => void events.refresh(), pollMs);
    return () => {
      clearInterval(timer);
    };
  }, [pending, events]);
  return { latest, refresh: events.refresh };
}

type Fresh = { id: string; key: string };
type Busy = "create" | "run" | undefined;
type Patch = { scenario?: Scenario; target?: SandboxTarget; webhookUrl?: string };

type Context = {
  providerId: string | undefined;
  current: SandboxKey | undefined;
  fresh: Fresh | undefined;
  set: {
    fresh: (fresh: Fresh | undefined) => void;
    chosen: (id: string) => void;
    busy: (busy: Busy) => void;
    ran: () => void;
  };
  act: <T>(call: Promise<{ data: T | null; error: ApiError | null }>) => Promise<T | undefined>;
  reloadKeys: () => Promise<void>;
  reloadEvents: () => Promise<void>;
};

const keyPath = (ctx: Context, suffix = "") => `/v1/sandbox/keys/${ctx.current?.id ?? ""}${suffix}`;

/** Key buttons, each followed by a reload of the key list. */
function keyActions(ctx: Context) {
  return {
    async create(scenario: Scenario) {
      ctx.set.busy("create");
      const created = await ctx.act(
        apiRequest<SandboxKeyCreated>("POST", "/v1/sandbox/keys", {
          provider: ctx.providerId,
          scenario,
        }),
      );
      ctx.set.busy(undefined);
      if (created === undefined) return;
      ctx.set.fresh({ id: created.id, key: created.key });
      ctx.set.chosen(created.id);
      await ctx.reloadKeys();
    },
    use: (id: string) => {
      ctx.set.chosen(id);
    },
    async revoke(id: string) {
      await ctx.act(apiRequest("DELETE", `/v1/sandbox/keys/${id}`));
      if (ctx.fresh?.id === id) ctx.set.fresh(undefined);
      await ctx.reloadKeys();
    },
    async update(patch: Patch) {
      if (
        ctx.current !== undefined &&
        (await ctx.act(apiRequest("PATCH", keyPath(ctx), patch))) !== undefined
      )
        await ctx.reloadKeys();
    },
  };
}

/** Call buttons, each followed by a reload of the key's history. */
function callActions(ctx: Context) {
  return {
    async run(scenario: Scenario) {
      if (ctx.current === undefined) return;
      ctx.set.busy("run");
      await ctx.act(apiRequest("POST", keyPath(ctx, "/run"), { scenario }));
      ctx.set.busy(undefined);
      ctx.set.ran();
      await ctx.reloadEvents();
    },
    async step(step: string, vars: Record<string, string>, scenario: Scenario) {
      const played = await ctx.act(
        apiRequest<{ event: SandboxEvent; vars: Record<string, string> }>(
          "POST",
          keyPath(ctx, "/run"),
          { step, vars, scenario },
        ),
      );
      ctx.set.ran();
      await ctx.reloadEvents();
      return played === undefined
        ? undefined
        : { vars: played.vars, status: played.event.response.status };
    },
    async replay(deliveryId: string) {
      await ctx.act(apiRequest("POST", `/v1/sandbox/deliveries/${deliveryId}/replay`));
      await ctx.reloadEvents();
    },
  };
}

/** Keys, scenario and calls of the test track for one provider. */
export function useTrack(providerId: string | undefined) {
  const keys = useApi<SandboxKey[]>("/v1/sandbox/keys");
  const [chosen, setChosen] = useState<string>();
  const [fresh, setFresh] = useState<Fresh>();
  const [busy, setBusy] = useState<Busy>();
  const [error, setError] = useState<ApiError>();
  const [justRan, setJustRan] = useState(false);
  const mine =
    keys.state.status === "ready"
      ? keys.state.data.filter((item) => item.provider === providerId)
      : [];
  const current = mine.find((item) => item.id === chosen) ?? mine[0];
  const events = useEvents(current?.id);
  const act = async <T>(call: Promise<{ data: T | null; error: ApiError | null }>) => {
    const { data, error: failure } = await call;
    setError(failure ?? undefined);
    return failure === null && data !== null ? data : undefined;
  };
  const set = {
    fresh: setFresh,
    chosen: setChosen,
    busy: setBusy,
    ran: () => {
      setJustRan(true);
    },
  };
  const ctx: Context = {
    providerId,
    current,
    fresh,
    set,
    act,
    reloadKeys: keys.refresh,
    reloadEvents: events.refresh,
  };
  const actions = { ...keyActions(ctx), ...callActions(ctx) };
  const shownFresh = fresh?.id === current?.id ? fresh : undefined;
  return { mine, current, fresh: shownFresh, busy, error, justRan, event: events.latest, actions };
}
