import type { ApiError, PostDetail } from "@overpass/shared";
import { Star } from "lucide-preact";
import type { JSX } from "preact";
import { useState } from "preact/hooks";
import { useLocation } from "preact-iso";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../app/useLanguage";
import { Button, ButtonLink, ConfirmDialog, cx } from "../../components/ui";
import { FormAlert } from "../../forms";
import { localizedPath } from "../../layout";

type Call = () => Promise<ApiError | undefined>;

export type ArticleActionsProps = {
  post: PostDetail;
  signedIn: boolean;
  star: Call;
  unstar: Call;
  report: Call;
};

type Run = (call: Call) => void;

function StarButton({ post, signedIn, star, unstar, run }: ArticleActionsProps & { run: Run }) {
  const { t } = useTranslation("blog");
  const language = useLanguage();
  const { url } = useLocation();
  const label = t("list.stars", { count: post.stars });
  if (!signedIn) {
    const href = `${localizedPath(language, "/sign-in")}?next=${encodeURIComponent(url)}`;
    const name = `${label}, ${t("article.signInToStar")}`;
    return (
      <ButtonLink href={href} aria-label={name}>
        {label}
      </ButtonLink>
    );
  }
  const starred = post.viewer.starred;
  return (
    <Button
      aria-pressed={starred}
      aria-label={`${t(starred ? "article.unstar" : "article.star")} (${label})`}
      disabled={post.viewer.isAuthor}
      onClick={() => {
        run(starred ? unstar : star);
      }}
    >
      <Star class={cx("h-5 w-5", starred && "fill-current")} aria-hidden="true" />
      {label}
    </Button>
  );
}

function ReportButton({ post, signedIn, report, run }: ArticleActionsProps & { run: Run }) {
  const { t } = useTranslation("blog");
  const [open, setOpen] = useState(false);
  if (!signedIn || post.viewer.isAuthor) return null;
  if (post.viewer.reported)
    return <p class="m-0 text-caption text-ink-2">{t("article.reported")}</p>;
  return (
    <>
      <Button
        variant="ghost"
        onClick={() => {
          setOpen(true);
        }}
      >
        {t("article.report")}
      </Button>
      <ConfirmDialog
        open={open}
        title={t("article.report")}
        description={t("article.reportConfirm")}
        confirmLabel={t("article.report")}
        onConfirm={() => {
          setOpen(false);
          run(report);
        }}
        onCancel={() => {
          setOpen(false);
        }}
      />
    </>
  );
}

/** Star, report and edit in one wrapping row; a failure is written above it, never dropped. */
export function ArticleActions(props: ArticleActionsProps): JSX.Element {
  const { t } = useTranslation("blog");
  const language = useLanguage();
  const [error, setError] = useState<ApiError | undefined>(undefined);
  const run: Run = (call) => {
    void call().then(setError);
  };
  const { post } = props;
  const editable = post.viewer.isAuthor || (post.kind === "news" && post.viewer.isAdmin);
  return (
    <div class="flex flex-col gap-3">
      <FormAlert error={error} />
      <div class="flex flex-wrap items-center gap-2 border-y border-rule py-3">
        <StarButton {...props} run={run} />
        <ReportButton {...props} run={run} />
        {editable ? (
          <ButtonLink variant="ghost" href={localizedPath(language, `/blog/write/${post.id}`)}>
            {t("article.edit")}
          </ButtonLink>
        ) : null}
      </div>
    </div>
  );
}
