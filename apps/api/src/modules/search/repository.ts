import type { Database } from "../../db/client.js";
import type { SearchRepository } from "./model.js";
import { searchPosts, searchRoutes, searchThreads } from "./repository/kinds.js";

export function searchRepository(db: Database): SearchRepository {
  return {
    posts: (filters) => searchPosts(db, filters),
    threads: (filters) => searchThreads(db, filters),
    routes: (filters) => searchRoutes(db, filters),
  };
}
