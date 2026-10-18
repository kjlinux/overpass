import { and, desc, eq, sql } from "drizzle-orm";
import type { Database } from "../../db/client.js";
import { newsletterSubscribers, posts, replies, threads, topics } from "./tables.js";

export class CommunityRepository {
  constructor(private readonly db: Database) {}

  async listTopics() {
    return this.db.select().from(topics).orderBy(topics.sortOrder);
  }

  async listThreads(filter: { topicId?: string; language?: string }) {
    const conditions = [];
    if (filter.topicId) conditions.push(eq(threads.topicId, filter.topicId));
    if (filter.language) conditions.push(eq(threads.language, filter.language));
    conditions.push(eq(threads.status, "open"));

    return this.db
      .select({
        id: threads.id,
        topicId: threads.topicId,
        title: threads.title,
        language: threads.language,
        country: threads.country,
        stack: threads.stack,
        routeId: threads.routeId,
        acceptedReplyId: threads.acceptedReplyId,
        status: threads.status,
        createdAt: threads.createdAt,
        updatedAt: threads.updatedAt,
        authorId: threads.authorId,
      })
      .from(threads)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(threads.createdAt));
  }

  async getThread(id: string) {
    const rows = await this.db
      .select({
        id: threads.id,
        topicId: threads.topicId,
        title: threads.title,
        content: threads.content,
        language: threads.language,
        country: threads.country,
        stack: threads.stack,
        routeId: threads.routeId,
        acceptedReplyId: threads.acceptedReplyId,
        status: threads.status,
        createdAt: threads.createdAt,
        updatedAt: threads.updatedAt,
        authorId: threads.authorId,
      })
      .from(threads)
      .where(eq(threads.id, id));
    return rows[0] ?? null;
  }

  async createThread(data: typeof threads.$inferInsert) {
    const [row] = await this.db.insert(threads).values(data).returning();
    return row;
  }

  async listReplies(threadId: string) {
    return this.db
      .select({
        id: replies.id,
        threadId: replies.threadId,
        content: replies.content,
        usefulVotes: replies.usefulVotes,
        status: replies.status,
        createdAt: replies.createdAt,
        authorId: replies.authorId,
      })
      .from(replies)
      .where(and(eq(replies.threadId, threadId), eq(replies.status, "visible")))
      .orderBy(replies.createdAt);
  }

  async createReply(data: typeof replies.$inferInsert) {
    const [row] = await this.db.insert(replies).values(data).returning();
    return row;
  }

  async acceptReply(threadId: string, replyId: string) {
    await this.db
      .update(threads)
      .set({ acceptedReplyId: replyId, updatedAt: new Date() })
      .where(eq(threads.id, threadId));
  }

  async voteReply(replyId: string) {
    const [row] = await this.db
      .update(replies)
      .set({ usefulVotes: sql`${replies.usefulVotes} + 1` })
      .where(eq(replies.id, replyId))
      .returning();
    return row;
  }

  async listPosts(filter: { language?: string; category?: string }) {
    const conditions = [eq(posts.status, "published")];
    if (filter.language) conditions.push(eq(posts.language, filter.language));
    if (filter.category) conditions.push(eq(posts.category, filter.category));
    return this.db
      .select({
        id: posts.id,
        slug: posts.slug,
        title: posts.title,
        summary: posts.summary,
        content: posts.content,
        language: posts.language,
        category: posts.category,
        status: posts.status,
        publishedAt: posts.publishedAt,
        createdAt: posts.createdAt,
        authorId: posts.authorId,
      })
      .from(posts)
      .where(and(...conditions))
      .orderBy(desc(posts.publishedAt));
  }

  async getPostBySlug(slug: string) {
    const [row] = await this.db
      .select({
        id: posts.id,
        slug: posts.slug,
        title: posts.title,
        summary: posts.summary,
        content: posts.content,
        language: posts.language,
        category: posts.category,
        status: posts.status,
        publishedAt: posts.publishedAt,
        createdAt: posts.createdAt,
        authorId: posts.authorId,
      })
      .from(posts)
      .where(eq(posts.slug, slug));
    return row ?? null;
  }

  async createPost(data: typeof posts.$inferInsert) {
    const [row] = await this.db.insert(posts).values(data).returning();
    return row;
  }

  async subscribeNewsletter(email: string, language: string, token: string) {
    const [row] = await this.db
      .insert(newsletterSubscribers)
      .values({
        id: crypto.randomUUID(),
        email,
        language,
        confirmationToken: token,
      })
      .onConflictDoUpdate({
        target: newsletterSubscribers.email,
        set: { confirmationToken: token, unsubscribedAt: null },
      })
      .returning();
    return row;
  }

  async confirmNewsletter(token: string) {
    const [row] = await this.db
      .update(newsletterSubscribers)
      .set({ confirmedAt: new Date() })
      .where(eq(newsletterSubscribers.confirmationToken, token))
      .returning();
    return row ?? null;
  }

  async unsubscribeNewsletter(token: string) {
    const [row] = await this.db
      .update(newsletterSubscribers)
      .set({ unsubscribedAt: new Date() })
      .where(eq(newsletterSubscribers.confirmationToken, token))
      .returning();
    return row ?? null;
  }
}
