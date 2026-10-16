import type { ComponentChildren, JSX } from "preact";
import { useTranslation } from "react-i18next";
import { CodeBlock } from "../../components/ui";

function Step({ title, children }: { title: string; children: ComponentChildren }): JSX.Element {
  return (
    <div class="flex min-w-0 flex-col gap-3">
      <h3 class="text-h3 font-semibold">{title}</h3>
      {children}
    </div>
  );
}

/** One question, the two tool calls the assistant makes, and the code it writes. */
export function ExampleSection(): JSX.Element {
  const { t } = useTranslation("docs");
  const caption = (kind: "call" | "result" | "code") => t(`example.captions.${kind}`);
  return (
    <>
      <p class="max-w-prose">{t("example.intro")}</p>
      <Step title={t("example.askTitle")}>
        <blockquote class="max-w-prose border border-rule bg-surface p-4">
          {t("example.question")}
        </blockquote>
      </Step>
      <Step title={t("example.searchTitle")}>
        <CodeBlock code={t("example.searchCall")} language={caption("call")} />
      </Step>
      <Step title={t("example.readTitle")}>
        <CodeBlock code={t("example.readCall")} language={caption("call")} />
        <CodeBlock code={t("example.readResult")} language={caption("result")} />
      </Step>
      <Step title={t("example.codeTitle")}>
        <CodeBlock code={t("example.code")} language={caption("code")} />
        <p class="max-w-prose border border-rule bg-warning-surface p-4">{t("example.warning")}</p>
      </Step>
    </>
  );
}
