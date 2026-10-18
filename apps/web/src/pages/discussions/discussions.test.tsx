import { LocationProvider } from "preact-iso";
import { render } from "preact-render-to-string";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { setupTestI18n } from "../../i18n/test-i18n";
import { DiscussionsFilters, ReplyCard, ThreadCard, ThreadOriginalPost } from "./index";
import fr from "./locales/fr.json";
import type { ReplyItem, ThreadDetail, ThreadSummary, Topic } from "./types";

const mockTopic: Topic = {
  id: "d0000001-0000-4000-8000-000000000001",
  name: "Integrations et API",
  description: "Discussions techniques",
  sortOrder: 1,
};

const mockThread: ThreadSummary = {
  id: "t0000001-0000-4000-8000-000000000001",
  topicId: mockTopic.id,
  title: "Wave webhook delay in production",
  language: "fr",
  country: "CI",
  stack: "laravel",
  routeId: null,
  acceptedReplyId: "r0000001-0000-4000-8000-000000000001",
  status: "open",
  createdAt: "2026-10-14T10:00:00Z",
  updatedAt: "2026-10-14T10:00:00Z",
  author: { id: "u0000001", handle: "dev-koffi" },
  repliesCount: 3,
};

const mockReply: ReplyItem = {
  id: "r0000001-0000-4000-8000-000000000001",
  threadId: mockThread.id,
  content: "Use an idempotent worker to process webhook events asynchronously.",
  usefulVotes: 5,
  status: "visible",
  createdAt: "2026-10-14T11:00:00Z",
  author: { id: "u0000002", handle: "dev-expert" },
};

const mockDetail: ThreadDetail = {
  ...mockThread,
  content: "We noticed 15s delays on MTN Côte d'Ivoire. Is anyone else seeing this?",
  replies: [mockReply],
};

beforeAll(async () => {
  await setupTestI18n("fr");
  vi.stubGlobal("location", new URL("/fr/discussions", "http://localhost"));
});

const page = (node: preact.ComponentChildren) =>
  render(<LocationProvider>{node}</LocationProvider>);

describe("ThreadCard", () => {
  it("renders title, author, topic and solved badge", () => {
    const html = page(<ThreadCard thread={mockThread} topics={[mockTopic]} />);
    expect(html).toContain("Wave webhook delay in production");
    expect(html).toContain("dev-koffi");
    expect(html).toContain("Integrations et API");
    expect(html).toContain(fr.card.accepted);
  });
});

describe("DiscussionsFilters", () => {
  it("renders topic, country and stack filter options", () => {
    const html = page(
      <DiscussionsFilters
        topics={[mockTopic]}
        filters={{ topicId: "", country: "", stack: "" }}
        onChange={vi.fn()}
      />,
    );
    expect(html).toContain(fr.topics.all);
    expect(html).toContain(fr.country.all);
    expect(html).toContain(fr.stack.all);
    expect(html).toContain("Integrations et API");
  });
});

describe("ReplyCard", () => {
  it("renders reply content, votes and accepted answer badge", () => {
    const html = page(
      <ReplyCard
        reply={mockReply}
        isThreadAuthor={true}
        isAccepted={true}
        hasAcceptedReply={true}
        onVote={vi.fn()}
        onAccept={vi.fn()}
        voting={false}
        accepting={false}
      />,
    );
    expect(html).toContain("dev-expert");
    expect(html).toContain("idempotent worker");
    expect(html).toContain(fr.detail.acceptedAnswer);
    expect(html).toContain("5");
  });
});

describe("ThreadOriginalPost", () => {
  it("renders question content and button to transform into a route", () => {
    const html = page(<ThreadOriginalPost thread={mockDetail} topics={[mockTopic]} />);
    expect(html).toContain("Wave webhook delay in production");
    expect(html).toContain("We noticed 15s delays");
    expect(html).toContain(fr.detail.transformToRoute);
  });
});
