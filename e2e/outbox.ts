import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { outbox } from "./paths.js";

type Mail = { to: string; subject: string; text: string };

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** A file the API is still writing reads as incomplete JSON; it is picked up on the next poll. */
async function readMail(path: string): Promise<Mail | undefined> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as Mail;
  } catch {
    return undefined;
  }
}

async function mailsTo(email: string): Promise<Mail[]> {
  const files = (await readdir(outbox).catch(() => [])).sort();
  const mails = await Promise.all(files.map((file) => readMail(join(outbox, file))));
  return mails.filter((mail): mail is Mail => mail?.to === email);
}

/** Waits for the newest mail sent to an address and returns the link it carries. */
export async function linkMailedTo(email: string): Promise<string> {
  for (let attempt = 0; attempt < 50; attempt++) {
    const link = /https?:\/\/\S+#token=\S+/.exec((await mailsTo(email)).at(-1)?.text ?? "")?.[0];
    if (link !== undefined) return link;
    await pause(100);
  }
  throw new Error(`No link mailed to ${email}`);
}
