import type { ComponentChildren, JSX } from "preact";

type Props = { id: string; title: string; children: ComponentChildren };

/** A ruled section of a reading page; its heading id is the anchor other pages link to. */
export function PageSection({ id, title, children }: Props): JSX.Element {
  return (
    <section aria-labelledby={id} class="border-t border-rule pt-6">
      <h2 id={id} class="scroll-mt-24 text-h2 font-semibold">
        {title}
      </h2>
      <div class="mt-4 flex max-w-prose flex-col gap-4">{children}</div>
    </section>
  );
}

/** An explicit gap the team must fill, never an invented value. */
export function Placeholder({ label }: { label: string }): JSX.Element {
  return (
    <span class="inline-flex min-h-7 items-center border border-dashed border-rule-strong px-3 text-caption font-medium text-ink-2">
      {label}
    </span>
  );
}

type Field = { term: string; value: ComponentChildren };

/** Ruled term and value rows that stack under 768 px. */
export function FieldList({ fields }: { fields: Field[] }): JSX.Element {
  return (
    <dl class="border-y border-rule">
      {fields.map((field) => (
        <div
          key={field.term}
          class="grid gap-1 border-t border-rule py-3 first:border-t-0 md:grid-cols-[220px_minmax(0,1fr)] md:gap-4"
        >
          <dt class="font-semibold">{field.term}</dt>
          <dd class="m-0 min-w-0 [overflow-wrap:anywhere]">{field.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Title and intro of a reading page. */
export function PageHead({ title, intro }: { title: string; intro: string }): JSX.Element {
  return (
    <header class="max-w-prose">
      <h1 class="text-h1 font-semibold">{title}</h1>
      <p class="mt-2 text-ink-2">{intro}</p>
    </header>
  );
}
