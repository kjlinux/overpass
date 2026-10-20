import { languageNames, supportedLanguages } from "@overpass/shared";
import type { Issue, Language, Me } from "@overpass/shared";
import type { JSX } from "preact";
import { useState } from "preact/hooks";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../app/useLanguage";
import { Button, Field, Select, Skeleton } from "../../components/ui";
import { FormAlert, LoadError } from "../../forms";
import { Layout } from "../../layout";
import { RequireSession } from "../../session";
import { useApi } from "../routes";
import type { Loaded } from "../routes";
import { IssueEditor } from "./IssueEditor";
import { IssueList } from "./IssueList";
import { useIssueEditor } from "./useIssueEditor";

const languageOptions = supportedLanguages.map((code) => ({
  value: code,
  label: languageNames[code],
}));

type Open = (issue: Issue) => void;

type PrepareProps = { busy: boolean; onPrepare: (language: Language) => void };

function Prepare({ busy, onPrepare }: PrepareProps): JSX.Element {
  const { t } = useTranslation("newsletter");
  const [language, setLanguage] = useState<Language>(useLanguage());
  const onSubmit = (event: Event) => {
    event.preventDefault();
    onPrepare(language);
  };
  return (
    <form class="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end" onSubmit={onSubmit}>
      <Field id="issue-language" label={t("admin.language")}>
        {(control) => (
          <Select
            {...control}
            value={language}
            options={languageOptions}
            onChange={(event) => {
              setLanguage(event.currentTarget.value as Language);
            }}
          />
        )}
      </Field>
      <Button type="submit" loading={busy}>
        {t("admin.prepare")}
      </Button>
    </form>
  );
}

type SectionProps = { state: Loaded<Issue[]>; onOpen: Open; onRetry: () => void };

function IssuesSection({ state, onOpen, onRetry }: SectionProps): JSX.Element {
  const { t } = useTranslation("newsletter");
  return (
    <section aria-labelledby="issues-heading" class="border-t border-rule pt-6">
      <h2 id="issues-heading" class="mb-4 text-h2 font-semibold">
        {t("admin.listHeading")}
      </h2>
      {state.status === "error" ? <LoadError error={state.error} onRetry={onRetry} /> : null}
      {state.status === "ready" ? <IssueList issues={state.data} onOpen={onOpen} /> : null}
      {state.status === "loading" ? <Skeleton lines={4} /> : null}
    </section>
  );
}

function IssuesAdmin(): JSX.Element {
  const { t } = useTranslation("newsletter");
  const { state, refresh, reload } = useApi<Issue[]>("/v1/newsletter/issues");
  const editor = useIssueEditor(refresh);
  const { editing } = editor;
  return (
    <div class="mt-8 flex flex-col gap-8">
      <section aria-labelledby="prepare-heading" class="border-t border-rule pt-6">
        <h2 id="prepare-heading" class="mb-4 text-h2 font-semibold">
          {editing === null ? t("admin.prepareHeading") : t("admin.editorHeading")}
        </h2>
        <div class="flex flex-col gap-6">
          <FormAlert error={editor.failure} />
          {editing === null ? (
            <Prepare busy={editor.busy} onPrepare={(language) => void editor.prepare(language)} />
          ) : (
            <IssueEditor
              editing={editing}
              busy={editor.busy}
              saved={editor.saved}
              onChange={editor.update}
              onSave={() => void editor.save()}
              onSend={() => void editor.send()}
              onClose={() => {
                editor.open(null);
              }}
            />
          )}
        </div>
      </section>
      <IssuesSection state={state} onOpen={editor.open} onRetry={() => void reload()} />
    </div>
  );
}

function AdminOnly({ me }: { me: Me }): JSX.Element {
  const { t } = useTranslation("newsletter");
  return (
    <section class="py-12 md:py-16">
      <h1 class="text-h1 font-semibold">{t("admin.title")}</h1>
      {me.role === "admin" ? (
        <>
          <p class="mt-2 max-w-prose text-ink-2">{t("admin.intro")}</p>
          <IssuesAdmin />
        </>
      ) : (
        <p class="mt-2 max-w-prose">{t("admin.adminOnly")}</p>
      )}
    </section>
  );
}

/** The team's newsletter desk: prepare the weekly issue, edit it, then send it once. */
export function IssuesAdminPage(): JSX.Element {
  const language = useLanguage();
  return (
    <Layout language={language}>
      <RequireSession>{(me) => <AdminOnly me={me} />}</RequireSession>
    </Layout>
  );
}
