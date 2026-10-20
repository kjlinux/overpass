import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { locale, path } from "./i18n.js";
import { promoteAdmin, resetRateLimits } from "./admin.js";
import { stampOf } from "./itineraries.js";
import { handleOf, newMember } from "./members.js";

test.beforeEach(() => resetRateLimits());

const blog = () => locale("blog");

async function publish(page: Page, title: string): Promise<void> {
  const { editor } = blog();
  await page.goto(path("/blog/write"));
  const main = page.getByRole("main");
  await main.getByLabel(editor.title, { exact: true }).fill(title);
  await main.getByLabel(editor.summary, { exact: true }).fill("Le parcours complet.");
  await main.getByLabel(editor.content, { exact: true }).fill("## Étapes\n\nUne clé de test.");
  await main.getByRole("button", { name: editor.publish, exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
  // The published article must stay in the language the author wrote from.
  await expect(page).toHaveURL(new RegExp(`${path("/blog/")}[^/]+$`));
}

/** The title of the first post in a reader's For me feed. */
async function firstOfForMe(page: Page) {
  await page.goto(`${path("/blog")}?feed=forme`);
  return page.getByRole("main").locator("li a.text-h3").first();
}

async function followAuthor(reader: Page, handle: string): Promise<void> {
  const texts = blog().blog;
  await reader.goto(path(`/blog/@${handle}`));
  await reader.getByRole("button", { name: texts.follow, exact: true }).click();
  await expect(reader.getByRole("button", { name: texts.unfollow, exact: true })).toBeVisible();
}

async function commentAndStar(reader: Page, articleUrl: string): Promise<void> {
  const { article, comments } = blog();
  await reader.goto(articleUrl);
  await reader.getByLabel(comments.label, { exact: true }).fill("Merci pour le pas à pas.");
  await reader.getByRole("button", { name: comments.submit }).click();
  await expect(reader.getByText("Merci pour le pas à pas.")).toBeVisible();
  await reader.getByRole("button", { name: new RegExp(article.star) }).click();
  const unstar = reader.getByRole("button", { name: new RegExp(article.unstar) });
  await expect(unstar).toHaveAttribute("aria-pressed", "true");
}

async function report(reader: Page, articleUrl: string): Promise<void> {
  const { article } = blog();
  await reader.goto(articleUrl);
  await reader.getByRole("button", { name: article.report, exact: true }).click();
  await reader.getByRole("dialog").getByRole("button", { name: article.report }).click();
  await expect(reader.getByText(article.reported)).toBeVisible();
}

test("publish, follow, comment, star, lead the For me feed, then the admin hides the post", async ({
  browser,
}) => {
  test.setTimeout(120_000);
  const admin = locale("admin");
  const stamp = stampOf(test.info().project.name);
  const title = `Encaisser avec Wave ${stamp}`;
  const author = await newMember(browser, `blog-author-${stamp}`);
  await publish(author, title);
  const articleUrl = author.url();
  const reader = await newMember(browser, `blog-reader-${stamp}`);
  await followAuthor(reader, await handleOf(author));
  await commentAndStar(reader, articleUrl);
  await expect(await firstOfForMe(reader)).toHaveText(title);
  await report(reader, articleUrl);

  const team = await newMember(browser, `blog-admin-${stamp}`);
  await promoteAdmin(`blog-admin-${stamp}`);
  await team.goto(path("/admin"));
  await team.getByLabel(admin.kindFilter.label).selectOption("post");
  const row = team.getByRole("listitem").filter({ hasText: title });
  await row.getByRole("button", { name: admin.decision.hide, exact: true }).click();
  await team.getByRole("dialog").getByRole("button", { name: admin.decision.hide }).click();
  await expect(row).toHaveCount(0);
  await team.getByLabel(admin.stateFilter.label).selectOption("hidden");
  await expect(row.getByText(admin.status.hidden, { exact: true })).toBeVisible();
  const feedLoaded = reader.waitForResponse((answer) =>
    answer.url().includes("/v1/posts?feed=forme"),
  );
  await reader.goto(`${path("/blog")}?feed=forme`);
  await feedLoaded;
  await expect(reader.getByRole("main").getByRole("link", { name: title })).toHaveCount(0);
});
