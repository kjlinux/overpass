import type { JSX } from "preact";
import { useTranslation } from "react-i18next";
import { FieldList, Placeholder } from "./PageSection";

/** One entry per group of tables in apps/api/migrations, in the order a member meets them. */
const categories = [
  "account",
  "stacks",
  "tokens",
  "contributions",
  "sandbox",
  "newsletter",
  "limits",
  "logs",
] as const;

/** Server logs have no retention set in code; the hosting decides it. */
const retentionUnknown = new Set<string>(["logs"]);

/** What the database keeps, why, and for how long, per group of data. */
export function DataInventory(): JSX.Element {
  const { t } = useTranslation("legal");
  return (
    <div class="flex flex-col gap-8">
      {categories.map((key) => (
        <article key={key} aria-labelledby={`data-${key}`}>
          <h3 id={`data-${key}`} class="mb-3 text-h3 font-semibold">
            {t(`data.${key}.title`)}
          </h3>
          <FieldList
            fields={[
              { term: t("data.what"), value: t(`data.${key}.what`) },
              { term: t("data.why"), value: t(`data.${key}.why`) },
              {
                term: t("data.kept"),
                value: retentionUnknown.has(key) ? (
                  <Placeholder label={t("placeholder")} />
                ) : (
                  t(`data.${key}.kept`)
                ),
              },
            ]}
          />
        </article>
      ))}
    </div>
  );
}
