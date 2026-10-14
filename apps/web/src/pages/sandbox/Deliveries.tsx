import type { SandboxDelivery, SandboxEvent } from "@overpass/shared";
import { RotateCcw } from "lucide-preact";
import { Fragment } from "preact";
import type { JSX } from "preact";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../app/useLanguage";
import { Button, CodeBlock } from "../../components/ui";
import { Section, clock } from "./parts";
import { tripOf } from "./trip";

type Props = { event: SandboxEvent | undefined; onReplay?: (id: string) => void };

function eventIdOf(body: string): string | undefined {
  try {
    const parsed = JSON.parse(body) as { id?: unknown };
    return typeof parsed.id === "string" ? parsed.id : undefined;
  } catch {
    return undefined;
  }
}

/** The signature of the test track: each webhook's road, stop by stop. */
function Trip({ delivery }: { delivery: SandboxDelivery }): JSX.Element {
  const { t } = useTranslation("sandbox");
  const language = useLanguage();
  const stops = tripOf(delivery, (iso) => clock(iso, language)).map((stop) => {
    const reason = stop.state.values?.reason;
    const values = {
      ...stop.state.values,
      reason: reason === "noAnswer" ? t("deliveries.state.noAnswer") : reason,
    };
    const name = t(`deliveries.stops.${stop.name.key}`);
    return {
      key: stop.name.key,
      name,
      state: t(`deliveries.state.${stop.state.key}`, values),
      reached: stop.reached,
    };
  });
  return (
    <ol
      aria-label={t("deliveries.trip")}
      class="mt-3 grid border border-rule-strong sm:auto-cols-fr sm:grid-flow-col"
    >
      {stops.map((stop) => (
        <li
          key={stop.key}
          class={`flex min-w-0 justify-between gap-3 border-b border-rule px-3 py-2 text-caption last:border-b-0 sm:block sm:border-b-0 sm:border-r sm:last:border-r-0 ${stop.reached ? "border-paper bg-ink text-paper" : "bg-surface"}`}
        >
          <b class="block font-semibold">{stop.name}</b>
          <span class={`block text-right sm:text-left ${stop.reached ? "" : "text-ink-2"}`}>
            {stop.state}
          </span>
        </li>
      ))}
    </ol>
  );
}

function EventType({ type }: { type: string }): JSX.Element {
  return (
    <code class="font-medium">
      {type.split(".").map((part, index) => (
        <Fragment key={part}>
          {index > 0 ? (
            <>
              .<wbr />
            </>
          ) : null}
          {part}
        </Fragment>
      ))}
    </code>
  );
}

function Wire({ delivery }: { delivery: SandboxDelivery }): JSX.Element {
  const { t } = useTranslation("sandbox");
  const headers = Object.entries(delivery.headers).map(([name, value]) => `${name}: ${value}`);
  return (
    <details class="mt-2">
      <summary class="inline-flex min-h-tap cursor-pointer items-center text-accent underline underline-offset-[3px]">
        {t("deliveries.body")}
      </summary>
      <CodeBlock code={`${headers.join("\n")}\n\n${delivery.body}`} />
    </details>
  );
}

type RowProps = {
  delivery: SandboxDelivery;
  same: boolean;
  onReplay?: ((id: string) => void) | undefined;
};

function DeliveryRow({ delivery, same, onReplay }: RowProps): JSX.Element {
  const { t } = useTranslation("sandbox");
  const eventId = eventIdOf(delivery.body);
  const pending = delivery.status === "scheduled";
  return (
    <li class="border-b border-rule py-4">
      <div class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <EventType type={delivery.eventType} />
        {onReplay === undefined || pending ? null : (
          <Button
            variant="ghost"
            onClick={() => {
              onReplay(delivery.id);
            }}
          >
            <RotateCcw class="h-5 w-5" aria-hidden="true" />
            {t("deliveries.replay")}
          </Button>
        )}
      </div>
      <Trip delivery={delivery} />
      <p class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-caption text-ink-2">
        {eventId === undefined ? null : (
          <span>
            {t("deliveries.event")} <code class="text-ink">{eventId}</code>
          </span>
        )}
        {same ? <span class="font-semibold text-ink">{t("deliveries.same")}</span> : null}
      </p>
      {pending ? null : <Wire delivery={delivery} />}
    </li>
  );
}

/** Every webhook the call scheduled, as the developer's server receives it. */
export function Deliveries({ event, onReplay }: Props): JSX.Element | null {
  const { t } = useTranslation("sandbox");
  if (event === undefined) return null;
  const caption = <span class="text-caption text-ink-2">{t("deliveries.caption")}</span>;
  const ids = event.deliveries.map((delivery) => eventIdOf(delivery.body));
  const repeats = (index: number) =>
    index > 0 && ids[index] !== undefined && ids[index] === ids[index - 1];
  return (
    <Section id="sandbox-deliveries" title={t("deliveries.heading")} aside={caption}>
      {event.deliveries.length === 0 ? (
        <p class="border border-rule-strong bg-surface p-4">{t("deliveries.none")}</p>
      ) : null}
      <ol class="border-t border-rule empty:hidden" aria-live="polite">
        {event.deliveries.map((delivery, index) => (
          <DeliveryRow
            key={delivery.id}
            delivery={delivery}
            same={repeats(index)}
            onReplay={onReplay}
          />
        ))}
      </ol>
    </Section>
  );
}
