import { expect, type Page, test } from "@playwright/test";
import { formatExactPrice } from "@reisinger/shared/utils";
import { flexPrivacyBase } from "@reisinger/shared/utils/pricing";

/**
 * `window` instrumentation this spec installs itself (see `addInitScript`/`evaluate`).
 * `window` has no such properties, so reads must go through `unknown`.
 */
type InstrumentedWindow = {
  observedPricingTotals?: string[];
  modalPageLoads?: number;
};

async function openPricing(page: Page, query = "") {
  await page.goto(`/preise/${query}`);
  await expect(page.locator('[data-pricing-ready="true"]')).toBeVisible();
  await expect(page.getByTestId("pricing-total")).toBeVisible();
}

async function assertConfiguration(page: Page, tariff: "Standard" | "Flex", price: number) {
  await expect(page.getByRole("tab", { name: tariff, exact: true })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByTestId("pricing-total")).toHaveText(`${price} €`);
}

test.beforeEach(async ({ page }) => {
  // All form traffic is mocked even though none of these tests submits a form.
  await page.route("**/form.reisinger.pictures/**", route => route.fulfill({
    status: 200, contentType: "application/json", body: JSON.stringify({ ok: true })
  }));
});

test("canonical Flex link never renders the Standard total and survives reload", async ({ page }) => {
  await page.addInitScript(() => {
    const observed: string[] = [];
    Object.assign(window, { observedPricingTotals: observed });
    new MutationObserver(() => {
      document.querySelectorAll('[data-testid="pricing-total"]').forEach(element => {
        observed.push(element.textContent ?? "");
      });
    }).observe(document, { subtree: true, childList: true, characterData: true });
  });
  await openPricing(page, "?tarif=flex");
  await assertConfiguration(page, "Flex", 149);
  await page.waitForTimeout(350); // Old Standard serializer wrote after 250 ms.
  expect(new URL(page.url()).search).toBe("?tarif=flex");
  expect(await page.evaluate(() => (window as unknown as InstrumentedWindow).observedPricingTotals)).not.toContain("249 €");
  await page.reload();
  await assertConfiguration(page, "Flex", 149);
});

for (const example of [
  { query: "?tarif=standard&h=1&img=15&location=outdoor", tariff: "Standard", price: 249 },
  { query: "?h=1&img=15&location=indoor", tariff: "Standard", price: 329 },
  { query: "?h=1.5&img=15&location=outdoor", tariff: "Standard", price: 289 },
  { query: "?student=true", tariff: "Standard", price: 165 },
  { query: "?friend=true&code=friend", tariff: "Standard", price: 125 },
  { query: "?tarif=flex&setup=indoor", tariff: "Flex", price: 199 },
  { query: "?private=true&type=akt&tarif=flex", tariff: "Flex", price: 349 }
] as const) {
  test(`keeps ${example.price} € and settings on reload: ${example.query}`, async ({ page }) => {
    await openPricing(page, example.query);
    await assertConfiguration(page, example.tariff, example.price);
    await page.waitForTimeout(350);
    expect(new URL(page.url()).search).toBe(example.query);
    await page.reload();
    await assertConfiguration(page, example.tariff, example.price);
    if (example.query.includes("location=indoor")) {
      await expect(page.getByRole("button", { name: "Studio Indoor" })).toHaveAttribute("aria-pressed", "true");
    }
    if (example.query.includes("type=akt")) {
      await expect(page.getByRole("checkbox", { name: /Online-Verbot/ })).toBeChecked();
    }
  });
}

test("switching maps TOTAL images, retains own settings and preserves hash/unrelated keys", async ({ page }) => {
  await openPricing(page, "?h=2&img=20&location=indoor&type=couples&setup=indoor&utm_source=share&tag=one&tag=two#details");
  await page.getByRole("tab", { name: "Flex", exact: true }).click();
  await expect(page.getByRole("slider", { name: "Zusätzliche Bilder" })).toHaveValue("5");
  await expect(page.getByRole("button", { name: /Pärchen/ })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: /Indoor \(Fotostudio\)/ })).toHaveAttribute("aria-pressed", "true");
  let url = new URL(page.url());
  expect(url.searchParams.get("tarif")).toBe("flex");
  expect(url.searchParams.get("extra")).toBe("5");
  expect(url.searchParams.getAll("tag")).toEqual(["one", "two"]);
  expect(url.searchParams.get("utm_source")).toBe("share");
  expect(url.hash).toBe("#details");
  await page.getByRole("slider", { name: "Zusätzliche Bilder" }).fill("6");
  await page.getByRole("tab", { name: "Standard", exact: true }).click();
  await expect(page.getByRole("slider", { name: "Anzahl bearbeiteter Bilder" })).toHaveValue("21");
  await expect(page.getByRole("slider", { name: "Shooting-Dauer in Stunden" })).toHaveValue("2");
  await expect(page.getByRole("button", { name: "Studio Indoor" })).toHaveAttribute("aria-pressed", "true");
  url = new URL(page.url());
  expect(url.searchParams.get("tarif")).toBe("standard");
  expect(url.searchParams.get("img")).toBe("21");
  expect(url.searchParams.get("location")).toBe("indoor");
  expect(url.hash).toBe("#details");
  await page.reload();
  await expect(page.getByRole("slider", { name: "Anzahl bearbeiteter Bilder" })).toHaveValue("21");
});

test("back and forward restore URL-selected tariff and configuration without remapping", async ({ page }) => {
  await openPricing(page, "?img=20&location=indoor");
  await page.getByRole("tab", { name: "Flex", exact: true }).click();
  await page.getByRole("slider", { name: "Zusätzliche Bilder" }).fill("6");
  await page.getByRole("tab", { name: "Standard", exact: true }).click();
  await page.goBack();
  await expect(page.getByRole("tab", { name: "Flex", exact: true })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("slider", { name: "Zusätzliche Bilder" })).toHaveValue("6");
  await page.goBack();
  await expect(page.getByRole("slider", { name: "Anzahl bearbeiteter Bilder" })).toHaveValue("20");
  await page.goForward();
  await expect(page.getByRole("slider", { name: "Zusätzliche Bilder" })).toHaveValue("6");
  await page.goForward();
  await expect(page.getByRole("slider", { name: "Anzahl bearbeiteter Bilder" })).toHaveValue("21");
});

test("tab keyboard navigation and panel association are accessible", async ({ page }) => {
  await openPricing(page);
  const standard = page.getByRole("tab", { name: "Standard", exact: true });
  const flex = page.getByRole("tab", { name: "Flex", exact: true });
  await standard.focus();
  await standard.press("ArrowRight");
  await expect(flex).toBeFocused();
  await expect(flex).toHaveAttribute("tabindex", "0");
  await expect(standard).toHaveAttribute("tabindex", "-1");
  expect(await page.getByRole("tabpanel").getAttribute("id")).toBe(await flex.getAttribute("aria-controls"));
  await flex.press("Home");
  await expect(standard).toBeFocused();
  await standard.press("End");
  await expect(flex).toBeFocused();
  await flex.press("ArrowLeft");
  await expect(standard).toBeFocused();
});

test("invalid enums and NaN fall back to valid selections and finite prices", async ({ page }) => {
  await openPricing(page, "?tarif=garbage&h=NaN&img=Infinity&location=moon&student=yes&friend=true");
  await assertConfiguration(page, "Standard", 249);
  await expect(page.getByRole("slider", { name: "Shooting-Dauer in Stunden" })).toHaveValue("1");
  await expect(page.getByRole("slider", { name: "Anzahl bearbeiteter Bilder" })).toHaveValue("15");
  await expect(page.getByRole("button", { name: "Outdoor", exact: true })).toHaveAttribute("aria-pressed", "true");
  await openPricing(page, "?tarif=flex&extra=NaN&type=garbage&setup=moon&private=true");
  await assertConfiguration(page, "Flex", 149);
  await expect(page.getByRole("button", { name: /Portrait & Beauty/ })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: /Natürliches Licht/ })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("checkbox", { name: /Online-Verbot/ })).toHaveCount(0);
});

test("Flex Act detail makes no anonymity guarantee and shows the flat fee at the option", async ({ page }) => {
  let posts = 0;
  page.on("request", request => { if (request.method() === "POST") posts += 1; });
  await openPricing(page, "?tarif=flex&type=akt&private=true");

  // The flat fee is recognizable at the selection itself (derived from the shared constant).
  await expect(page.getByRole("checkbox", { name: /Online-Verbot/ })).toHaveAccessibleName(new RegExp(`\\+${flexPrivacyBase} €`));

  await page.getByText("Diskretion bei Akt & Boudoir").click();
  const portfolio = page.getByText(/Online-Portfolio-Modus/).locator("..");
  await expect(portfolio).toContainText("bewusste Entscheidung");
  await expect(portfolio).toContainText("nicht ausschließen");
  await expect(portfolio).not.toContainText("Anonymität");
  await expect(portfolio).not.toContainText("identifizierbar");
  await expect(portfolio).not.toContainText("kein Rückschluss");

  // The fee must not read like a price range (no dash glued to the amount).
  const hint = page.getByText(/festen Exklusiv-Aufpreis/);
  const hintText = await hint.innerText();
  expect(hintText).toContain(`${formatExactPrice(flexPrivacyBase)},`);
  expect(hintText).not.toMatch(new RegExp(`${formatExactPrice(flexPrivacyBase)}\\s*[–-]`));
  expect(posts).toBe(0);
});

test("out-of-range inputs are clamped to matching slider/price values", async ({ page }) => {
  await openPricing(page, "?h=-5&img=-3");
  await expect(page.getByRole("slider", { name: "Shooting-Dauer in Stunden" })).toHaveValue("1");
  await expect(page.getByRole("slider", { name: "Anzahl bearbeiteter Bilder" })).toHaveValue("1");
  await expect(page.getByTestId("pricing-total")).toHaveText("139 €");
  await openPricing(page, "?tarif=flex&extra=-30");
  await assertConfiguration(page, "Flex", 149);
  await expect(page.getByRole("slider", { name: "Zusätzliche Bilder" })).toHaveValue("0");
  await openPricing(page, "?tarif=flex&extra=9999");
  await assertConfiguration(page, "Flex", 599);
  await expect(page.getByRole("slider", { name: "Zusätzliche Bilder" })).toHaveValue("30");
});

test("interactive location/discount and Flex privacy changes persist immediately", async ({ page }) => {
  await openPricing(page);
  await page.getByRole("button", { name: "Studio Indoor" }).click();
  await assertConfiguration(page, "Standard", 329);
  await page.getByRole("checkbox", { name: /Studenten-Rabatt/ }).check();
  await assertConfiguration(page, "Standard", 219);
  expect(new URL(page.url()).searchParams.get("location")).toBe("indoor");
  expect(new URL(page.url()).searchParams.get("student")).toBe("true");
  await page.reload();
  await assertConfiguration(page, "Standard", 219);
  await page.getByRole("tab", { name: "Flex", exact: true }).click();
  await assertConfiguration(page, "Flex", 149);
  await page.getByRole("button", { name: /Akt & Boudoir/ }).click();
  await page.getByRole("checkbox", { name: /Online-Verbot/ }).check();
  await assertConfiguration(page, "Flex", 349);
  expect(new URL(page.url()).searchParams.get("private")).toBe("true");
  await page.reload();
  await assertConfiguration(page, "Flex", 349);
  await page.getByRole("button", { name: /Portrait & Beauty/ }).click();
  await assertConfiguration(page, "Flex", 149);
  expect(new URL(page.url()).searchParams.has("private")).toBe(false);
});

test("mobile Flex image count stays inside its label", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openPricing(page, "?tarif=flex&extra=30");
  const label = page.getByText("3. Zusätzlicher Bild-Nachschlag:", { exact: true }).locator("..");
  const bounds = await label.evaluate(element => {
    const parent = element.getBoundingClientRect();
    const counter = element.lastElementChild?.getBoundingClientRect();
    return { width: element.clientWidth, scrollWidth: element.scrollWidth, right: parent.right, counterRight: counter?.right ?? Infinity };
  });
  expect(bounds.scrollWidth).toBeLessThanOrEqual(bounds.width);
  expect(bounds.counterRight).toBeLessThanOrEqual(bounds.right + 1);
});

test("configured Flex inquiry opens/closes without losing tariff, config or price (zero POSTs)", async ({ page }) => {
  let posts = 0;
  page.on("request", request => { if (request.method() === "POST") posts += 1; });
  await openPricing(page, "?tarif=flex&type=akt&private=true&utm_source=inquiry#details");
  await assertConfiguration(page, "Flex", 349);
  await page.evaluate(() => {
    const trackedWindow = window as unknown as InstrumentedWindow;
    trackedWindow.modalPageLoads = 0;
    document.addEventListener("astro:page-load", () => { trackedWindow.modalPageLoads = (trackedWindow.modalPageLoads ?? 0) + 1; });
  });
  await page.getByRole("link", { name: "Anfrage absenden" }).click();
  await expect(page.locator("#contact_modal")).toBeVisible();
  const message = await page.locator("#form_msg").inputValue();
  expect(message).toContain("349 €");
  expect(message).toContain("Akt & Boudoir");
  expect(message).toContain("keine Online-Veröffentlichung");
  expect(message).toContain("eigenen Geräten");
  expect(new URL(page.url()).searchParams.get("tarif")).toBe("flex");
  await page.locator('#contact_modal form[method="dialog"] button').click();
  await expect(page.locator("#contact_modal")).toBeHidden();
  const url = new URL(page.url());
  expect(url.searchParams.get("tarif")).toBe("flex");
  expect(url.searchParams.get("type")).toBe("akt");
  expect(url.searchParams.get("private")).toBe("true");
  expect(url.searchParams.get("utm_source")).toBe("inquiry");
  expect(url.searchParams.has("message")).toBe(false);
  expect.soft(url.hash).toBe("#details");
  expect(await page.evaluate(() => (window as unknown as InstrumentedWindow).modalPageLoads)).toBe(0);
  await page.reload();
  await assertConfiguration(page, "Flex", 349);
  await expect(page.getByRole("checkbox", { name: /Online-Verbot/ })).toBeChecked();
  expect(posts).toBe(0);
});

test("student and friend conditions still prefill the request without any POST", async ({ page }) => {
  let posts = 0;
  page.on("request", request => { if (request.method() === "POST") posts += 1; });
  const condition = "Freigabe ausgewählter Bilder zur Veröffentlichung";

  await openPricing(page, "?student=true");
  await expect(page.getByTestId("discount-publication-condition")).toContainText(condition);
  await page.getByRole("link", { name: "Angebot anfragen" }).click();
  await expect(page.locator("#contact_modal")).toBeVisible();
  const studentMessage = await page.locator("#form_msg").inputValue();
  expect(studentMessage).toContain("Studenten-Rabatt");
  expect(studentMessage).toContain(condition);
  await page.locator('#contact_modal form[method="dialog"] button').click();
  await expect(page.locator("#contact_modal")).toBeHidden();

  await page.goto("/preise/?code=friend");
  await expect(page.locator('[data-pricing-ready="true"]')).toBeVisible();
  await page.getByRole("checkbox", { name: /Freunde-Rabatt/ }).check();
  await expect(page.getByTestId("discount-publication-condition")).toContainText(condition);
  await page.getByRole("link", { name: "Angebot anfragen" }).click();
  await expect(page.locator("#contact_modal")).toBeVisible();
  const friendMessage = await page.locator("#form_msg").inputValue();
  expect(friendMessage).toContain("Freunde-Rabatt");
  expect(friendMessage).toContain(condition);
  await page.locator('#contact_modal form[method="dialog"] button').click();
  await expect(page.locator("#contact_modal")).toBeHidden();

  expect(posts).toBe(0);
});

test("the friend deep link redirects to the Flex tariff with the friend discount pre-armed", async ({ page }) => {
  await page.goto("/preise/friends");

  await expect(page.locator('[data-pricing-ready="true"]')).toBeVisible();
  expect(new URL(page.url()).pathname).toBe("/preise/");
  expect(new URL(page.url()).search).toBe("?tarif=flex&code=friend&friend=true");
  await assertConfiguration(page, "Flex", 149);

  // The friend option lives in the Standard tariff only — the redirect pre-arms it there.
  await page.getByRole("tab", { name: "Standard", exact: true }).click();
  await expect(page.getByRole("checkbox", { name: /Freunde-Rabatt/ })).toBeChecked();
  await expect(page.getByTestId("pricing-total")).toHaveText("125 €");
});

test("Standard example inquiry preserves its 249 € configuration on close/reload", async ({ page }) => {
  let posts = 0;
  page.on("request", request => { if (request.method() === "POST") posts += 1; });
  await openPricing(page, "?tarif=standard&h=1&img=15&location=outdoor&utm_source=standard#example");
  await assertConfiguration(page, "Standard", 249);
  await page.getByRole("link", { name: "Angebot anfragen" }).click();
  await expect(page.locator("#contact_modal")).toBeVisible();
  const message = await page.locator("#form_msg").inputValue();
  expect(message).toContain("249 €");
  expect(message).toContain("15 Stück");
  expect(message).toContain("Outdoor");
  expect(message).not.toContain("Freigabe");
  await page.locator('#contact_modal form[method="dialog"] button').click();
  await expect(page.locator("#contact_modal")).toBeHidden();
  expect(new URL(page.url()).searchParams.get("tarif")).toBe("standard");
  expect(new URL(page.url()).searchParams.get("utm_source")).toBe("standard");
  expect(new URL(page.url()).hash).toBe("#example");
  await page.reload();
  await assertConfiguration(page, "Standard", 249);
  expect(posts).toBe(0);
});
