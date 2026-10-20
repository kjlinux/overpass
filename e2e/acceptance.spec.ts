import { expect, test } from "@playwright/test";
import { resetRateLimits } from "./admin.js";
import { publishRoute, stampOf, verifyRoute } from "./itineraries.js";
import { confirmSignUp, emailOf, newMember, signUp } from "./members.js";

const fiveMinutesMs = 5 * 60_000;

test.beforeEach(() => resetRateLimits());

test("a new member publishes an itinerary and verifies another one in less than 5 minutes", async ({
  browser,
  page,
}) => {
  test.setTimeout(fiveMinutesMs + 120_000);
  const stamp = stampOf(test.info().project.name);
  const other = await newMember(browser, `other-author-${stamp}`);
  const otherUrl = await publishRoute(other, `Wave à vérifier ${stamp}`);

  const startedAt = Date.now();
  await signUp(page, emailOf(`newcomer-${stamp}`));
  await confirmSignUp(page, emailOf(`newcomer-${stamp}`));
  await publishRoute(page, `Ma première fiche Wave ${stamp}`);
  await verifyRoute(page, otherUrl);
  const elapsedMs = Date.now() - startedAt;

  test.info().annotations.push({ type: "elapsed", description: `${String(elapsedMs)} ms` });
  expect(elapsedMs).toBeLessThan(fiveMinutesMs);
});
