import { describe, expect, it, vi } from "vitest";
import type { RelayBus } from "./bus.js";
import { createRelayHub } from "./hub.js";
import type { RelayDelivery, RelayRepository } from "./repository.js";

describe("relay hub", () => {
  it("replays pending deliveries to attached streams after the bus reconnects", async () => {
    let reconnect = (): void => undefined;
    const bus = {
      subscribe: () => () => undefined,
      onReconnect: (handler: () => void) => {
        reconnect = handler;
        return () => undefined;
      },
    } as unknown as RelayBus;
    const missed = { id: "d1", sentSeq: 7 } as RelayDelivery;
    const pending = vi.fn().mockResolvedValue([missed]);
    const hub = createRelayHub(bus, { pending } as unknown as RelayRepository);
    const send = vi.fn();
    hub.attach("k1", send);
    reconnect();
    await vi.waitFor(() => {
      expect(send).toHaveBeenCalledWith(missed);
    });
    expect(pending).toHaveBeenCalledWith("k1", undefined, expect.any(Date));
  });
});
