import type { Inbox } from "lucide-preact";
import type { ComponentChildren, JSX } from "preact";

export type EmptyStateProps = {
  icon?: typeof Inbox;
  title: string;
  description: string;
  action?: ComponentChildren;
  /** 2 when the empty state sits right under the page title, so no heading level is skipped. */
  level?: 2 | 3;
};

/** Names what is empty, says why it matters, offers one next action. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  level = 3,
}: EmptyStateProps): JSX.Element {
  const Heading = level === 2 ? "h2" : "h3";
  return (
    <div class="flex flex-col items-center border border-rule px-4 py-12 text-center">
      {Icon === undefined ? null : <Icon class="mb-4 h-12 w-12 text-ink-2" aria-hidden="true" />}
      <Heading class="text-h3 font-semibold">{title}</Heading>
      <p class="mt-2 max-w-prose text-ink-2">{description}</p>
      {action === undefined ? null : <div class="mt-6">{action}</div>}
    </div>
  );
}
