import { expect } from "@playwright/test";
import { readFileSync } from "node:fs";

import { test } from "./helpers";

// Focused checks for the redesigned homepage upper area. The complete existing
// portfolio/blog feed (12 posts per page + pagination) must stay untouched and
// reachable. No test ever performs a real form POST.

const BLOG = "#portfolio-blog";
const PORTFOLIO_LINK = `${BLOG} a[href^="/portfolio/"]`;
const PAGE_SIZE = 12;

test("shows the personal hero with the private-first entry points", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { level: 1, name: "Fotografie, die sich nach dir anfühlt." }),
  ).toBeVisible();

  for (const href of ["/shootings/beauty/", "/shootings/couples/", "/shootings/akt/"]) {
    await expect(page.locator(`main a[href="${href}"]`).first()).toBeVisible();
  }

  const photos = page.locator('section[aria-labelledby="home-intro-heading"] img');
  await expect(photos).toHaveCount(3);
  expect(new Set(await photos.evaluateAll(images => images.map(image => image.getAttribute("src")))).size).toBe(3);
  await expect(photos.filter({ visible: true })).toHaveCount(3);
  for (const href of ["/personal-branding/", "/eventfotografie/"]) {
    await expect(page.locator(`main a[href="${href}"]`)).toBeVisible();
  }
  await expect(page.locator('main a[href="/tfp/"]')).toHaveCount(0);
  await expect(page.locator("main")).not.toContainText(/TFP|kreative Projekte/);
  await expect(page.locator('footer a[href="/tfp/"]')).toBeVisible();
  await expect(page.getByRole("heading", { name: "Privat vor der Kamera", exact: true })).toHaveCount(0);
});

test("uses one consistent image, offer-title and action structure at every viewport", async ({ page }) => {
  for (const width of [480, 1190, 1920]) {
    await page.setViewportSize({ width, height: 1040 });
    await page.goto("/");
    const titles = ["Beauty & Portrait", "Paare", "Boudoir & Fine Art"];
    const hrefs = ["/shootings/beauty/", "/shootings/couples/", "/shootings/akt/"];
    const titleStyles: unknown[] = [];
    const actionStyles: unknown[] = [];
    for (const [index, title] of titles.entries()) {
      const heading = page.getByRole("heading", { name: title, level: 2, exact: true });
      const offering = page.locator("main figure").filter({ has: heading });
      const action = offering.getByRole("link", { name: `Mehr erfahren: ${title}`, exact: true });
      await expect(offering.locator("img")).toHaveCount(1);
      await expect(offering.locator("figcaption > h2")).toHaveText(title);
      await expect(action).toHaveText("Mehr erfahren");
      await expect(action).toHaveAttribute("href", hrefs[index]);
      await expect(offering.locator("a a")).toHaveCount(0);
      await expect(offering.locator("img")).toHaveAttribute("loading", index === 0 ? "eager" : "lazy");
      if (index === 0) {
        await expect(offering.locator("img")).toHaveAttribute("sizes", "(min-width: 1024px) 58vw, 100vw");
      }
      const photoBox = await offering.locator("img").boundingBox();
      const titleBox = await heading.boundingBox();
      const actionBox = await action.boundingBox();
      expect(titleBox!.y).toBeGreaterThanOrEqual(photoBox!.y + photoBox!.height);
      expect(actionBox!.y).toBeGreaterThanOrEqual(titleBox!.y + titleBox!.height);
      expect(actionBox!.height).toBeGreaterThanOrEqual(44);
      titleStyles.push(await heading.evaluate(element => {
        const style = getComputedStyle(element);
        return [style.fontSize, style.fontWeight, style.lineHeight, style.textAlign];
      }));
      actionStyles.push(await action.evaluate(element => {
        const style = getComputedStyle(element);
        return [style.fontSize, style.fontWeight, style.lineHeight, style.minHeight];
      }));
      await action.focus();
      expect(await action.evaluate(element => getComputedStyle(element).outlineWidth)).toBe("2px");
    }
    expect(titleStyles[0]).toEqual(titleStyles[1]);
    expect(titleStyles[1]).toEqual(titleStyles[2]);
    expect(actionStyles[0]).toEqual(actionStyles[1]);
    expect(actionStyles[1]).toEqual(actionStyles[2]);
  }
});

test("keeps the complete Nicole quote before pricing", async ({ page }) => {
  await page.goto("/");
  const quote = page.locator("main blockquote");
  await expect(quote).toHaveText("Das Shooting war meine erste Erfahrung vor der Kamera, und die ersten 3 Minuten war es etwas ungewohnt, jedoch hat mir Florian schnell ein gutes Gefühl sowie Tipps gegeben und Posen vorgeschlagen, sodass es dann wirklich viel Spaß gemacht hat. Kann ich nur empfehlen :)");
  await expect(page.locator("main figcaption").getByText("Nicole Pecnik", { exact: true })).toBeVisible();
  expect(await quote.evaluate(element => Boolean(element.compareDocumentPosition(document.getElementById("home-pricing-heading")!) & Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
});

test("shows the mobile photograph before the introduction without horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 480, height: 1040 });
  await page.goto("/");
  const intro = page.locator('section[aria-labelledby="home-intro-heading"]');
  const photo = await intro.locator("img").first().boundingBox();
  const introduction = await intro.getByText(/^Ich bin Florian/).boundingBox();
  expect(photo!.y).toBeLessThan(250);
  expect(photo!.y + photo!.height).toBeLessThan(introduction!.y);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});

test("points the jump link at the portfolio blog section", async ({ page }) => {
  await page.goto("/");

  const jump = page.getByRole("link", { name: "Zum Portfolio-Blog" });
  await expect(jump).toBeVisible();
  await expect(jump).toHaveAttribute("href", "#portfolio-blog");

  await jump.click();
  await expect(page).toHaveURL(/#portfolio-blog$/);
  await expect(page.locator(BLOG)).toBeVisible();
});

test("keeps the full 12-post feed and pagination on the homepage", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator(PORTFOLIO_LINK)).toHaveCount(PAGE_SIZE);
  await expect(page.locator(BLOG).getByRole("link", { name: "Nächste Seite" }).first()).toBeVisible();
});

test("shows the centrally derived pricing card without a hardcoded minimum", async ({ page }) => {
  await page.goto("/");

  const intro = page.locator("main section").first();
  await expect(intro.getByRole("heading", { name: "Fotoshootings & Preise" })).toBeVisible();

  // Standard: explicitly an example, never a promised minimum.
  await expect(intro.getByText(/Beispielpreis, kein Mindestpreis/)).toBeVisible();
  await expect(intro.getByText(/kein Mindestpreis/)).toBeVisible();

  // Flex: subordinate creative private sessions; the discount is tied to
  // agreed publication (conditions explained on /preise/).
  await expect(intro.getByText("Kreative Privat-Sessions ab")).toBeVisible();
  await expect(intro.getByText(/keine kommerzielle Bildnutzung/)).toBeVisible();
  await expect(
    intro.getByText(/Vergünstigter Tarif gegen vereinbarte Bildveröffentlichung/),
  ).toBeVisible();
  await expect(intro.getByText(/Online-Verzicht bei Akt & Boudoir/)).toBeVisible();

  await expect(intro.getByText(/€\s?249(?:,00)?$/)).toBeVisible();
  await expect(intro.getByRole("heading", { name: /Flex.*€\s?149(?:,00)?$/ })).toBeVisible();

  await expect(
    page.locator('main a[href="/preise/?tarif=standard&h=1&img=15&location=outdoor"]').first(),
  ).toBeVisible();
  await expect(intro.getByRole("link", { name: "Flex berechnen" })).toHaveAttribute("href", "/preise/?tarif=flex");
  await expect(intro.getByRole("link", { name: "Bedingungen", exact: true })).toHaveCount(0);
  await expect(intro.getByRole("link", { name: "Standard berechnen" })).toHaveClass(/btn-primary/);
  await expect(intro.getByRole("link", { name: "Flex berechnen" })).toHaveClass(/btn-outline/);
  await expect(intro.getByText("1 Stunde · 15 bearbeitete Bilder · Outdoor")).toBeVisible();
});

for (const { link, tariff, amount } of [
  { link: "Standard berechnen", tariff: "Standard", amount: "249 €" },
  { link: "Flex berechnen", tariff: "Flex", amount: "149 €" }
]) {
  test(`reproduces the advertised ${tariff} amount through its homepage link`, async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: link }).click();
    await expect(page.getByRole("tab", { name: tariff, exact: true })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByTestId("pricing-total")).toHaveText(amount);
    await page.reload();
    await expect(page.getByRole("tab", { name: tariff, exact: true })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByTestId("pricing-total")).toHaveText(amount);
  });
}

// The owner explicitly selected this existing slug for the homepage Boudoir
// offer and for the /shootings/akt/ hero. The selection is pinned to the stable
// rendered output so the check is meaningful in development *and* in the
// production preview: the development `src`/`srcset` point at the source file
// (`…/fa-02.jpg`), the production ones are the CDN paths built from this image's
// manifest hash. `data-name` is a development-only attribute (ResponsiveImage
// emits it solely for `import.meta.env.MODE === "development"`) and is therefore
// not asserted here — it is `null` in the built output.
const ACTIVE_BOUDOIR_SLUG = "akt-boudoir-fine-art-fa-02";
const activeBoudoirPattern = (() => {
  const manifest = JSON.parse(readFileSync(new URL("../.imagedist/manifest.json", import.meta.url), "utf8"));
  return new RegExp(`${ACTIVE_BOUDOIR_SLUG}|fa-02\\.jpg|${manifest.images[ACTIVE_BOUDOIR_SLUG].hash as string}`);
})();

test("uses the owner's selected Boudoir image for the homepage offer", async ({ page }) => {
  await page.goto("/");
  const card = page.locator("main figure").filter({
    has: page.getByRole("heading", { name: "Boudoir & Fine Art", exact: true })
  });
  // `src` is the rendered largest variant, `srcset` all responsive variants of
  // that one image — both must resolve to the owner's chosen file in every mode.
  await expect(card.locator("img")).toHaveAttribute("src", activeBoudoirPattern);
  await expect(card.locator("img")).toHaveAttribute("srcset", activeBoudoirPattern);
});

test("uses the owner's selected Boudoir image as the Akt page hero and social preview", async ({ page }) => {
  await page.goto("/shootings/akt/");
  const title = await page.getByRole("heading", { level: 1 }).innerText();
  const hero = page.getByRole("img", { name: title, exact: true });
  await expect(hero).toHaveAttribute("src", activeBoudoirPattern);
  await expect(hero).toHaveAttribute("srcset", activeBoudoirPattern);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", activeBoudoirPattern);
  await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute("content", activeBoudoirPattern);
  expect(await hero.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
});

test("offers only the header contact button and preserves the dialog without sending a request", async ({ page }) => {
  let requests = 0;
  await page.route("**/form.reisinger.pictures/**", (route) => {
    requests += 1;
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
  });

  await page.goto("/");
  await expect(page.locator('main [data-contact-open="cta"]')).toHaveCount(0);
  await expect(page.locator('[data-contact-open="fab"]')).toHaveCount(0);
  await expect(page.locator('footer a[href="#kontakt"]')).toBeVisible();
  await page.locator('[data-contact-open="header"]').click();

  await expect(page.locator("#contact_modal")).toBeVisible();
  expect(requests).toBe(0);

  await page.locator('#contact_modal form[method="dialog"] button').click();
  await expect(page.locator("#contact_modal")).toBeHidden();
});

test("keeps query configuration and the previous hash across footer contact open and close", async ({ page }) => {
  let requests = 0;
  await page.route("**/form.reisinger.pictures/**", route => {
    requests += 1;
    return route.fulfill({ status: 200, body: "{}" });
  });
  await page.goto("/?tarif=flex&type=portrait&setup=outdoor&extra=0#portfolio-blog");
  await page.locator('footer a[href="#kontakt"]').click();
  await expect(page.locator("#contact_modal")).toBeVisible();
  let url = new URL(page.url());
  expect(url.searchParams.get("tarif")).toBe("flex");
  expect(url.hash).toBe("#kontakt");
  // A state update made after opening must not be overwritten by a stale URL.
  await page.evaluate(() => {
    const url = new URL(location.href);
    url.searchParams.set("extra", "2");
    url.searchParams.set("message", "Temporary contact prefill");
    history.replaceState(history.state, "", url);
  });
  await page.locator('#contact_modal form[method="dialog"] button').click();
  await expect(page).toHaveURL(/extra=2#portfolio-blog$/);
  url = new URL(page.url());
  expect(Object.fromEntries(url.searchParams)).toEqual({ tarif: "flex", type: "portrait", setup: "outdoor", extra: "2" });
  expect(url.hash).toBe("#portfolio-blog");
  expect(requests).toBe(0);
});

test("does not repeat the hero on page 2 but keeps the feed and pagination", async ({ page }) => {
  await page.goto("/2");

  await expect(page.getByText("Fotografie, die sich nach dir anfühlt.")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Beauty & Portrait", exact: true })).toHaveCount(0);

  await expect(page.locator(PORTFOLIO_LINK)).toHaveCount(PAGE_SIZE);
  await expect(page.locator(BLOG)).toBeVisible();
  await expect(page.locator(BLOG).getByRole("link", { name: "Vorherige Seite" }).first()).toBeVisible();
  await expect(page.locator('[data-contact-open="fab"]')).toHaveCount(1);
});
