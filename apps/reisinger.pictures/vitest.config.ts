import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // Mirror the `@reisinger/shared/*` tsconfig path alias (Astro/Vite resolves
    // it at build time) so unit tests can import the shared pricing/utils
    // modules with the same specifier as the application code.
    alias: {
      "@reisinger/shared": fileURLToPath(new URL("../../packages/shared", import.meta.url))
    }
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.ts"]
  }
});
