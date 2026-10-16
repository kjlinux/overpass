import type { IssueItem, Language } from "@overpass/shared";
import type { MailMessage } from "../../../mail/mailer.js";
import en from "../locales/en.json" with { type: "json" };
import fr from "../locales/fr.json" with { type: "json" };

export const texts = { fr, en } satisfies Record<Language, typeof fr>;

export function fill(body: string, values: Record<string, string>): string {
  return Object.entries(values).reduce(
    (text, [key, value]) => text.replaceAll(`{{${key}}}`, () => value),
    body,
  );
}

const entities: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

const escape = (text: string): string => text.replace(/[&<>"']/g, (char) => entities[char] ?? char);

export function confirmationMail(to: string, language: Language, link: string): MailMessage {
  const copy = texts[language].confirmMail;
  return { to, subject: copy.subject, text: fill(copy.body, { link }) };
}

export type IssueMail = {
  to: string;
  language: Language;
  subject: string;
  intro: string;
  items: IssueItem[];
  webOrigin: string;
  unsubscribePage: string;
  oneClickUrl: string;
};

const linkOf = (mail: IssueMail, item: IssueItem) =>
  `${mail.webOrigin}/${mail.language}${item.path}`;

function textOf(mail: IssueMail): string {
  const copy = texts[mail.language].issue;
  const line = (label: string, value: string) => fill(copy.line, { label, value });
  const items = mail.items.map((item) =>
    [line(copy.kinds[item.kind], item.title), item.summary, linkOf(mail, item)].join("\n"),
  );
  const footer = [copy.why, line(copy.unsubscribe, mail.unsubscribePage), copy.signature];
  return [mail.intro, ...items, footer.join("\n")].filter((part) => part !== "").join("\n\n");
}

/** Plain markup with inline styles from DESIGN.md: readable with images and styles blocked. */
function htmlOf(mail: IssueMail): string {
  const copy = texts[mail.language].issue;
  const paragraphs = mail.intro.split(/\n{2,}/).map((part) => `<p>${escape(part)}</p>`);
  const items = mail.items.map(
    (item) =>
      `<div style="border-top:1px solid #D4D4D0;padding:16px 0">` +
      `<p style="margin:0;font-size:13px">${escape(copy.kinds[item.kind])}</p>` +
      `<h2 style="margin:4px 0;font-size:18px">${escape(item.title)}</h2>` +
      `<p style="margin:0 0 8px">${escape(item.summary)}</p>` +
      `<a href="${escape(linkOf(mail, item))}" style="color:#213E9E">${escape(copy.read)}</a></div>`,
  );
  const footer =
    `<p style="border-top:1px solid #D4D4D0;padding-top:16px;font-size:13px">${escape(copy.why)} ` +
    `<a href="${escape(mail.unsubscribePage)}" style="color:#213E9E">${escape(copy.unsubscribe)}</a></p>` +
    `<p>${escape(copy.signature)}</p>`;
  return (
    `<!doctype html><html lang="${mail.language}"><body style="margin:0;padding:24px;` +
    `background:#FBFBF9;color:#1A1A1C;font-family:Arial,sans-serif;line-height:1.5">` +
    `<div style="max-width:600px;margin:0 auto">${[...paragraphs, ...items, footer].join("")}` +
    `</div></body></html>`
  );
}

/** RFC 8058 headers let mail clients offer a real one-click unsubscribe. */
export function issueMail(mail: IssueMail): MailMessage {
  return {
    to: mail.to,
    subject: mail.subject,
    text: textOf(mail),
    html: htmlOf(mail),
    headers: {
      "List-Unsubscribe": `<${mail.oneClickUrl}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  };
}
