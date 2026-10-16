import { redactSecrets } from "@overpass/shared";
import type { JSX } from "preact";
import { useTranslation } from "react-i18next";
import { CodeBlock } from "../../components/ui";
import { Markdown } from "../../markdown";

export type PreviewValues = { title: string; content: string; errorText: string; codeText: string };

/** The same masking the API applies, so what the member sees here is what gets published. */
export function maskedValues(values: PreviewValues): { values: PreviewValues; found: number } {
  const entries = Object.entries(values).map(([key, text]) => [key, redactSecrets(text)] as const);
  const found = entries.reduce((total, [, masked]) => total + masked.found, 0);
  return {
    values: Object.fromEntries(entries.map(([key, masked]) => [key, masked.text])) as PreviewValues,
    found,
  };
}

export function MaskedPreview({ values }: { values: PreviewValues }): JSX.Element {
  const { t } = useTranslation("discussions");
  const masked = maskedValues(values);
  const shown = masked.values;
  return (
    <section aria-labelledby="preview-heading" class="flex flex-col gap-4 border border-rule p-4">
      <h2 id="preview-heading" class="text-h3 font-semibold">
        {t("form.preview")}
      </h2>
      <p role="status" class={masked.found > 0 ? "font-semibold" : "text-ink-2"}>
        {masked.found > 0 ? t("form.masked", { count: masked.found }) : t("form.noSecret")}
      </p>
      {shown.title === "" ? null : (
        <p class="text-h3 font-semibold [overflow-wrap:anywhere]">{shown.title}</p>
      )}
      {shown.content === "" ? null : <Markdown source={shown.content} />}
      {shown.errorText === "" ? null : (
        <CodeBlock code={shown.errorText} language={t("form.errorCaption")} />
      )}
      {shown.codeText === "" ? null : (
        <CodeBlock code={shown.codeText} language={t("form.codeCaption")} />
      )}
    </section>
  );
}
