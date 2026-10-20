import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { currentLanguage, format, locale, path } from "./i18n.js";
import { resetRateLimits } from "./admin.js";
import { expectNoSidewaysScroll } from "./layout.js";
import { stampOf } from "./itineraries.js";
import { newMember } from "./members.js";

test.beforeEach(() => resetRateLimits());

async function callTool(page: Page, token: string, name: string) {
  const response = await page.request.post(`/mcp?lang=${currentLanguage()}`, {
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
  await page.goto(path("/docs"));
  await expect(page.getByRole("heading", { level: 1, name: locale("docs").title })).toBeVisible();
  await expectNoSidewaysScroll(page);
  await page.getByRole("tab", { name: "Claude Code" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: "Cursor" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByText('"mcpServers"').first()).toBeVisible();
  await expect(page.getByRole("heading", { level: 3, name: "Wave" })).toBeVisible();
});

test("a member creates an MCP token, copies the configuration, and loses access on revoke", async ({
  browser,
}) => {
  const settings = locale("settings");
  const page = await newMember(browser, `mcp-${stampOf(test.info().project.name)}`);
  await page.goto(`${path("/settings")}#tokens`);
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
  await page
    .getByRole("button", { name: format(settings.tokens.revokeLabel, { name: "Portable" }) })
    .click();
  await page.getByRole("dialog").getByRole("button", { name: settings.tokens.revoke }).click();
  await expect(page.getByText(settings.tokens.emptyTitle)).toBeVisible();
  const refused = await callTool(page, token, "list_services");
  expect(refused.result.isError).toBe(true);
});
