import type { JSX } from "preact";
import { useState } from "preact/hooks";
import { useTranslation } from "react-i18next";
import { Button } from "../../components/ui";
import { useTyping } from "./useTyping";

type Props = { phrases: readonly string[] };

/** The promise typed phrase after phrase; readers hear the first one, the hidden copies hold the height. */
export function TypedPromise({ phrases }: Props): JSX.Element {
  const { t } = useTranslation();
  const [paused, setPaused] = useState(false);
  const { text, still } = useTyping(phrases, paused);
  return (
    <div class="flex flex-col items-start gap-4">
      <h1 class="home-promise">
        <span class="sr-only">{phrases[0]}</span>
        <span class="typed-stack" aria-hidden="true">
          {phrases.map((phrase) => (
            <span key={phrase} class="typed-ghost">
              {phrase}
            </span>
          ))}
          <span class="typed-live">
            {text}
            <span class="typed-caret" />
          </span>
        </span>
      </h1>
      {still ? null : (
        <Button
          variant="ghost"
          class="-ml-5 text-[15px] font-medium text-ink-2"
          onClick={() => {
            setPaused((current) => !current);
          }}
        >
          {t(paused ? "app.typingPlay" : "app.typingPause")}
        </Button>
      )}
    </div>
  );
}
