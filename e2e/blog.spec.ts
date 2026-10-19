import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import admin from "../apps/web/src/pages/admin/locales/fr.json" with { type: "json" };
import blog from "../apps/web/src/pages/blog/locales/fr.json" with { type: "json" };
import { promoteAdmin, resetRateLimits } from "./admin.js";
import { newMember } from "./members.js";

test.beforeEach(() => resetRateLimits());

const stampOf = () => `${String(Date.now())}-${test.info().project.name}`;

async function handleOf(page: Page): Promise<string> {
  const me = await page.request.get("/v1/me");
  return ((await me.json()) as { data: { handle: string } }).data.handle;
}

async function publish(page: Page, title: string): Promise<void> {
  await page.goto("/fr/blog/write");
  const main = page.getByRole("main");
  await main.getByLabel(blog.editor.title, { exact: true }).fill(title);
  await main.getByLabel(blog.editor.summary, { exact: true }).fill("Le parcours complet.");
  await main.getByLabel(blog.editor.content, { exact: true }).fill("## Étapes\n\nUne clé de test.");
  await main.getByRole("button", { name: blog.editor.publish, exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
}

/** The title of the first post in a reader's For me feed. */
async function firstOfForMe(page: Page) {
  await page.goto("/fr/blog?feed=forme");
  return page.getByRole("main").locator("li a.text-h3").first();
}

async function followAuthor(reader: Page, handle: string): Promise<void> {
  await reader.goto(`/fr/blog/@${handle}`);
  await reader.getByRole("button", { name: blog.blog.follow, exact: true }).click();
  await expect(reader.getByRole("button", { name: blog.blog.unfollow, exact: true })).toBeVisible();
}

async function commentAndStar(reader: Page, articleUrl: string): Promise<void> {
  await reader.goto(articleUrl);
  await reader.getByLabel(blog.comments.label, { exact: true }).fill("Merci pour le pas à pas.");
  await reader.getByRole("button", { name: blog.comments.submit }).click();
  await expect(reader.getByText("Merci pour le pas à pas.")).toBeVisible();
  await reader.getByRole("button", { name: new RegExp(blog.article.star) }).click();
  const unstar = reader.getByRole("button", { name: new RegExp(blog.article.unstar) });
  await expect(unstar).toHaveAttribute("aria-pressed", "true");
}

async function report(reader: Page, articleUrl: string): Promise<void> {
  await reader.goto(articleUrl);
  await reader.getByRole("button", { name: blog.article.report, exact: true }).click();
  await reader.getByRole("dialog").getByRole("button", { name: blog.article.report }).click();
  await expect(reader.getByText(blog.article.reported)).toBeVisible();
}

test("publish, follow, comment, star, lead the For me feed, then the admin hides the post", async ({
  browser,
}) => {
  test.setTimeout(120_000);
  const stamp = stampOf();
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
  await team.goto("/fr/admin");
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
  await reader.goto("/fr/blog?feed=forme");
  await feedLoaded;
  await expect(reader.getByRole("main").getByRole("link", { name: title })).toHaveCount(0);
});
