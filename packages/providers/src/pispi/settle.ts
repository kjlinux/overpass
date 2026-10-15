import type { ProviderEvent } from "@overpass/simulator";
import type { z } from "zod";
import protocol from "./protocol.json" with { type: "json" };
import type { demande } from "./schemas.js";

export type Demande = z.infer<typeof demande>;
export type PispiOutcome = { accept: true } | { accept: false; reason: "AM04" | "AB03" };

export const requestKind = "demande_paiement";
export const paymentKind = "paiement";

/** E + participant code + yyyymmddhhmmss + 14 characters, the shape of the documented examples. */
export function end2endIdOf(now: Date, newId: () => string): string {
  const stamp = now.toISOString().replace(/\D/g, "").slice(0, 14);
  return `ECIB001${stamp}${newId().slice(0, 14)}`;
}

function event(
  code: string,
  demand: Demande,
  now: Date,
  id: string,
  motif?: string,
): ProviderEvent {
  const payload = {
    evCode: code,
    evDate: now.toISOString(),
    txId: demand.txId,
    end2endId: demand.end2endId ?? "",
    montant: demand.montant,
    client: protocol.simulatorPayerName,
    alias: demand.payeurAlias,
    ...(motif === undefined ? {} : { motif }),
  };
  return { id, type: code, payload };
}

/** The virtual payer answers at once: accepted, or rejected with the scenario's reason code. */
export function settle(sent: Demande, outcome: PispiOutcome, now: Date, eventId: string) {
  const at = now.toISOString();
  if (outcome.accept) {
    const paid: Demande = {
      ...sent,
      statut: "IRREVOCABLE",
      dateIrrevocabilite: at,
      dateReponse: at,
    };
    return { demand: paid, events: [event("PAIEMENT_RECU", paid, now, eventId)] };
  }
  const rejected: Demande = {
    ...sent,
    statut: "REJETE",
    statutRaison: outcome.reason,
    dateReponse: at,
  };
  return {
    demand: rejected,
    events: [event("PAIEMENT_REJETE", rejected, now, eventId, outcome.reason)],
  };
}

/** What GET /paiements-recus shows of a settled request. */
export function paymentOf(demand: Demande): Record<string, unknown> {
  return Object.fromEntries(Object.entries(demand).filter(([field]) => field !== "confirmation"));
}
