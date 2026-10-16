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

export type ArticleActionsProps = {
  post: PostDetail;
  signedIn: boolean;
  star: () => Promise<ApiError | undefined>;
  unstar: () => Promise<ApiError | undefined>;
  report: () => Promise<ApiError | undefined>;
};

function StarButton(props: ArticleActionsProps): JSX.Element {
  const { t } = useTranslation("blog");
  const language = useLanguage();
  const { url } = useLocation();
  const { post } = props;
  const label = t("list.stars", { count: post.stars });
  if (!props.signedIn) {
    const href = `${localizedPath(language, "/sign-in")}?next=${encodeURIComponent(url)}`;
    return (
      <ButtonLink href={href} aria-label={t("article.signInToStar")}>
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
      onClick={() => void (starred ? props.unstar() : props.star())}
    >
      <Star class={cx("h-4 w-4", starred && "fill-current")} aria-hidden="true" />
      {label}
    </Button>
  );
}

function ReportButton(props: ArticleActionsProps): JSX.Element | null {
  const { t } = useTranslation("blog");
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<ApiError | undefined>(undefined);
  const { viewer } = props.post;
  if (!props.signedIn || viewer.isAuthor) return null;
  if (viewer.reported) return <p class="m-0 text-caption text-ink-2">{t("article.reported")}</p>;
  const confirm = async () => {
    setOpen(false);
    setError(await props.report());
  };
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
      <FormAlert error={error} />
      <ConfirmDialog
        open={open}
        title={t("article.report")}
        description={t("article.reportConfirm")}
        confirmLabel={t("article.report")}
        onConfirm={() => void confirm()}
        onCancel={() => {
          setOpen(false);
        }}
      />
    </>
  );
}

/** Star, report and edit, in one wrapping row under the title. */
export function ArticleActions(props: ArticleActionsProps): JSX.Element {
  const { t } = useTranslation("blog");
  const language = useLanguage();
  const { post } = props;
  const editable = post.viewer.isAuthor || (post.kind === "news" && post.viewer.isAdmin);
  return (
    <div class="flex flex-wrap items-center gap-2 border-y border-rule py-3">
      <StarButton {...props} />
      <ReportButton {...props} />
      {editable ? (
        <ButtonLink variant="ghost" href={localizedPath(language, `/blog/write/${post.id}`)}>
          {t("article.edit")}
        </ButtonLink>
      ) : null}
    </div>
  );
}
