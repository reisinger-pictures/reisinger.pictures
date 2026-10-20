// The single source of truth for the content-container widths.
//
// The TypeScript side imports this module (packages/shared/utils/Breakpoints.ts),
// so the `sizes` attribute of responsive images and the layout width stay the
// same. The CSS side cannot import a module, so
// `apps/reisinger.pictures/vite-plugin-container-sizes.mjs` reads this file at
// build time and appends the widths to `global.css` as `--site-container-width-*`.
//
// Adding a breakpoint means changing this file **and**
// `container-sizes.d.mts` (the type declaration lists the keys) **and** the
// `.container` rule in `global.css`. The plugin fails the build when the two
// sides disagree, so a forgotten change cannot pass silently.
export const CONTAINER_SIZES = Object.freeze({
  sm: "540px",
  md: "720px",
  lg: "960px",
  xl: "1140px",
  "2xl": "1320px",
});
