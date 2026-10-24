import type { JSX } from "preact";
import { useTheme } from "../layout";

export type CaptureName = "track";
type Size = readonly [number, number];
type Props = {
  name: CaptureName;
  alt: string;
  wide: Size;
  phone: Size;
};

/** A real interface capture: phone crop under 768 px, desktop column crop above, in the current theme. */
export function Capture({ name, alt, wide, phone }: Props): JSX.Element {
  const dark = useTheme() === "dark";
  const theme = dark ? "-dark" : "";
  const base = `/home/${name}${theme}`;
  return (
    <figure>
      <div class="overflow-hidden border border-rule bg-surface">
        <picture>
          <source
            media="(max-width: 767px)"
            srcset={`${base}-phone-360.webp 360w, ${base}-phone-720.webp 720w`}
            sizes="100vw"
            width={phone[0]}
            height={phone[1]}
          />
          <img
            class="block h-auto w-full"
            src={`${base}-760.webp`}
            srcset={`${base}-760.webp 760w, ${base}-1520.webp 1520w`}
            sizes="(min-width: 1024px) 734px, 100vw"
            alt={alt}
            loading="lazy"
            decoding="async"
            width={wide[0]}
            height={wide[1]}
          />
        </picture>
      </div>
    </figure>
  );
}
