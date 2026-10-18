import { defineConfig } from "@playwright/test";

import { e2ePreviewPort } from "./e2e/preview-server.helpers";

const port = e2ePreviewPort();
const baseURL = `http://localhost:${port}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "on-first-retry"
  },
  webServer: {
    // Astro's CLI auto-backgrounds `astro preview` in agent environments and
    // exits early; the wrapper starts the real production preview through
    // Astro's public preview() API, owns that server and stops only it.
    command: "node e2e/preview-server.mjs",
    env: { E2E_PREVIEW_PORT: String(port) },
    url: baseURL,
    // An already running server is reused and never stopped by us; CI stays strict.
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    gracefulShutdown: { signal: "SIGTERM", timeout: 15_000 }
  }
});
