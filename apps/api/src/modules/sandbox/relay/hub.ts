import type { RelayBus } from "./bus.js";
import type { RelayDelivery, RelayRepository } from "./repository.js";

type Send = (delivery: RelayDelivery) => void;
type Connection = { send: Send; sent: Set<string>; last: number | undefined };

export const maxConnectionsPerKey = 3;

function push(connection: Connection, delivery: RelayDelivery): void {
  if (connection.sent.has(delivery.id)) return;
  connection.sent.add(delivery.id);
  if (delivery.sentSeq !== null) connection.last = Math.max(connection.last ?? 0, delivery.sentSeq);
  connection.send(delivery);
}

// Notifications sent while the listener was down are gone, so the log is read again.
function replayAll(byKey: Map<string, Set<Connection>>, relays: RelayRepository): void {
  for (const [keyId, connections] of byKey) {
    for (const connection of connections) {
      void relays.pending(keyId, connection.last, new Date()).then((deliveries) => {
        for (const delivery of deliveries) push(connection, delivery);
      });
    }
  }
}

/** This instance's open relay streams; the bus tells it when one of their deliveries is ready. */
export function createRelayHub(bus: RelayBus, relays: RelayRepository) {
  const byKey = new Map<string, Set<Connection>>();

  bus.subscribe(({ keyId, deliveryId }) => {
    const connections = byKey.get(keyId);
    if (connections === undefined || connections.size === 0) return;
    void relays.awaitingFor(keyId, deliveryId).then((delivery) => {
      if (delivery !== undefined) for (const connection of connections) push(connection, delivery);
    });
  });

  bus.onReconnect(() => {
    replayAll(byKey, relays);
  });

  return {
    count: (keyId: string) => byKey.get(keyId)?.size ?? 0,
    /** Attaches first and replays after, so a delivery announced in between is never lost. */
    attach(keyId: string, send: Send) {
      const connection: Connection = { send, sent: new Set(), last: undefined };
      const connections = byKey.get(keyId) ?? new Set<Connection>();
      connections.add(connection);
      byKey.set(keyId, connections);
      return {
        replay: (deliveries: RelayDelivery[]) => {
          for (const delivery of deliveries) push(connection, delivery);
        },
        detach: () => {
          connections.delete(connection);
          if (connections.size === 0) byKey.delete(keyId);
        },
      };
    },
  };
}

export type RelayHub = ReturnType<typeof createRelayHub>;
