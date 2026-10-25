import type { Content } from "./read.js";

type Joined = (handle: string, at: Date) => boolean;

function threadIssues(content: Content, early: Joined): string[] {
  const issues: string[] = [];
  for (const thread of content.threads) {
    const opened = thread.at;
    if (thread.replies.length > 0 && opened === undefined) {
      issues.push(`${thread.title}: a thread with replies needs its own date`);
    }
    if (thread.author !== undefined && opened !== undefined && early(thread.author, opened)) {
      issues.push(`${thread.title}: opened before ${thread.author} joined`);
    }
    for (const reply of thread.replies) {
      const voters = [reply.author, ...reply.useful].filter((handle) => early(handle, reply.at));
      if (voters.length > 0) issues.push(`${thread.title}: ${voters.join(", ")} not joined yet`);
      if (opened !== undefined && reply.at < opened) {
        issues.push(`${thread.title}: a reply by ${reply.author} is older than the thread`);
      }
    }
  }
  return issues;
}

function postIssues(content: Content, early: Joined): string[] {
  const issues: string[] = [];
  for (const post of content.posts) {
    if (post.author !== undefined && early(post.author, post.publishedAt)) {
      issues.push(`${post.title}: published before ${post.author} joined`);
    }
    for (const comment of post.comments) {
      const fans = comment.likes.some((handle) => early(handle, comment.at));
      if (early(comment.author, comment.at) || fans || comment.at < post.publishedAt) {
        issues.push(`${post.title}: a comment by ${comment.author} is dated too early`);
      }
    }
  }
  return issues;
}

/** Every contribution dated before its author joined or before what it answers, as messages. */
export function chronologyIssues(content: Content): string[] {
  const joined = new Map(content.members.map((member) => [member.handle, member.joinedAt]));
  const early: Joined = (handle, at) => at < (joined.get(handle) ?? at);
  return [...threadIssues(content, early), ...postIssues(content, early)];
}
