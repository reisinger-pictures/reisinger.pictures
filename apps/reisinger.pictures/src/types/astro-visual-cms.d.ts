/**
 * `@all-the.rest/astro-visual-cms` ships JavaScript only. This minimal local
 * declaration covers the dev-only editor server used by the integration test.
 */
declare module "@all-the.rest/astro-visual-cms/server" {
  import type { Server } from "node:http";

  export function createEditorServer(options?: Record<string, unknown>): Server;
}
