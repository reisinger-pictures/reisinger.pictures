import nodePath from "node:path";
import { pathToFileURL } from "node:url";

const TARGET_PATH = "/src/styles/global.css";
const VARIABLE_PREFIX = "--site-container-width-";
// A `var(--site-container-width-sm)` reference, with or without a fallback.
const VARIABLE_PATTERN = /var\(--site-container-width-([a-z0-9]+)\s*[,)]/g;

export default function containerSizesPlugin() {
  let sharedModulePath;
  let isDev = false;

  return {
    name: "container-sizes",
    enforce: "pre",

    configResolved(config) {
      sharedModulePath = nodePath.resolve(config.root, "../../packages/shared/utils/container-sizes.mjs");
      isDev = config.command === "serve";
    },

    async transform(code, id) {
      // Vite appends a query (`?direct`, `?v=…`) to some module ids; the
      // target path must be compared without it.
      const filePath = id.split("?")[0];
      if (!filePath.endsWith(TARGET_PATH)) return;

      let sizes;
      try {
        // Node caches ESM modules by URL, so in dev the query busts the cache
        // and an edited module reaches the stylesheet without a restart.
        const specifier = pathToFileURL(sharedModulePath).href + (isDev ? `?t=${Date.now()}` : "");
        ({ CONTAINER_SIZES: sizes } = await import(specifier));
      } catch (error) {
        this.error(`[container-sizes] Failed to read ${sharedModulePath}: ${error.message}`);
        return;
      }
      if (!sizes || Object.keys(sizes).length === 0) {
        this.error(`[container-sizes] Shared module exports no container sizes: ${sharedModulePath}`);
        return;
      }

      // Fail closed in both directions. The stylesheet and the shared module
      // must agree on the breakpoint set, otherwise one side applies a width
      // the other does not know about — the silent drift this removes.
      const referenced = new Set([...code.matchAll(VARIABLE_PATTERN)].map((match) => match[1]));
      const unknown = [...referenced].filter((key) => !(key in sizes));
      if (unknown.length > 0) {
        this.error(
          `[container-sizes] ${filePath} references ${unknown.map((key) => `${VARIABLE_PREFIX}${key}`).join(", ")}, ` +
            `but the shared module provides ${Object.keys(sizes).map((key) => `${VARIABLE_PREFIX}${key}`).join(", ")}.`
        );
        return;
      }
      const unused = Object.keys(sizes).filter((key) => !referenced.has(key));
      if (unused.length > 0) {
        this.error(
          `[container-sizes] The shared module provides ${unused.map((key) => `${VARIABLE_PREFIX}${key}`).join(", ")}, ` +
            `but ${filePath} never references them — the width would reach one side only.`
        );
        return;
      }

      // The declarations are emitted as a `@theme` block of their own: a
      // top-level declaration is invalid CSS and would be dropped, leaving the
      // container without a width.
      const declarations = Object.entries(sizes)
        .map(([breakpoint, width]) => `    ${VARIABLE_PREFIX}${breakpoint}: ${width};`)
        .join("\n");
      const block = [
        "",
        "/* Container widths — injected from the shared module, the single source of truth. */",
        "@theme {",
        declarations,
        "}",
        "",
      ].join("\n");
      return `${code.replace(/\n*$/, "\n")}${block}`;
    },
  };
}
