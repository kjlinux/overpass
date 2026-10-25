import type { BadgeLevel } from "@overpass/shared";
import type { JSX } from "preact";
import { useTranslation } from "react-i18next";
import { cx } from "./cx";

/** The project's own pixel drawings, 12 by 12 cells of 2 units on the 24 by 24 grid. */
const drawings: Record<BadgeLevel, string[]> = {
  hugin: [
    "#..........#",
    "##........##",
    "###..##..###",
    ".####.##.###",
    "..#########.",
    "...#######..",
    "....#####...",
    ".....###....",
    "......#.....",
    "............",
    "............",
    "............",
  ],
  ragnar: [
    ".....##.....",
    "...######...",
    "..########..",
    "..########..",
    "...#######..",
    ".....##.#...",
    ".....##.....",
    ".....##.....",
    ".....##.....",
    ".....##.....",
    ".....##.....",
    ".....##.....",
  ],
  thor: [
    "............",
    ".##########.",
    ".##########.",
    ".##########.",
    ".##########.",
    ".##########.",
    ".....##.....",
    ".....##.....",
    ".....##.....",
    ".....##.....",
    ".....##.....",
    ".....##.....",
  ],
  kratos: [
    "......##....",
    ".....####...",
    ".....####...",
    ".....####...",
    ".....####...",
    ".....####...",
    ".....####...",
    "..##########",
    "..##########",
    "......##....",
    "......##....",
    ".....####...",
  ],
  odin: [
    "............",
    "............",
    "...######...",
    "..########..",
    ".####..####.",
    ".###.##.###.",
    ".###.##.###.",
    ".####..####.",
    "..########..",
    "...######...",
    "............",
    "............",
  ],
};

const pathOf = (rows: string[]): string =>
  rows
    .flatMap((row, y) =>
      [...row].flatMap((cell, x) => (cell === "#" ? [`M${x * 2} ${y * 2}h2v2h-2z`] : [])),
    )
    .join("");

const paths = Object.fromEntries(
  Object.entries(drawings).map(([level, rows]) => [level, pathOf(rows)]),
) as Record<BadgeLevel, string>;

export function LevelEmblem({ level, size = 18 }: { level: BadgeLevel; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      shape-rendering="crispEdges"
      aria-hidden="true"
    >
      <path d={paths[level]} />
    </svg>
  );
}

/** A member's level as its emblem and name, in the monospace style of an identifier. */
export function LevelBadge(props: { level: BadgeLevel; class?: string }): JSX.Element {
  const { t } = useTranslation("ui");
  return (
    <span
      class={cx(
        "inline-flex h-8 items-center gap-2 border border-ink px-2 font-mono text-[13px] font-semibold",
        props.class,
      )}
    >
      <LevelEmblem level={props.level} />
      {t(`level.${props.level}`)}
    </span>
  );
}
