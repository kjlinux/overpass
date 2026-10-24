import type { ComponentChildren, JSX, RefObject } from "preact";
import { useTranslation } from "react-i18next";

type Props = {
  title: string;
  label: string;
  screenRef: RefObject<HTMLElement | null>;
  children: ComponentChildren;
};

/** A small window frame; its text is real text, so it stays readable, translatable and sharp. */
export function Screen({ title, label, screenRef, children }: Props): JSX.Element {
  const { t } = useTranslation("home");
  return (
    <figure
      ref={screenRef}
      aria-label={label}
      class="tour-screen m-0 border border-rule-strong bg-surface"
    >
      <figcaption class="flex items-center gap-2 border-b border-rule px-4 py-2">
        <span aria-hidden="true" class="tour-dots" />
        <span class="min-w-0 flex-1 truncate font-code text-caption text-ink-2">{title}</span>
        <span class="text-caption text-ink-2">{t("tour.example")}</span>
      </figcaption>
      <div class="flex flex-col gap-2 p-4 md:p-5">{children}</div>
    </figure>
  );
}

export type Tone = "code" | "muted" | "ok" | "warn" | "danger" | "accent" | "you";

const tones: Record<Tone, string> = {
  code: "whitespace-pre-wrap font-code text-code text-ink [overflow-wrap:anywhere]",
  muted: "text-caption text-ink-2",
  ok: "text-caption font-semibold text-success",
  warn: "text-caption font-semibold text-warning",
  danger: "text-caption font-semibold text-danger",
  accent: "whitespace-pre-wrap font-code text-code text-accent [overflow-wrap:anywhere]",
  you: "self-end max-w-[85%] border border-rule bg-paper px-3 py-2 text-caption",
};

/** One line of a screen; it fades in when the sequence reaches it and keeps its room before. */
export function Line({
  tone,
  on,
  children,
}: {
  tone: Tone;
  on: boolean;
  children: ComponentChildren;
}) {
  return (
    <p class={`tour-line m-0 ${tones[tone]}`} data-on={on ? "" : undefined}>
      {children}
    </p>
  );
}
