import type { ApiError } from "@overpass/shared";
import { CircleAlert } from "lucide-preact";
import type { JSX } from "preact";
import { useTranslation } from "react-i18next";
import { networkErrorCode } from "../session/api";

/** The error of a whole form, above its fields; announced as soon as it appears. */
export function FormAlert({ error }: { error: ApiError | undefined }): JSX.Element | null {
  const { t } = useTranslation("ui");
  if (error === undefined) return null;
  const text = error.code === networkErrorCode ? t("networkError") : error.message;
  return (
    <div
      role="alert"
      class="flex items-start gap-3 border border-l-4 border-danger bg-danger-surface p-4"
    >
      <CircleAlert class="mt-1 h-5 w-5 flex-none text-danger" aria-hidden="true" />
      <p>{text}</p>
    </div>
  );
}
