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
const PricingPage = lazyPage("pricing", async () => (await import("../pages/pricing")).PricingPage);
const AboutPage = lazyPage("about", async () => (await import("../pages/about")).AboutPage);
const legal = () => import("../pages/legal");
const LegalPage = lazyPage("legal", async () => (await legal()).LegalPage);
const PrivacyPage = lazyPage("legal", async () => (await legal()).PrivacyPage);

/** Blog, newsletter, docs, pricing, about and legal; static paths precede the post segment. */
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
  ["/pricing", PricingPage],
  ["/about", AboutPage],
  ["/legal", LegalPage],
  ["/privacy", PrivacyPage],
] as const;
