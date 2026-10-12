import type { ComponentChildren, JSX } from "preact";

export type SectionProps = { id: string; title: string; children: ComponentChildren };

/** A ruled section of the showcase, titled and linkable. */
export function Section({ id, title, children }: SectionProps): JSX.Element {
  return (
    <section id={id} class="border-t border-rule py-12" aria-labelledby={`${id}-title`}>
      <h2 class="mb-6 text-h2 font-semibold" id={`${id}-title`}>
        {title}
      </h2>
      {children}
    </section>
  );
}
