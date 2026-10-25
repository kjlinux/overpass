import type { BlogDeps } from "./service/context.js";
import { feedService } from "./service/feed.js";
import { likeService } from "./service/likes.js";
import { moderationService } from "./service/moderation.js";
import { postService } from "./service/posts.js";
import { socialService } from "./service/social.js";

export type { BlogDeps } from "./service/context.js";

/** Business rules of the blog module, independent of HTTP and SQL. */
export function createBlogService(deps: BlogDeps) {
  return {
    ...postService(deps),
    ...feedService(deps),
    ...socialService(deps),
    ...likeService(deps),
    ...moderationService(deps),
  };
}

export type BlogService = ReturnType<typeof createBlogService>;
