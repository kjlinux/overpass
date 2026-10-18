import type { JSX } from "preact";
import { useEffect, useState } from "preact/hooks";
import { useLocation } from "preact-iso";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../app/useLanguage";
import { Button, Field, Textarea } from "../../components/ui";
import { FormAlert } from "../../forms";
import { Layout, localizedPath } from "../../layout";
import { RequireSession } from "../../session";
import { createThread, fetchTopics } from "./api";
import { NewThreadMetaFields } from "./NewThreadFields";
import type { ThreadFormState } from "./NewThreadFields";
import type { Topic } from "./types";

async function submitThreadPayload(form: ThreadFormState, language: string) {
  return createThread({
    topicId: form.topicId,
    title: form.title.trim(),
    content: form.content.trim(),
    language,
    country: form.country || undefined,
    stack: form.stack || undefined,
    routeId: form.routeId.trim() || undefined,
  });
}

function useThreadSubmit(topics: Topic[]) {
  const language = useLanguage();
  const { route } = useLocation();
  const [form, setForm] = useState<ThreadFormState>({
    topicId: topics[0]?.id ?? "",
    title: "",
    country: "",
    stack: "",
    routeId: "",
    content: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);

  useEffect(() => {
    if (!form.topicId && topics.length > 0 && topics[0]?.id) {
      setForm((prev) => ({ ...prev, topicId: topics[0]?.id ?? "" }));
    }
  }, [topics, form.topicId]);

  const patch = (diff: Partial<ThreadFormState>) => {
    setForm((prev) => ({ ...prev, ...diff }));
  };

  const submit = async (e: Event) => {
    e.preventDefault();
    if (!form.topicId || !form.title.trim() || !form.content.trim()) return;
    setLoading(true);
    setError(null);
    const res = await submitThreadPayload(form, language);
    setLoading(false);
    if (res.error) setError(res.error);
    else route(localizedPath(language, `/discussions/${res.data.id}`));
  };

  return { form, patch, submit, loading, error };
}

function NewThreadForm({ topics }: { topics: Topic[] }): JSX.Element {
  const { t } = useTranslation("discussions");
  const { form, patch, submit, loading, error } = useThreadSubmit(topics);

  return (
    <form
      class="flex flex-col gap-6"
      onSubmit={(e) => {
        void submit(e);
      }}
    >
      {error && <FormAlert error={error} />}

      <NewThreadMetaFields topics={topics} form={form} onChange={patch} />

      <Field id="content" label={t("new.content")} help={t("new.markdownHelp")}>
        {(ctrl) => (
          <Textarea
            {...ctrl}
            rows={8}
            value={form.content}
            placeholder={t("new.contentPlaceholder")}
            onInput={(e) => {
              patch({ content: (e.target as HTMLTextAreaElement).value });
            }}
            required
            minLength={10}
          />
        )}
      </Field>

      <div class="flex items-center gap-4">
        <Button variant="primary" type="submit" loading={loading} disabled={loading}>
          {loading ? t("new.submitting") : t("new.submit")}
        </Button>
      </div>
    </form>
  );
}

export function NewThreadPage(): JSX.Element {
  const { t } = useTranslation("discussions");
  const language = useLanguage();
  const [topics, setTopics] = useState<Topic[]>([]);

  useEffect(() => {
    void fetchTopics().then((res) => {
      if (res.data) setTopics(res.data);
    });
  }, []);

  return (
    <Layout language={language}>
      <RequireSession>
        {() => (
          <div class="mx-auto max-w-3xl py-6">
            <div class="mb-6 border-b border-rule pb-6">
              <h1 class="text-h1 font-bold tracking-tight text-ink">{t("new.title")}</h1>
              <p class="mt-1 text-body text-ink-2">{t("new.intro")}</p>
            </div>
            <NewThreadForm topics={topics} />
          </div>
        )}
      </RequireSession>
    </Layout>
  );
}
