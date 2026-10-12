import type { ComponentChildren, InputHTMLAttributes, JSX, TextareaHTMLAttributes } from "preact";
import { classOf, cx } from "./cx";

export type ControlProps = {
  id: string;
  "aria-describedby": string | undefined;
  "aria-invalid": boolean;
};

export type FieldProps = {
  id: string;
  label: string;
  help?: string;
  error?: string;
  children: (control: ControlProps) => ComponentChildren;
};

/** Label above, control, then help or error text linked by aria-describedby. */
export function Field({ id, label, help, error, children }: FieldProps): JSX.Element {
  const helpId = help === undefined ? undefined : `${id}-help`;
  const errorId = error === undefined ? undefined : `${id}-error`;
  const describedBy = [errorId, helpId].filter((part) => part !== undefined).join(" ");
  return (
    <div class="block">
      <label class="mb-2 block font-semibold" for={id}>
        {label}
      </label>
      {children({
        id,
        "aria-describedby": describedBy === "" ? undefined : describedBy,
        "aria-invalid": error !== undefined,
      })}
      {help === undefined ? null : (
        <span class="mt-2 block text-caption text-ink-2" id={helpId}>
          {help}
        </span>
      )}
      {error === undefined ? null : (
        <span class="mt-2 block text-caption font-medium text-danger" id={errorId} role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

const controlClass =
  "w-full min-h-tap border border-rule-strong bg-paper px-3 text-ink placeholder:text-ink-2 [&[readonly]]:bg-surface [&[readonly]]:font-code [&[readonly]]:text-code aria-[invalid=true]:border-danger disabled:bg-surface disabled:text-ink-2";

export type TextInputProps = JSX.IntrinsicElements["input"];

export function TextInput(props: TextInputProps): JSX.Element {
  return <input {...props} class={cx(controlClass, classOf(props.class))} />;
}

export type TextareaProps = Omit<TextareaHTMLAttributes, "class"> & {
  class?: string;
};

export function Textarea({ class: className, rows = 4, ...rest }: TextareaProps): JSX.Element {
  return (
    <textarea {...rest} rows={rows} class={cx(controlClass, "py-2 leading-relaxed", className)} />
  );
}

export type SelectOption = { value: string; label: string };

export type SelectProps = JSX.IntrinsicElements["select"] & { options: SelectOption[] };

export function Select({ options, ...props }: SelectProps): JSX.Element {
  return (
    <span class={cx("select-wrap", classOf(props.class))}>
      <select {...props} class={cx(controlClass, "appearance-none pr-8")}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </span>
  );
}

export type ChoiceProps = Omit<InputHTMLAttributes, "class" | "type" | "role"> & {
  type: "checkbox" | "radio";
  label: string;
};

const choiceClass = "m-0 h-5 w-5 flex-none accent-accent";

/** A 44 px row holding a 20 px checkbox or radio and its label. */
export function Choice({ label, type, ...rest }: ChoiceProps): JSX.Element {
  return (
    <label class="flex min-h-tap cursor-pointer items-center gap-3 border-b border-rule">
      {type === "radio" ? (
        <input {...rest} type="radio" class={choiceClass} />
      ) : (
        <input {...rest} type="checkbox" class={choiceClass} />
      )}
      {label}
    </label>
  );
}
