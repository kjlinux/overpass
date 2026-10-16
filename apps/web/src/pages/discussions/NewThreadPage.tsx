import type { DiscussionTopic, RouteDetail } from "@overpass/shared";
import type { JSX } from "preact";
import { useLocation } from "preact-iso";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../app/useLanguage";
import { Skeleton } from "../../components/ui";
import { Layout, localizedPath } from "../../layout";
import { RequireSession } from "../../session";
import { ErrorPage } from "../errors";
import { useApi } from "../routes";
import { ThreadForm } from "./ThreadForm";

function RouteContext({ route }: { route: RouteDetail }): JSX.Element {
  const { t } = useTranslation("discussions");
  const language = useLanguage();
  return (
    <p role="note" class="mt-6 max-w-prose border border-rule-strong bg-surface px-4 py-3">
      {t("form.fromRoute", { service: route.service.name })}{" "}
      <a href={localizedPath(language, `/routes/${route.id}`)}>{route.title}</a>
    </p>
  );
}

function FormArea(props: { topics: DiscussionTopic[]; linked: RouteDetail | undefined }) {
  const language = useLanguage();
  const { route: go } = useLocation();
  const { linked } = props;
  return (
    <ThreadForm
      topics={props.topics}
      {...(linked === undefined ? {} : { route: { id: linked.id, country: linked.country } })}
      onCreated={(id) => {
        go(localizedPath(language, `/discussions/${id}`));
      }}
    />
  );
}

/** A new thread; with ?route=, a question already tied to that route, service and country. */
export function NewThreadPage(): JSX.Element {
  const { t } = useTranslation("discussions");
  const language = useLanguage();
  const { query } = useLocation();
  const routeId = query["route"];
  const topics = useApi<DiscussionTopic[]>("/v1/topics").state;
  const source = useApi<RouteDetail>(routeId === undefined ? null : `/v1/routes/${routeId}`).state;
  if (source.status === "notFound") return <ErrorPage kind="notFound" language={language} />;
  const linked = routeId === undefined ? undefined : source.status === "ready" ? source.data : null;
  const ready = topics.status === "ready" && linked !== null;
  return (
    <Layout language={language}>
      <RequireSession>
        {() => (
          <section class="py-12 md:py-16">
            <h1 class="text-h1 font-semibold">
              {t(linked === undefined ? "form.heading" : "form.headingRoute")}
            </h1>
            <p class="mt-2 max-w-prose text-ink-2">{t("form.intro")}</p>
            {linked === undefined || linked === null ? null : <RouteContext route={linked} />}
            <div class="mt-8 max-w-3xl border-t border-rule pt-8">
              {ready ? <FormArea topics={topics.data} linked={linked} /> : <Skeleton lines={8} />}
            </div>
          </section>
        )}
      </RequireSession>
    </Layout>
  );
}
