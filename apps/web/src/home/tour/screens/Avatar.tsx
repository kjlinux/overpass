import type { JSX } from "preact";

const tones = [
  "bg-accent-surface text-accent",
  "bg-success-surface text-success",
  "bg-warning-surface text-warning",
];

/** A member's initial in a circle, the one round shape DESIGN.md allows; tone follows the name. */
export function Avatar({ name, size = 32 }: { name: string; size?: number }): JSX.Element {
  const tone =
    tones[
      Array.from({ length: name.length }, (_, i) => name.charCodeAt(i)).reduce(
        (sum, code) => sum + code,
        0,
      ) % tones.length
    ];
  return (
    <span
      aria-hidden="true"
      class={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold ${tone ?? ""}`}
      style={{
        width: `${String(size)}px`,
        height: `${String(size)}px`,
        fontSize: `${String(size / 2.2)}px`,
      }}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}
