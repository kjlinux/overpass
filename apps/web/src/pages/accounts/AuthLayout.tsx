import type { ComponentChildren, JSX } from "preact";
import { useLanguage } from "../../app/useLanguage";
import { Layout } from "../../layout";

type Props = {
  title: string;
  intro?: string;
  children: ComponentChildren;
  footer?: ComponentChildren;
};

/** One narrow ruled column: title, one sentence, the form, then the way out. */
export function AuthLayout({ title, intro, children, footer }: Props): JSX.Element {
  const language = useLanguage();
  return (
    <Layout language={language}>
      <section class="mx-auto max-w-[480px] py-12 md:py-16">
        <h1 class="text-h1 font-semibold">{title}</h1>
        {intro === undefined ? null : <p class="mt-3 text-ink-2">{intro}</p>}
        <div class="mt-8 border-t border-rule pt-8">{children}</div>
        {footer === undefined ? null : <p class="mt-8 border-t border-rule pt-6">{footer}</p>}
      </section>
    </Layout>
  );
}
