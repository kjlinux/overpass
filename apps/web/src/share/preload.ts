export type ManifestChunk = {
  file: string;
  imports?: string[];
  css?: string[];
  name?: string;
  isEntry?: boolean;
  isDynamicEntry?: boolean;
};
export type Manifest = Record<string, ManifestChunk>;

const coreRoots = (language: string) =>
  ["app", "layout", "components/ui", "share"].map(
    (owner) => `src/${owner}/locales/${language}.json`,
  );
const homeRoots = (language: string) => [
  "src/app/HomePage.tsx",
  `src/home/locales/${language}.json`,
];

/** A dynamic entry also imported statically is keyed "_Name-hash.js" instead of by its source. */
function resolveKey(manifest: Manifest, key: string): string | undefined {
  if (manifest[key] !== undefined) return key;
  const name = key.slice(key.lastIndexOf("/") + 1).replace(/\.[^.]+$/, "");
  return Object.keys(manifest).find(
    (candidate) =>
      manifest[candidate]?.isDynamicEntry === true && manifest[candidate].name === name,
  );
}

function filesOf(manifest: Manifest, roots: string[]): { js: Set<string>; css: Set<string> } {
  const js = new Set<string>();
  const css = new Set<string>();
  const visit = (key: string | undefined): void => {
    const chunk = key === undefined ? undefined : manifest[key];
    if (chunk === undefined || js.has(chunk.file)) return;
    js.add(chunk.file);
    for (const style of chunk.css ?? []) css.add(style);
    for (const imported of chunk.imports ?? []) visit(imported);
  };
  for (const root of roots) visit(resolveKey(manifest, root));
  return { js, css };
}

/** Link tags that start the requests the app would only discover after its first script runs. */
export function preloadLinks(manifest: Manifest, language: string, home: boolean): string[] {
  const roots = home ? [...coreRoots(language), ...homeRoots(language)] : coreRoots(language);
  const { js, css } = filesOf(manifest, roots);
  return [
    ...[...js].map((file) => `<link rel="modulepreload" crossorigin href="/${file}">`),
    ...[...css].map((file) => `<link rel="preload" as="style" href="/${file}">`),
  ];
}

/** Adds, just before the end of head, the links whose file the page does not reference yet. */
export function injectPreloads(html: string, links: string[]): string {
  const fresh = links.filter((link) => !html.includes(/href="([^"]+)"/.exec(link)?.[1] ?? "\0"));
  return html.replace("</head>", `${fresh.join("")}</head>`);
}
