import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import dashboard from "../apps/web/src/pages/dashboard/locales/fr.json" with { type: "json" };
import discussions from "../apps/web/src/pages/discussions/locales/fr.json" with { type: "json" };
import moderation from "../apps/web/src/pages/moderation/locales/fr.json" with { type: "json" };
import requests from "../apps/web/src/pages/requests/locales/fr.json" with { type: "json" };
import routes from "../apps/web/src/pages/routes/locales/fr.json" with { type: "json" };
import { promoteAdmin, resetRateLimits } from "./admin.js";
import { newMember } from "./members.js";
import { mailMentioning } from "./outbox.js";

test.beforeEach(() => resetRateLimits());

const stampOf = () => `${String(Date.now())}-${test.info().project.name}`;

async function handleOf(page: Page): Promise<string> {
  const me = await page.request.get("/v1/me");
  return ((await me.json()) as { data: { handle: string } }).data.handle;
}

async function pointsShown(page: Page, handle: string, points: number): Promise<void> {
  await page.goto(`/fr/members/${handle}`);
  await expect(page.locator("dd", { hasText: new RegExp(`^${String(points)}$`) })).toBeVisible();
}

async function openThread(page: Page, title: string, topic: string): Promise<void> {
  await page.goto("/fr/discussions/new");
  const main = page.getByRole("main");
  await main.getByLabel(discussions.form.title, { exact: true }).fill(title);
  await main
    .getByLabel(discussions.form.content, { exact: true })
    .fill("Comment estimer un taux ?");
  await main.getByLabel(discussions.form.topic, { exact: true }).selectOption(topic);
  await page.getByRole("button", { name: discussions.form.submit }).click();
  await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
}

test("a thread outside integrations gets a reply, the author accepts it, the points move", async ({
  browser,
}) => {
  test.setTimeout(90_000);
  const stamp = stampOf();
  const title = `Taux journalier en freelance ${stamp}`;
  const asker = await newMember(browser, `asker-${stamp}`);
  await openThread(asker, title, "career");
  const url = asker.url();

  const helper = await newMember(browser, `helper-${stamp}`);
  await helper.goto(url);
  await helper.getByLabel(discussions.reply.label).fill("Partez de vos charges, divisez par 15.");
  await helper.getByRole("button", { name: discussions.reply.submit, exact: true }).click();
  await expect(helper.getByText("Partez de vos charges, divisez par 15.")).toBeVisible();
  const handle = await handleOf(helper);
  await pointsShown(helper, handle, 0);

  await asker.reload();
  await asker.getByRole("button", { name: discussions.reply.accept }).click();
  await expect(asker.getByText(discussions.reply.accepted, { exact: true })).toBeVisible();
  await expect(asker.getByRole("link", { name: discussions.detail.transform })).toBeVisible();
  await pointsShown(helper, handle, 5);
  await helper.goto("/fr/ranking");
  await expect(helper.getByRole("link", { name: handle, exact: true })).toBeVisible();
});

test("a question asked from a route masks the key pasted in it", async ({ browser }) => {
  test.setTimeout(90_000);
  const stamp = stampOf();
  const author = await newMember(browser, `route-author-${stamp}`);
  await author.goto("/fr/routes/new");
  const main = author.getByRole("main");
  await main.getByLabel(routes.editor.title, { exact: true }).fill(`Wave Checkout en PHP ${stamp}`);
  await main.getByLabel(routes.editor.service, { exact: true }).selectOption("wave");
  await main.getByLabel(routes.editor.country, { exact: true }).selectOption("SN");
  await main.getByLabel(routes.editor.stack, { exact: true }).selectOption("laravel");
  await author.getByRole("button", { name: routes.editor.submitCreate }).click();
  await expect(
    author.getByRole("heading", { level: 1, name: `Wave Checkout en PHP ${stamp}` }),
  ).toBeVisible();
  const routeUrl = author.url();

  const asker = await newMember(browser, `route-asker-${stamp}`);
  await asker.goto(routeUrl);
  await asker.getByRole("link", { name: routes.detail.notWorking }).click();
  await expect(
    asker.getByRole("heading", { level: 1, name: discussions.form.headingRoute }),
  ).toBeVisible();
  const secret = "YhUNAUh7SY8w2A4gBLGTEVR3RkQhWaWZ";
  const form = asker.getByRole("main");
  await form.getByLabel(discussions.form.title, { exact: true }).fill(`Erreur 401 Wave ${stamp}`);
  await form.getByLabel(discussions.form.content, { exact: true }).fill("Le checkout répond 401.");
  await form
    .getByLabel(discussions.form.codeText)
    .fill(`Authorization: Bearer wave_sn_prod_${secret}`);
  await expect(asker.getByText("1 secret masqué avant publication.")).toBeVisible();
  await asker.getByRole("button", { name: discussions.form.submit }).click();
  await expect(
    asker.getByRole("heading", { level: 1, name: `Erreur 401 Wave ${stamp}` }),
  ).toBeVisible();
  await expect(asker.getByRole("main")).not.toContainText(secret);
  await expect(asker.getByRole("main")).toContainText("Authorization: Bearer ••••••••");

  await asker.goto(routeUrl);
  const questions = asker.getByRole("region", { name: routes.questions.heading });
  await expect(questions.getByRole("link", { name: `Erreur 401 Wave ${stamp}` })).toBeVisible();
});

test("a proposed service is accepted by the team and the member is told", async ({ browser }) => {
  test.setTimeout(90_000);
  const stamp = stampOf();
  const name = `Pay ${stamp}`;
  const member = await newMember(browser, `proposer-${stamp}`);
  await member.goto("/fr/services/propose");
  const form = member.getByRole("main");
  await form.getByLabel(requests.propose.name).fill(name);
  await form.getByLabel(requests.propose.category).selectOption("payment");
  await form.getByLabel(requests.propose.country, { exact: true }).selectOption("TZ");
  await form.getByLabel(requests.propose.docsUrl).fill("https://developer.example.com/pay");
  await member.getByRole("button", { name: requests.propose.submit }).click();
  await expect(member.getByRole("heading", { name: requests.propose.sentTitle })).toBeVisible();

  const admin = await newMember(browser, `admin-${stamp}`);
  await promoteAdmin(`admin-${stamp}`);
  await admin.goto("/fr/admin/moderation");
  const row = admin.getByRole("listitem").filter({ hasText: name });
  await row.getByRole("button", { name: moderation.proposals.accept }).click();
  await expect(row).toHaveCount(0);

  await mailMentioning(`e2e-proposer-${stamp}@example.com`, name);
  await member.goto("/fr/dashboard");
  const mine = member.getByRole("region", { name: dashboard.proposals.heading });
  await expect(mine.getByText(dashboard.proposals.status.accepted)).toBeVisible();
  await mine.getByRole("link", { name }).click();
  await expect(member.getByRole("heading", { level: 1, name })).toBeVisible();
});

test("a member votes for a simulator and the request enters the public ranking", async ({
  browser,
}) => {
  const member = await newMember(browser, `voter-${stampOf()}`);
  await member.goto("/fr/services/moov-money");
  const vote = member.getByRole("button", { name: requests.vote.ask });
  const withdraw = member.getByRole("button", { name: requests.vote.withdraw });
  if (await withdraw.isVisible()) await withdraw.click();
  await vote.click();
  await expect(withdraw).toBeVisible();
  await member.getByRole("link", { name: requests.vote.ranking }).click();
  await expect(
    member.getByRole("heading", { level: 1, name: requests.ranking.title }),
  ).toBeVisible();
  await expect(member.getByRole("link", { name: "Moov Money" })).toBeVisible();
});
