/** The JSON escape of "<", built at run time so no tool or editor decodes it on the way. */
export const escapedLessThan = `\\u${"<".charCodeAt(0).toString(16).padStart(4, "0")}`;

/** Escaping every "<" keeps the JSON valid and leaves no way to forge the closing tag. */
function inertJson(payload: unknown): string {
  return JSON.stringify(payload, null, 2).replace(/</g, escapedLessThan);
}

export function dataBlock(source: string, payload: unknown, notice: string): string {
  return `${notice}\n\n<overpass_data source="${source}">\n${inertJson(payload)}\n</overpass_data>`;
}
