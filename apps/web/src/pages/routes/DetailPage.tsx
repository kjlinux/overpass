import type { ApiError, PotholeStatus, RouteDetail, Service } from "@overpass/shared";
import type { JSX } from "preact";
import { useLocation, useRoute } from "preact-iso";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../app/useLanguage";
import { Button, Skeleton } from "../../components/ui";
import { FormAlert } from "../../forms";
import { Layout, localizedPath } from "../../layout";
import { apiRequest } from "../../session";
import { ErrorPage } from "../errors";
import type { RouteViewActions } from "./RouteView";
import { RouteView } from "./RouteView";
import { useApi } from "./useApi";

/** Every action reloads the route, so the computed state is always the server's. */
function useActions(id: string, reload: () => Promise<void>): RouteViewActions {
  const language = useLanguage();
  const { route } = useLocation();
  const then = async (call: Promise<{ error: ApiError | null }>) => {
    const { error } = await call;
    if (error === null) await reload();
    return error ?? undefined;
  };
  return {
    verify: (input) => then(apiRequest("POST", `/v1/routes/${id}/checks`, input)),
    report: (input) => then(apiRequest("POST", `/v1/routes/${id}/potholes`, input)),
    setStatus: (potholeId: string, status: PotholeStatus) =>
      then(apiRequest("PATCH", `/v1/potholes/${potholeId}`, { status })),
    flag: async (input) =>
      (await apiRequest("POST", `/v1/routes/${id}/reports`, input)).error ?? undefined,
    remove: async () => {
      const { error } = await apiRequest("DELETE", `/v1/routes/${id}`);
      if (error === null) route(localizedPath(language, "/routes"));
      return error ?? undefined;
    },
  };
}

function Loaded(props: { route: RouteDetail; reload: () => Promise<void> }): JSX.Element {
  const { route, reload } = props;
  const actions = useActions(route.id, reload);
  const services = useApi<Service[]>("/v1/services").state;
  const service =
    services.status === "ready"
      ? services.data.find((candidate) => candidate.slug === route.service.slug)
      : undefined;
  return <RouteView route={route} now={new Date()} actions={actions} service={service} />;
}

/** Reads the itinerary in the interface language, falling back to the one that exists. */
export function DetailPage(): JSX.Element {
  const { t } = useTranslation("ui");
  const language = useLanguage();
  const { params } = useRoute();
  const { state, reload, refresh } = useApi<RouteDetail>(
    `/v1/routes/${params["id"] ?? ""}?lang=${language}`,
  );
  if (state.status === "notFound") return <ErrorPage kind="notFound" language={language} />;
  return (
    <Layout language={language}>
      {state.status === "loading" ? (
        <div class="py-12">
          <Skeleton lines={8} />
        </div>
      ) : null}
      {state.status === "ready" ? <Loaded route={state.data} reload={refresh} /> : null}
      {state.status === "error" ? (
        <div class="flex flex-col items-start gap-4 py-12">
          <FormAlert error={state.error} />
          <Button onClick={() => void reload()}>{t("retry")}</Button>
        </div>
      ) : null}
    </Layout>
  );
}
