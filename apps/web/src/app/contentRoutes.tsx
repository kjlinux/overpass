import { lazyPage } from "./lazyPage";

const blog = () => import("../pages/blog");
const BlogPage = lazyPage("blog", async () => (await blog()).BlogPage);
const MyBlogPage = lazyPage("blog", async () => (await blog()).MyBlogPage);
const FollowsPage = lazyPage("blog", async () => (await blog()).FollowsPage);
const PostEditorPage = lazyPage("blog", async () => (await blog()).PostEditorPage);
const newsletter = () => import("../pages/newsletter");
const NewsletterPage = lazyPage("newsletter", async () => (await newsletter()).NewsletterPage);
const ConfirmPage = lazyPage("newsletter", async () => (await newsletter()).NewsletterConfirmPage);
const LeavePage = lazyPage(
  "newsletter",
  async () => (await newsletter()).NewsletterUnsubscribePage,
);
const IssuesPage = lazyPage("newsletter", async () => (await newsletter()).IssuesAdminPage);
const BlogSegmentPage = lazyPage(["blog", "profile"], async () => (await blog()).BlogSegmentPage);
const DocsPage = lazyPage(["docs", "mcp"], async () => (await import("../pages/docs")).DocsPage);

/** Blog, newsletter and documentation; static paths come before the post and member segment. */
export const contentRoutes = [
  ["/blog", BlogPage],
  ["/blog/write", PostEditorPage],
  ["/blog/write/:id", PostEditorPage],
  ["/blog/me", MyBlogPage],
  ["/blog/following", FollowsPage],
  ["/blog/:segment", BlogSegmentPage],
  ["/newsletter", NewsletterPage],
  ["/newsletter/confirm", ConfirmPage],
  ["/newsletter/unsubscribe", LeavePage],
  ["/admin/newsletter", IssuesPage],
  ["/docs", DocsPage],
] as const;
