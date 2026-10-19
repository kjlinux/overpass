import type {
  LogAction,
  LogTargetKind,
  QueueKind,
  QueueState,
  Role,
  RouteModeration,
} from "@overpass/shared";
import type { Atomic, Database } from "../../db/client.js";
import type { AdminCursor } from "./cursor.js";

/** One decision of the moderation team, written by every module that decides. */
export type LogEntryInput = {
  actorId: string;
  targetKind: LogTargetKind;
  targetId: string;
  action: LogAction;
  reason?: string | null | undefined;
};

/** The log port: it writes through the caller's transaction, so decision and log commit together. */
export type ModerationLog = (entry: LogEntryInput, tx: Database) => Promise<void>;

export type QueueRow = {
  kind: QueueKind;
  id: string;
  title: string;
  excerpt: string;
  author: string;
  reports: number;
  lastReportAt: Date | null;
  status: RouteModeration;
  path: string;
  cursorAt: string;
};

export type AccountRow = {
  id: string;
  handle: string;
  email: string;
  country: string;
  role: Role;
  createdAt: Date;
  suspendedAt: Date | null;
  cursorAt: string;
};

export type LogRow = {
  id: string;
  actor: string | null;
  targetKind: LogTargetKind;
  targetId: string;
  action: LogAction;
  reason: string | null;
  createdAt: Date;
  cursorAt: string;
};

/** Storage port of the module; the service never sees SQL. Lists return one extra row. */
export type AdminRepository = {
  queue(
    filter: { kind: QueueKind; state: QueueState },
    after: AdminCursor | undefined,
    limit: number,
  ): Promise<QueueRow[]>;
  /** The author of the live route once its moderation is set, or undefined when it is gone. */
  setRouteModeration(
    id: string,
    moderation: RouteModeration,
  ): Promise<{ authorId: string | null } | undefined>;
  clearRouteReports(id: string): Promise<void>;
  accounts(
    prefix: string | undefined,
    after: AdminCursor | undefined,
    limit: number,
  ): Promise<AccountRow[]>;
  findAccount(id: string): Promise<AccountRow | null>;
  /** Suspends a member not yet suspended and ends their sessions; null when nothing changed. */
  suspend(id: string, reason: string, at: Date): Promise<AccountRow | null>;
  reactivate(id: string): Promise<AccountRow | null>;
  /** Dated by the database clock, so two decisions never share the same instant. */
  insertLog(entry: LogEntryInput): Promise<void>;
  log(after: AdminCursor | undefined, limit: number): Promise<LogRow[]>;
  atomically: Atomic<AdminRepository>;
};
