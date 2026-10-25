import { atomic } from "../../db/client.js";
import type { Database } from "../../db/client.js";
import type { BlogRepository } from "./model.js";
import { feedQueries } from "./repository/feed.js";
import { likeQueries } from "./repository/likes.js";
import { moderationQueries } from "./repository/moderation.js";
import { postQueries } from "./repository/posts.js";
import { socialQueries } from "./repository/social.js";

export { PostTranslationExists } from "./repository/posts.js";

export function createBlogRepository(db: Database): BlogRepository {
  return {
    ...postQueries(db),
    ...feedQueries(db),
    ...socialQueries(db),
    ...likeQueries(db),
    ...moderationQueries(db),
    atomically: atomic(db, createBlogRepository),
  };
}
