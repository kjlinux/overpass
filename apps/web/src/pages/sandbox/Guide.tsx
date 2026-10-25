import type { ComponentChildren, JSX } from "preact";

export type GuideStep = {
  id: string;
  title: string;
  text: string;
  extra?: ComponentChildren;
};

type GuideProps = {
  id: string;
  title: string;
  intro: string;
  steps: GuideStep[];
};

/** A numbered guide; a step can carry a command or a link under its text. */
export function Guide({ id, title, intro, steps }: GuideProps): JSX.Element {
  return (
    <section aria-labelledby={id} class="flex min-w-0 flex-col gap-4">
      <h3 id={id} class="text-h3 font-semibold">
        {title}
      </h3>
      <p class="max-w-prose">{intro}</p>
      <ol class="border-y border-rule">
        {steps.map((step, index) => (
          <li
            key={step.id}
            data-step={step.id}
            class="flex min-w-0 flex-col gap-2 border-t border-rule py-4 first:border-t-0"
          >
            <h4 class="font-semibold">
              {index + 1}. {step.title}
            </h4>
            <p class="max-w-prose">{step.text}</p>
            {step.extra}
          </li>
        ))}
      </ol>
    </section>
  );
}
