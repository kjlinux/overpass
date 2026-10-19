import type { JSX } from "preact";
import { useTranslation } from "react-i18next";
import { Button, Skeleton } from "../../components/ui";
import { FormAlert } from "../../forms";
import { PostList } from "./PostList";
import { useFeed } from "./useFeed";

/** A loaded feed with its error, loading and "show more" states. */
export function Feed(props: {
  path: (cursor?: string) => string;
  featured?: boolean;
}): JSX.Element {
  const { t } = useTranslation("ui");
  const { state, reload, page, more, loadingMore } = useFeed(props.path);
  if (state.status === "error") {
    return (
      <div class="flex flex-col items-start gap-4">
        <FormAlert error={state.error} />
        <Button onClick={() => void reload()}>{t("retry")}</Button>
      </div>
    );
  }
  if (page === null) return <Skeleton lines={6} />;
  return (
    <PostList
      page={page}
      featured={props.featured ?? false}
      onMore={() => void more()}
      loadingMore={loadingMore}
    />
  );
}
