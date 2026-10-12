import { Check, Copy } from "lucide-preact";
import type { JSX } from "preact";
import { useEffect, useState } from "preact/hooks";
import { useTranslation } from "react-i18next";
import { IconButton } from "./Button";

export type CodeBlockProps = { code: string; language?: string };

const copiedDelay = 2000;

/** Writes text to the clipboard and reports whether it worked. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** A code block with a language caption and a copy button that confirms in aria-live. */
export function CodeBlock({ code, language }: CodeBlockProps): JSX.Element {
  const { t } = useTranslation("ui");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return undefined;
    const timer = setTimeout(() => {
      setCopied(false);
    }, copiedDelay);
    return () => {
      clearTimeout(timer);
    };
  }, [copied]);

  const onCopy = (): void => {
    void copyText(code).then(setCopied);
  };

  return (
    <div class="border border-rule">
      <div class="flex items-center justify-between gap-2 border-b border-rule py-1 pl-4 pr-2">
        <span class="text-caption font-medium text-ink-2">{language ?? t("code")}</span>
        <IconButton label={copied ? t("copied") : t("copy")} onClick={onCopy}>
          {copied ? (
            <Check class="h-5 w-5 text-success" aria-hidden="true" />
          ) : (
            <Copy class="h-5 w-5" aria-hidden="true" />
          )}
        </IconButton>
        <span class="sr-only" aria-live="polite">
          {copied ? t("copied") : ""}
        </span>
      </div>
      <pre class="m-0 overflow-x-auto bg-surface p-4 leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}

/** Inline code inside running text. */
export function InlineCode({ children }: { children: string }): JSX.Element {
  return <code class="bg-surface px-1 text-[0.9375em]">{children}</code>;
}
