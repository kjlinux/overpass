import type { JSX } from "preact";

export type FlagProps = { country: string; name: string };

/** A self-hosted flag (flag-icons, MIT) beside the country name, which carries the meaning. */
export function Flag({ country, name }: FlagProps): JSX.Element {
  return (
    <span class="inline-flex min-w-0 items-center gap-2">
      <img
        src={`/flags/${country.toLowerCase()}.svg`}
        alt=""
        width={24}
        height={18}
        loading="lazy"
        decoding="async"
        class="h-[18px] w-6 shrink-0 border border-rule object-cover"
      />
      <span class="[overflow-wrap:anywhere]">{name}</span>
    </span>
  );
}
