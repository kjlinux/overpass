import type { Envelope } from "@overpass/shared";
import { apiRequest } from "../../session/api";
import type { ReplyItem, ThreadDetail, ThreadSummary, Topic } from "./types";

export function fetchTopics(): Promise<Envelope<Topic[]>> {
  return apiRequest<Topic[]>("GET", "/v1/topics");
}

export function fetchThreads(filter: {
  topicId?: string | undefined;
  language?: string | undefined;
}): Promise<Envelope<ThreadSummary[]>> {
  const params = new URLSearchParams();
  if (filter.topicId) params.set("topicId", filter.topicId);
  if (filter.language) params.set("language", filter.language);
  const query = params.toString();
  return apiRequest<ThreadSummary[]>("GET", `/v1/threads${query ? `?${query}` : ""}`);
}

export function fetchThread(id: string): Promise<Envelope<ThreadDetail>> {
  return apiRequest<ThreadDetail>("GET", `/v1/threads/${id}`);
}

export function createThread(body: {
  topicId: string;
  title: string;
  content: string;
  language?: string | undefined;
  country?: string | undefined;
  stack?: string | undefined;
  routeId?: string | undefined;
}): Promise<Envelope<ThreadSummary>> {
  return apiRequest<ThreadSummary>("POST", "/v1/threads", body);
}

export function createReply(threadId: string, content: string): Promise<Envelope<ReplyItem>> {
  return apiRequest<ReplyItem>("POST", `/v1/threads/${threadId}/replies`, { content });
}

export function voteReply(replyId: string): Promise<Envelope<{ usefulVotes: number }>> {
  return apiRequest<{ usefulVotes: number }>("POST", `/v1/replies/${replyId}/useful`);
}

export function acceptReply(
  threadId: string,
  replyId: string,
): Promise<Envelope<{ accepted: boolean }>> {
  return apiRequest<{ accepted: boolean }>("POST", `/v1/threads/${threadId}/accept`, { replyId });
}
