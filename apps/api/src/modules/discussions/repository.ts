import type { Database } from "../../db/client.js";
import type { DiscussionsRepository } from "./model.js";
import { replyQueries } from "./repository/replies.js";
import { reportQueries } from "./repository/reports.js";
import { threadQueries } from "./repository/threads.js";

export function createDiscussionsRepository(db: Database): DiscussionsRepository {
  return { ...threadQueries(db), ...replyQueries(db), ...reportQueries(db) };
}
