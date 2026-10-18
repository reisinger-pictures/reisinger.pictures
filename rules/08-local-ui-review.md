# Repeatable local UI review

Run from the monorepo root:

```sh
pnpm test:ui
```

This extends the existing screenshot harness, not functional E2E. The existing
`pnpm test:screenshots` command is retained as an equivalent entry point. No CI,
baseline comparison, build, content metadata generation, or publication runs.
Chromium must already be available through the project's Playwright setup.

## Scope and filters

`tests/screenshots/ui-review.config.ts` is the route/state manifest. Existing
portfolio, pagination, content, testimonials, shooting and TFP routes remain.
The homepage, Standard example, Flex default and configured Akt/Boudoir private
Flex view are included. Direct URL loads deliberately review the public entry
points/deep links. Static SSR content has no meaningful empty state: do not
duplicate filled pages under a fictional `empty` label.

Every route runs in these six projects:

| Project | CSS viewport | Theme |
| --- | --- | --- |
| mobile-light / mobile-dark | 480 × 1040 (Galaxy A55 profile) | light / dark |
| intermediate-light / intermediate-dark | 1024 × 900 | light / dark |
| desktop-light / desktop-dark | 1920 × 950 | light / dark |

All projects use Chromium, device scale factor 1, German/Austria locale and
reduced motion. Project metadata identifies viewport/theme; unknown metadata
fails instead of silently becoming desktop. There are six projects, not a
second viewport loop multiplying skipped tests.

```sh
pnpm test:ui --grep 'home|pricing'
pnpm test:ui --grep pricing-flex --project mobile-dark
pnpm test:ui --project intermediate-light --project desktop-light
pnpm test:ui:unit
```

## Server lifecycle

The default URL is `http://localhost:4325`. An already running server is reused
and **never stopped** by this harness. Each capture checks the manifest's actual
rendered title to reject an unrelated app on that port. Calculator captures also
wait for hydration and the requested active tab; no monetary/business assertions
belong here.

If no server responds, Playwright starts `tests/screenshots/dev-server.mjs`.
It uses Astro's public `dev()` API because the installed Astro 7 CLI can hand off
to a background daemon and exit before Playwright considers it started (there
is no documented CLI foreground flag). The wrapper owns only the server it
creates, uses strict port binding, and calls that server's `stop()` on SIGTERM
or SIGINT. Its child-process working directory is the app directory, matching
the normal filtered dev command and the image manifest's relative paths.
It never invokes Astro's global `dev stop`, kills a shared process,
deletes caches, or writes environment files. The public Astro JS API is marked
experimental by Astro; check it when upgrading Astro.

For an isolated local port, including cold-start verification without disturbing
someone else's dev/preview server:

```sh
UI_REVIEW_PORT=44325 pnpm test:ui --grep pricing-standard --project mobile-light
```

The port must be 1024–65535. Do not launch another process on the shared 4325
port just to test lifecycle. No production build is required for this command.

## Deterministic pixels and artifacts

The app's actual themes are `reisinger-light` and `reisinger-dark` in
`src/styles/global.css`. There is currently no JavaScript/local-storage theme
controller. An init script sets `html[data-theme]` before first paint; matching
browser color preferences are also configured. Readiness checks verify the
attribute **and rendered opaque page-surface RGB brightness** (not just a project
label). If a storage-based controller is introduced, update this initialization
to use its real storage key before navigation.

Captures wait for fonts, visible image loading/decoding, visible/client-load
island hydration and visible loading indicators to finish. Two animation frames
after scrolling allow layout/paint to settle; there are no arbitrary sleeps or
network-idle waits that can hang on development connections. CSS animations are
disabled during screenshots. Broken visible images fail readiness rather than
silently producing a successful incomplete capture.
Native lazy images are made eager before section traversal because the whole
page is in scope: their final dimensions must not expand an already-captured
section later. Long real pages (notably all testimonials) may need more than
100 sections; traversal follows the actual scroll extent, not an arbitrary
section-count cutoff. The per-test timeout still bounds a broken/infinite page.

```text
test-results/ui-screenshots/<state>/<theme>/<viewport>/<name>.png
test-results/ui-screenshots/<state>/<theme>/<viewport>/<name>-sec0.png
test-results/ui-screenshots/<state>/<theme>/<viewport>/<name>-sec1.png
test-results/ui-screenshots/<state>/<theme>/<viewport>/<name>.json
```

Full-page PNGs are overview artifacts. Readable viewport-height sections scroll
the real page (or an inner overflow container) in 80% steps, overlapping by 20%
through the footer. Lazy content is visited before the final full-page shot.
The JSON records viewport, theme, actual rendered title/URL, surface color and
section count. Theme and viewport directories prevent overwrites across all six
combinations. The HTML report lives in `playwright-report/ui-screenshots/`.
Both artifact trees are local/ignored. **Playwright clears its output directory
at the next run**, including filtered runs; copy evidence elsewhere first if it
must be retained. Never keep source/user files in that directory.
Playwright's `--output <directory>` is honored for an isolated capture run; pair
it with `--reporter line` to avoid replacing the normal HTML report as well.

## Review, not functional success

A green command proves only that capture identity/readiness succeeded. A human
or vision-capable agent must inspect full-page **and section** PNGs, grouped by
state, theme, viewport and route, using the `ui-review` skill checklist: contrast,
spacing, states, responsive behavior, hierarchy, interactions, German copy,
design consistency, overflow and branding. Long full-page PNGs alone are not
readable enough. Record concrete findings with screenshot paths; critical/high
findings block visual approval. Do not introduce pixel-baseline CI gates.

Keep calculator URL/price behavior in the separate functional E2E suite. Review
screenshots from a stable final working tree; captures taken while concurrent
app edits are landing are intermediate evidence, not final design approval.
