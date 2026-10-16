import { supportedLanguages } from "@overpass/shared";
import type { RouteDetail, Service, ThreadDetail } from "@overpass/shared";
import type { JSX } from "preact";
import { useLocation, useRoute } from "preact-iso";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../app/useLanguage";
import { Skeleton } from "../../components/ui";
import { Layout, localizedPath } from "../../layout";
import { RequireSession } from "../../session";
import { ErrorPage } from "../errors";
import { draftFrom, newDraft, threadDraft } from "./draft";
import type { Draft } from "./draft";
import { EditorView } from "./EditorView";
import type { EditorViewProps } from "./EditorView";
import { useApi } from "./useApi";

function translationDraft(source: RouteDetail): Draft {
  const language = supportedLanguages.find((code) => code !== source.language) ?? source.language;
  return {
    ...newDraft(language),
    service: source.service.slug,
    country: source.country,
    stack: source.stack,
  };
}

type ShellProps = {
  heading: string;
  draft: Draft | null;
  extra: Omit<EditorViewProps, "initial" | "services" | "onSaved">;
};

function EditorShell({ heading, draft, extra }: ShellProps): JSX.Element {
  const { t } = useTranslation("routes");
  const language = useLanguage();
  const { route } = useLocation();
  const services = useApi<Service[]>("/v1/services").state;
  const ready = draft !== null && services.status === "ready";
  return (
    <Layout language={language}>
      <RequireSession>
        {() => (
          <section class="py-12 md:py-16">
            <h1 class="text-h1 font-semibold">{heading}</h1>
            <p class="mt-2 max-w-prose text-ink-2">{t("editor.intro")}</p>
            <div class="mt-8 border-t border-rule pt-8">
              {ready ? (
                <EditorView
                  {...extra}
                  initial={draft}
                  services={services.data}
                  onSaved={(id) => {
                    route(localizedPath(language, `/routes/${id}`));
                  }}
                />
              ) : (
                <Skeleton lines={8} />
              )}
            </div>
          </section>
        )}
      </RequireSession>
    </Layout>
  );
}

/** A route written from a resolved thread keeps the link to that thread. */
function FromThreadPage({ threadId }: { threadId: string }): JSX.Element {
  const { t } = useTranslation("routes");
  const language = useLanguage();
  const { state } = useApi<ThreadDetail>(`/v1/threads/${threadId}`);
  if (state.status === "notFound") return <ErrorPage kind="notFound" language={language} />;
  return (
    <EditorShell
      heading={t("editor.titleFromThread")}
      draft={state.status === "ready" ? threadDraft(state.data) : null}
      extra={{ mode: "create", sourceThread: threadId }}
    />
  );
}

/** A new itinerary, a translation (?translationOf=) or a route from a thread (?fromThread=). */
export function NewRoutePage(): JSX.Element {
  const { t } = useTranslation("routes");
  const language = useLanguage();
  const { query } = useLocation();
  const threadId = query["fromThread"];
  const sourceId = query["translationOf"];
  const source = useApi<RouteDetail>(
    sourceId === undefined ? null : `/v1/routes/${sourceId}`,
  ).state;
  if (threadId !== undefined) return <FromThreadPage threadId={threadId} />;
  if (sourceId === undefined) {
    return (
      <EditorShell
        heading={t("editor.titleCreate")}
        draft={newDraft(language)}
        extra={{ mode: "create" }}
      />
    );
  }
  if (source.status === "notFound") return <ErrorPage kind="notFound" language={language} />;
  const draft = source.status === "ready" ? translationDraft(source.data) : null;
  return (
    <EditorShell
      heading={t("editor.titleTranslate")}
      draft={draft}
      extra={{ mode: "create", translationOf: sourceId }}
    />
  );
}

/** Each save of an existing itinerary creates a new version. */
export function EditRoutePage(): JSX.Element {
  const { t } = useTranslation("routes");
  const language = useLanguage();
  const { params } = useRoute();
  const id = params["id"] ?? "";
  const { state } = useApi<RouteDetail>(`/v1/routes/${id}`);
  if (state.status === "notFound") return <ErrorPage kind="notFound" language={language} />;
  const draft = state.status === "ready" ? draftFrom(state.data) : null;
  return (
    <EditorShell
      heading={t("editor.titleEdit")}
      draft={draft}
      extra={{ mode: "edit", routeId: id }}
    />
  );
}
