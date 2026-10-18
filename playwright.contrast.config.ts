// Focused WCAG AA contrast matrix (ui-review checklist item 11). Local-only,
// deliberately separate from functional E2E and CI. No pixel baselines, no new
// dependency: colors are resolved through the browser's own parser.
import { defineConfig } from "@playwright/test";
import { reviewPort } from "./tests/screenshots/ui-review.helpers";

// Reuse an already running dev server when present (never stopped by us);
// otherwise start our own through the screenshot wrapper. Override with
// UI_CONTRAST_PORT for an isolated run.
const port = reviewPort(process.env.UI_CONTRAST_PORT);
const baseURL = `http://localhost:${port}`;

export default defineConfig({
  testDir: "./tests/contrast",
  testMatch: "**/contrast.spec.ts",
  fullyParallel: true,
  forbidOnly: true,
  retries: 0,
  workers: 2,
  timeout: 120000,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report/ui-contrast" }]],
  use: {
    baseURL,
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    reducedMotion: "reduce",
    locale: "de-AT",
    trace: "off",
    video: "off"
  },
  webServer: {
    command: "node tests/screenshots/dev-server.mjs",
    env: { UI_REVIEW_PORT: String(port) },
    url: baseURL,
    reuseExistingServer: true,
    timeout: 120000,
    gracefulShutdown: { signal: "SIGTERM", timeout: 15000 }
  },
  projects: [
    { name: "contrast-light", metadata: { contrastTheme: "light" }, use: { colorScheme: "light" } },
    { name: "contrast-dark", metadata: { contrastTheme: "dark" }, use: { colorScheme: "dark" } }
  ]
});
