import type { ComponentChildren, JSX } from "preact";

type SectionProps = {
  id: string;
  title: string;
  aside?: ComponentChildren;
  children: ComponentChildren;
};

/** One ruled block of the test track: a heading, an optional aside, then its content. */
export function Section({ id, title, aside, children }: SectionProps): JSX.Element {
  return (
    <section aria-labelledby={id} class="border-b border-rule py-6 last:border-b-0">
      <div class="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <h2 id={id} class="text-h3 font-semibold">
          {title}
        </h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

type RadioRowProps = {
  name: string;
  value: string;
  checked: boolean;
  label: string;
  help: string;
  onChange: (value: string) => void;
};

/** A ruled radio row with one line saying what choosing it does. */
export function RadioRow({
  name,
  value,
  checked,
  label,
  help,
  onChange,
}: RadioRowProps): JSX.Element {
  return (
    <label class="grid cursor-pointer grid-cols-[20px_minmax(0,1fr)] items-start gap-x-3 border-b border-rule py-3">
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        class="m-0 mt-0.5 h-5 w-5 accent-accent"
        onChange={() => {
          onChange(value);
        }}
      />
      <span class={checked ? "font-semibold" : "font-medium"}>{label}</span>
      <span class="col-start-2 text-caption text-ink-2">{help}</span>
    </label>
  );
}

/** Formats an instant as a wall-clock time in the reader's language. */
export function clock(iso: string, language: string): string {
  return new Intl.DateTimeFormat(language, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(iso));
}

/** Pretty JSON when the text is JSON, the raw text otherwise. */
export function readable(body: unknown): string {
  if (typeof body !== "string") return JSON.stringify(body, null, 2);
  try {
    return JSON.stringify(JSON.parse(body), null, 2);
  } catch {
    return body;
  }
}
