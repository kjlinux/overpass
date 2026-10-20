import type { ApiError } from "@overpass/shared";
import type { JSX } from "preact";
import { useTranslation } from "react-i18next";
import { Button } from "../components/ui";
import { FormAlert } from "./FormAlert";

export type LoadErrorProps = { error: ApiError; onRetry: () => void };

/** A failed load: the written error, then one button that asks again. */
export function LoadError({ error, onRetry }: LoadErrorProps): JSX.Element {
  const { t } = useTranslation("ui");
  return (
    <div class="flex flex-col items-start gap-4">
      <FormAlert error={error} />
      <Button onClick={onRetry}>{t("retry")}</Button>
    </div>
  );
}
