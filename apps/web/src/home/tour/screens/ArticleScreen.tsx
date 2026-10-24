import { MessageSquare, Star } from "lucide-preact";
import type { JSX } from "preact";
import { useTranslation } from "react-i18next";
import { Line, Screen } from "../Screen";
import { useSequence } from "../useSequence";
import { Avatar } from "./Avatar";
import { CoverArt } from "./CoverArt";

type Article = {
  category: string;
  headline: string;
  author: string;
  read: string;
  stars: string;
  comments: string;
  newsletter: string;
};

/** An article card as readers see it: cover, title, author, then stars and comments coming in. */
export function ArticleScreen(): JSX.Element {
  const { t } = useTranslation("home");
  const a = t("tour.blog.screen.article", { returnObjects: true }) as Article;
  const { ref, step } = useSequence(4);
  return (
    <Screen title={t("tour.blog.screen.title")} label={t("tour.blog.screen.label")} screenRef={ref}>
      <CoverArt on={step >= 1} />
      <p class="m-0 text-caption font-semibold text-accent">{a.category}</p>
      <p class="m-0 text-h3 font-semibold">{a.headline}</p>
      <div class="flex items-center gap-3">
        <Avatar name={a.author} />
        <span class="text-caption text-ink-2">
          {t("tour.blog.screen.article.byline", { author: a.author, read: a.read })}
        </span>
      </div>
      <div class="flex flex-wrap gap-x-6 gap-y-1 text-caption">
        <Line tone="ok" on={step >= 2}>
          <Star size={14} aria-hidden="true" class="mr-1 inline align-[-2px]" />
          {a.stars}
        </Line>
        <Line tone="muted" on={step >= 3}>
          <MessageSquare size={14} aria-hidden="true" class="mr-1 inline align-[-2px]" />
          {a.comments}
        </Line>
      </div>
      <Line tone="muted" on={step >= 4}>
        {a.newsletter}
      </Line>
    </Screen>
  );
}
