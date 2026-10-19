import type { QueueItem } from "@overpass/shared";
import type { JSX } from "preact";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../app/useLanguage";
import { Button, Chip } from "../../components/ui";
import { localizedPath } from "../../layout";
import { formatDate } from "../routes";
import type { Decision } from "./decisions";
import { decisionsFor } from "./decisions";

type Props = { item: QueueItem; onAsk: (decision: Decision) => void };

function Facts({ item }: { item: QueueItem }): JSX.Element {
  const { t } = useTranslation("admin");
  const language = useLanguage();
  const author = item.author === "" ? t("queue.deletedAuthor") : item.author;
  const reported =
    item.lastReportAt === null
      ? t("queue.noReport")
      : t("queue.lastReport", { date: formatDate(item.lastReportAt, language) });
  return (
    <p class="m-0 text-caption text-ink-2 [overflow-wrap:anywhere]">
      {t("queue.author", { author })} · {reported}
    </p>
  );
}

/** One reported or hidden content: what it is, where to read it, what can be decided. */
export function QueueRow({ item, onAsk }: Props): JSX.Element {
  const { t } = useTranslation("admin");
  const language = useLanguage();
  return (
    <li class="flex flex-col gap-2 border-b border-rule py-4">
      <div class="flex flex-wrap items-center gap-2">
        <Chip>{t(`kind.${item.kind}`)}</Chip>
        <Chip selected={item.status === "hidden"}>{t(`status.${item.status}`)}</Chip>
        <span class="text-caption text-ink-2 tabular-nums">
          {t("queue.count", { count: item.reports })}
        </span>
      </div>
      <a
        class="flex min-h-tap items-center self-start font-semibold [overflow-wrap:anywhere]"
        href={localizedPath(language, item.path)}
      >
        {item.title}
      </a>
      {item.excerpt === "" ? null : (
        <p class="m-0 max-w-prose text-ink-2 [overflow-wrap:anywhere]">{item.excerpt}</p>
      )}
      <Facts item={item} />
      <div class="flex flex-wrap gap-2">
        {decisionsFor(item).map((decision) => (
          <Button
            key={decision}
            variant={decision === "restore" ? "secondary" : "ghost"}
            onClick={() => {
              onAsk(decision);
            }}
          >
            {t(`decision.${decision}`)}
          </Button>
        ))}
      </div>
    </li>
  );
}
