import type { ComponentChildren, JSX } from "preact";

type Props = { id: string; title: string; children: ComponentChildren };

/** A ruled section whose heading is the anchor of the page index. */
export function DocSection({ id, title, children }: Props): JSX.Element {
  return (
    <section aria-labelledby={id} class="border-t border-rule pt-6">
      <h2 id={id} class="scroll-mt-24 text-h2 font-semibold">
        {title}
      </h2>
      <div class="mt-4 flex flex-col gap-6">{children}</div>
    </section>
  );
}
