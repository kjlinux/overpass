import { and, count, desc, eq, sql } from "drizzle-orm";
import type { Database } from "../../db/client.js";
import type { RequestsRepository } from "./model.js";
import { serviceProposals, simulatorVotes } from "./tables.js";

type ProposalPart = Pick<
  RequestsRepository,
  | "insertProposal"
  | "findProposal"
  | "proposalsBy"
  | "pendingProposals"
  | "decideProposal"
  | "attachService"
  | "reopenProposal"
>;
type VotePart = Pick<RequestsRepository, "addVote" | "removeVote" | "votes" | "mostVoted">;

function proposalQueries(db: Database): ProposalPart {
  return {
    insertProposal: async (proposal) => {
      const [created] = await db.insert(serviceProposals).values(proposal).returning();
      if (created === undefined) throw new Error("proposal insert returned nothing");
      return created;
    },
    findProposal: async (id) =>
      (await db.select().from(serviceProposals).where(eq(serviceProposals.id, id)).limit(1))[0] ??
      null,
    proposalsBy: (userId, limit) =>
      db
        .select()
        .from(serviceProposals)
        .where(eq(serviceProposals.userId, userId))
        .orderBy(desc(serviceProposals.createdAt))
        .limit(limit),
    pendingProposals: (limit) =>
      db
        .select()
        .from(serviceProposals)
        .where(eq(serviceProposals.status, "pending"))
        .orderBy(serviceProposals.createdAt)
        .limit(limit),
    ...decisionQueries(db),
  };
}

type DecisionPart = Pick<RequestsRepository, "decideProposal" | "attachService" | "reopenProposal">;

/** The claim only matches a pending proposal, so two moderators never both decide. */
function decisionQueries(db: Database): DecisionPart {
  return {
    decideProposal: async (id, decision) => {
      const pending = and(eq(serviceProposals.id, id), eq(serviceProposals.status, "pending"));
      const [row] = await db.update(serviceProposals).set(decision).where(pending).returning();
      return row ?? null;
    },
    attachService: async (id, serviceId) => {
      const where = eq(serviceProposals.id, id);
      const [row] = await db.update(serviceProposals).set({ serviceId }).where(where).returning();
      return row ?? null;
    },
    reopenProposal: async (id) => {
      const reopened = {
        status: "pending" as const,
        reason: null,
        decidedBy: null,
        decidedAt: null,
      };
      await db.update(serviceProposals).set(reopened).where(eq(serviceProposals.id, id));
    },
  };
}

function voteQueries(db: Database): VotePart {
  const one = (serviceId: string, userId: string) =>
    and(eq(simulatorVotes.serviceId, serviceId), eq(simulatorVotes.userId, userId));
  return {
    addVote: async (serviceId, userId, at) => {
      await db
        .insert(simulatorVotes)
        .values({ serviceId, userId, createdAt: at })
        .onConflictDoNothing();
    },
    removeVote: async (serviceId, userId) => {
      await db.delete(simulatorVotes).where(one(serviceId, userId));
    },
    votes: async (serviceId, userId) => {
      const mine =
        userId === null ? sql`false` : sql`bool_or(${simulatorVotes.userId} = ${userId})`;
      const [row] = await db
        .select({ votes: count(), voted: sql<boolean | null>`${mine}` })
        .from(simulatorVotes)
        .where(eq(simulatorVotes.serviceId, serviceId));
      return { votes: row?.votes ?? 0, voted: row?.voted === true };
    },
    mostVoted: (limit) =>
      db
        .select({ serviceId: simulatorVotes.serviceId, votes: count() })
        .from(simulatorVotes)
        .groupBy(simulatorVotes.serviceId)
        .orderBy(desc(count()), simulatorVotes.serviceId)
        .limit(limit),
  };
}

export function createRequestsRepository(db: Database): RequestsRepository {
  return { ...proposalQueries(db), ...voteQueries(db) };
}
