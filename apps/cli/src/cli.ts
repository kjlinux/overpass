#!/usr/bin/env node
import { parseArgs } from "./args.js";
import { describeEvent, detectLanguage, messagesFor } from "./messages.js";
import { startRelay } from "./relay.js";
import { readVersion } from "./version.js";

const locale = Intl.DateTimeFormat().resolvedOptions().locale;
const text = messagesFor(detectLanguage(process.env, locale));
const parsed = parseArgs(process.argv.slice(2), process.env);
const print = (line: string) => process.stdout.write(`${line}\n`);

if (parsed.command === "help") {
  print(text.help);
} else if (parsed.command === "version") {
  print(readVersion(new URL("../package.json", import.meta.url)));
} else if (parsed.command === "error") {
  process.stderr.write(`${text.errors[parsed.error]}\n`);
  process.exitCode = 2;
} else {
  const time = () => new Date().toTimeString().slice(0, 8);
  const relay = startRelay({
    api: parsed.api,
    key: parsed.key,
    forwardTo: parsed.forwardTo,
    report: (event) =>
      print(describeEvent(text, event, { forwardTo: parsed.forwardTo, time: time() })),
  });
  process.once("SIGINT", () => {
    void relay.stop().then(() => print(text.stopped));
  });
  if ((await relay.done) === "unauthorized") process.exitCode = 1;
}
