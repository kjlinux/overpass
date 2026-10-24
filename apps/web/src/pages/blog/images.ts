const accepted = new Set(["image/png", "image/jpeg", "image/webp"]);

/** Same ceiling as the API, so a member learns before uploading that a file is too big. */
export const imageMaxBytes = 2 * 1024 * 1024;

export type ImageProblem = "image_invalid" | "image_too_large";

export function checkImage(file: { type: string; size: number }): ImageProblem | null {
  if (!accepted.has(file.type)) return "image_invalid";
  return file.size > imageMaxBytes ? "image_too_large" : null;
}

const newline = String.fromCharCode(10);
const backslash = String.fromCharCode(92);
const paragraph = newline + newline;
const markdownSpecial = new RegExp(`[${backslash}[${backslash}]${backslash}${backslash}]`, "g");

/** An image on a paragraph of its own; brackets would end the alternative text early. */
export function imageMarkdown(alt: string, url: string): string {
  const text = alt.replace(markdownSpecial, (char) => backslash + char);
  return `${paragraph}![${text}](${url})${paragraph}`;
}

export function insertAt(
  text: string,
  at: number | null,
  snippet: string,
): { text: string; cursor: number } {
  const position = at ?? text.length;
  return {
    text: text.slice(0, position) + snippet + text.slice(position),
    cursor: position + snippet.length,
  };
}

const mediaPath = /^\/v1\/media\/([0-9a-f-]{36})$/;

export function mediaIdOf(url: string): string | null {
  return mediaPath.exec(url)?.[1] ?? null;
}
