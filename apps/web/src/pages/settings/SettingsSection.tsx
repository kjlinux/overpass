import type { ComponentChildren, JSX } from "preact";
import { useTranslation } from "react-i18next";

type Props = { heading: string; intro?: string; children: ComponentChildren };

/** One tab panel: a heading, one sentence, then its form. */
export function SettingsSection({ heading, intro, children }: Props): JSX.Element {
  return (
    <div class="max-w-[560px] p-4 sm:p-6">
      <h2 class="text-h2 font-semibold">{heading}</h2>
      {intro === undefined ? null : <p class="mt-2 text-ink-2">{intro}</p>}
      <div class="mt-6">{children}</div>
    </div>
  );
}

/** Silent success: a short status line, no toast. */
export function SavedNote({ shown, text }: { shown: boolean; text?: string }): JSX.Element {
  const { t } = useTranslation("settings");
  return (
    <p role="status" class="min-h-[1.6em] text-success">
      {shown ? (text ?? t("saved")) : null}
    </p>
  );
}
