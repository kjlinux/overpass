export const maxLines = 200;
export const maxCommentRatio = 0.2;

function countCommentLines(lines: string[]): number {
  let inBlock = false;
  let count = 0;
  for (const raw of lines) {
    const line = raw.trim();
    const opensBlock = line.startsWith("/*") || line.startsWith("{/*") || line.startsWith("<!--");
    if (inBlock || opensBlock || line.startsWith("//")) count++;
    if (opensBlock && !line.includes("*/") && !line.includes("-->")) inBlock = true;
    else if (inBlock && (line.includes("*/") || line.includes("-->"))) inBlock = false;
  }
  return count;
}

/** Checks the 200 line limit and the 20 percent comment ceiling. */
export function checkFileShape(file: string, content: string): string[] {
  const lines = content.replace(/\n$/, "").split("\n");
  const errors: string[] = [];
  if (lines.length > maxLines) {
    errors.push(`${file} has ${String(lines.length)} lines (max ${String(maxLines)})`);
  }
  const comments = countCommentLines(lines);
  if (comments / lines.length > maxCommentRatio) {
    errors.push(`${file} has ${String(comments)} comment lines out of ${String(lines.length)}`);
  }
  return errors;
}
