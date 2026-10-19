import { sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import type { Database } from "../../db/client.js";
import { countedCoverageCondition, listedRouteCondition } from "../routes/index.js";

export type StatsCounts = { routes: number; checks: number; countries: string[] };

/** Storage port of the module; the service never sees SQL. */
export type StatsRepository = { counts(): Promise<StatsCounts> };

async function rows<Row>(db: Database, query: SQL): Promise<Row[]> {
  const result: unknown = await db.execute(query);
  return (result as { rows: Row[] }).rows;
}

const listed = listedRouteCondition("r");

const totalsQuery = sql`select
  (select count(*)::int from routes r where ${listed}) as routes,
  (select count(*)::int from checks c join routes r on r.id = c.route_id where ${listed}) as checks`;

/** Source and community confirmations live in one table, so both feed the same list. */
const countriesQuery = sql`select distinct trim(country) as country from service_countries
  where confirmed and ${countedCoverageCondition()} order by country`;

export function createStatsRepository(db: Database): StatsRepository {
  return {
    counts: async () => {
      const [totals] = await rows<{ routes: number; checks: number }>(db, totalsQuery);
      const countries = await rows<{ country: string }>(db, countriesQuery);
      return {
        routes: totals?.routes ?? 0,
        checks: totals?.checks ?? 0,
        countries: countries.map((row) => row.country),
      };
    },
  };
}
