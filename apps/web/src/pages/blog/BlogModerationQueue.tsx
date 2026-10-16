import type { ApiError, BlogModerationItem, ModerationAction } from "@overpass/shared";
import type { JSX } from "preact";
import { useState } from "preact/hooks";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../app/useLanguage";
import { ShieldCheck } from "lucide-preact";
import { Button, Chip, ConfirmDialog, EmptyState, Skeleton } from "../../components/ui";
import { FormAlert } from "../../forms";
import { localizedPath } from "../../layout";
import { apiRequest } from "../../session";
import { useApi } from "../routes";

type Pending =
  { kind: "block"; item: BlogModerationItem } | { kind: "suspend"; handle: string } | null;

type RowProps = {
  item: BlogModerationItem;
  act: (action: ModerationAction) => void;
  ask: (pending: Pending) => void;
};

function RowActions({ item, act, ask }: RowProps): JSX.Element {
  const { t } = useTranslation("blog");
  const author = item.author;
  const button = (label: string, onClick: () => void, ghost = false) => (
    <Button variant={ghost ? "ghost" : "secondary"} onClick={onClick}>
      {label}
    </Button>
  );
  const hide = () => {
    act("hide");
  };
  const block = () => {
    ask({ kind: "block", item });
  };
  const restore = () => {
    act("restore");
  };
  return (
    <div class="flex flex-wrap gap-2">
      {item.moderation === "visible" ? button(t("moderation.hide"), hide) : null}
      {button(t("moderation.block"), block)}
      {author === null
        ? null
        : button(t("moderation.suspend"), () => {
            ask({ kind: "suspend", handle: author });
          })}
      {item.moderation === "visible" ? null : button(t("moderation.restore"), restore, true)}
    </div>
  );
}

function Row({ item, act, ask }: RowProps): JSX.Element {
  const { t } = useTranslation("blog");
  const language = useLanguage();
  return (
    <li class="flex flex-col gap-2 border-b border-rule py-4">
      <div class="flex flex-wrap gap-2">
        <Chip>{t(`moderation.${item.kind}`)}</Chip>
        <Chip selected={item.moderation !== "visible"}>
          {t(`moderationStatus.${item.moderation}`)}
        </Chip>
        <Chip>{t("moderation.reports", { count: item.reports })}</Chip>
      </div>
      <a
        class="font-semibold [overflow-wrap:anywhere]"
        href={localizedPath(language, `/blog/${item.postSlug}`)}
      >
        {item.title}
      </a>
      <p class="m-0 text-ink-2 [overflow-wrap:anywhere]">{item.excerpt}</p>
      <RowActions item={item} act={act} ask={ask} />
    </li>
  );
}

function useQueue() {
  const { state, refresh } = useApi<BlogModerationItem[]>("/v1/moderation/blog");
  const [error, setError] = useState<ApiError | undefined>(undefined);
  const run = async (call: Promise<{ error: ApiError | null }>) => {
    setError((await call).error ?? undefined);
    await refresh();
  };
  const act = (item: BlogModerationItem, action: ModerationAction) =>
    void run(apiRequest("POST", `/v1/moderation/blog/${item.kind}/${item.id}`, { action }));
  const suspend = (handle: string) =>
    void run(apiRequest("POST", `/v1/moderation/blogs/${handle}/suspension`, { suspended: true }));
  return { state, error, act, suspend };
}

type DialogProps = { pending: Pending; onConfirm: () => void; onCancel: () => void };

function PendingDialog({ pending, onConfirm, onCancel }: DialogProps): JSX.Element {
  const { t } = useTranslation("blog");
  const action = pending?.kind === "suspend" ? "moderation.suspend" : "moderation.block";
  const description =
    pending?.kind === "suspend"
      ? t("moderation.suspendConfirm", { handle: pending.handle })
      : t("moderation.blockConfirm");
  return (
    <ConfirmDialog
      open={pending !== null}
      destructive
      title={t(action)}
      description={description}
      confirmLabel={t(action)}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}

type ListProps = {
  items: BlogModerationItem[];
  act: (item: BlogModerationItem, action: ModerationAction) => void;
  ask: (pending: Pending) => void;
};

function QueueList({ items, act, ask }: ListProps): JSX.Element {
  const { t } = useTranslation("blog");
  return (
    <>
      {items.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title={t("moderation.empty")}
          description={t("moderation.emptyText")}
        />
      ) : (
        <ul class="m-0 list-none border-t border-rule p-0">
          {items.map((item) => (
            <Row
              key={`${item.kind}:${item.id}`}
              item={item}
              act={(action) => {
                act(item, action);
              }}
              ask={ask}
            />
          ))}
        </ul>
      )}
    </>
  );
}

/** Reported posts and comments; blocking and suspending ask for confirmation first. */
export function BlogModerationQueue(): JSX.Element {
  const { state, error, act, suspend } = useQueue();
  const [pending, setPending] = useState<Pending>(null);
  const confirm = () => {
    if (pending?.kind === "block") act(pending.item, "block");
    if (pending?.kind === "suspend") suspend(pending.handle);
    setPending(null);
  };
  if (state.status === "error") return <FormAlert error={state.error} />;
  if (state.status !== "ready") return <Skeleton lines={4} />;
  return (
    <div class="flex flex-col gap-4">
      <FormAlert error={error} />
      <QueueList items={state.data} act={act} ask={setPending} />
      <PendingDialog
        pending={pending}
        onConfirm={confirm}
        onCancel={() => {
          setPending(null);
        }}
      />
    </div>
  );
}
