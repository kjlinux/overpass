import type { JSX } from "preact";

/** Every section starts with a rule, 96 px after the previous one (64 px under 768 px). */
export const sectionClass = "mt-16 scroll-mt-4 border-t border-rule md:mt-24";

type Props = { id: string; title: string; intro?: string };

/** Title and lead of a section: stacked on phones, a 4/8 ruled split from 1024 px. */
export function SectionHead({ id, title, intro }: Props): JSX.Element {
  return (
    <div class="grid gap-2 py-6 lg:grid-cols-[4fr_8fr] lg:gap-0">
      <h2 id={id} class="text-h2 font-semibold lg:pr-8">
        {title}
      </h2>
      {intro === undefined ? null : (
        <p class="max-w-[64ch] lg:border-l lg:border-rule lg:pl-8">{intro}</p>
      )}
    </div>
  );
}
