export type Range = { start: number; end: number };

export const redactionMask = "••••••••";

const secretName = /(?:key|secret|token|password|passwd|pwd)$/i;
const notSecretName = /idempotency/i;

/** True for a name such as apiKey, client_secret or PAYDUNYA-MASTER-KEY. */
function isSecretName(name: string): boolean {
  return secretName.test(name) && !notSecretName.test(name);
}

/** A value typed in clear, as opposed to a variable, a call, a URL or an earlier mask. */
export function isLiteral(value: string, quoted: boolean): boolean {
  if (value.length < 3 || value.includes(redactionMask.charAt(0))) return false;
  if (/[$({]/.test(value) || /^[a-z][a-z0-9+.-]*:\/\//i.test(value)) return false;
  if (/^(?:\d+|true|false|null|none|undefined)$/i.test(value)) return false;
  if (quoted) return true;
  return /\d/.test(value) && !/^[A-Za-z_][\w]*(?:\.[\w]+)+$/.test(value);
}

/** Long enough and mixed enough to be a credential rather than a word. */
function looksGenerated(value: string): boolean {
  return value.length >= 20 && /\d/.test(value) && /[A-Za-z]/.test(value);
}

function* matches(text: string, pattern: RegExp): Generator<RegExpExecArray> {
  const scan = new RegExp(
    pattern.source,
    pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`,
  );
  for (let match = scan.exec(text); match !== null; match = scan.exec(text)) yield match;
}

/** The range of the last capture group of a match. */
function groupRange(match: RegExpExecArray, group: string): Range {
  const start = match.index + match[0].lastIndexOf(group);
  return { start, end: start + group.length };
}

type Rule = (text: string) => Range[];

const authorization: Rule = (text) =>
  [
    ...matches(
      text,
      /\bauthorization["']?\s*[:=]\s*["'`]?(?:(?:bearer|basic|token|digest)\s+)?([^\s"'`,;]+)/gi,
    ),
  ]
    .filter((match) => isLiteral(match[1] ?? "", true) && (match[1] ?? "").length >= 8)
    .map((match) => groupRange(match, match[1] ?? ""));

const bearer: Rule = (text) =>
  [...matches(text, /\b(?:bearer|token)\s+([A-Za-z0-9._~+/=-]{20,})/gi)]
    .filter((match) => looksGenerated(match[1] ?? ""))
    .map((match) => groupRange(match, match[1] ?? ""));

const jwt: Rule = (text) =>
  [...matches(text, /\beyJ[\w-]{8,}\.[\w-]{8,}\.[\w-]{8,}/g)].map((match) => ({
    start: match.index,
    end: match.index + match[0].length,
  }));

/** Documented key formats: Wave, PayDunya, Overpass test keys and common live keys. */
const prefixed: Rule = (text) =>
  [
    ...matches(
      text,
      /\b(?:wave_[a-z]{2}_(?:prod|test|sandbox)_|ovp_test_|(?:test|live)_(?:private|public|secret)_|sk_(?:live|test)_)([\w-]{8,})/g,
    ),
  ].map((match) => groupRange(match, match[1] ?? ""));

/** Reads a quoted or bare value starting at a position. */
function valueAt(
  text: string,
  position: number,
): { value: string; start: number; quoted: boolean } {
  const quote = text.charAt(position);
  if (quote === '"' || quote === "'" || quote === "`") {
    const end = text.indexOf(quote, position + 1);
    const value = end === -1 ? "" : text.slice(position + 1, end);
    return { value: value.includes("\n") ? "" : value, start: position + 1, quoted: true };
  }
  const bare = /^[^\s,;&)}\]"'`]+/.exec(text.slice(position))?.[0] ?? "";
  return { value: bare, start: position, quoted: false };
}

const keyValue: Rule = (text) =>
  [...matches(text, /([A-Za-z][\w.-]*)["']?\s*(?:=>|[:=])\s*/g)].flatMap((match) => {
    if (!isSecretName(match[1] ?? "")) return [];
    const found = valueAt(text, match.index + match[0].length);
    if (!isLiteral(found.value, found.quoted)) return [];
    return [{ start: found.start, end: found.start + found.value.length }];
  });

const setter: Rule = (text) =>
  [...matches(text, /\b([A-Za-z_]\w*)\s*\(\s*(["'`])([^"'`\n]+)\2/g)]
    .filter((match) => isSecretName(match[1] ?? "") && isLiteral(match[3] ?? "", true))
    .map((match) => groupRange(match, match[3] ?? ""));

const urlCredentials: Rule = (text) =>
  [...matches(text, /\b[a-z][a-z0-9+.-]*:\/\/[^\s:@/]+:([^\s@/]+)@/gi)]
    .filter((match) => isLiteral(match[1] ?? "", true))
    .map((match) => groupRange(match, match[1] ?? ""));

const privateKey: Rule = (text) =>
  [
    ...matches(
      text,
      /(-----BEGIN [A-Z ]*PRIVATE KEY-----\s*)([\s\S]*?)\s*-----END [A-Z ]*PRIVATE KEY-----/g,
    ),
  ]
    .filter((match) => (match[2] ?? "").length > 0 && isLiteral(match[2] ?? "", true))
    .map((match) => {
      const start = match.index + (match[1] ?? "").length;
      return { start, end: start + (match[2] ?? "").length };
    });

export const rules: readonly Rule[] = [
  privateKey,
  authorization,
  bearer,
  jwt,
  prefixed,
  keyValue,
  setter,
  urlCredentials,
];
