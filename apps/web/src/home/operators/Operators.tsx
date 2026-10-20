import type { JSX } from "preact";
import { useTranslation } from "react-i18next";
import { operatorsView } from "./view";
import type { Operator } from "./view";
import { useOperators } from "./useOperators";

const skeletonItems = 3;
const itemClass =
  "flex items-baseline justify-between gap-4 border-b border-rule py-4 md:flex-col md:border-b-0 md:border-l md:px-6 md:py-5 md:first:border-l-0 md:first:pl-0";

function Kind({ operator }: { operator: Operator }): JSX.Element {
  const { t } = useTranslation("home");
  const category = t(`track.category.${operator.category}`);
  const text =
    operator.countries === 0 ? category : t("track.kind", { category, count: operator.countries });
  return <span class="text-caption text-ink-2">{text}</span>;
}

/** The simulated operators as the database lists them; names are proper nouns, never translated. */
export function OperatorList({ operators }: { operators: Operator[] }): JSX.Element {
  return (
    <ul class="grid border-t border-rule md:grid-cols-3">
      {operators.map((operator) => (
        <li key={operator.slug} class={itemClass}>
          <strong class="home-operator">{operator.name}</strong>
          <Kind operator={operator} />
        </li>
      ))}
    </ul>
  );
}

function OperatorsSkeleton(): JSX.Element {
  const { t } = useTranslation("home");
  return (
    <ul
      aria-busy="true"
      aria-label={t("track.loading")}
      class="grid border-t border-rule md:grid-cols-3"
    >
      {Array.from({ length: skeletonItems }, (_, index) => (
        <li key={index} class={itemClass}>
          <div class="skeleton-bar h-14 w-full" />
        </li>
      ))}
    </ul>
  );
}

/** Heading, unofficial badge and list; the whole block disappears when the API fails or lists none. */
export function Operators(): JSX.Element | null {
  const { t } = useTranslation("home");
  const view = operatorsView(useOperators());
  if (view.kind === "hidden") return null;
  return (
    <div class="border-t border-rule">
      <div class="flex flex-wrap items-center gap-x-4 gap-y-2 py-4">
        <h3 class="text-caption font-medium text-ink-2">{t("track.operators")}</h3>
        <span class="inline-flex min-h-7 items-center border border-rule-strong px-2 text-caption font-medium text-ink-2">
          {t("track.unofficial")}
        </span>
      </div>
      {view.kind === "loading" ? (
        <OperatorsSkeleton />
      ) : (
        <OperatorList operators={view.operators} />
      )}
    </div>
  );
}
