import type { JSX } from "preact";
import { useTranslation } from "react-i18next";
import { Button, EmptyState, InlineCode, Skeleton } from "../../components/ui";
import type { Operation, Reference } from "./openapi";
import { openApiPath, useOpenApi } from "./useOpenApi";

function OperationItem({ operation }: { operation: Operation }): JSX.Element {
  const { t } = useTranslation("docs");
  return (
    <details class="border-t border-rule first:border-t-0">
      <summary class="flex min-h-tap cursor-pointer flex-wrap items-baseline gap-x-3 gap-y-1 py-3">
        <span class="w-16 flex-none font-mono font-semibold">{operation.method}</span>
        <code class="min-w-0 break-all font-mono">{operation.path}</code>
        <span class="text-ink-2">{operation.summary}</span>
      </summary>
      <dl class="grid gap-x-6 gap-y-2 pb-4 sm:grid-cols-[max-content_minmax(0,1fr)]">
        <dt class="font-medium">{t("api.parameters")}</dt>
        <dd class="min-w-0">
          {operation.parameters.length === 0
            ? t("api.none")
            : operation.parameters.map((parameter) => (
                <p key={`${parameter.in}-${parameter.name}`}>
                  <InlineCode>{parameter.name}</InlineCode> {parameter.in}
                  {parameter.required ? `, ${t("api.required")}` : ""}
                </p>
              ))}
        </dd>
        <dt class="font-medium">{t("api.responses")}</dt>
        <dd>
          <ul class="flex flex-wrap gap-x-4 font-mono">
            {operation.responses.map((status) => (
              <li key={status}>{status}</li>
            ))}
          </ul>
        </dd>
      </dl>
    </details>
  );
}

/** The simulator reference, grouped by provider tag; every provider is marked unofficial. */
export function ApiReferenceView({ reference }: { reference: Reference }): JSX.Element {
  const { t } = useTranslation("docs");
  if (reference.groups.length === 0)
    return <EmptyState title={t("api.empty")} description={t("api.emptyText")} />;
  return (
    <div class="flex flex-col gap-6">
      <div>
        <h3 class="text-h3 font-semibold">{t("api.providers")}</h3>
        <ul class="mt-2">
          {reference.providers.map((provider) => (
            <li key={provider.id}>
              {t(provider.unofficial ? "api.providerUnofficial" : "api.provider", {
                name: provider.name,
                version: provider.docsVersion,
              })}
            </li>
          ))}
        </ul>
      </div>
      {reference.groups.map((group) => (
        <div key={group.tag}>
          <h3 class="border-b border-rule pb-2 text-h3 font-semibold">{group.tag}</h3>
          {group.operations.map((operation) => (
            <OperationItem key={`${operation.method} ${operation.path}`} operation={operation} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function ApiReference(): JSX.Element {
  const { t } = useTranslation("docs");
  const { state, reload } = useOpenApi();
  return (
    <>
      <a class="inline-flex min-h-tap items-center self-start" href={openApiPath} download>
        {t("api.download")}
      </a>
      {state.status === "loading" ? <Skeleton title={false} /> : null}
      {state.status === "error" ? (
        <div
          role="alert"
          class="flex flex-col items-start gap-4 border border-rule bg-danger-surface p-4"
        >
          <p>{t("api.error")}</p>
          <Button onClick={reload}>{t("api.retry")}</Button>
        </div>
      ) : null}
      {state.status === "ready" ? <ApiReferenceView reference={state.reference} /> : null}
    </>
  );
}
