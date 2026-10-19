import { animate } from "motion/mini";
import type { ComponentChildren, JSX } from "preact";
import { useEffect, useRef } from "preact/hooks";
import { prefersReducedMotion } from "../hooks/idle";
import { useTranslation } from "react-i18next";
import type { StageState } from "./stages";

type Props = {
  title: string;
  state: StageState;
  elapsed?: number | undefined;
  children?: ComponentChildren;
};

/** One ruled step of the demo: a mark, its title, the measured time and what the API returned. */
export function DemoStage({ title, state, elapsed, children }: Props): JSX.Element {
  const { t } = useTranslation();
  const time =
    state === "pending"
      ? t("demo.pending")
      : elapsed === undefined
        ? ""
        : t("demo.elapsed", { ms: Math.round(elapsed) });
  return (
    <li
      class="demo-stage min-w-0 border-b border-rule py-5 last:border-b-0 md:border-b-0 md:border-l md:px-6 md:first:border-l-0 md:first:pl-0"
      data-state={state}
    >
      <p class="mb-3 flex justify-between gap-2 text-caption text-ink-2">
        <span>
          <i class="demo-mark" aria-hidden="true" />
          {title}
        </span>
        <span class="font-code">{time}</span>
      </p>
      {children}
    </li>
  );
}

/** The mono line and body excerpt under a finished step. */
export function StageBody({ line, body }: { line: string; body?: string }): JSX.Element {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (box.current === null || prefersReducedMotion()) return undefined;
    const enter = { opacity: [0, 1], transform: ["translateY(8px)", "none"] };
    const running = animate(box.current, enter, { duration: 0.2, ease: [0.2, 0, 0, 1] });
    return () => {
      running.cancel();
    };
  }, []);
  return (
    <div ref={box}>
      <p class="font-code text-code [overflow-wrap:anywhere]">{line}</p>
      {body === undefined ? null : (
        <pre class="mt-3 overflow-x-auto border border-rule bg-surface p-3 text-code">{body}</pre>
      )}
    </div>
  );
}
