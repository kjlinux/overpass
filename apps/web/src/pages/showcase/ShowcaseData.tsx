import type { JSX } from "preact";
import { useTranslation } from "react-i18next";
import { Button, Card, Chip, CodeBlock, StatusBadge, Table, Tabs } from "../../components/ui";
import type { Column, RouteStatus } from "../../components/ui";
import { Section } from "./Section";

type Route = { id: string; service: string; country: string; stack: string; status: RouteStatus };

const routes: Route[] = [
  { id: "wave-ci", service: "Wave Checkout", country: "CI", stack: "Laravel", status: "clear" },
  {
    id: "om-sn",
    service: "Orange Money Web Payment",
    country: "SN",
    stack: "Node.js",
    status: "toVerify",
  },
  {
    id: "momo-cm",
    service: "MTN MoMo Collections",
    country: "CM",
    stack: "Django",
    status: "broken",
  },
];

const request = `POST /v1/sandbox/wave/checkout/sessions
{
  "amount": "2500",
  "currency": "XOF"
}`;

const response = `201 Created
{
  "id": "cos_sim_01HX9F2Q",
  "payment_status": "succeeded"
}`;

/** Card, badges and chips. */
export function CardsSection(): JSX.Element {
  const { t } = useTranslation("showcase");
  return (
    <Section id="cards" title={t("cards.title")}>
      <div class="grid gap-6 md:grid-cols-2">
        <Card
          title={t("cards.cardTitle")}
          meta={t("cards.cardMeta")}
          action={<Button>{t("cards.cardAction")}</Button>}
        >
          <p>{t("cards.cardText")}</p>
        </Card>
        <div class="flex flex-wrap content-start items-center gap-3">
          <StatusBadge status="clear" />
          <StatusBadge status="toVerify" />
          <StatusBadge status="broken" />
          <Chip>{t("cards.unofficial")}</Chip>
          <Chip selected>{t("cards.selectedChip")}</Chip>
        </div>
      </div>
    </Section>
  );
}

/** A ruled table of itineraries with their status. */
export function TableSection(): JSX.Element {
  const { t } = useTranslation("showcase");
  const columns: Column<Route>[] = [
    { key: "service", header: t("table.service"), render: (row) => <strong>{row.service}</strong> },
    {
      key: "country",
      header: t("table.country"),
      render: (row) => t(`table.countries.${row.country}`),
    },
    { key: "stack", header: t("table.stack"), render: (row) => row.stack },
    {
      key: "status",
      header: t("table.status"),
      render: (row) => <StatusBadge status={row.status} />,
    },
  ];
  return (
    <Section id="table" title={t("table.title")}>
      <Table
        caption={t("table.caption")}
        columns={columns}
        rows={routes}
        rowKey={(row) => row.id}
      />
    </Section>
  );
}

/** Tabs holding code blocks, as in the test track inspector. */
export function TabsSection(): JSX.Element {
  const { t } = useTranslation("showcase");
  const tabs = [
    {
      id: "request",
      label: t("tabs.request"),
      content: <CodeBlock code={request} language="HTTP" />,
    },
    {
      id: "response",
      label: t("tabs.response"),
      content: <CodeBlock code={response} language="HTTP" />,
    },
  ];
  return (
    <Section id="tabs" title={t("tabs.title")}>
      <Tabs id="inspector" label={t("tabs.label")} tabs={tabs} />
    </Section>
  );
}

/** A standalone code block with its copy button. */
export function CodeSection(): JSX.Element {
  const { t } = useTranslation("showcase");
  return (
    <Section id="code" title={t("code.title")}>
      <CodeBlock code={t("code.sample")} language="bash" />
    </Section>
  );
}
