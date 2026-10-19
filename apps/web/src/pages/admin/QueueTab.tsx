import { queueKinds, queueStates } from "@overpass/shared";
import type { QueueKind, QueueState } from "@overpass/shared";
import { EyeOff, ShieldCheck } from "lucide-preact";
import type { JSX } from "preact";
import { useRef, useState } from "preact/hooks";
import { useTranslation } from "react-i18next";
import { Field, Select } from "../../components/ui";
import { destructiveDecisions, takesReason } from "./decisions";
import { PagedView } from "./PagedView";
import { ProposalsQueue } from "./ProposalsQueue";
import { QueueRow } from "./QueueRow";
import { ReasonDialog } from "./ReasonDialog";
import type { Pending } from "./useQueue";
import { useQueue } from "./useQueue";

type FilterProps<Value extends string> = {
  id: string;
  group: "kindFilter" | "stateFilter";
  values: readonly Value[];
  value: Value;
  onChange: (value: Value) => void;
};

function Filter<Value extends string>(props: FilterProps<Value>): JSX.Element {
  const { t } = useTranslation("admin");
  const options = props.values.map((value) => ({ value, label: t(`${props.group}.${value}`) }));
  return (
    <div class="min-w-0 flex-1 basis-48 md:max-w-xs">
      <Field id={props.id} label={t(`${props.group}.label`)}>
        {(control) => (
          <Select
            {...control}
            options={options}
            value={props.value}
            onChange={(event) => {
              props.onChange(event.currentTarget.value as Value);
            }}
          />
        )}
      </Field>
    </div>
  );
}

function DecisionDialog(props: ReturnType<typeof useQueue>): JSX.Element {
  const { t } = useTranslation("admin");
  const { pending, busy, failure, ask, confirm } = props;
  const last = useLastPending(pending);
  const decision = last?.decision ?? "restore";
  const item = last?.item;
  const reason =
    item !== undefined && takesReason(item)
      ? { rule: "optional" as const, label: t("queue.reason"), help: t("queue.reasonHelp") }
      : undefined;
  return (
    <ReasonDialog
      open={pending !== null}
      title={t(`confirm.${decision}`, { title: item?.title ?? "", author: item?.author ?? "" })}
      text={t(`consequence.${decision}`)}
      confirmLabel={t(`decision.${decision}`)}
      destructive={destructiveDecisions.includes(decision)}
      reason={reason}
      busy={busy}
      error={failure}
      onConfirm={(text) => void confirm(text)}
      onCancel={() => {
        ask(null);
      }}
    />
  );
}

/** Keeps the dialog text while it closes, instead of flashing the default wording. */
function useLastPending(pending: Pending | null): Pending | null {
  const last = useRef(pending);
  if (pending !== null) last.current = pending;
  return last.current;
}

function Items({ queue, state }: { queue: ReturnType<typeof useQueue>; state: QueueState }) {
  const { t } = useTranslation("admin");
  const tone = state === "open" ? "Open" : "Hidden";
  const empty = {
    icon: state === "open" ? ShieldCheck : EyeOff,
    title: t(`queue.empty${tone}Title`),
    description: t(`queue.empty${tone}Text`),
  };
  return (
    <PagedView state={queue.state} more={queue.more} empty={empty}>
      {(items) => (
        <ul class="m-0 list-none border-t border-rule p-0">
          {items.map((item) => (
            <QueueRow
              key={`${item.kind}-${item.id}`}
              item={item}
              onAsk={(decision) => {
                queue.ask({ item, decision });
              }}
            />
          ))}
        </ul>
      )}
    </PagedView>
  );
}

/** Each kind and state pages on its own; a decision takes the item out of the current view. */
function Reports(): JSX.Element {
  const { t } = useTranslation("admin");
  const [kind, setKind] = useState<QueueKind>("route");
  const [state, setState] = useState<QueueState>("open");
  const queue = useQueue(kind, state);
  return (
    <section aria-labelledby="queue-heading" class="flex flex-col gap-6 py-8">
      <h2 id="queue-heading" class="text-h2 font-semibold">
        {t("queue.heading")}
      </h2>
      <div class="flex flex-wrap gap-4">
        <Filter
          id="queue-kind"
          group="kindFilter"
          values={queueKinds}
          value={kind}
          onChange={setKind}
        />
        <Filter
          id="queue-state"
          group="stateFilter"
          values={queueStates}
          value={state}
          onChange={setState}
        />
      </div>
      <p role="status" class="text-success empty:hidden">
        {queue.decided > 0 ? t("queue.done") : ""}
      </p>
      <Items queue={queue} state={state} />
      <DecisionDialog {...queue} />
    </section>
  );
}

/** Reported content of every kind, then the services proposed by members. */
export function QueueTab(): JSX.Element {
  const { t } = useTranslation("admin");
  return (
    <div class="px-4 md:px-6">
      <Reports />
      <section aria-labelledby="proposals-heading" class="border-t border-rule py-8">
        <h2 id="proposals-heading" class="mb-4 text-h2 font-semibold">
          {t("proposals.heading")}
        </h2>
        <ProposalsQueue />
      </section>
    </div>
  );
}
