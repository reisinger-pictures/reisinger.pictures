/**
 * Preview port for the functional E2E suite. Kept in one place so the Playwright
 * config's `baseURL` and the `preview-server.mjs` wrapper can never drift apart.
 * Mirrors the screenshot harness rule in `tests/screenshots/ui-review.helpers.ts`.
 */
export function e2ePreviewPort(value = process.env.E2E_PREVIEW_PORT): number {
  if (value === undefined) return 4322;
  if (!/^\d+$/.test(value) || Number(value) < 1024 || Number(value) > 65535) {
    throw new Error("E2E_PREVIEW_PORT must be an integer between 1024 and 65535");
  }
  return Number(value);
}
