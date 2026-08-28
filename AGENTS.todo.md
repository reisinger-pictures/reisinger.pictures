# 🚀 Florian Reisinger Fotografie - Monorepo Backlog

## Aktuelle Tasks

- [ ] **Dependencies: typescript 6→7** – 2026-08-25: Upgrade auf ~6.0.3 erledigt (astro check 0 Errors, Lint clean, vitest 29/29 inkl. 18 Feed-Tests, Build grün). TS 7 bleibt blockiert: @astrojs/check peer `^5||^6`, typescript-eslint peer `<6.1.0` – erst nach deren Support heben.

## Abgeschlossene Refactorings

- **Vite-Plugin** (`vite-plugin-image-meta.mjs`):
  - `transform` hook: hängt YAML-Metadaten (title, EXIF, slug, …) an jeden ESM-Image-Import an
  - `virtual:image-meta-index`: scannt `src/**/*.yaml`, exportiert `slug → metadata` (ersetzt `imageMetadata` Content Collection)
  - `virtual:image-slug-map`: scannt alle Images + Companion-YAMLs, exportiert `slug → () => import(...)` (ersetzt `import.meta.glob` in `Images.ts`)
- `slug-map.ts` als Drop-in-Ersatz für `Images.ts` (gleiche API: `getImage`, `tryGetImage`, `filterInvalidImageName`)
- `imageMetadata` Content Collection entfernt aus `content.config.ts`
- `image.utils.ts` verwendet jetzt `virtual:image-meta-index`
- `content/simple/akt/ablauf/index.mdx` + `content/simple/index.mdx`: alte `-gallery-` Slugs auf aktuelle Slugs migriert
- Shared Types in `src/types/image-metadata.ts` + `src/env.d.ts`
- `ResponsiveImage.astro`, `HeaderLogo.astro` verwenden embedded metadata aus dem Plugin
