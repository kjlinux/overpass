import type { ApiError, PostComment } from "@overpass/shared";
import { Heart } from "lucide-preact";
import type { JSX } from "preact";
import { useTranslation } from "react-i18next";
import { Button, cx } from "../../components/ui";

export type LikeCall = (id: string, liked: boolean) => Promise<ApiError | undefined>;

type Props = {
  item: PostComment;
  signedIn: boolean;
  like: LikeCall;
  onError: (e?: ApiError) => void;
};

/** A member likes another member's visible comment; everyone else only reads the count. */
export function CommentLike({ item, signedIn, like, onError }: Props): JSX.Element | null {
  const { t } = useTranslation("blog");
  const count = t("comments.likes", { count: item.likes });
  const mayLike = signedIn && !item.viewer.isAuthor && item.moderation === "visible";
  if (!mayLike) return item.likes === 0 ? null : <p class="m-0 text-caption text-ink-2">{count}</p>;
  const liked = item.viewer.liked;
  return (
    <Button
      variant="ghost"
      class="self-start"
      aria-pressed={liked}
      aria-label={`${t(liked ? "comments.unlike" : "comments.like")} (${count})`}
      onClick={() => {
        void like(item.id, !liked).then(onError);
      }}
    >
      <Heart class={cx("h-4 w-4", liked && "fill-current")} aria-hidden="true" />
      {count}
    </Button>
  );
}
