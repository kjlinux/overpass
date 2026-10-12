import type { ComponentChildren, JSX } from "preact";
import { cx } from "./cx";

export type CardProps = {
  title?: string;
  meta?: ComponentChildren;
  action?: ComponentChildren;
  class?: string;
  children?: ComponentChildren;
};

/** A ruled container with an optional title, metadata line and single action. */
export function Card({ title, meta, action, class: className, children }: CardProps): JSX.Element {
  return (
    <article class={cx("border border-rule bg-paper p-4 sm:p-6", className)}>
      {title === undefined ? null : <h3 class="text-h3 font-semibold">{title}</h3>}
      {meta === undefined ? null : <div class="mt-1 text-caption text-ink-2">{meta}</div>}
      {children === undefined ? null : <div class="mt-3">{children}</div>}
      {action === undefined ? null : <div class="mt-4">{action}</div>}
    </article>
  );
}
