import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import docs from "../apps/web/src/pages/docs/locales/fr.json" with { type: "json" };
import settings from "../apps/web/src/pages/settings/locales/fr.json" with { type: "json" };
import { resetRateLimits } from "./admin.js";
import { newMember } from "./members.js";

test.beforeEach(() => resetRateLimits());

const stampOf = () => `${String(Date.now())}-${test.info().project.name}`;

async function callTool(page: Page, token: string, name: string) {
  const response = await page.request.post("/mcp?lang=fr", {
    headers: {
      authorization: `Bearer ${token}`,
      accept: "application/json, text/event-stream",
      "content-type": "application/json",
    },
    data: { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: {} } },
  });
  return (await response.json()) as { result: { isError?: boolean; content: { text: string }[] } };
}

test("the documentation reads at any width and its editor tabs work with the keyboard", async ({
  page,
}) => {
  await page.goto("/fr/docs");
  await expect(page.getByRole("heading", { level: 1, name: docs.title })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
  await page.getByRole("tab", { name: "Claude Code" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: "Cursor" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByText('"mcpServers"').first()).toBeVisible();
  await expect(page.getByRole("heading", { level: 3, name: "Wave" })).toBeVisible();
});

test("a member creates an MCP token, copies the configuration, and loses access on revoke", async ({
  browser,
}) => {
  const page = await newMember(browser, `mcp-${stampOf()}`);
  await page.goto("/fr/settings#tokens");
  const main = page.getByRole("main");
  await main.getByLabel(settings.tokens.name).fill("Portable");
  await page.getByRole("button", { name: settings.tokens.submit }).click();
  await expect(page.getByRole("heading", { name: settings.tokens.configTitle })).toBeVisible();
  const token = (await main.locator("pre").first().textContent())?.trim() ?? "";
  expect(token).toMatch(/^ovp_/);
  await expect(main.getByText(`Bearer ${token}`).first()).toBeAttached();

  const served = await callTool(page, token, "list_services");
  expect(served.result.isError).toBeFalsy();
  expect(served.result.content[0]?.text).toContain("<overpass_data");

  await page.getByRole("button", { name: settings.tokens.dismiss }).click();
  await page.getByRole("button", { name: `Révoquer le jeton Portable` }).click();
  await page.getByRole("dialog").getByRole("button", { name: settings.tokens.revoke }).click();
  await expect(page.getByText(settings.tokens.emptyTitle)).toBeVisible();
  const refused = await callTool(page, token, "list_services");
  expect(refused.result.isError).toBe(true);
});
