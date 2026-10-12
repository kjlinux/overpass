import type { ComponentChildren, JSX } from "preact";
import { useState } from "preact/hooks";
import { cx } from "./cx";

export type Tab = { id: string; label: string; content: ComponentChildren };

export type TabsProps = { id: string; label: string; tabs: Tab[]; initial?: string };

const keyMoves: Record<string, (index: number, count: number) => number> = {
  ArrowRight: (index, count) => (index + 1) % count,
  ArrowLeft: (index, count) => (index - 1 + count) % count,
  Home: () => 0,
  End: (_index, count) => count - 1,
};

type TabButtonProps = {
  tabsId: string;
  tab: Tab;
  active: boolean;
  onSelect: () => void;
  onKeyDown: (event: KeyboardEvent) => void;
};

function TabButton({ tabsId, tab, active, onSelect, onKeyDown }: TabButtonProps): JSX.Element {
  return (
    <button
      type="button"
      role="tab"
      id={`${tabsId}-tab-${tab.id}`}
      aria-selected={active}
      aria-controls={`${tabsId}-panel-${tab.id}`}
      tabIndex={active ? 0 : -1}
      class={cx(
        "min-h-tap flex-none whitespace-nowrap border-r border-rule px-4 focus-visible:-outline-offset-[3px]",
        active
          ? "bg-paper font-semibold text-ink shadow-[inset_0_-2px_0_var(--color-accent)]"
          : "text-ink-2 hover:text-ink",
      )}
      onClick={onSelect}
      onKeyDown={onKeyDown}
    >
      {tab.label}
    </button>
  );
}

/** Moves the active tab with the arrow, Home and End keys and focuses it. */
function moveWithKeys(
  event: KeyboardEvent,
  index: number,
  tabs: Tab[],
  id: string,
): Tab | undefined {
  const move = keyMoves[event.key];
  if (move === undefined) return undefined;
  event.preventDefault();
  const next = tabs[move(index, tabs.length)];
  if (next !== undefined) document.getElementById(`${id}-tab-${next.id}`)?.focus();
  return next;
}

/** A ruled tab rail with roving focus; panels are labelled by their tab. */
export function Tabs({ id, label, tabs, initial }: TabsProps): JSX.Element {
  const [active, setActive] = useState(initial ?? tabs[0]?.id);
  return (
    <div class="border border-rule">
      <div
        role="tablist"
        aria-label={label}
        class="flex overflow-x-auto border-b border-rule bg-surface"
      >
        {tabs.map((tab, index) => (
          <TabButton
            key={tab.id}
            tabsId={id}
            tab={tab}
            active={tab.id === active}
            onSelect={() => {
              setActive(tab.id);
            }}
            onKeyDown={(event) => {
              const next = moveWithKeys(event, index, tabs, id);
              if (next !== undefined) setActive(next.id);
            }}
          />
        ))}
      </div>
      {tabs.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`${id}-panel-${tab.id}`}
          aria-labelledby={`${id}-tab-${tab.id}`}
          hidden={tab.id !== active}
          tabIndex={0}
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
}
