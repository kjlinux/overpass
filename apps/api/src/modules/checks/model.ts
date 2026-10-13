import type { PotholeStatus } from "@overpass/shared";

export type CheckRecord = {
  id: string;
  routeId: string;
  userId: string;
  country: string;
  environment: "test" | "production";
  checkedAt: Date;
};

export type NewCheck = Omit<CheckRecord, "id">;

export type PotholeRecord = {
  id: string;
  routeId: string;
  userId: string | null;
  description: string;
  status: PotholeStatus;
  createdAt: Date;
  updatedAt: Date;
};

export type NewPothole = { routeId: string; userId: string; description: string; at: Date };

/** Storage port of the module; the service never sees SQL. */
export type ChecksRepository = {
  lastCheckAt(userId: string, routeId: string): Promise<Date | null>;
  /** Inserts unless the account checked the route after `since`; serialised per account and route. */
  insertCheckUnlessRecent(check: NewCheck, since: Date): Promise<CheckRecord | null>;
  checksForRoute(routeId: string, limit: number): Promise<CheckRecord[]>;
  checksByUser(userId: string, limit: number): Promise<CheckRecord[]>;
  insertPothole(pothole: NewPothole): Promise<PotholeRecord>;
  findPothole(id: string): Promise<PotholeRecord | null>;
  setPotholeStatus(id: string, status: PotholeStatus, at: Date): Promise<PotholeRecord>;
  potholesForRoute(routeId: string): Promise<PotholeRecord[]>;
  countByUser(userId: string): Promise<{ checks: number; potholes: number }>;
};

/** What this module needs to know about routes, provided by the routes module. */
export type RouteDirectory = {
  /** The live route's author, or null when the route is unknown or deleted. */
  facts(routeId: string): Promise<{ authorId: string | null } | null>;
  titles(routeIds: string[]): Promise<Map<string, string>>;
};
