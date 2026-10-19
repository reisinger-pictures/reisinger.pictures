import { expect } from "@playwright/test";

import { test } from "./helpers";

// The Akt guide page (/akt/ablauf/) always existed, but it was reachable only
// through the inline word "hier" inside the body copy — practically
// undiscoverable. Since 2026-10-19 the route block of the private offer pages
// carries the entry explicitly (owner decision, rules/09-shooting-areas.md).

test("links the Akt guide from the route block and from the body copy", async ({ page }) => {
  await page.goto("/shootings/akt/");

  const routeBlock = page.locator('aside[aria-labelledby="weg-zum-shooting"]');
  const guide = routeBlock.getByRole("link", { name: "Ablauf-Leitfaden" });
  await expect(guide).toBeVisible();
  await expect(guide).toHaveAttribute("href", "/akt/ablauf/");

  const inline = page.locator("article").first().getByRole("link", { name: "Ablauf-Leitfaden" });
  await expect(inline).toHaveCount(1);
  await expect(inline).toHaveAttribute("href", "/akt/ablauf/");

  await guide.click();
  await expect(page).toHaveURL(/\/akt\/ablauf\/?$/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("keeps the other private offers free of a guide entry", async ({ page }) => {
  for (const area of ["beauty", "couples"]) {
    await page.goto(`/shootings/${area}/`);
    await expect(page.locator('aside[aria-labelledby="weg-zum-shooting"]').getByRole("link", { name: "Ablauf-Leitfaden" })).toHaveCount(0);
  }
});
