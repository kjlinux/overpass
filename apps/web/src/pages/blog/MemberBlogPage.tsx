import type { ApiError, Blog } from "@overpass/shared";
import type { JSX } from "preact";
import { useState } from "preact/hooks";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../app/useLanguage";
import { Button, Skeleton } from "../../components/ui";
import { FormAlert, LoadError } from "../../forms";
import { Layout } from "../../layout";
import { apiRequest, usePublicProfile, useSession } from "../../session";
import { ErrorPage } from "../errors";
import { ProfileSummary } from "../profile";
import { useApi } from "../routes";
import { Feed } from "./Feed";
import { postsPath } from "./query";

function FollowButton({ blog, onChange }: { blog: Blog; onChange: () => Promise<void> }) {
  const { t } = useTranslation("blog");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | undefined>(undefined);
  const { follows } = blog.viewer;
  const toggle = async () => {
    setBusy(true);
    const path = `/v1/blogs/${blog.handle}/follow`;
    const result = await apiRequest(follows ? "DELETE" : "POST", path, follows ? undefined : {});
    setBusy(false);
    setError(result.error ?? undefined);
    if (result.error === null) await onChange();
  };
  return (
    <div class="flex flex-col items-start gap-2">
      <Button
        variant={follows ? "secondary" : "primary"}
        aria-pressed={follows}
        loading={busy}
        onClick={() => void toggle()}
      >
        {t(follows ? "blog.unfollow" : "blog.follow")}
      </Button>
      <FormAlert error={error} />
    </div>
  );
}

function BlogHeader({ handle }: { handle: string }): JSX.Element | null {
  const { t } = useTranslation("blog");
  const { me } = useSession();
  const { state, refresh, reload } = useApi<Blog>(`/v1/blogs/${handle}`);
  if (state.status === "error") {
    return <LoadError error={state.error} onRetry={() => void reload()} />;
  }
  if (state.status !== "ready") return <Skeleton lines={1} />;
  const blog = state.data;
  return (
    <div class="mt-6 flex flex-wrap items-center gap-4 border-b border-rule pb-6">
      <p class="m-0 text-ink-2">{t("blog.followers", { count: blog.followers })}</p>
      {me != null && !blog.viewer.isOwner ? <FollowButton blog={blog} onChange={refresh} /> : null}
      {blog.suspended ? (
        <p class="m-0 border border-warning bg-warning-surface p-4">{t("blog.suspended")}</p>
      ) : null}
    </div>
  );
}

/** The member's public profile, the follow button, then the posts of this blog only. */
export function MemberBlogPage({ handle }: { handle: string }): JSX.Element {
  const { t } = useTranslation("blog");
  const language = useLanguage();
  const { state: profile, retry } = usePublicProfile(handle);
  if (profile.status === "notFound") return <ErrorPage kind="notFound" language={language} />;
  const path = (cursor?: string) => postsPath({ author: handle }, language, cursor);
  return (
    <Layout language={language}>
      <section class="py-12 md:py-16">
        <p class="m-0 text-caption font-semibold text-ink-2">{t("blog.title", { handle })}</p>
        {profile.status === "ready" ? <ProfileSummary profile={profile.profile} /> : null}
        {profile.status === "error" ? (
          <LoadError error={profile.error} onRetry={() => void retry()} />
        ) : null}
        {profile.status === "loading" ? <Skeleton lines={3} /> : null}
        <BlogHeader handle={handle} />
        <section aria-labelledby="blog-posts" class="mt-8">
          <h2 id="blog-posts" class="mb-4 text-h2 font-semibold">
            {t("blog.posts")}
          </h2>
          <Feed path={path} />
        </section>
      </section>
    </Layout>
  );
}
