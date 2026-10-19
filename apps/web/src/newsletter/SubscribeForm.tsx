import { fieldMessage, languageNames, supportedLanguages } from "@overpass/shared";
import type { Language } from "@overpass/shared";
import type { JSX } from "preact";
import { useId } from "preact/hooks";
import { useTranslation } from "react-i18next";
import { Button, Field, Select, TextInput, cx } from "../components/ui";
import { FormAlert } from "../forms";
import type { FieldBinding } from "../forms";
import { useSubscribe } from "./useSubscribe";

export type SubscribeVariant = "page" | "footer" | "compact";

export type SubscribeFormProps = { language: Language; variant?: SubscribeVariant };

const layouts: Record<SubscribeVariant, string> = {
  page: "grid gap-6",
  footer: "grid gap-3 md:grid-cols-[1fr_auto_auto] md:items-end",
  compact: "grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end",
};

type FieldProps = { id: string; binding: FieldBinding; language: Language };

const languageOptions = supportedLanguages.map((code) => ({
  value: code,
  label: languageNames[code],
}));

function errorText(binding: FieldBinding, language: Language): string | undefined {
  if (binding.error === undefined) return undefined;
  return binding.error.message ?? fieldMessage(binding.error.code, language);
}

function Sent({ noteId, onRestart }: { noteId: string; onRestart: () => void }): JSX.Element {
  const { t } = useTranslation("layout");
  return (
    <div class="flex flex-col items-start gap-3" role="status">
      <p class="m-0 max-w-prose font-semibold">{t("newsletter.sent")}</p>
      <p class="m-0 max-w-prose text-caption text-ink-2" id={noteId}>
        {t("newsletter.note")}
      </p>
      <Button variant="ghost" onClick={onRestart}>
        {t("newsletter.another")}
      </Button>
    </div>
  );
}

function EmailField({ id, binding, language }: FieldProps): JSX.Element {
  const { t } = useTranslation("layout");
  const error = errorText(binding, language);
  return (
    <Field id={id} label={t("newsletter.email")} {...(error === undefined ? {} : { error })}>
      {(control) => (
        <TextInput
          {...control}
          type="email"
          name="email"
          autocomplete="email"
          spellcheck={false}
          value={binding.value}
          onInput={binding.onInput}
          onBlur={binding.onBlur}
        />
      )}
    </Field>
  );
}

function LanguageField({ id, binding }: Omit<FieldProps, "language">): JSX.Element {
  const { t } = useTranslation("layout");
  return (
    <Field id={id} label={t("newsletter.language")}>
      {(control) => (
        <Select
          {...control}
          name="language"
          value={binding.value}
          onChange={binding.onInput}
          options={languageOptions}
        />
      )}
    </Field>
  );
}

/** Subscription form shared by the footer, the newsletter page and the end of an article. */
export function SubscribeForm({ language, variant = "page" }: SubscribeFormProps): JSX.Element {
  const { t } = useTranslation("layout");
  const uid = useId();
  const { form, busy, onSubmit, done, restart } = useSubscribe(language);
  const noteId = `${uid}-note`;
  if (done) return <Sent noteId={noteId} onRestart={restart} />;
  const [email, chosen] = [form.bind("email"), form.bind("language")];
  return (
    <form noValidate aria-describedby={noteId} onSubmit={onSubmit}>
      <FormAlert error={form.formError} />
      <fieldset class={cx("m-0 border-0 p-0", layouts[variant])}>
        <legend class="mb-3 font-semibold">{t("newsletter.title")}</legend>
        <EmailField id={`${uid}-email`} binding={email} language={language} />
        <LanguageField id={`${uid}-language`} binding={chosen} />
        <Button
          type="submit"
          variant={variant === "footer" ? "secondary" : "primary"}
          loading={busy}
        >
          {t("newsletter.subscribe")}
        </Button>
      </fieldset>
      <p class="mt-3 max-w-prose text-caption text-ink-2" id={noteId}>
        {t("newsletter.note")}
      </p>
    </form>
  );
}
