import { languageNames } from "@overpass/shared";
import type { Issue } from "@overpass/shared";
import { Mail } from "lucide-preact";
import type { JSX } from "preact";
import { useTranslation } from "react-i18next";
import { Button, Chip, EmptyState } from "../../components/ui";

export type IssueListProps = { issues: Issue[]; onOpen: (issue: Issue) => void };

function IssueRow({ issue, onOpen }: { issue: Issue; onOpen: () => void }): JSX.Element {
  const { t } = useTranslation("newsletter");
  return (
    <li class="flex flex-col gap-2 border-b border-rule py-4 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex min-w-0 flex-col gap-1">
        <div class="flex flex-wrap items-center gap-2">
          <span class="font-semibold tabular-nums">
            {t("admin.number", { number: issue.number })}
          </span>
          <Chip selected={issue.status === "draft"}>{t(`admin.status.${issue.status}`)}</Chip>
          <Chip>{languageNames[issue.language]}</Chip>
        </div>
        <p class="m-0 [overflow-wrap:anywhere]">{issue.subject}</p>
        {issue.status === "draft" ? null : (
          <p class="m-0 text-caption tabular-nums text-ink-2">
            {t("admin.delivery", { delivered: issue.delivered, recipients: issue.recipients })}
          </p>
        )}
      </div>
      <Button variant="ghost" onClick={onOpen}>
        {t("admin.open")}
        <span class="sr-only">{issue.subject}</span>
      </Button>
    </li>
  );
}

/** Every issue, newest first as the API returns them; opening one shows it in the editor. */
export function IssueList({ issues, onOpen }: IssueListProps): JSX.Element {
  const { t } = useTranslation("newsletter");
  if (issues.length === 0) {
    return (
      <EmptyState icon={Mail} title={t("admin.emptyTitle")} description={t("admin.emptyText")} />
    );
  }
  return (
    <ul class="m-0 list-none border-t border-rule p-0">
      {issues.map((issue) => (
        <IssueRow
          key={issue.id}
          issue={issue}
          onOpen={() => {
            onOpen(issue);
          }}
        />
      ))}
    </ul>
  );
}
