import type { Inbox } from "lucide-preact";
import type { ComponentChildren, JSX } from "preact";
import { useTranslation } from "react-i18next";
import { Button, EmptyState, Skeleton } from "../../components/ui";
import { FormAlert, LoadError } from "../../forms";
import type { Paged } from "./paging";

type Props<Item> = {
  state: Paged<Item>;
  more: () => void;
  retry: () => void;
  empty: { icon: typeof Inbox; title: string; description: string };
  children: (items: Item[]) => ComponentChildren;
};

/** Skeleton, error with a retry, empty state or the rows, then "Charger plus" while pages remain. */
export function PagedView<Item>(props: Props<Item>): JSX.Element {
  const { state, more, retry, empty, children } = props;
  const { t } = useTranslation("admin");
  if (state.phase === "loading") return <Skeleton lines={4} title={false} />;
  if (state.items.length === 0) {
    return state.error === undefined ? (
      <EmptyState {...empty} />
    ) : (
      <LoadError error={state.error} onRetry={retry} />
    );
  }
  return (
    <div class="flex flex-col gap-4">
      {children(state.items)}
      <FormAlert error={state.error} />
      {state.next === null ? null : (
        <Button class="self-start" loading={state.phase === "more"} onClick={more}>
          {t("more")}
        </Button>
      )}
    </div>
  );
}
