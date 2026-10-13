import type { RouteDetail } from "@overpass/shared";
import type { JSX } from "preact";
import { useTranslation } from "react-i18next";
import { headingsOf } from "../../markdown";

const linkClass =
  "flex min-h-tap items-center justify-between gap-2 px-2 text-ink no-underline hover:bg-surface hover:underline";

function Entries({ route }: { route: RouteDetail }): JSX.Element {
  const { t } = useTranslation("routes");
  const entries = [
    ...headingsOf(route.content).map((heading) => ({ ...heading, count: undefined })),
    { id: "potholes", text: t("potholes.heading"), count: route.potholes.length },
    { id: "checks", text: t("checks.heading"), count: route.checks.length },
  ];
  return (
    <ol class="m-0 list-none border-t border-rule p-0">
      {entries.map((entry) => (
        <li key={entry.id} class="border-b border-rule">
          <a class={linkClass} href={`#${entry.id}`}>
            <span>{entry.text}</span>
            {entry.count === undefined ? null : (
              <span class="tabular-nums text-ink-2">{entry.count}</span>
            )}
          </a>
        </li>
      ))}
    </ol>
  );
}

/** Open list in the desktop rail, collapsed under 1024 px so the text comes first. */
export function Contents({ route }: { route: RouteDetail }): JSX.Element {
  const { t } = useTranslation("routes");
  return (
    <nav aria-labelledby="contents-heading">
      <h2 id="contents-heading" class="mb-2 hidden text-body font-semibold lg:block">
        {t("detail.contents")}
      </h2>
      <div class="hidden lg:block">
        <Entries route={route} />
      </div>
      <details class="lg:hidden">
        <summary class="min-h-tap cursor-pointer py-3 font-semibold">
          {t("detail.contents")}
        </summary>
        <Entries route={route} />
      </details>
    </nav>
  );
}
