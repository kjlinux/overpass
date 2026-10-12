import type { Inbox } from "lucide-preact";
import type { ComponentChildren, JSX } from "preact";

export type EmptyStateProps = {
  icon?: typeof Inbox;
  title: string;
  description: string;
  action?: ComponentChildren;
};

/** Names what is empty, says why it matters, offers one next action. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: EmptyStateProps): JSX.Element {
  return (
    <div class="flex flex-col items-center border border-rule px-4 py-12 text-center">
      {Icon === undefined ? null : <Icon class="mb-4 h-12 w-12 text-ink-2" aria-hidden="true" />}
      <h3 class="text-h3 font-semibold">{title}</h3>
      <p class="mt-2 max-w-prose text-ink-2">{description}</p>
      {action === undefined ? null : <div class="mt-6">{action}</div>}
    </div>
  );
}
