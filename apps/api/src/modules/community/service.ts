import { randomUUID } from "node:crypto";
import type {
  NewsletterSubscribeInput,
  PostCreateInput,
  ReplyCreateInput,
  ThreadCreateInput,
} from "@overpass/shared";
import { AppError } from "../../http/app-error.js";
import type { HandleDirectory } from "../accounts/index.js";
import type { CommunityRepository } from "./repository.js";

export class CommunityService {
  constructor(
    private readonly repo: CommunityRepository,
    private readonly handles?: HandleDirectory,
  ) {}

  private async resolveHandles(ids: (string | null)[]) {
    const valid = ids.filter((id): id is string => Boolean(id));
    if (!this.handles || valid.length === 0) return new Map<string, string>();
    return this.handles(valid);
  }

  async listTopics() {
    return this.repo.listTopics();
  }

  async listThreads(filter: { topicId?: string; language?: string }) {
    const rows = await this.repo.listThreads(filter);
    const names = await this.resolveHandles(rows.map((r) => r.authorId));
    return rows.map((r) => ({
      ...r,
      author: { id: r.authorId, handle: (r.authorId && names.get(r.authorId)) ?? "anonymous" },
      repliesCount: 0,
    }));
  }

  async getThread(id: string) {
    const thread = await this.repo.getThread(id);
    if (!thread) throw new AppError("not_found", 404);
    const rawReplies = await this.repo.listReplies(id);
    const names = await this.resolveHandles([
      thread.authorId,
      ...rawReplies.map((r) => r.authorId),
    ]);
    const replies = rawReplies.map((r) => ({
      ...r,
      author: { id: r.authorId, handle: (r.authorId && names.get(r.authorId)) ?? "anonymous" },
    }));
    return {
      ...thread,
      author: {
        id: thread.authorId,
        handle: (thread.authorId && names.get(thread.authorId)) ?? "anonymous",
      },
      repliesCount: replies.length,
      replies,
    };
  }

  async createThread(authorId: string | null, input: ThreadCreateInput) {
    const id = randomUUID();
    return this.repo.createThread({
      id,
      authorId,
      topicId: input.topicId,
      title: input.title,
      content: input.content,
      language: input.language,
      country: input.country,
      stack: input.stack,
      routeId: input.routeId,
      status: "open",
    });
  }

  async createReply(authorId: string | null, threadId: string, input: ReplyCreateInput) {
    const thread = await this.repo.getThread(threadId);
    if (!thread) throw new AppError("not_found", 404);
    const id = randomUUID();
    return this.repo.createReply({
      id,
      threadId,
      authorId,
      content: input.content,
      status: "visible",
    });
  }

  async acceptReply(authorId: string, threadId: string, replyId: string) {
    const thread = await this.repo.getThread(threadId);
    if (!thread) throw new AppError("not_found", 404);
    if (thread.authorId !== authorId) throw new AppError("forbidden", 403);
    await this.repo.acceptReply(threadId, replyId);
  }

  async voteReply(replyId: string) {
    const updated = await this.repo.voteReply(replyId);
    if (!updated) throw new AppError("not_found", 404);
    return updated;
  }

  async listPosts(filter: { language?: string; category?: string }) {
    const rows = await this.repo.listPosts(filter);
    const names = await this.resolveHandles(rows.map((r) => r.authorId));
    return rows.map((r) => ({
      ...r,
      author: { id: r.authorId, handle: (r.authorId && names.get(r.authorId)) ?? "Overpass" },
    }));
  }

  async getPost(slug: string) {
    const post = await this.repo.getPostBySlug(slug);
    if (!post) throw new AppError("not_found", 404);
    const names = await this.resolveHandles([post.authorId]);
    return {
      ...post,
      author: {
        id: post.authorId,
        handle: (post.authorId && names.get(post.authorId)) ?? "Overpass",
      },
    };
  }

  async createPost(authorId: string | null, input: PostCreateInput) {
    const id = randomUUID();
    const slug = input.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    return this.repo.createPost({
      id,
      authorId,
      slug: `${slug}-${id.slice(0, 8)}`,
      title: input.title,
      summary: input.summary,
      content: input.content,
      language: input.language,
      category: input.category,
      status: "published",
      publishedAt: new Date(),
    });
  }

  async subscribeNewsletter(input: NewsletterSubscribeInput) {
    const token = randomUUID().replace(/-/g, "");
    await this.repo.subscribeNewsletter(input.email, input.language, token);
    return { token };
  }

  async confirmNewsletter(token: string) {
    const confirmed = await this.repo.confirmNewsletter(token);
    if (!confirmed) throw new AppError("not_found", 404);
    return { ok: true };
  }

  async unsubscribeNewsletter(token: string) {
    const unsubscribed = await this.repo.unsubscribeNewsletter(token);
    if (!unsubscribed) throw new AppError("not_found", 404);
    return { ok: true };
  }
}
