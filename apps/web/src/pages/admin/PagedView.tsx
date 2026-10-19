import type { Inbox } from "lucide-preact";
import type { ComponentChildren, JSX } from "preact";
import { useTranslation } from "react-i18next";
import { Button, EmptyState, Skeleton } from "../../components/ui";
import { FormAlert } from "../../forms";
import type { Paged } from "./paging";

type Props<Item> = {
  state: Paged<Item>;
  more: () => void;
  empty: { icon: typeof Inbox; title: string; description: string };
  children: (items: Item[]) => ComponentChildren;
};

/** Skeleton, written error, empty state or the rows, then "Charger plus" while pages remain. */
export function PagedView<Item>({ state, more, empty, children }: Props<Item>): JSX.Element {
  const { t } = useTranslation("admin");
  if (state.phase === "loading") return <Skeleton lines={4} title={false} />;
  if (state.items.length === 0) {
    return state.error === undefined ? (
      <EmptyState {...empty} />
    ) : (
      <FormAlert error={state.error} />
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
