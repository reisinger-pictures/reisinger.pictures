// Manifest-driven local pixel capture. Identity/readiness assertions do not
// replace functional E2E or a human/agent review of the resulting images.
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import { routes } from "./ui-review.config";
import type { UiReviewTheme } from "./ui-review.config";
import { nextSectionPosition, reviewTarget, screenshotPath } from "./ui-review.helpers";

async function setThemeBeforeNavigation(page: Page, theme: UiReviewTheme): Promise<void> {
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
      await setThemeBeforeNavigation(page, target.theme);
      await page.goto(route.path, { waitUntil: "load" });
      await expect(page.getByRole("main")).toBeVisible();
      await expect(page).toHaveTitle(route.expectedTitle);
      if (route.calculatorTab) {
        await expect(page.locator('[data-pricing-ready="true"]')).toBeVisible();
        await expect(page.getByRole("tab", { name: route.calculatorTab, exact: true })).toHaveAttribute("aria-selected", "true");
        await expect(page.getByRole("tabpanel")).toBeVisible();
      }
      // The full page is in scope. Resolve native lazy images up front so their
      // final dimensions cannot expand earlier sections after we passed them.
      await page.evaluate(() => { for (const image of document.images) image.loading = "eager"; });
      await page.waitForFunction(() => [...document.images].every((image) => image.complete && image.naturalWidth > 0));
      await waitForVisibleContent(page);
      const surface = await renderedTheme(page, target.theme);
      await selectScroller(page);
      const scroller = page.locator("[data-ui-review-scroller]");
      const screenshotOptions = { animations: "disabled", caret: "hide" } as const;
      let position = 0;
      let sections = 0;
      for (;;) {
        await scroller.evaluate((element, top) => element.scrollTo({ top, behavior: "instant" }), position);
        await waitForVisibleContent(page);
        await page.screenshot({ ...screenshotOptions, path: out(`${route.name}-sec${sections}.png`) });
        sections += 1;
        const { height, max, current } = await scroller.evaluate((element) => ({
          height: element.clientHeight,
          max: Math.max(0, element.scrollHeight - element.clientHeight),
          current: element.scrollTop,
        }));
        if (current >= max - 1) break;
        position = nextSectionPosition(current, height, max);
        if (position <= current) throw new Error("Screenshot scroller did not advance");
      }
      await scroller.evaluate((element) => element.scrollTo({ top: 0, behavior: "instant" }));
      await waitForVisibleContent(page);
      await renderedTheme(page, target.theme);
      // Capture full page after lazy images/visible islands have been visited.
      await page.screenshot({ ...screenshotOptions, path: out(`${route.name}.png`), fullPage: true });
      await writeFile(out(`${route.name}.json`), JSON.stringify({
        route: route.name, state, ...target, viewportSize: page.viewportSize(),
        title: await page.title(), url: page.url(), surface, sections,
      }, null, 2) + "\n");
    });
  }
}
