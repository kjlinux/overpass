import type { IssueItem } from "@overpass/shared";
import { ArrowDown, ArrowUp, X } from "lucide-preact";
import type { JSX } from "preact";
import { useTranslation } from "react-i18next";
import { Chip, IconButton } from "../../components/ui";
import { moveItem, removeItem } from "./items";

export type ItemListProps = {
  items: IssueItem[];
  readOnly: boolean;
  onChange: (items: IssueItem[]) => void;
};

type RowProps = ItemListProps & { item: IssueItem; index: number };

function ItemActions({ items, item, index, onChange }: RowProps): JSX.Element {
  const { t } = useTranslation("newsletter");
  const title = item.title;
  return (
    <div class="flex flex-none gap-1">
      <IconButton
        label={t("admin.moveUp", { title })}
        disabled={index === 0}
        onClick={() => {
          onChange(moveItem(items, index, -1));
        }}
      >
        <ArrowUp class="h-5 w-5" aria-hidden="true" />
      </IconButton>
      <IconButton
        label={t("admin.moveDown", { title })}
        disabled={index === items.length - 1}
        onClick={() => {
          onChange(moveItem(items, index, 1));
        }}
      >
        <ArrowDown class="h-5 w-5" aria-hidden="true" />
      </IconButton>
      <IconButton
        label={t("admin.remove", { title })}
        onClick={() => {
          onChange(removeItem(items, index));
        }}
      >
        <X class="h-5 w-5" aria-hidden="true" />
      </IconButton>
    </div>
  );
}

function ItemRow(props: RowProps): JSX.Element {
  const { t } = useTranslation("newsletter");
  const { item, readOnly } = props;
  return (
    <li class="flex flex-col gap-2 border-b border-rule py-3 sm:flex-row sm:items-start sm:justify-between">
      <div class="flex min-w-0 flex-col gap-1">
        <div>
          <Chip>{t(`admin.kind.${item.kind}`)}</Chip>
        </div>
        <span class="font-semibold [overflow-wrap:anywhere]">{item.title}</span>
        <span class="text-caption text-ink-2 [overflow-wrap:anywhere]">{item.summary}</span>
      </div>
      {readOnly ? null : <ItemActions {...props} />}
    </li>
  );
}

/** The ordered content of an issue; every move is a button so the keyboard can reorder. */
export function ItemList(props: ItemListProps): JSX.Element {
  const { t } = useTranslation("newsletter");
  if (props.items.length === 0) return <p class="m-0 text-ink-2">{t("admin.noItems")}</p>;
  return (
    <ol class="m-0 list-none border-t border-rule p-0">
      {props.items.map((item, index) => (
        <ItemRow key={`${item.kind}-${item.id}`} {...props} item={item} index={index} />
      ))}
    </ol>
  );
}
