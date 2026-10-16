import type { ProposalStatus } from "@overpass/shared";
import type { serviceProposals } from "./tables.js";

export type ProposalRecord = typeof serviceProposals.$inferSelect;

export type NewProposal = Pick<
  ProposalRecord,
  "userId" | "name" | "category" | "country" | "docsUrl" | "createdAt"
>;

export type Decision = {
  status: Exclude<ProposalStatus, "pending">;
  reason: string | null;
  serviceId: string | null;
  decidedBy: string;
  decidedAt: Date;
};

/** Storage port of the module; the service never sees SQL. */
export type RequestsRepository = {
  insertProposal(proposal: NewProposal): Promise<ProposalRecord>;
  findProposal(id: string): Promise<ProposalRecord | null>;
  proposalsBy(userId: string, limit: number): Promise<ProposalRecord[]>;
  pendingProposals(limit: number): Promise<ProposalRecord[]>;
  /** Claims a pending proposal; null when another moderator decided first. */
  decideProposal(id: string, decision: Decision): Promise<ProposalRecord | null>;
  attachService(id: string, serviceId: string): Promise<ProposalRecord | null>;
  reopenProposal(id: string): Promise<void>;
  addVote(serviceId: string, userId: string, at: Date): Promise<void>;
  removeVote(serviceId: string, userId: string): Promise<void>;
  votes(serviceId: string, userId: string | null): Promise<{ votes: number; voted: boolean }>;
  mostVoted(limit: number): Promise<{ serviceId: string; votes: number }[]>;
};
