import type { JSX } from "preact";
import { useState } from "preact/hooks";
import { useTranslation } from "react-i18next";
import { Button, cx } from "../../components/ui";
import type { Bindable } from "../../forms";
import { Markdown } from "../../markdown";
import { TextAreaField } from "./TextAreaField";

type Pane = "write" | "preview";

function Preview({ hidden, source }: { hidden: boolean; source: string }): JSX.Element {
  const { t } = useTranslation("blog");
  return (
    <section aria-labelledby="preview-heading" class={cx(hidden && "hidden", "min-w-0 lg:block")}>
      <h2 id="preview-heading" class="mb-2 font-semibold">
        {t("editor.preview")}
      </h2>
      <div class="max-w-prose border border-rule p-4">
        <Markdown source={source} />
      </div>
    </section>
  );
}

/** Side by side from 1024 px; below, one pane at a time with a pressed toggle. */
export function MarkdownPanes({ form }: { form: Bindable }): JSX.Element {
  const { t } = useTranslation("blog");
  const [pane, setPane] = useState<Pane>("write");
  const source = form.bind("content").value;
  const toggle = (name: Pane) => (
    <Button
      variant={pane === name ? "secondary" : "ghost"}
      aria-pressed={pane === name}
      onClick={() => {
        setPane(name);
      }}
    >
      {t(`editor.${name}`)}
    </Button>
  );
  return (
    <div class="flex flex-col gap-4">
      <div class="flex gap-2 lg:hidden">
        {toggle("write")}
        {toggle("preview")}
      </div>
      <div class="grid gap-6 lg:grid-cols-2">
        <div class={cx(pane !== "write" && "hidden", "min-w-0 lg:block")}>
          <TextAreaField
            id="content"
            label={t("editor.content")}
            help={t("editor.contentHelp")}
            form={form}
            rows={18}
          />
        </div>
        <Preview hidden={pane !== "preview"} source={source} />
      </div>
    </div>
  );
}
