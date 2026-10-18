import { expect } from "@playwright/test";

import { test } from "./helpers";

// Die TFP-Übersicht (/tfp/) zeigt zunächst sechs Ideen und blendet den Rest
// über ein natives <details>/<summary> ein. Diese Spec prüft nur Verhalten
// (Sichtbarkeit, Tastatur, Links, Redirect, Kontakt-Prefill) und schickt
// niemals einen echten Netzwerk-POST.

const IDEA_LINKS = 'main a[href^="/tfp/"]';
const INITIAL_IDEA_COUNT = 6;

test("shows six ideas first and reveals the remaining ones on demand", async ({ page }) => {
  await page.goto("/tfp");

  const ideas = page.locator(IDEA_LINKS);
  const total = await ideas.count();
  expect(total).toBeGreaterThan(INITIAL_IDEA_COUNT);

  for (let index = 0; index < INITIAL_IDEA_COUNT; index += 1) {
    await expect(ideas.nth(index)).toBeVisible();
  }
  for (let index = INITIAL_IDEA_COUNT; index < total; index += 1) {
    await expect(ideas.nth(index)).toBeHidden();
  }

  const details = page.locator("main details");
  const summary = details.locator("summary");

  await expect(details).not.toHaveAttribute("open", "");
  await expect(summary).toContainText("Weitere Ideen");
  await expect(summary).toContainText(`(${total - INITIAL_IDEA_COUNT})`);
  await expect(page.locator("main")).not.toContainText("Resident");

  await summary.click();

  await expect(details).toHaveAttribute("open", "");
  for (let index = INITIAL_IDEA_COUNT; index < total; index += 1) {
    await expect(ideas.nth(index)).toBeVisible();
  }
});

test("keeps the idea disclosure keyboard operable with a visible focus ring", async ({ page }) => {
  await page.goto("/tfp");

  const details = page.locator("main details");
  const summary = details.locator("summary");

  await page.locator(IDEA_LINKS).nth(INITIAL_IDEA_COUNT - 1).focus();
  await page.keyboard.press("Tab");

  await expect(summary).toBeFocused();
  expect(await details.evaluate(element => getComputedStyle(element).outlineWidth)).toBe("2px");

  await page.keyboard.press("Enter");
  await expect(details).toHaveAttribute("open", "");

  await page.keyboard.press("Enter");
  await expect(details).not.toHaveAttribute("open", "");
});

test("links every idea to its own detail page and offers the paid alternative", async ({ page }) => {
  await page.goto("/tfp");

  const hrefs = await page.locator(IDEA_LINKS).evaluateAll(links => links.map(link => link.getAttribute("href") ?? ""));

  expect(new Set(hrefs).size).toBe(hrefs.length);
  expect(hrefs).not.toContain("/tfp/resident-model");
  for (const href of hrefs) {
    expect(href).toMatch(/^\/tfp\/[a-z0-9-]+$/);
  }

  await expect(page.locator('main a[href="/shootings/beauty/"]')).toBeVisible();
});

test("redirects the removed Resident Model URL to the overview", async ({ page }) => {
  for (const url of ["/tfp/resident-model", "/tfp/resident-model/"]) {
    await page.goto(url);

    await expect(page).toHaveURL(/\/tfp\/?$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("TFP Shootings in Linz");
  }
});

test("opens the contact form prefilled for an idea without sending a request", async ({ page }) => {
  let requests = 0;
  await page.route("**/form.reisinger.pictures/**", (route) => {
    requests += 1;
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
  });

  await page.goto("/tfp/in-home-lifestyle");
  await page.getByRole("link", { name: "Über diese Idee sprechen" }).click();

  await expect(page.locator("#contact_modal")).toBeVisible();
  await expect(page.locator("#form__subject_prefix")).toHaveValue("TFP");
  await expect(page.locator("#form_msg")).toHaveValue(/In-Home Lifestyle/);
  expect(requests).toBe(0);
});
