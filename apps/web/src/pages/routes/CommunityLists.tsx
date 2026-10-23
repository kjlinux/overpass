import { countryName } from "@overpass/shared";
import type { Pothole, PotholeStatus, RouteDetail } from "@overpass/shared";
import type { ComponentChildren, JSX } from "preact";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../app/useLanguage";
import { Button } from "../../components/ui";
import { formatDate } from "./format";

type SectionProps = {
  id: string;
  title: string;
  intro?: string;
  action?: ComponentChildren;
  children: ComponentChildren;
};

function Section({ id, title, intro, action, children }: SectionProps): JSX.Element {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-heading`}
      class="max-w-prose scroll-mt-4 border-t border-ink py-8"
    >
      <div class="flex flex-wrap items-center justify-between gap-3">
        <h2 id={`${id}-heading`} class="text-h2 font-semibold">
          {title}
        </h2>
        {action}
      </div>
      {intro === undefined ? null : <p class="mb-4 mt-2 text-ink-2">{intro}</p>}
      {children}
    </section>
  );
}

type PotholeProps = {
  busy: boolean;
  pothole: Pothole;
  canModerate: boolean;
  onStatus: (id: string, status: PotholeStatus) => void;
};

/** Each button names its pothole for screen readers, since every row repeats the same labels. */
function Moderation(props: Omit<PotholeProps, "canModerate">): JSX.Element {
  const { busy, pothole, onStatus } = props;
  const { t } = useTranslation("routes");
  const next: PotholeStatus[] =
    pothole.status === "open" ? ["confirmed", "resolved"] : ["resolved"];
  return (
    <div class="flex flex-wrap gap-2">
      {next.map((status) => (
        <Button
          key={status}
          variant="ghost"
          loading={busy}
          aria-describedby={`pothole-${pothole.id}`}
          onClick={() => {
            onStatus(pothole.id, status);
          }}
        >
          {t(status === "confirmed" ? "potholes.confirm" : "potholes.resolve")}
        </Button>
      ))}
    </div>
  );
}

function PotholeRow({ busy, pothole, canModerate, onStatus }: PotholeProps): JSX.Element {
  const { t } = useTranslation("routes");
  const language = useLanguage();
  const resolved = pothole.status === "resolved";
  return (
    <li class="flex flex-col gap-2 border-b border-rule px-2 py-4">
      <p id={`pothole-${pothole.id}`} class={resolved ? "text-ink-2" : undefined}>
        {pothole.description}
      </p>
      <p class="flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-ink-2">
        <span class="font-semibold text-ink">{t(`potholes.status.${pothole.status}`)}</span>
        <span>
          {pothole.handle}, {formatDate(pothole.createdAt, language)}
        </span>
      </p>
      {canModerate && !resolved ? (
        <Moderation busy={busy} pothole={pothole} onStatus={onStatus} />
      ) : null}
    </li>
  );
}

export type PotholeListProps = {
  busyId?: string | null;
  route: RouteDetail;
  onReport: () => void;
  onStatus: (id: string, status: PotholeStatus) => void;
};

export function PotholeList(props: PotholeListProps): JSX.Element {
  const { route, onReport, onStatus, busyId = null } = props;
  const { t } = useTranslation("routes");
  const member = route.viewer.eligibility !== "anonymous";
  const action = member ? <Button onClick={onReport}>{t("potholes.report")}</Button> : undefined;
  return (
    <Section
      id="potholes"
      title={t("potholes.heading")}
      intro={t("potholes.intro")}
      action={action}
    >
      {route.potholes.length === 0 ? (
        <p class="border-t border-rule py-4 text-ink-2">{t("potholes.empty")}</p>
      ) : (
        <ul class="m-0 list-none border-t border-rule p-0">
          {route.potholes.map((pothole) => (
            <PotholeRow
              key={pothole.id}
              pothole={pothole}
              busy={busyId === pothole.id}
              canModerate={route.viewer.isAuthor}
              onStatus={onStatus}
            />
          ))}
        </ul>
      )}
    </Section>
  );
}

export function CheckList({ route }: { route: RouteDetail }): JSX.Element {
  const { t } = useTranslation("routes");
  const language = useLanguage();
  return (
    <Section id="checks" title={t("checks.heading")}>
      {route.checks.length === 0 ? (
        <p class="border-t border-rule py-4 text-ink-2">{t("checks.empty")}</p>
      ) : (
        <ol class="m-0 list-none border-t border-rule p-0">
          {route.checks.map((check) => (
            <li
              key={check.id}
              class="grid grid-cols-[9.5em_minmax(0,1fr)] items-baseline gap-2 border-b border-rule px-2 py-4"
            >
              <time dateTime={check.checkedAt} class="font-semibold tabular-nums">
                {formatDate(check.checkedAt, language)}
              </time>
              <span class="flex flex-wrap gap-x-3 text-caption text-ink-2">
                <span>{countryName(check.country, language)}</span>
                <span class="font-code">{t(`checks.environment.${check.environment}`)}</span>
                <span>{check.handle}</span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </Section>
  );
}
