import type { IssueItem, IssueItemRef, IssueStatus, Language } from "@overpass/shared";

export type SubscriberRow = {
  id: string;
  email: string;
  language: Language;
  confirmTokenHash: string | null;
  confirmedAt: Date | null;
  unsubscribedAt: Date | null;
  updatedAt: Date;
};

export type PendingLink = { language: Language; tokenHash: string; expiresAt: Date; at: Date };

export type IssueRow = {
  id: string;
  number: number;
  language: Language;
  subject: string;
  intro: string;
  items: IssueItemRef[];
  status: IssueStatus;
  createdAt: Date;
  queuedAt: Date | null;
  sentAt: Date | null;
  recipients: number;
  delivered: number;
};

export type NewIssue = Pick<IssueRow, "language" | "subject" | "intro" | "items"> & {
  createdBy: string;
  at: Date;
};

export type IssuePatch = { [Key in "subject" | "intro" | "items"]?: IssueRow[Key] | undefined };

export type ClaimedDelivery = {
  id: string;
  issueId: string;
  subscriberId: string;
  attempts: number;
};

export type SubscribersPart = {
  subscriberByEmail(email: string): Promise<SubscriberRow | null>;
  subscriberById(id: string): Promise<SubscriberRow | null>;
  /** False when another request inserted the same address first. */
  insertSubscriber(email: string, link: PendingLink): Promise<boolean>;
  /** A new link restarts the double opt-in, even after an unsubscription. */
  refreshSubscriber(id: string, link: PendingLink): Promise<void>;
  confirm(tokenHash: string, now: Date): Promise<Language | null>;
  unsubscribe(id: string, at: Date): Promise<void>;
};

export type IssuesPart = {
  insertIssue(issue: NewIssue): Promise<string>;
  updateIssue(id: string, patch: IssuePatch): Promise<void>;
  findIssue(id: string): Promise<IssueRow | null>;
  listIssues(limit: number): Promise<IssueRow[]>;
  /** Queues one delivery per active subscriber of the language; null if the issue left draft. */
  queueIssue(id: string, at: Date): Promise<number | null>;
};

export type HighlightsPart = {
  highlights(language: Language, since: Date, now: Date, perKind: number): Promise<IssueItem[]>;
  /** The referenced items still visible now, in the given order. */
  resolveItems(refs: IssueItemRef[], now: Date): Promise<IssueItem[]>;
};

export type DeliveriesPart = {
  claim(batchSize: number, now: Date, staleBefore: Date): Promise<ClaimedDelivery[]>;
  markSent(id: string, at: Date): Promise<void>;
  markSkipped(id: string): Promise<void>;
  markRetry(id: string, dueAt: Date, error: string): Promise<void>;
  markFailed(id: string, error: string): Promise<void>;
  finishIssues(at: Date): Promise<void>;
};

/** Storage port of the module; the service never sees SQL. */
export type NewsletterRepository = SubscribersPart & IssuesPart & HighlightsPart & DeliveriesPart;
