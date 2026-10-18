import { test, type Page } from "@playwright/test";

export { test };

export async function openModal(page: Page): Promise<void> {
  // The header trigger is available on every route and viewport; homepage page
  // one deliberately omits the floating contact button.
  await page.locator('[data-contact-open="header"]').click();
  await page.locator("#contact_modal").waitFor({ state: "visible" });
}

export async function fillContactForm(page: Page, name = "E2E Tester", email = "e2e@test.local"): Promise<void> {
  await page.locator("#form__name").fill(name);
  await page.locator("#form_email").fill(email);
  await page.locator("#form_msg").fill("Hallo Florian, das ist eine Testnachricht aus den E2E-Tests.");
}

export async function closeModal(page: Page): Promise<void> {
  await page.locator('#contact_modal form[method="dialog"] button').click();
  await page.locator("#contact_modal").waitFor({ state: "hidden" });
}
