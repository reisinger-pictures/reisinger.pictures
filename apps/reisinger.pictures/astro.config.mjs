import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import solidJs from "@astrojs/solid-js";
import imageMetaPlugin from "./vite-plugin-image-meta.mjs";

// https://astro.build/config
export default defineConfig({
  image: {
    dangerouslyProcessSVG: true
  },
  // `/preise/friends` is the friend deep link: it opens the Flex tab and
  // pre-arms the friend discount in the Standard tab (`code=friend` unlocks the
  // option, `friend=true` selects it). The friend option exists only in the
  // Standard tariff — the redirect does not add a discount to Flex.
  // Owner decision 2026-10-19, rules/06-pricing-publication.md.
  redirects: {
    "/live": "/portal",
    "/privat/preise": "/preise",
    "/tfp/resident-model": "/tfp/",
    "/preise/friends": "/preise/?tarif=flex&code=friend&friend=true"
  },
  site: "https://reisinger.pictures",
  cacheDir: "./.cache",
  devToolbar: {
    enabled: false
  },
  build: {
    concurrency: 4
  },
  vite: {
    cacheDir: ".cache/.vite",
    plugins: [tailwindcss(), imageMetaPlugin()],
    optimizeDeps: {
      include: [
        "astro/virtual-modules/transitions-router.js",
        "astro/virtual-modules/transitions-types.js",
        "astro/virtual-modules/transitions-events.js",
        "astro/virtual-modules/transitions-swap-functions.js",
        "photoswipe/lightbox",
        "photoswipe"
      ]
    }
  },
  integrations: [mdx(), solidJs(), sitemap({
    serialize(item) {
      // Prioritize key pages for crawlers.
      if (!item.url.endsWith("/")) return item;
      const path = new URL(item.url).pathname;
      if (path === "/") item.priority = 1.0;
      else if (path === "/personal-branding/" || path === "/eventfotografie/") item.priority = 0.9;
      else if (path.startsWith("/shootings/")) item.priority = 0.8;
      else if (path.startsWith("/portfolio/")) item.priority = 0.7;
      else if (path.startsWith("/tfp/") || path.startsWith("/testimonials/")) item.priority = 0.7;
      else if (path === "/preise/" || path === "/ueber-mich/") item.priority = 0.8;
      else if (path === "/portal/") item.priority = 0.7;
      else if (path === "/impressum/" || path === "/dsb/" || path === "/agb/") item.priority = 0.3;
      return item;
    }
  })]
});