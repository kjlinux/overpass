import type { JSX } from "preact";
import { Choice } from "../components/ui";
import { stackOptions } from "./options";

type Props = { legend: string; value: string[]; onChange: (next: string[]) => void };

const toggle = (list: string[], item: string) =>
  list.includes(item) ? list.filter((entry) => entry !== item) : [...list, item];

/** Every stack as a 44 px checkbox row, two columns from 640 px. */
export function StackChoices({ legend, value, onChange }: Props): JSX.Element {
  return (
    <fieldset>
      <legend class="mb-2 font-semibold">{legend}</legend>
      <div class="grid gap-x-6 sm:grid-cols-2">
        {stackOptions.map((option) => (
          <Choice
            key={option.value}
            type="checkbox"
            label={option.label}
            checked={value.includes(option.value)}
            onChange={() => {
              onChange(toggle(value, option.value));
            }}
          />
        ))}
      </div>
    </fieldset>
  );
}
