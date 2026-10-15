import type { EndpointInput } from "@overpass/simulator";
import protocol from "./protocol.json" with { type: "json" };
import { json, problems } from "./problem.js";
import { paymentKind } from "./settle.js";
import type { PispiOutcome } from "./settle.js";

type Input = EndpointInput<PispiOutcome>;
type Payment = Record<string, unknown> & {
  txId: string;
  end2endId: string;
  montant: number;
  statut: string;
  payeurAlias: string;
  retourStatut?: string;
};

const received = async (input: Input) =>
  ((await input.store.list(paymentKind)) as Payment[]).filter(
    (payment) => payment.statut === "IRREVOCABLE",
  );

export async function listReceived(input: Input) {
  const data = await received(input);
  return { response: json(200, { data, meta: { total: data.length } }) };
}

/** The last payment received for this txId, as the specification asks for static QR codes. */
export async function receivedByTxId(input: Input) {
  const match = (await received(input))
    .filter((payment) => payment.txId === input.params.txId)
    .at(-1);
  return { response: match === undefined ? problems.notFound() : json(200, match) };
}

/** Only IRREVOCABLE or REJETE: a transfer is never reported as in progress. */
export async function paymentByEnd2endId(input: Input) {
  const payment = await input.store.get(paymentKind, input.params.end2endId ?? "");
  return {
    response:
      payment === undefined ? problems.notFound(protocol.paymentNotFound) : json(200, payment),
  };
}

/** Returns the full amount once; a second call answers the same state without a new transfer. */
export async function returnFunds(input: Input) {
  const payment = (await input.store.get(paymentKind, input.params.end2endId ?? "")) as
    Payment | undefined;
  if (payment?.statut !== "IRREVOCABLE")
    return { response: problems.notFound(protocol.paymentNotFound) };
  if (payment.retourStatut === "IRREVOCABLE") return { response: json(200, payment) };
  const at = input.now.toISOString();
  const returned: Payment = {
    ...payment,
    retourStatut: "IRREVOCABLE",
    retourDateDemande: at,
    retourDateIrrevocabilite: at,
  };
  await input.store.put(paymentKind, payment.end2endId, returned);
  const payload = {
    evCode: "RETOUR_ENVOYE",
    evDate: at,
    txId: payment.txId,
    end2endId: payment.end2endId,
    montant: payment.montant,
    alias: payment.payeurAlias,
  };
  return {
    response: json(200, returned),
    events: [{ id: `ev_${input.newId()}`, type: "RETOUR_ENVOYE", payload }],
  };
}
