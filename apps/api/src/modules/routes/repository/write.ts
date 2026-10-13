import { and, eq, isNull, sql } from "drizzle-orm";
import type { Database } from "../../../db/client.js";
import { TranslationExists } from "../model.js";
import type { NewRoute, RoutePatch } from "../model.js";
import { routes, routeVersions } from "../tables.js";

/** Maps the partial unique index on (translation_group, language) to TranslationExists. */
function asTranslationExists(error: unknown): unknown {
  for (const candidate of [error, (error as { cause?: unknown } | null)?.cause]) {
    const { code, constraint } = (candidate ?? {}) as { code?: string; constraint?: string };
    if (code === "23505" && constraint === "routes_translation_language_key") {
      return new TranslationExists();
    }
  }
  return error;
}

export async function insertRoute(db: Database, route: NewRoute): Promise<string> {
  try {
    return await db.transaction(async (tx) => {
      const [row] = await tx.insert(routes).values(route).returning({ id: routes.id });
      if (row === undefined) throw new Error("route insert returned nothing");
      await tx.insert(routeVersions).values({
        routeId: row.id,
        number: 1,
        title: route.title,
        content: route.content,
        authorId: route.authorId,
        createdAt: route.createdAt,
      });
      return row.id;
    });
  } catch (error) {
    throw asTranslationExists(error);
  }
}

/** The version number comes from the UPDATE itself, so concurrent edits never share one. */
export async function updateRoute(
  db: Database,
  id: string,
  patch: RoutePatch,
  editorId: string,
  at: Date,
): Promise<boolean> {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .update(routes)
      .set({ ...patch, version: sql`${routes.version} + 1`, updatedAt: at })
      .where(and(eq(routes.id, id), isNull(routes.deletedAt)))
      .returning({ version: routes.version, title: routes.title, content: routes.content });
    if (row === undefined) return false;
    await tx.insert(routeVersions).values({
      routeId: id,
      number: row.version,
      title: row.title,
      content: row.content,
      authorId: editorId,
      createdAt: at,
    });
    return true;
  });
}

export async function softDelete(db: Database, id: string, at: Date): Promise<void> {
  await db.update(routes).set({ deletedAt: at }).where(eq(routes.id, id));
}
