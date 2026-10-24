import type { JSX } from "preact";

/** A drawn cover, a phone paying and a webhook arriving; decorative, the title says the rest. */
export function CoverArt({ on }: { on: boolean }): JSX.Element {
  return (
    <svg
      viewBox="0 0 320 140"
      aria-hidden="true"
      class="tour-cover block h-auto w-full"
      data-on={on ? "" : undefined}
    >
      <rect width="320" height="140" class="fill-accent-surface" />
      <g class="stroke-rule-strong" stroke-width="1">
        <line x1="0" y1="35" x2="320" y2="35" />
        <line x1="0" y1="70" x2="320" y2="70" />
        <line x1="0" y1="105" x2="320" y2="105" />
      </g>
      <rect x="58" y="22" width="56" height="98" class="fill-paper stroke-ink" stroke-width="3" />
      <rect x="68" y="36" width="36" height="8" class="fill-accent" />
      <rect x="68" y="52" width="24" height="6" class="fill-rule-strong" />
      <rect x="68" y="64" width="30" height="6" class="fill-rule-strong" />
      <rect x="68" y="92" width="36" height="14" class="fill-ink" />
      <path
        d="M126 71 H214"
        class="tour-wire stroke-accent"
        stroke-width="3"
        stroke-dasharray="8 6"
        fill="none"
      />
      <rect class="tour-packet fill-accent" x="122" y="65" width="12" height="12" />
      <rect x="222" y="40" width="64" height="62" class="fill-paper stroke-ink" stroke-width="3" />
      <circle cx="254" cy="71" r="17" class="tour-check fill-success" />
      <path d="M245 71 l6 6 l12 -13" class="stroke-paper" stroke-width="4" fill="none" />
    </svg>
  );
}
