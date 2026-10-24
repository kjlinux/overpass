import type { JSX } from "preact";
import { Field } from "../../components/ui";

const fileClass =
  "block max-w-full text-caption file:mr-3 file:min-h-tap file:border file:border-rule-strong file:bg-paper file:px-3 file:font-medium file:text-ink";

type Props = {
  id: string;
  label: string;
  help: string;
  busy: boolean;
  onFile: (file: File) => void;
};

/** The native file picker, kept for its keyboard and screen reader support; resets after each pick. */
export function ImageFileInput({ id, label, help, busy, onFile }: Props): JSX.Element {
  const pick = (input: HTMLInputElement) => {
    const file = input.files?.[0];
    input.value = "";
    if (file !== undefined) onFile(file);
  };
  return (
    <Field id={id} label={label} help={help}>
      {(control) => (
        <input
          {...control}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          class={fileClass}
          disabled={busy}
          onChange={(event) => {
            pick(event.currentTarget);
          }}
        />
      )}
    </Field>
  );
}
