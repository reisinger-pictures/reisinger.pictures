import { expect, type Page } from "@playwright/test";
import { formatExactPrice, roundToPsychologicalValue } from "@reisinger/shared/utils";
import {
  basePrice,
  flexBasePrice,
  flexImagesIncluded,
  flexPrivacyBase,
  flexPrivacyPerImage,
  hourlyRate,
  standardImagePriceOutdoor,
} from "@reisinger/shared/utils/pricing";

import { test } from "./helpers";

// Copy phrase that marks the discount/Flex publication condition. It is the
// same wording used by the on-screen note and the contact request message, so a
// single constant keeps the assertions honest when the copy is reworded.
const PUBLICATION_CONDITION = "Freigabe ausgewählter Bilder zur Veröffentlichung";

// PricingCalculatorProfi default for "2. Bild-Anzahl" (1 h, outdoor).
const STANDARD_DEFAULT_IMAGES = 15;

/** Intercepts the external form endpoint and returns a POST counter (never a real request). */
async function guardExternalForm(page: Page): Promise<() => number> {
  let posts = 0;
  await page.route("**/form.reisinger.pictures/**", (route) => {
    posts += 1;
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
  });
  return () => posts;
}

/** Reads the psychological total rendered by the active calculator. */
async function readPrice(page: Page): Promise<number> {
  const text = await page.getByTestId("pricing-total").innerText();
  return Number(text.replace(/\D/g, ""));
}

/** Clicks a calculator CTA (opens the modal, never navigates) and returns the request message. */
async function openRequestMessage(page: Page, ctaName: string): Promise<string> {
  await page.getByRole("link", { name: ctaName }).click();
  await expect(page.locator("#contact_modal")).toBeVisible();
  return page.locator("#form_msg").inputValue();
}

/**
 * Navigates to the pricing page and waits until the `client:load` PricingTabs
 * island is hydrated (the SSR HTML renders the tabs, so a plain visibility
 * check would race the click below).
 */
async function gotoPricing(page: Page, query = ""): Promise<void> {
  await page.goto(`/preise/${query}`);
  await page.waitForLoadState("networkidle");
  await expect(page.getByTestId("pricing-total")).toBeVisible();
  await page.waitForTimeout(200);
}

test("shows the Standard and Flex tabs and starts on the Standard calculator", async ({ page }) => {
  await gotoPricing(page);

  const standardTab = page.getByRole("tab", { name: "Standard" });
  const flexTab = page.getByRole("tab", { name: "Flex" });
  await expect(standardTab).toBeVisible();
  await expect(flexTab).toBeVisible();
  await expect(standardTab).toHaveAttribute("aria-selected", "true");

  // Standard calculator is rendered; the Flex-only Act option is not.
  await expect(page.getByTestId("pricing-total")).toBeVisible();
  await expect(page.getByRole("button", { name: /Akt & Boudoir/ })).toHaveCount(0);

  await flexTab.click();
  await expect(flexTab).toHaveAttribute("aria-selected", "true");
  await expect(standardTab).toHaveAttribute("aria-selected", "false");
  await expect(page.getByRole("button", { name: /Akt & Boudoir/ })).toBeVisible();
});

test("Standard without a discount shows no publication condition and keeps the price math", async ({ page }) => {
  const posts = await guardExternalForm(page);
  await gotoPricing(page);

  // No discount -> no dynamic publication condition.
  await expect(page.getByTestId("discount-publication-condition")).toHaveCount(0);

  // Existing totals are not altered: the UI equals the shared pricing formula.
  const expected = roundToPsychologicalValue(basePrice + 1 * hourlyRate + STANDARD_DEFAULT_IMAGES * standardImagePriceOutdoor);
  await expect(page.getByTestId("pricing-total")).toHaveText(`${expected} €`);

  const msg = await openRequestMessage(page, "Angebot anfragen");
  expect(msg).not.toContain(PUBLICATION_CONDITION);
  expect(msg).not.toContain("Freigabe");
  expect(posts()).toBe(0);
});

test("Standard student discount adds the publication condition to note and request", async ({ page }) => {
  const posts = await guardExternalForm(page);
  await gotoPricing(page);

  await page.getByRole("checkbox", { name: /Studenten-Rabatt/ }).check();

  const note = page.getByTestId("discount-publication-condition");
  await expect(note).toBeVisible();
  await expect(note).toContainText(PUBLICATION_CONDITION);

  const msg = await openRequestMessage(page, "Angebot anfragen");
  expect(msg).toContain("Studenten-Rabatt");
  expect(msg).toContain(PUBLICATION_CONDITION);
  expect(posts()).toBe(0);
});

test("Standard friend discount (referral link) also requires publication", async ({ page }) => {
  const posts = await guardExternalForm(page);
  await gotoPricing(page, "?code=friend");

  const friend = page.getByRole("checkbox", { name: /Freunde-Rabatt/ });
  await expect(friend).toBeVisible();
  await friend.check();

  await expect(page.getByTestId("discount-publication-condition")).toBeVisible();

  const msg = await openRequestMessage(page, "Angebot anfragen");
  expect(msg).toContain("Freunde-Rabatt");
  expect(msg).toContain(PUBLICATION_CONDITION);
  expect(posts()).toBe(0);
});

test("Flex states the private / no-commercial scope and the agreed-publication condition", async ({ page }) => {
  const posts = await guardExternalForm(page);
  await gotoPricing(page);
  await page.getByRole("tab", { name: "Flex" }).click();

  const rights = page.getByTestId("flex-usage-rights");
  await expect(rights).toContainText("ohne kommerzielle Nutzung");
  await expect(rights).toContainText(PUBLICATION_CONDITION);

  expect(await readPrice(page)).toBe(roundToPsychologicalValue(flexBasePrice));

  const msg = await openRequestMessage(page, "Anfrage absenden");
  expect(msg).toContain("keine kommerzielle Nutzung");
  expect(msg).toContain(PUBLICATION_CONDITION);
  expect(msg).not.toContain("vollständig privat");
  expect(posts()).toBe(0);
});

test("Flex Act toggle reflects the 1:1 on-device exception in copy and request with a flat fee", async ({ page }) => {
  const posts = await guardExternalForm(page);
  await gotoPricing(page);
  await page.getByRole("tab", { name: "Flex" }).click();

  const baseTotal = await readPrice(page);
  expect(baseTotal).toBe(roundToPsychologicalValue(flexBasePrice));

  await page.getByRole("button", { name: /Akt & Boudoir/ }).click();
  await page.getByRole("checkbox", { name: /Online-Verbot/ }).check();

  // Copy: the in-calculator rights summary carries the exception …
  const rights = page.getByTestId("flex-usage-rights");
  await expect(rights).toContainText("Keine Online-Veröffentlichung");
  await expect(rights).toContainText("eigenen Geräten");

  // … and so does the (collapsed) privacy block.
  await page.getByText("Diskretion bei Akt & Boudoir").click();
  await expect(page.getByText(/eigenen Geräten/).first()).toBeVisible();

  // Fee: flat surcharge from the shared constant — same value in copy and math.
  const expectedOption = roundToPsychologicalValue(flexBasePrice + flexPrivacyBase + flexImagesIncluded * flexPrivacyPerImage);
  await expect.poll(() => readPrice(page)).toBe(expectedOption);
  await expect(page.getByText(formatExactPrice(flexPrivacyBase)).first()).toBeVisible();

  const msg = await openRequestMessage(page, "Anfrage absenden");
  expect(msg).toContain("keine Online-Veröffentlichung");
  expect(msg).toContain("1:1");
  expect(msg).toContain("eigenen Geräten");
  expect(msg).not.toContain(PUBLICATION_CONDITION);
  expect(posts()).toBe(0);
});
