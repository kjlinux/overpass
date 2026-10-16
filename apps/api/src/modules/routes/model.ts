import type { Language, RouteState } from "@overpass/shared";

export type CoverageRecord = {
  country: string;
  basis: "source" | "community";
  source: string | null;
  consultedOn: string | null;
  routeId: string | null;
  confirmedAt: Date | null;
};

export type ServiceRecord = {
  id: string;
  slug: string;
  name: string;
  category: "payment" | "sms" | "ussd";
  simulated: boolean;
  /** Confirmed countries only. */
  coverage: CoverageRecord[];
};

export type RouteRecord = {
  id: string;
  translationGroup: string;
  authorId: string | null;
  serviceId: string;
  country: string;
  stack: string;
  language: Language;
  title: string;
  content: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
};

/** A route with its service and the counts its state is computed from. */
export type RouteRow = RouteRecord & {
  service: { slug: string; name: string; simulated: boolean };
  recentCheckers: number;
  unresolvedPotholes: number;
  lastCheckAt: Date | null;
};

export type NewRoute = Omit<RouteRecord, "id" | "version" | "translationGroup"> & {
  translationGroup?: string | undefined;
  sourceThreadId?: string | undefined;
};

export type RoutePatch = Partial<
  Pick<RouteRecord, "serviceId" | "country" | "stack" | "title" | "content">
>;

export type Cursor =
  { mode: "date"; key: string; id: string } | { mode: "rank"; key: number; id: string };

export type ListFilters = {
  q?: string | undefined;
  service?: string | undefined;
  country?: string | undefined;
  stack?: string | undefined;
  language?: Language | undefined;
  state?: RouteState | undefined;
  after?: Cursor | undefined;
  limit: number;
};

export type ListedRow = RouteRow & { rank: number };

/** Storage port of the module; the service never sees SQL. */
export type RoutesRepository = {
  services(): Promise<ServiceRecord[]>;
  serviceBySlug(slug: string): Promise<ServiceRecord | null>;
  /** Marks the country of a clear route as covered by its service, unless already confirmed. */
  confirmCoverage(routeId: string, at: Date): Promise<void>;
  /** Inserts the route and its version 1 together; returns the new id. */
  insertRoute(route: NewRoute): Promise<string>;
  /** Applies the patch, bumps the version and stores it; false when the route is gone. */
  updateRoute(id: string, patch: RoutePatch, editorId: string, at: Date): Promise<boolean>;
  softDelete(id: string, at: Date): Promise<void>;
  findLive(id: string): Promise<RouteRecord | null>;
  findRow(id: string): Promise<RouteRow | null>;
  translations(group: string): Promise<{ id: string; language: Language }[]>;
  sibling(group: string, language: Language): Promise<string | null>;
  list(filters: ListFilters): Promise<ListedRow[]>;
  byAuthor(authorId: string, limit: number): Promise<RouteRow[]>;
  countByAuthor(authorId: string): Promise<number>;
  titles(ids: string[]): Promise<Map<string, string>>;
  /** The live route written from each thread, keyed by thread id. */
  fromThreads(threadIds: string[]): Promise<Map<string, string>>;
  serviceNames(serviceIds: string[]): Promise<Map<string, { slug: string; name: string }>>;
};

/** Raised when a thread already has its route. */
export class SourceThreadTaken extends Error {
  constructor() {
    super("already_transformed");
    this.name = "SourceThreadTaken";
  }
}

/** Raised when a translation group already holds the language. */
export class TranslationExists extends Error {
  constructor() {
    super("translation_exists");
    this.name = "TranslationExists";
  }
}
