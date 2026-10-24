import { CircleCheck, Route } from "lucide-preact";
import type { JSX } from "preact";
import { useTranslation } from "react-i18next";
import { Line, Screen } from "../Screen";
import { useSequence } from "../useSequence";
import { Avatar } from "./Avatar";

type Thread = {
  question: string;
  asker: string;
  answer: string;
  answerer: string;
  accepted: string;
  route: string;
};

function Message({ name, text, on }: { name: string; text: string; on: boolean }): JSX.Element {
  return (
    <div class="tour-line flex items-start gap-3" data-on={on ? "" : undefined}>
      <Avatar name={name} />
      <div class="min-w-0 border border-rule bg-paper px-3 py-2">
        <p class="m-0 text-caption font-semibold">{name}</p>
        <p class="m-0">{text}</p>
      </div>
    </div>
  );
}

/** A question, an answer from another member, accepted, then turned into an itinerary. */
export function ThreadScreen(): JSX.Element {
  const { t } = useTranslation("home");
  const th = t("tour.discussions.screen.thread", { returnObjects: true }) as Thread;
  const { ref, step } = useSequence(4);
  return (
    <Screen
      title={t("tour.discussions.screen.title")}
      label={t("tour.discussions.screen.label")}
      screenRef={ref}
    >
      <Message name={th.asker} text={th.question} on={step >= 1} />
      <Message name={th.answerer} text={th.answer} on={step >= 2} />
      <Line tone="ok" on={step >= 3}>
        <CircleCheck size={16} aria-hidden="true" class="mr-1 inline align-[-3px]" />
        {th.accepted}
      </Line>
      <div
        class="tour-line flex items-center gap-3 border border-accent bg-accent-surface px-3 py-2"
        data-on={step >= 4 ? "" : undefined}
      >
        <Route size={18} aria-hidden="true" class="text-accent" />
        <span class="font-medium">{th.route}</span>
      </div>
    </Screen>
  );
}
