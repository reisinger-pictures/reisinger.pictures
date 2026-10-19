// Manifest-driven local pixel capture. Identity/readiness assertions do not
// replace functional E2E or a human/agent review of the resulting images.
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import { routes } from "./ui-review.config";
import type { UiReviewTheme } from "./ui-review.config";
import { FULL_PAGE_MAX_SECTIONS, HEIGHT_GROWTH_TOLERANCE, nextSectionPosition, reviewTarget, sampledSectionIndexes, screenshotPath, sectionPositions } from "./ui-review.helpers";

async function preparePageBeforeNavigation(page: Page, theme: UiReviewTheme): Promise<void> {
  // These are the app's actual daisyUI theme names. The app has no JS theme
  // controller/storage key; matching colorScheme alone would not prove capture.
  await page.addInitScript((name) => {
    const apply = () => {
      if (!document.documentElement) return false;
      document.documentElement.setAttribute("data-theme", name);
      return true;
    };
    if (!apply()) {
      const observer = new MutationObserver(() => { if (apply()) observer.disconnect(); });
      observer.observe(document, { childList: true, subtree: true });
    }

    const eagerlyLoadImages = () => {
      for (const image of document.images) image.loading = "eager";
    };
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", eagerlyLoadImages, { once: true });
    } else {
      eagerlyLoadImages();
    }
  }, `reisinger-${theme}`);
}

async function waitForVisibleContent(page: Page): Promise<void> {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => {
    const visible = (element: Element) => {
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < innerHeight;
    };
    return [...document.querySelectorAll("astro-island[ssr]")].every((island) =>
      !["load", "only"].includes(island.getAttribute("client") ?? "") && !visible(island),
    ) && [...document.images].filter(visible).every((image) => image.complete && image.naturalWidth > 0);
  });
  await expect(page.locator('.loading:visible, [aria-busy="true"]:visible')).toHaveCount(0);
  await page.evaluate(async () => {
    await Promise.all([...document.images].filter((image) => {
      const rect = image.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < innerHeight;
    }).map((image) => image.decode()));
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  });
}

async function renderedTheme(page: Page, theme: UiReviewTheme) {
  await expect(page.locator("html")).toHaveAttribute("data-theme", `reisinger-${theme}`);
  const surface = await page.evaluate(() => {
    const color = getComputedStyle(document.documentElement).backgroundColor;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    const context = canvas.getContext("2d")!;
    context.fillStyle = color;
    context.fillRect(0, 0, 1, 1);
    return { color, rgba: [...context.getImageData(0, 0, 1, 1).data] };
  });
  expect(surface.rgba[3], "page surface must be opaque, not an unstyled transparent document").toBe(255);
  const brightness = (surface.rgba[0] + surface.rgba[1] + surface.rgba[2]) / 3;
  if (theme === "light") expect(brightness, "rendered light surface").toBeGreaterThan(200);
  else expect(brightness, "rendered dark surface").toBeLessThan(80);
  return surface;
}

async function selectScroller(page: Page): Promise<void> {
  await page.evaluate(() => {
    const root = document.scrollingElement as HTMLElement;
    let scroller = root;
    if (root.scrollHeight <= root.clientHeight + 1) {
      const inner = [...document.querySelectorAll<HTMLElement>("main, main *")].filter((element) =>
        /auto|scroll/.test(getComputedStyle(element).overflowY) && element.scrollHeight > element.clientHeight + 1,
      ).sort((a, b) => b.clientWidth * b.clientHeight - a.clientWidth * a.clientHeight)[0];
      if (inner) scroller = inner;
    }
    scroller.setAttribute("data-ui-review-scroller", "");
  });
}

for (const route of routes) {
  for (const state of route.states) {
    test(`screenshot ${route.name} (${state})`, { tag: ["@screenshot"] }, async ({ page }, testInfo) => {
      const target = reviewTarget(testInfo.project.metadata);
      test.skip(route.viewports !== undefined && !route.viewports.includes(target.viewport), "viewport excluded by manifest");
      const out = (file: string) => screenshotPath(testInfo.project.outputDir, state, target, file);
      await preparePageBeforeNavigation(page, target.theme);
      await page.goto(route.path, { waitUntil: "load" });
      await expect(page.getByRole("main")).toBeVisible();
      await expect(page).toHaveTitle(route.expectedTitle);
      if (route.calculatorTab) {
        await expect(page.locator('[data-pricing-ready="true"]')).toBeVisible();
        await expect(page.getByRole("tab", { name: route.calculatorTab, exact: true })).toHaveAttribute("aria-selected", "true");
        await expect(page.getByRole("tabpanel")).toBeVisible();
      }
      // The init script marks every document's images eager at DOMContentLoaded.
      // Astro's ClientRouter can perform a second same-URL document load after
      // goto() returns; doing this only here would leave that document lazy.
      // The full page is in scope, so wait for all dimensions before traversal.
      await page.waitForFunction(() => [...document.images].every((image) => image.complete && image.naturalWidth > 0));
      await waitForVisibleContent(page);
      const surface = await renderedTheme(page, target.theme);
      await selectScroller(page);
      const scroller = page.locator("[data-ui-review-scroller]");
      const screenshotOptions = { animations: "disabled", caret: "hide" } as const;

      // Reconnaissance scroll — reach the page end *without* screenshots so the
      // section geometry is known. It proves the scroller advances and that the
      // page height does not grow (lazy images were already forced eager and
      // awaited above).
      const metrics = () => scroller.evaluate((element) => ({
        height: element.clientHeight,
        max: Math.max(0, element.scrollHeight - element.clientHeight),
        current: element.scrollTop,
        scrollHeight: element.scrollHeight,
      }));
      let baselineScrollHeight = -1;
      let positions = [0];
      let position = 0;
      for (;;) {
        await scroller.evaluate((element, top) => element.scrollTo({ top, behavior: "instant" }), position);
        const measured = await metrics();
        if (baselineScrollHeight === -1) baselineScrollHeight = measured.scrollHeight;
        else if (measured.scrollHeight > baselineScrollHeight + HEIGHT_GROWTH_TOLERANCE) {
          throw new Error(`page height grew during capture: ${baselineScrollHeight} -> ${measured.scrollHeight}`);
        }
        if (measured.current >= measured.max - 1) break;
        position = nextSectionPosition(measured.current, measured.height, measured.max);
        if (position <= positions[positions.length - 1]) throw new Error("Screenshot scroller did not advance");
        positions.push(position);
      }

      // Re-anchor the tail after arriving at the bottom: if the height moved,
      // recompute the section offsets so the last sections (the footer) are exact.
      const bottom = await metrics();
      if (bottom.scrollHeight > baselineScrollHeight + HEIGHT_GROWTH_TOLERANCE) {
        throw new Error(`page height grew during capture: ${baselineScrollHeight} -> ${bottom.scrollHeight}`);
      }
      if (bottom.max !== positions[positions.length - 1]) {
        positions = sectionPositions(bottom.height, bottom.max);
      }

      // Sample = the page top and the footer; the gallery in between is skipped.
      const sample = new Set(sampledSectionIndexes(positions.length, { leadingSections: route.leadingSections }));

      // The single capture pass: visit only the sampled offsets, wait, shoot.
      const capturedIndexes: number[] = [];
      for (const index of [...sample].sort((a, b) => a - b)) {
        await scroller.evaluate((element, top) => element.scrollTo({ top, behavior: "instant" }), positions[index]);
        await waitForVisibleContent(page);
        const measured = await metrics();
        if (measured.scrollHeight > baselineScrollHeight + HEIGHT_GROWTH_TOLERANCE) {
          throw new Error(`page height grew during capture: ${baselineScrollHeight} -> ${measured.scrollHeight}`);
        }
        await page.screenshot({ ...screenshotOptions, path: out(`${route.name}-sec${index}.png`) });
        capturedIndexes.push(index);
      }

      await scroller.evaluate((element) => element.scrollTo({ top: 0, behavior: "instant" }));
      await waitForVisibleContent(page);
      await renderedTheme(page, target.theme);
      // A single full-page overview only where it stays readable; long pages
      // would otherwise write multi-megabyte unreadable artifacts and rely on
      // their sampled sections instead (rules/08-local-ui-review.md).
      const fullPageOverview = positions.length <= FULL_PAGE_MAX_SECTIONS;
      if (fullPageOverview) {
        await page.screenshot({ ...screenshotOptions, path: out(`${route.name}.png`), fullPage: true });
      }
      await writeFile(out(`${route.name}.json`), JSON.stringify({
        route: route.name, state, ...target, viewportSize: page.viewportSize(),
        title: await page.title(), url: page.url(), surface,
        sections: positions.length, capturedSections: capturedIndexes.length, capturedSectionIndexes: capturedIndexes,
        footerSectionIndex: positions.length - 1, fullPageOverview,
      }, null, 2) + "\n");
    });
  }
}
