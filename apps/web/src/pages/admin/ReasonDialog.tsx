import { fieldMessage } from "@overpass/shared";
import type { ApiError } from "@overpass/shared";
import type { JSX } from "preact";
import { useEffect, useId, useRef, useState } from "preact/hooks";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../app/useLanguage";
import { Button, Field, Textarea } from "../../components/ui";
import { FormAlert } from "../../forms";
import { reasonError } from "./decisions";

export type ReasonField = { rule: "optional" | "required"; label: string; help: string };

export type ReasonDialogProps = {
  open: boolean;
  title: string;
  text: string;
  confirmLabel: string;
  destructive: boolean;
  reason?: ReasonField | undefined;
  busy: boolean;
  error: ApiError | undefined;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
};

function useModal(open: boolean) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (dialog === null) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  return ref;
}

/** Holds the typed reason, cleared each time the dialog closes. */
function useReason(props: ReasonDialogProps) {
  const language = useLanguage();
  const [value, setValue] = useState("");
  const [problem, setProblem] = useState<string | undefined>(undefined);
  useEffect(() => {
    if (props.open) return;
    setValue("");
    setProblem(undefined);
  }, [props.open]);
  const submit = (event: Event) => {
    event.preventDefault();
    const code = props.reason === undefined ? undefined : reasonError(props.reason.rule, value);
    setProblem(code === undefined ? undefined : fieldMessage(code, language));
    if (code === undefined && !props.busy) props.onConfirm(value.trim());
  };
  return { value, setValue, problem, submit };
}

type InputProps = {
  id: string;
  field: ReasonField;
  value: string;
  problem: string | undefined;
  onInput: (value: string) => void;
};

function ReasonInput({ id, field, value, problem, onInput }: InputProps): JSX.Element {
  return (
    <Field
      id={id}
      label={field.label}
      help={field.help}
      {...(problem === undefined ? {} : { error: problem })}
    >
      {(control) => (
        <Textarea
          {...control}
          value={value}
          maxLength={500}
          onInput={(event) => {
            onInput(event.currentTarget.value);
          }}
        />
      )}
    </Field>
  );
}

/** A confirmation that may carry a reason; the reason is checked with the API schema first. */
export function ReasonDialog(props: ReasonDialogProps): JSX.Element {
  const { t } = useTranslation("admin");
  const ref = useModal(props.open);
  const id = useId();
  const { value, setValue, problem, submit } = useReason(props);
  return (
    <dialog
      ref={ref}
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-text`}
      onClose={props.onCancel}
      class="fade-in m-auto w-[calc(100%-32px)] max-w-[480px] border border-rule-strong bg-raised p-8 text-ink shadow-raised backdrop:bg-[rgb(0_0_0/0.4)]"
    >
      <form class="flex flex-col gap-6" noValidate onSubmit={submit}>
        <h2 id={`${id}-title`} class="text-h3 font-semibold [overflow-wrap:anywhere]">
          {props.title}
        </h2>
        <p id={`${id}-text`}>{props.text}</p>
        <FormAlert error={props.error} />
        {props.reason === undefined ? null : (
          <ReasonInput
            {...{ id: `${id}-reason`, field: props.reason, value, problem, onInput: setValue }}
          />
        )}
        <div class="flex flex-wrap justify-between gap-3">
          <Button variant="ghost" onClick={props.onCancel}>
            {t("cancel")}
          </Button>
          <Button
            type="submit"
            variant={props.destructive ? "danger" : "primary"}
            loading={props.busy}
          >
            {props.confirmLabel}
          </Button>
        </div>
      </form>
    </dialog>
  );
}
