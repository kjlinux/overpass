import { sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import type { Database } from "../../db/client.js";
import { listedPostCondition } from "../blog/index.js";
import { listedRouteCondition } from "../routes/index.js";

/** A translation of a shared content: its language and the URL segment that opens it. */
export type ContentVersion = { language: string; segment: string };

/** What a link preview may show of a public content; text is Markdown or a summary. */
export type SharedContent = { title: string; text: string; versions: ContentVersion[] };

export type ShareRepository = {
  route(id: string): Promise<SharedContent | null>;
  post(language: string, slug: string, now: Date): Promise<SharedContent | null>;
};

async function rows<Row>(db: Database, query: SQL): Promise<Row[]> {
  const result: unknown = await db.execute(query);
  return (result as { rows: Row[] }).rows;
}

type Found = { title: string; text: string; group: string };

const listedRoute = listedRouteCondition("r");

/** Reads only listed content, so a hidden or unpublished title never reaches a preview. */
export function createShareRepository(db: Database): ShareRepository {
  return {
    route: async (id) => {
      const [found] = await rows<Found>(
        db,
        sql`select r.title, r.content as text, r.translation_group as "group"
          from routes r where r.id = ${id} and ${listedRoute}`,
      );
      if (found === undefined) return null;
      const versions = await rows<ContentVersion>(
        db,
        sql`select r.language, r.id::text as segment from routes r
          where r.translation_group = ${found.group} and ${listedRoute}`,
      );
      return { title: found.title, text: found.text, versions };
    },
    post: async (language, slug, now) => {
      const listed = listedPostCondition("p", sql`${now.toISOString()}::timestamptz`);
      const [found] = await rows<Found>(
        db,
        sql`select p.title, p.summary as text, p.translation_group as "group"
          from posts p where p.language = ${language} and p.slug = ${slug} and ${listed}`,
      );
      if (found === undefined) return null;
      const versions = await rows<ContentVersion>(
        db,
        sql`select p.language, p.slug as segment from posts p
          where p.translation_group = ${found.group} and ${listed}`,
      );
      return { title: found.title, text: found.text, versions };
    },
  };
}
