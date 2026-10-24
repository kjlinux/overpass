import type { JSX } from "preact";

const rows = 3;

/** Three grey bars where a list will land; the block never jumps when it fills. */
export function LatestSkeleton({ label, tall }: { label: string; tall?: boolean }): JSX.Element {
  return (
    <ul aria-busy="true" aria-label={label} class="grid gap-4 md:grid-cols-3">
      {Array.from({ length: rows }, (_, index) => (
        <li key={index}>
          <div class={`skeleton-bar w-full ${tall === true ? "h-40" : "h-14"}`} />
        </li>
      ))}
    </ul>
  );
}
