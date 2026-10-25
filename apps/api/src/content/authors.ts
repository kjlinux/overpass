import type { Content } from "./read.js";

/** Every handle the content names: authors, voters, stargazers and commenters. */
function namedHandles(content: Content): string[] {
  const fromThreads = content.threads.flatMap((thread) => [
    ...(thread.author === undefined ? [] : [thread.author]),
    ...thread.replies.flatMap((reply) => [reply.author, ...reply.useful]),
  ]);
  const fromPosts = content.posts.flatMap((post) => [
    ...(post.author === undefined ? [] : [post.author]),
    ...post.stars,
    ...post.comments.flatMap((comment) => [comment.author, ...comment.likes]),
  ]);
  return [...fromThreads, ...fromPosts];
}

/** Handles named in the content without a file under members/, so the seed stops before writing. */
export function unknownHandles(content: Content): string[] {
  const known = new Set(content.members.map((member) => member.handle));
  return [...new Set(namedHandles(content))].filter((handle) => !known.has(handle));
}
