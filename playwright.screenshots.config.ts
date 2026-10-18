// Local pixel capture only; deliberately separate from functional E2E and CI.
import { defineConfig, devices } from "@playwright/test";
import { reviewViewports, uiReviewConfig } from "./tests/screenshots/ui-review.config";
import { reviewPort, reviewTargets } from "./tests/screenshots/ui-review.helpers";

const port = reviewPort();
const baseURL = `http://localhost:${port}`;

export default defineConfig({
  testDir: "./tests/screenshots",
  testMatch: "**/ui-screenshots.spec.ts",
  fullyParallel: true,
  forbidOnly: true,
  retries: 0,
  workers: 2,
  timeout: 120000,
  reporter: [["html", { open: "never", outputFolder: "playwright-report/ui-screenshots" }]],
  use: {
    baseURL,
    reducedMotion: "reduce",
    locale: "de-AT",
    trace: "off",
    video: "off",
  },
  webServer: {
    command: "node tests/screenshots/dev-server.mjs",
    env: { UI_REVIEW_PORT: String(port) },
    url: baseURL,
    reuseExistingServer: true,
    timeout: 120000,
    gracefulShutdown: { signal: "SIGTERM", timeout: 15000 },
  },
  outputDir: uiReviewConfig.outputDir,
  projects: reviewTargets.map((target) => ({
    name: `${target.viewport}-${target.theme}`,
    metadata: { uiReview: target },
    use: {
      ...(target.viewport === "mobile" ? devices["Galaxy A55"] : devices["Desktop Chrome"]),
      viewport: reviewViewports[target.viewport],
      deviceScaleFactor: 1,
      colorScheme: target.theme,
    },
  })),
});
