import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { format, locale, path } from "./i18n.js";
import { promoteAdmin, resetRateLimits } from "./admin.js";
import { publishRoute, stampOf } from "./itineraries.js";
import { emailOf, handleOf, newMember } from "./members.js";
import { mailMentioning } from "./outbox.js";

test.beforeEach(() => resetRateLimits());

const stamp = () => stampOf(test.info().project.name);

async function pointsShown(page: Page, handle: string, points: number): Promise<void> {
  await page.goto(path(`/members/${handle}`));
  await expect(page.locator("dd", { hasText: new RegExp(`^${String(points)}$`) })).toBeVisible();
}

async function openThread(page: Page, title: string, topic: string): Promise<void> {
  const discussions = locale("discussions");
  await page.goto(path("/discussions/new"));
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
  const discussions = locale("discussions");
  const run = stamp();
  const title = `Taux journalier en freelance ${run}`;
  const asker = await newMember(browser, `asker-${run}`);
  await openThread(asker, title, "career");
  const url = asker.url();

  const helper = await newMember(browser, `helper-${run}`);
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
  await helper.goto(path("/ranking"));
  await expect(helper.getByRole("link", { name: handle, exact: true })).toBeVisible();
});

test("a question asked from a route masks the key pasted in it", async ({ browser }) => {
  test.setTimeout(90_000);
  const [discussions, routes] = [locale("discussions"), locale("routes")];
  const run = stamp();
  const author = await newMember(browser, `route-author-${run}`);
  const routeUrl = await publishRoute(author, `Wave Checkout en PHP ${run}`, "SN");

  const asker = await newMember(browser, `route-asker-${run}`);
  await asker.goto(routeUrl);
  await asker.getByRole("link", { name: routes.detail.notWorking }).click();
  await expect(
    asker.getByRole("heading", { level: 1, name: discussions.form.headingRoute }),
  ).toBeVisible();
  const secret = "YhUNAUh7SY8w2A4gBLGTEVR3RkQhWaWZ";
  const form = asker.getByRole("main");
  await form.getByLabel(discussions.form.title, { exact: true }).fill(`Erreur 401 Wave ${run}`);
  await form.getByLabel(discussions.form.content, { exact: true }).fill("Le checkout répond 401.");
  await form
    .getByLabel(discussions.form.codeText)
    .fill(`Authorization: Bearer wave_sn_prod_${secret}`);
  await expect(asker.getByText(format(discussions.form.masked_one, { count: 1 }))).toBeVisible();
  await asker.getByRole("button", { name: discussions.form.submit }).click();
  await expect(
    asker.getByRole("heading", { level: 1, name: `Erreur 401 Wave ${run}` }),
  ).toBeVisible();
  await expect(asker.getByRole("main")).not.toContainText(secret);
  await expect(asker.getByRole("main")).toContainText("Authorization: Bearer ••••••••");

  await asker.goto(routeUrl);
  const questions = asker.getByRole("region", { name: routes.questions.heading });
  await expect(questions.getByRole("link", { name: `Erreur 401 Wave ${run}` })).toBeVisible();
});

async function proposeService(member: Page, name: string): Promise<void> {
  const requests = locale("requests");
  await member.goto(path("/services/propose"));
  const form = member.getByRole("main");
  await form.getByLabel(requests.propose.name).fill(name);
  await form.getByLabel(requests.propose.category).selectOption("payment");
  await form.getByLabel(requests.propose.country, { exact: true }).selectOption("TZ");
  await form.getByLabel(requests.propose.docsUrl).fill("https://developer.example.com/pay");
  await member.getByRole("button", { name: requests.propose.submit }).click();
  await expect(member.getByRole("heading", { name: requests.propose.sentTitle })).toBeVisible();
}

test("a proposed service is accepted by the team and the member is told", async ({ browser }) => {
  test.setTimeout(90_000);
  const [admin, dashboard] = [locale("admin"), locale("dashboard")];
  const run = stamp();
  const name = `Pay ${run}`;
  const member = await newMember(browser, `proposer-${run}`);
  await proposeService(member, name);

  const team = await newMember(browser, `admin-${run}`);
  await promoteAdmin(`admin-${run}`);
  await team.goto(path("/admin"));
  const row = team.getByRole("listitem").filter({ hasText: name });
  await row.getByRole("button", { name: admin.proposals.accept }).click();
  await expect(row).toHaveCount(0);

  await mailMentioning(emailOf(`proposer-${run}`), name);
  await member.goto(path("/dashboard"));
  const mine = member.getByRole("region", { name: dashboard.proposals.heading });
  await expect(mine.getByText(dashboard.proposals.status.accepted)).toBeVisible();
  await mine.getByRole("link", { name }).click();
  await expect(member.getByRole("heading", { level: 1, name })).toBeVisible();
});

test("a member votes for a simulator and the request enters the public ranking", async ({
  browser,
}) => {
  const requests = locale("requests");
  const member = await newMember(browser, `voter-${stamp()}`);
  await member.goto(path("/services/moov-money"));
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
