import { fieldMessage, routeTemplate, supportedLanguages } from "@overpass/shared";
import type { RouteDetail, Service } from "@overpass/shared";
import type { JSX } from "preact";
import { useState } from "preact/hooks";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../app/useLanguage";
import { Button, Field, Textarea, cx } from "../../components/ui";
import { FormAlert, useForm, useSubmit } from "../../forms";
import type { Bindable, FieldBinding } from "../../forms";
import { Markdown } from "../../markdown";
import { apiRequest } from "../../session";
import { changesOf, draftSchema } from "./draft";
import type { Draft } from "./draft";
import { EditorFields } from "./EditorFields";

export type EditorViewProps = {
  mode: "create" | "edit";
  initial: Draft;
  services: Service[];
  onSaved: (id: string) => void;
  routeId?: string;
  translationOf?: string;
};

const asLanguage = (value: string) => supportedLanguages.find((code) => code === value);

/** Swaps an untouched template for the template of the newly chosen language. */
function withTemplateSwap(form: ReturnType<typeof useForm<typeof draftSchema>>): Bindable {
  return {
    bind: (name) => {
      const binding = form.bind(name);
      if (name !== "language") return binding;
      const onInput = (event: Event) => {
        const next = asLanguage((event.currentTarget as HTMLSelectElement).value);
        const previous = asLanguage(form.values["language"] ?? "");
        const content = form.values["content"] ?? "";
        const untouched = previous !== undefined && content === routeTemplate(previous);
        form.setValues({
          ...form.values,
          language: next ?? "",
          content: untouched && next !== undefined ? routeTemplate(next) : content,
        });
      };
      return { ...binding, onInput };
    },
  };
}

function send(props: EditorViewProps, data: Draft) {
  if (props.mode === "edit") {
    return apiRequest<RouteDetail>(
      "PATCH",
      `/v1/routes/${props.routeId ?? ""}`,
      changesOf(props.initial, data),
    );
  }
  const translation =
    props.translationOf === undefined ? {} : { translationOf: props.translationOf };
  return apiRequest<RouteDetail>("POST", "/v1/routes", { ...data, ...translation });
}

function ContentField({ binding }: { binding: FieldBinding }): JSX.Element {
  const { t } = useTranslation("routes");
  const language = useLanguage();
  const issue = binding.error;
  const error =
    issue === undefined ? {} : { error: issue.message ?? fieldMessage(issue.code, language) };
  return (
    <Field id="content" label={t("editor.content")} help={t("editor.contentHelp")} {...error}>
      {(control) => (
        <Textarea
          {...control}
          name="content"
          rows={24}
          class="font-code text-code"
          value={binding.value}
          onInput={binding.onInput}
          onBlur={binding.onBlur}
          spellcheck={false}
        />
      )}
    </Field>
  );
}

type Pane = "write" | "preview";

/** Side by side from 1024 px; below, one pane at a time with a pressed toggle. */
function ContentPanes({ form }: { form: Bindable }): JSX.Element {
  const { t } = useTranslation("routes");
  const [pane, setPane] = useState<Pane>("write");
  const binding = form.bind("content");
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
          <ContentField binding={binding} />
        </div>
        <section
          aria-labelledby="preview-heading"
          class={cx(pane !== "preview" && "hidden", "min-w-0 lg:block")}
        >
          <h2 id="preview-heading" class="mb-2 font-semibold">
            {t("editor.preview")}
          </h2>
          <div class="max-w-prose border border-rule p-4">
            <Markdown source={binding.value} />
          </div>
        </section>
      </div>
    </div>
  );
}

/** Template prefilled, live preview, language choice; the API decides what is valid. */
export function EditorView(props: EditorViewProps): JSX.Element {
  const { t } = useTranslation("routes");
  const form = useForm(draftSchema, props.initial);
  const bindable = withTemplateSwap(form);
  const { busy, onSubmit } = useSubmit({
    validate: form.validate,
    send: (data) => send(props, data as Draft),
    onError: (error) => {
      form.showApiError(error);
    },
    onSuccess: (route) => {
      props.onSaved(route.id);
    },
  });
  return (
    <form class="flex flex-col gap-8" noValidate onSubmit={onSubmit}>
      <FormAlert error={form.formError} />
      <EditorFields
        form={bindable}
        services={props.services}
        languageLocked={props.mode === "edit"}
      />
      <ContentPanes form={bindable} />
      <Button type="submit" variant="primary" loading={busy} class="self-start">
        {t(props.mode === "edit" ? "editor.submitEdit" : "editor.submitCreate")}
      </Button>
    </form>
  );
}
