import type { SandboxEvent } from "@overpass/shared";
import type { JSX } from "preact";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../app/useLanguage";
import { CodeBlock, EmptyState, Tabs } from "../../components/ui";
import type { Tab } from "../../components/ui";
import { Section, clock, readable } from "./parts";

type Props = { event: SandboxEvent | undefined; justRan: boolean };

function headerLines(headers: Record<string, string>): string {
  return Object.entries(headers)
    .map(([name, value]) => `${name}: ${value}`)
    .join("\n");
}

function StatusLine({ text }: { text: string }): JSX.Element {
  return (
    <p class="border-b border-rule px-4 py-3 font-code text-caption [overflow-wrap:anywhere]">
      {text}
    </p>
  );
}

function Body({ status, body }: { status: string; body: unknown }): JSX.Element {
  return (
    <>
      <StatusLine text={status} />
      <CodeBlock code={readable(body)} language="JSON" />
    </>
  );
}

/** Request first, then response: a fresh run opens on the second tab. */
function tabsOf(event: SandboxEvent, t: TFunction): Tab[] {
  const path = `${event.request.method} /v1/sandbox/${event.provider}${event.request.path}`;
  return [
    {
      id: "request",
      label: t("inspector.request"),
      content: <Body status={path} body={event.request.body} />,
    },
    {
      id: "response",
      label: t("inspector.response"),
      content: <Body status={String(event.response.status)} body={event.response.body} />,
    },
    {
      id: "headers",
      label: t("inspector.headers"),
      content: <CodeBlock code={headerLines(event.request.headers)} />,
    },
  ];
}

/** Request, response and headers of the latest call. */
export function Inspector({ event, justRan }: Props): JSX.Element {
  const { t } = useTranslation("sandbox");
  const language = useLanguage();
  if (event === undefined) {
    return (
      <Section id="sandbox-inspector" title={t("inspector.heading")}>
        <EmptyState title={t("inspector.emptyTitle")} description={t("inspector.emptyBody")} />
      </Section>
    );
  }
  const tabs = tabsOf(event, t);
  const when = (
    <span class="text-caption text-ink-2">
      {t("inspector.last", { time: clock(event.createdAt, language) })}
    </span>
  );
  const opened = justRan ? tabs[1]?.id : tabs[0]?.id;
  return (
    <Section id="sandbox-inspector" title={t("inspector.heading")} aside={when}>
      <Tabs
        key={event.id}
        id="sandbox-inspector-tabs"
        label={t("inspector.label")}
        tabs={tabs}
        {...(opened === undefined ? {} : { initial: opened })}
      />
    </Section>
  );
}
