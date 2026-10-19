import type { JSX } from "preact";
import { useRoute } from "preact-iso";
import { ArticlePage } from "./ArticlePage";
import { MemberBlogPage } from "./MemberBlogPage";

/** /blog/@handle is a member's blog, any other segment is a post slug. */
export function BlogSegmentPage(): JSX.Element {
  const { params } = useRoute();
  const segment = decodeURIComponent(params["segment"] ?? "");
  if (segment.startsWith("@")) return <MemberBlogPage handle={segment.slice(1)} />;
  return <ArticlePage slug={segment} />;
}
