import type { JSX } from "preact";
import { useTranslation } from "react-i18next";

export type SkeletonProps = { lines?: number; title?: boolean };

const widths = ["w-full", "w-11/12", "w-4/5", "w-2/3"];

/** Surface-coloured bars matching the shape of the content being loaded. */
export function Skeleton({ lines = 3, title = true }: SkeletonProps): JSX.Element {
  const { t } = useTranslation("ui");
  return (
    <div aria-busy="true" aria-label={t("loading")} role="status" class="flex flex-col gap-3">
      {title ? <div class="skeleton-bar h-8 w-48" /> : null}
      {Array.from({ length: lines }, (_, index) => (
        <div key={index} class={`skeleton-bar h-4 ${widths[index % widths.length] ?? "w-full"}`} />
      ))}
    </div>
  );
}
