import report from "../../../../../docs/LICENSES.md?raw";

export type LicencePackage = { name: string; dev: boolean };
export type LicenceGroup = { licence: string; count: number; packages: LicencePackage[] };
export type LicenceReport = { audited: number; groups: LicenceGroup[] };

const summaryRow = /^\|\s*([^|]+?)\s*\|\s*yes\s*\|\s*(\d+)\s*\|$/;
const packageLine = /^- \*\*(.+?)\*\*: (.+)$/;

function packagesOf(list: string): LicencePackage[] {
  return list.split(", ").map((entry) => {
    const dev = entry.endsWith(" (dev)");
    return { name: dev ? entry.slice(0, -" (dev)".length) : entry, dev };
  });
}

/** Reads the licence report written by scripts/licenses.ts; nothing is copied by hand. */
export function parseLicenceReport(markdown: string): LicenceReport {
  const lines = markdown.split(/\r?\n/);
  const audited = Number(/Packages audited: (\d+)/.exec(markdown)?.[1] ?? 0);
  const lists = new Map<string, LicencePackage[]>();
  for (const line of lines) {
    const match = packageLine.exec(line);
    if (match?.[1] !== undefined && match[2] !== undefined) {
      lists.set(match[1], packagesOf(match[2]));
    }
  }
  const groups = lines.flatMap((line): LicenceGroup[] => {
    const match = summaryRow.exec(line);
    if (match?.[1] === undefined || match[2] === undefined) return [];
    return [{ licence: match[1], count: Number(match[2]), packages: lists.get(match[1]) ?? [] }];
  });
  return { audited, groups };
}

/** The report bundled at build time from docs/LICENSES.md. */
export const licenceReport: LicenceReport = /* @__PURE__ */ parseLicenceReport(report);
