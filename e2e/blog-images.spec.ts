import { expect, test } from "@playwright/test";
import { fileURLToPath } from "node:url";
import { locale, path } from "./i18n.js";
import { resetRateLimits } from "./admin.js";
import { stampOf } from "./itineraries.js";
import { newMember } from "./members.js";

test.beforeEach(() => resetRateLimits());

const image = fileURLToPath(new URL("../apps/web/public/apple-touch-icon.png", import.meta.url));

test("an author adds a cover and an image to an article, and readers see both", async ({
  browser,
}) => {
  test.setTimeout(90_000);
  const { editor } = locale("blog");
  const title = `Capture du simulateur ${stampOf(test.info().project.name)}`;
  const author = await newMember(browser, `blog-images-${stampOf(test.info().project.name)}`);
  await author.goto(path("/blog/write"));
  const main = author.getByRole("main");
  await main.getByLabel(editor.title, { exact: true }).fill(title);
  await main
    .getByLabel(editor.summary, { exact: true })
    .fill("Une capture vaut mieux qu'un long texte.");
  await main.getByLabel(editor.content, { exact: true }).fill("Le tableau de bord du simulateur.");
  await main.getByLabel(editor.cover, { exact: true }).setInputFiles(image);
  await expect(main.getByRole("button", { name: editor.coverRemove })).toBeVisible();
  await main.getByLabel(editor.imageAlt, { exact: true }).fill("Icône d'Overpass");
  await main.getByLabel(editor.imageFile, { exact: true }).setInputFiles(image);
  await expect(main.getByLabel(editor.content, { exact: true })).toHaveValue(/\/v1\/media\//);
  await main.getByRole("button", { name: editor.publish, exact: true }).click();
  await expect(author.getByRole("heading", { level: 1, name: title })).toBeVisible();
  const inline = author.getByRole("img", { name: "Icône d'Overpass" });
  await expect(inline).toBeVisible();
  expect(await inline.evaluate((node: HTMLImageElement) => node.naturalWidth)).toBeGreaterThan(0);
  await expect(author.locator("article img[src^='/v1/media/']")).toHaveCount(2);
});
