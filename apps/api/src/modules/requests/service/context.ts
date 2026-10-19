import type { Proposal } from "@overpass/shared";
import type { MailMessage } from "../../../mail/mailer.js";
import type { ContactDirectory, HandleDirectory } from "../../accounts/index.js";
import type { ModerationLog } from "../../admin/index.js";
import type { ServiceCatalogue } from "../../routes/index.js";
import type { ProposalRecord, RequestsRepository } from "../model.js";

export type RequestsDeps = {
  repository: RequestsRepository;
  catalogue: ServiceCatalogue;
  handles: HandleDirectory;
  contacts: ContactDirectory;
  /** Sends in the background: a mail failure never undoes a decision already stored. */
  notify: (message: MailMessage) => void;
  reportError: (error: unknown) => void;
  log: ModerationLog;
  webOrigin: string;
  now: () => Date;
};

const idsOf = (values: (string | null)[]): string[] =>
  values.flatMap((value) => (value === null ? [] : [value]));

export async function toProposals(
  deps: RequestsDeps,
  records: ProposalRecord[],
): Promise<Proposal[]> {
  const [names, entries] = await Promise.all([
    deps.handles(idsOf(records.map((record) => record.userId))),
    deps.catalogue.byIds(idsOf(records.map((record) => record.serviceId))),
  ]);
  return records.map((record) => ({
    id: record.id,
    name: record.name,
    category: record.category,
    country: record.country,
    docsUrl: record.docsUrl,
    status: record.status,
    reason: record.reason,
    author: names.get(record.userId ?? "") ?? "",
    service: entries.get(record.serviceId ?? "")?.slug ?? null,
    createdAt: record.createdAt.toISOString(),
    decidedAt: record.decidedAt?.toISOString() ?? null,
  }));
}
