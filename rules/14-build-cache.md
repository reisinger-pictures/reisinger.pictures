# Build cache rationale

Rationale behind the cache rule in `AGENTS.md` §5 (`.cache/`, `.astro/` and `dist/` must
never be deleted on one's own initiative).

Astro manages these directories. Deleting them — even partially — corrupts image-hash
references, makes the build fail with `ENOENT` errors and forces unnecessary full
recomputations. For real cache problems, prefer `astro sync` (content index) and ask the
owner instead of clearing a cache.

## Container widths — one source, injected at build time

The content-container widths (`sm` 540 px, `md` 720 px, `lg` 960 px, `xl` 1140 px,
`2xl` 1320 px) live in exactly one place: `packages/shared/utils/container-sizes.mjs`.

* The **TypeScript** side imports that module (`packages/shared/utils/Breakpoints.ts`),
  so `computeSizes()` — which builds the `sizes` attribute of responsive images — reads
  the same numbers the layout uses.
* The **CSS** side cannot import a module, so
  `apps/reisinger.pictures/vite-plugin-container-sizes.mjs` reads the module at build
  time and appends a `@theme` block with the widths to `global.css`. The `.container`
  rule then uses `w-[var(--site-container-width-*)]`.

The plugin **fails the build** when the two sides disagree: a breakpoint the stylesheet
references but the module does not provide, or a breakpoint the module provides but the
stylesheet never references. Both would reintroduce the silent drift this mechanism
removes — the `sizes` attribute claiming a width the layout never applies.

Never write the widths into `global.css` a second time. A `var()` with a fallback
(`var(--site-container-width-sm, 540px)`) is also not accepted: the fallback would hide
a disagreement between the two sides.
