import type { ApiError, ModerationDecision, ModerationItem } from "@overpass/shared";
import { ShieldCheck } from "lucide-preact";
import type { JSX } from "preact";
import { useState } from "preact/hooks";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../app/useLanguage";
import { Button, Chip, ConfirmDialog, EmptyState, Skeleton } from "../../components/ui";
import { FormAlert } from "../../forms";
import { localizedPath } from "../../layout";
import { apiRequest } from "../../session";
import { useApi } from "../routes";

type Decide = (item: ModerationItem, decision: ModerationDecision) => void;
type RowProps = { item: ModerationItem; busy: boolean; onDecide: Decide; onRemove: () => void };

function RowActions({ item, busy, onDecide, onRemove }: RowProps): JSX.Element {
  const { t } = useTranslation("moderation");
  return (
    <div class="flex flex-wrap gap-2">
      <Button
        onClick={() => {
          onDecide(item, "restore");
        }}
        disabled={busy}
      >
        {t("reports.restore")}
      </Button>
      <Button variant="ghost" onClick={onRemove} disabled={busy}>
        {t("reports.remove")}
      </Button>
    </div>
  );
}

function ReportRow(props: RowProps): JSX.Element {
  const { item } = props;
  const { t } = useTranslation("moderation");
  const language = useLanguage();
  const author = item.author === "" ? "-" : item.author;
  return (
    <li class="flex flex-col gap-2 border-b border-rule py-4">
      <div class="flex flex-wrap items-center gap-2">
        <Chip>{t(`kind.${item.kind}`)}</Chip>
        <Chip selected={item.status === "hidden"}>{t(`status.${item.status}`)}</Chip>
        <span class="text-caption text-ink-2">{t("reports.count", { count: item.reports })}</span>
      </div>
      <a
        class="font-semibold [overflow-wrap:anywhere]"
        href={localizedPath(language, `/discussions/${item.threadId}`)}
      >
        {item.title}
      </a>
      <p class="m-0 max-w-prose text-ink-2 [overflow-wrap:anywhere]">{item.excerpt}</p>
      <p class="m-0 text-caption text-ink-2">{t("reports.author", { author })}</p>
      <RowActions {...props} />
    </li>
  );
}

function useDecisions(refresh: () => Promise<void>) {
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<ApiError | undefined>(undefined);
  const [removing, setRemoving] = useState<ModerationItem | null>(null);
  const decide: Decide = (item, decision) => {
    setBusy(true);
    setRemoving(null);
    const path = `/v1/moderation/${item.kind}/${item.id}`;
    void apiRequest("POST", path, { decision }).then(async ({ error }) => {
      if (error === null) await refresh();
      setBusy(false);
      setFailure(error ?? undefined);
    });
  };
  return { busy, failure, removing, setRemoving, decide };
}

function RemoveDialog(props: {
  item: ModerationItem | null;
  onConfirm: Decide;
  onCancel: () => void;
}) {
  const { t } = useTranslation("moderation");
  const { item } = props;
  return (
    <ConfirmDialog
      open={item !== null}
      title={t("reports.removeTitle")}
      description={t("reports.removeText")}
      confirmLabel={t("reports.remove")}
      destructive
      onConfirm={() => {
        if (item !== null) props.onConfirm(item, "remove");
      }}
      onCancel={props.onCancel}
    />
  );
}

/** Restoring clears the reports; removing is destructive, so it asks first. */
export function ReportsQueue(): JSX.Element {
  const { t } = useTranslation("moderation");
  const { state, refresh } = useApi<ModerationItem[]>("/v1/moderation/reports");
  const { busy, failure, removing, setRemoving, decide } = useDecisions(refresh);
  if (state.status === "error") return <FormAlert error={state.error} />;
  if (state.status !== "ready") return <Skeleton lines={4} />;
  if (state.data.length === 0) {
    const empty = { title: t("reports.emptyTitle"), description: t("reports.emptyText") };
    return <EmptyState icon={ShieldCheck} {...empty} />;
  }
  const rows = state.data.map((item) => (
    <ReportRow
      key={`${item.kind}-${item.id}`}
      item={item}
      busy={busy}
      onDecide={decide}
      onRemove={() => {
        setRemoving(item);
      }}
    />
  ));
  return (
    <div class="flex flex-col gap-4">
      <FormAlert error={failure} />
      <ul class="m-0 list-none border-t border-rule p-0">{rows}</ul>
      <RemoveDialog
        item={removing}
        onConfirm={decide}
        onCancel={() => {
          setRemoving(null);
        }}
      />
    </div>
  );
}
