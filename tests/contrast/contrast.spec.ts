// Focused WCAG AA contrast check for the color combinations actually rendered on
// the changed pages / theme tokens (ui-review checklist item 11). Colors are read
// from the live document and resolved through the browser's own color parser via
// canvas, so the measured ratio matches what a user sees (`oklch` and
// `color-mix()` are not re-implemented here). No pixel baselines, no new package.
//
// Run: pnpm test:contrast
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

type Theme = "light" | "dark";

interface SampleSpec {
  /** Human-readable role of the measured element. */
  label: string;
  /** CSS selector; every *visible* match is measured (capped at `max`). */
  selector: string;
  /** A required sample must resolve to at least one visible element. */
  required?: boolean;
  max?: number;
}

interface Measurement {
  label: string;
  selector: string;
  found: boolean;
  required: boolean;
  text: string;
  colorCss: string;
  fg: string;
  bg: string;
  fontSize: number;
  fontWeight: number;
  ratio: number;
  threshold: number;
  pass: boolean;
}

const ROUTES: { name: string; path: string; title: string; samples: SampleSpec[] }[] = [
  {
    name: "shootings-beauty",
    path: "/shootings/beauty/",
    title: "Dein Beauty-Fotoshooting in Linz – Ganz du selbst",
    samples: [
      { label: "Fließtext (main p)", selector: "main p", required: true, max: 2 },
      { label: "Überschrift h1", selector: "main h1", required: true },
      { label: "Link (Footer)", selector: "footer a.link", required: true, max: 2 },
      { label: "Primärbutton (btn-primary)", selector: ".btn-primary", required: true, max: 2 },
      { label: "Sekundärbutton (btn-outline)", selector: ".btn-outline", required: false, max: 2 }
    ]
  },
  {
    name: "shootings-couples",
    path: "/shootings/couples/",
    title: "Eure Liebesgeschichte in Bildern – Pärchen-Fotos in Linz und Oberösterreich",
    samples: [
      { label: "Fließtext (main p)", selector: "main p", required: true, max: 2 },
      { label: "Überschrift h1", selector: "main h1", required: true },
      { label: "Link (Footer)", selector: "footer a.link", required: true, max: 2 },
      { label: "Primärbutton (btn-primary)", selector: ".btn-primary", required: true, max: 2 },
      { label: "Sekundärbutton (btn-outline)", selector: ".btn-outline", required: false, max: 2 }
    ]
  },
  {
    name: "pricing-standard-student",
    path: "/preise/?tarif=standard&student=true",
    title: "Meine Tarife – Fair, transparent, flexibel",
    samples: [
      { label: "Fließtext (main p)", selector: "main p", required: true, max: 2 },
      { label: "Hinweis Rabattbedingungen (discount-publication-condition)", selector: '[data-testid="discount-publication-condition"]', required: true },
      { label: "Hinweistext Rabattzeile (text-base-content/70)", selector: '.prose .text-base-content\\/70, .label .text-base-content\\/70, span.text-base-content\\/70', required: false, max: 2 },
      { label: "Preis (text-primary) auf base-200", selector: '[data-testid="pricing-total"]', required: true },
      { label: "Gestrichener Paketpreis (text-base-content/60)", selector: '.line-through.text-base-content\\/60', required: true },
      { label: "Inaktiver Tab (text-base-content/60 auf base-200)", selector: '[role="tab"][aria-selected="false"]', required: true },
      { label: "Primärbutton (btn-primary)", selector: ".btn-primary", required: true, max: 2 },
      { label: "Sekundärbutton (btn-outline)", selector: ".btn-outline", required: true, max: 1 },
      { label: "Link (Footer)", selector: "footer a.link", required: true, max: 1 }
    ]
  },
  {
    name: "pricing-standard-friend",
    path: "/preise/?tarif=standard&code=friend&friend=true",
    title: "Meine Tarife – Fair, transparent, flexibel",
    samples: [
      { label: "Fließtext (main p)", selector: "main p", required: true, max: 2 },
      { label: "Hinweis Rabattbedingungen (discount-publication-condition)", selector: '[data-testid="discount-publication-condition"]', required: true },
      { label: "Freunde-Rabatt Zeile (text-base-content/70)", selector: '.text-base-content\\/70', required: true, max: 2 },
      { label: "Preis (text-primary) auf base-200", selector: '[data-testid="pricing-total"]', required: true },
      { label: "Gestrichener Paketpreis (text-base-content/60)", selector: '.line-through.text-base-content\\/60', required: true },
      { label: "Inaktiver Tab (text-base-content/60 auf base-200)", selector: '[role="tab"][aria-selected="false"]', required: true },
      { label: "Primärbutton (btn-primary)", selector: ".btn-primary", required: true, max: 2 },
      { label: "Sekundärbutton (btn-outline)", selector: ".btn-outline", required: true, max: 1 },
      { label: "Link (Footer)", selector: "footer a.link", required: true, max: 1 }
    ]
  }
];

// daisyUI semantic color combinations used in this project (checklist item 11).
// The class strings are taken verbatim from the components that render them, so
// the probe measures the real theme tokens, not an invented variant. Classes the
// project does not use (e.g. alert-info/success/error, link-primary) are
// deliberately absent: Tailwind only emits used classes, so probing them would
// measure unstyled markup rather than a theme token.
const MATRIX: { label: string; classes: string; text: string }[] = [
  { label: "badge-primary (ImageCategories)", classes: "badge badge-lg badge-primary", text: "Badge" },
  { label: "badge-secondary (PricingCard)", classes: "badge badge-secondary", text: "Badge" },
  { label: "badge-success (PricingTabs)", classes: "badge badge-success font-black text-[11px] uppercase px-2.5 py-2", text: "Badge" },
  { label: "badge-error (PricingTabs)", classes: "badge badge-error font-black text-[11px] uppercase px-2.5 py-2", text: "Badge" },
  { label: "badge-soft (ReviewSocialLink)", classes: "badge badge-soft badge-lg bg-base-100/90 text-primary", text: "Badge" },
  { label: "alert primary toast (ContactForm)", classes: "alert bg-primary text-primary-content border-primary", text: "Hinweis" },
  { label: "body text vs bg-base-100", classes: "bg-base-100 text-base-content", text: "Fließtext" }
];

async function setThemeBeforeNavigation(page: Page, theme: Theme): Promise<void> {
  // These are the app's actual daisyUI theme names (src/styles/global.css).
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

/** Measure every visible match of every sample: rendered fg vs composited bg. */
async function measure(page: Page, samples: SampleSpec[]): Promise<Measurement[]> {
  return page.evaluate((specs) => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    type Rgba = [number, number, number, number];

    // Resolve any CSS color (incl. oklch / color-mix) to sRGB + alpha by drawing
    // it over white and over black with the browser's own parser.
    const resolve = (css: string): Rgba => {
      if (!CSS.supports("color", css)) throw new Error(`Unsupported CSS color: ${css}`);
      const over = (bg: string): Rgba => {
        ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, 1, 1);
        ctx.fillStyle = css;
        ctx.fillRect(0, 0, 1, 1);
        const d = ctx.getImageData(0, 0, 1, 1).data;
        return [d[0], d[1], d[2], d[3]];
      };
      const w = over("#ffffff");
      const b = over("#000000");
      const alpha = 1 - ((w[0] - b[0]) + (w[1] - b[1]) + (w[2] - b[2])) / (3 * 255);
      if (alpha <= 0.0001) return [0, 0, 0, 0];
      return [b[0] / alpha, b[1] / alpha, b[2] / alpha, alpha];
    };

    const comp = (fg: Rgba, bg: Rgba): Rgba => {
      const a = fg[3] + bg[3] * (1 - fg[3]);
      if (a <= 0.0001) return [0, 0, 0, 0];
      return [
        (fg[0] * fg[3] + bg[0] * bg[3] * (1 - fg[3])) / a,
        (fg[1] * fg[3] + bg[1] * bg[3] * (1 - fg[3])) / a,
        (fg[2] * fg[3] + bg[2] * bg[3] * (1 - fg[3])) / a,
        a
      ];
    };

    /** Composite all ancestor backgrounds, root first (translucent bgs included). */
    const backgroundOf = (el: Element): Rgba => {
      const stack: Rgba[] = [];
      let node: Element | null = el;
      while (node) {
        const bg = resolve(getComputedStyle(node).backgroundColor);
        if (bg[3] > 0) stack.push(bg);
        node = node.parentElement;
      }
      let base: Rgba = stack.length ? stack[stack.length - 1] : [255, 255, 255, 1];
      base = comp(base, [255, 255, 255, 1]);
      for (let i = stack.length - 2; i >= 0; i--) base = comp(stack[i], base);
      return base;
    };

    const luminance = ([r, g, b]: Rgba): number => {
      const lin = (v: number) => {
        const s = v / 255;
        return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
      };
      return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
    };

    const rgb = (c: Rgba) => `rgb(${c.slice(0, 3).map((v) => Math.round(v)).join(", ")})`;

    const visible = (el: Element): boolean => {
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return false;
      const style = getComputedStyle(el);
      return style.visibility !== "hidden" && Number(style.opacity) > 0;
    };

    const results: Measurement[] = [];
    for (const spec of specs) {
      const matches = [...document.querySelectorAll(spec.selector)]
        .filter((el) => visible(el) && (el.textContent ?? "").trim().length > 0)
        .slice(0, spec.max ?? 1);
      if (matches.length === 0) {
        results.push({
          label: spec.label, selector: spec.selector, found: false, required: spec.required === true, text: "",
          colorCss: "", fg: "", bg: "", fontSize: 0, fontWeight: 0,
          ratio: 0, threshold: 0, pass: false
        });
        continue;
      }
      for (const el of matches) {
        const style = getComputedStyle(el);
        const fgColor = resolve(style.color);
        const bg = backgroundOf(el);
        const fg = comp(fgColor, bg);
        const l1 = luminance(fg);
        const l2 = luminance(bg);
        const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
        const fontSize = parseFloat(style.fontSize);
        const fontWeight = Number(style.fontWeight) || 400;
        // WCAG 2.x: large text may use 3:1, everything else 4.5:1.
        const large = fontSize >= 24 || (fontSize >= 18.66 && fontWeight >= 700);
        const threshold = large ? 3 : 4.5;
        results.push({
          label: spec.label, selector: spec.selector, found: true, required: spec.required === true,
          text: (el.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 40),
          colorCss: style.color, fg: rgb(fg), bg: rgb(bg),
          fontSize: Math.round(fontSize * 10) / 10, fontWeight,
          ratio: Math.round(ratio * 100) / 100, threshold, pass: ratio + 1e-9 >= threshold
        });
      }
    }
    return results;
  }, samples);
}

function report(scope: string, theme: Theme, measurements: Measurement[]): void {
  for (const m of measurements) {
    if (!m.found) {
      console.log(`[contrast] ${theme} ${scope} :: ${m.label} :: NICHT GEFUNDEN (${m.selector})`);
      continue;
    }
    console.log(
      `[contrast] ${theme} ${scope} :: ${m.label} :: ${m.ratio.toFixed(2)}:1 ` +
      `(AA ≥ ${m.threshold}) ${m.pass ? "PASS" : "FAIL"} | fg ${m.fg} / bg ${m.bg} ` +
      `| ${m.fontSize}px ${m.fontWeight} | "${m.text}"`
    );
  }
}

test.describe("@contrast", () => {
  for (const route of ROUTES) {
    test(`contrast ${route.name}`, async ({ page }, testInfo) => {
      const theme = testInfo.project.metadata.contrastTheme as Theme;
      await setThemeBeforeNavigation(page, theme);
      await page.goto(route.path, { waitUntil: "load" });
      await expect(page).toHaveTitle(route.title);
      await expect(page.getByRole("main")).toBeVisible();
      if (route.path.startsWith("/preise/")) {
        await expect(page.locator('[data-pricing-ready="true"]')).toBeVisible();
      }
      await page.evaluate(() => document.fonts.ready);

      const measurements = await measure(page, route.samples);
      report(route.name, theme, measurements);

      const missing = measurements.filter((m) => !m.found && m.required).map((m) => m.label);
      expect(missing, "required contrast samples must resolve to a visible element").toEqual([]);
      const failures = measurements
        .filter((m) => m.found && !m.pass)
        .map((m) => `${m.label} ${m.ratio}:1 < ${m.threshold} (fg ${m.fg} / bg ${m.bg})`);
      expect(failures, `WCAG AA contrast failures on ${route.name} (${theme})`).toEqual([]);
      expect(measurements.length).toBeGreaterThanOrEqual(route.samples.length);
    });
  }

  test("contrast theme token matrix (badges, alerts, body, link-primary)", async ({ page }, testInfo) => {
    const theme = testInfo.project.metadata.contrastTheme as Theme;
    await setThemeBeforeNavigation(page, theme);
    // Any real page loads the compiled theme CSS; the probes below are then
    // measured with the same tokens the components use.
    await page.goto("/", { waitUntil: "load" });
    await expect(page.locator("html")).toHaveAttribute("data-theme", `reisinger-${theme}`);
    await page.evaluate(() => document.fonts.ready);

    const measurements = await page.evaluate((matrix) => {
      const host = document.createElement("div");
      host.id = "contrast-probe";
      host.style.cssText = "position:fixed;left:0;top:0;display:flex;flex-direction:column;gap:4px;z-index:99999";
      for (const item of matrix) {
        const el = document.createElement("span");
        el.className = item.classes;
        el.textContent = item.text;
        host.appendChild(el);
      }
      document.body.appendChild(host);

      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 1;
      const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
      type Rgba = [number, number, number, number];
      const resolve = (css: string): Rgba => {
        if (!CSS.supports("color", css)) throw new Error(`Unsupported CSS color: ${css}`);
        const over = (bg: string): Rgba => {
          ctx.globalCompositeOperation = "source-over";
          ctx.fillStyle = bg;
          ctx.fillRect(0, 0, 1, 1);
          ctx.fillStyle = css;
          ctx.fillRect(0, 0, 1, 1);
          const d = ctx.getImageData(0, 0, 1, 1).data;
          return [d[0], d[1], d[2], d[3]];
        };
        const w = over("#ffffff");
        const b = over("#000000");
        const alpha = 1 - ((w[0] - b[0]) + (w[1] - b[1]) + (w[2] - b[2])) / (3 * 255);
        if (alpha <= 0.0001) return [0, 0, 0, 0];
        return [b[0] / alpha, b[1] / alpha, b[2] / alpha, alpha];
      };
      const comp = (fg: Rgba, bg: Rgba): Rgba => {
        const a = fg[3] + bg[3] * (1 - fg[3]);
        if (a <= 0.0001) return [0, 0, 0, 0];
        return [
          (fg[0] * fg[3] + bg[0] * bg[3] * (1 - fg[3])) / a,
          (fg[1] * fg[3] + bg[1] * bg[3] * (1 - fg[3])) / a,
          (fg[2] * fg[3] + bg[2] * bg[3] * (1 - fg[3])) / a,
          a
        ];
      };
      const backgroundOf = (el: Element): Rgba => {
        const stack: Rgba[] = [];
        let node: Element | null = el;
        while (node) {
          const bg = resolve(getComputedStyle(node).backgroundColor);
          if (bg[3] > 0) stack.push(bg);
          node = node.parentElement;
        }
        let base: Rgba = stack.length ? stack[stack.length - 1] : [255, 255, 255, 1];
        base = comp(base, [255, 255, 255, 1]);
        for (let i = stack.length - 2; i >= 0; i--) base = comp(stack[i], base);
        return base;
      };
      const luminance = ([r, g, b]: Rgba): number => {
        const lin = (v: number) => {
          const s = v / 255;
          return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
        };
        return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
      };
      const rgb = (c: Rgba) => `rgb(${c.slice(0, 3).map((v) => Math.round(v)).join(", ")})`;

      const results = matrix.map((item, index) => {
        const el = host.children[index] as Element;
        const style = getComputedStyle(el);
        const bg = backgroundOf(el);
        const fg = comp(resolve(style.color), bg);
        const ratio = (Math.max(luminance(fg), luminance(bg)) + 0.05) / (Math.min(luminance(fg), luminance(bg)) + 0.05);
        return {
          label: item.label, found: true, required: true, text: item.text, colorCss: style.color,
          fg: rgb(fg), bg: rgb(bg), fontSize: parseFloat(style.fontSize),
          fontWeight: Number(style.fontWeight) || 400,
          ratio: Math.round(ratio * 100) / 100, threshold: 4.5,
          pass: ratio + 1e-9 >= 4.5, selector: item.classes
        };
      });
      host.remove();
      return results;
    }, MATRIX);

    report("theme-matrix", theme, measurements);
    const failures = measurements
      .filter((m) => !m.pass)
      .map((m) => `${m.label} ${m.ratio}:1 < ${m.threshold} (fg ${m.fg} / bg ${m.bg})`);
    expect(failures, `WCAG AA contrast failures in the theme token matrix (${theme})`).toEqual([]);
  });
});
