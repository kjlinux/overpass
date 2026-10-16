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

/** Every quantifier below is bounded, so a 20,000 character body is scanned in linear time. */
const authorization: Rule = (text) =>
  [
    ...matches(
      text,
      /\bauthorization["']?\s{0,8}[:=]\s{0,8}["'`]?(?:(?:bearer|basic|token|digest)\s{1,8})?([^\s"'`,;]{1,4096})/gi,
    ),
  ]
    .filter((match) => isLiteral(match[1] ?? "", true) && (match[1] ?? "").length >= 8)
    .map((match) => groupRange(match, match[1] ?? ""));

const bearer: Rule = (text) =>
  [...matches(text, /\b(?:bearer|token)\s{1,8}([A-Za-z0-9._~+/=-]{20,4096})/gi)]
    .filter((match) => looksGenerated(match[1] ?? ""))
    .map((match) => groupRange(match, match[1] ?? ""));

const whole = (match: RegExpExecArray): Range => ({
  start: match.index,
  end: match.index + match[0].length,
});

const jwt: Rule = (text) =>
  [...matches(text, /\beyJ[\w-]{8,2048}\.[\w-]{8,4096}\.[\w-]{8,2048}/g)].map(whole);

/** Keys of common platforms that members paste alone, without a name before them. */
const bareKeys: Rule = (text) =>
  [
    ...matches(
      text,
      /\b(?:gh[pousr]_[A-Za-z0-9]{30,255}|AKIA[0-9A-Z]{16}|sk-(?:proj-)?[\w-]{20,200}|xox[abprs]-[\w-]{10,200}|AIza[\w-]{30,40})/g,
    ),
  ].map(whole);

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
  const sticky = /[^\s,;&)}\]"'`]{1,512}/y;
  sticky.lastIndex = position;
  const bare = sticky.exec(text)?.[0] ?? "";
  return { value: bare, start: position, quoted: false };
}

/** The lookbehind starts a name only at the beginning of a word, never inside one. */
const keyValue: Rule = (text) =>
  [...matches(text, /(?<![\w.-])([A-Za-z][\w.-]{0,63})["']?\s{0,8}(?:=>|[:=])\s{0,8}/g)].flatMap(
    (match) => {
      if (!isSecretName(match[1] ?? "")) return [];
      const found = valueAt(text, match.index + match[0].length);
      if (!isLiteral(found.value, found.quoted)) return [];
      return [{ start: found.start, end: found.start + found.value.length }];
    },
  );

const setter: Rule = (text) =>
  [...matches(text, /\b([A-Za-z_]\w{0,63})\s{0,8}\(\s{0,8}(["'`])([^"'`\n]{1,4096})\2/g)]
    .filter((match) => isSecretName(match[1] ?? "") && isLiteral(match[3] ?? "", true))
    .map((match) => groupRange(match, match[3] ?? ""));

const urlCredentials: Rule = (text) =>
  [...matches(text, /\b[a-z][a-z0-9+.-]{0,30}:\/\/[^\s:@/]{1,128}:([^\s@/]{1,256})@/gi)]
    .filter((match) => isLiteral(match[1] ?? "", true))
    .map((match) => groupRange(match, match[1] ?? ""));

/** Scanned with indexOf: a regex over the body backtracks badly when the END line is missing. */
const privateKey: Rule = (text) =>
  [...matches(text, /-----BEGIN [A-Z ]{0,40}PRIVATE KEY-----/g)].flatMap((begin) => {
    const from = begin.index + begin[0].length;
    const to = text.indexOf("-----END", from);
    if (to === -1) return [];
    const body = text.slice(from, to);
    const inner = body.trim();
    if (inner === "" || !isLiteral(inner, true)) return [];
    const start = from + body.indexOf(inner);
    return [{ start, end: start + inner.length }];
  });

export const rules: readonly Rule[] = [
  privateKey,
  authorization,
  bearer,
  jwt,
  prefixed,
  bareKeys,
  keyValue,
  setter,
  urlCredentials,
];
