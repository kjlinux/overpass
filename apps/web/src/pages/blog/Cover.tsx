import type { JSX } from "preact";

/** The title sits beside it, so the cover is decorative for screen readers. */
export function Cover({
  src,
  small = false,
}: {
  src: string | null;
  small?: boolean;
}): JSX.Element | null {
  if (src === null) return null;
  const size = small ? "w-full md:w-48 md:shrink-0" : "w-full";
  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      decoding="async"
      class={`aspect-[16/9] border border-rule object-cover ${size}`}
    />
  );
}
