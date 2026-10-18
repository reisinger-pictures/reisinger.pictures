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

`tests/screenshots/ui-review.config.ts` is the route/state manifest. Owner
decision 2026-10-18: **one page per page type is enough, plus every `simple`
page in full**. The manifest therefore keeps one representative per type
(homepage, blog post, portfolio overview and its pagination, a testimonial
detail page, a private and a sport shooting area, an area testimonials page,
the TFP overview plus one idea, and the calculator's Standard, Flex and
configured states) and covers all `simple` routes completely (preise, agb, dsb,
impressum, ueber-mich, personal-branding, eventfotografie, share, portal,
akt/ablauf, tfp) together with the 404 page. Direct URL loads deliberately
review the public entry points and deep links. Redirects (`/live`,
`/privat/preise`, the removed Resident Model URL) and the machine-readable feeds
are not captured: a redirect only duplicates its target under a wrong name, and
a feed has no reviewable UI. Static SSR content has no meaningful empty state:
do not duplicate filled pages under a fictional `empty` label.

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

The functional E2E suite has the same problem and the same solution. The Astro 7
CLI auto-backgrounds `astro preview` when it detects an agent environment
(`am-i-vibing`) and then exits immediately, which is why
`webServer.command: "pnpm preview …"` failed with
`Process from config.webServer exited early`. `apps/reisinger.pictures/playwright.config.ts`
therefore starts `apps/reisinger.pictures/e2e/preview-server.mjs`, which serves
the production `dist/` through Astro's public `preview()` API (also marked
experimental by Astro). It binds strictly (`vite.preview.strictPort`) so a
partially-available port fails loudly instead of silently serving something
else, owns only its own server and calls that server's `stop()` on SIGTERM or
SIGINT. `reuseExistingServer` keeps an already running server on 4322 reusable
and is never stopped by the suite. The port can be overridden with
`E2E_PREVIEW_PORT` (1024–65535); the config and the wrapper share that one
resolver so `baseURL` and the bound port cannot drift apart. The suite still
requires a prior build (`pnpm --filter reisinger.pictures build`), which
`test:e2e` performs itself.

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

### Section sampling (2026-10-18)

The unbounded run produced ~1900 PNGs / 1.5 GB, and the 198 full-page PNGs alone
were 858 MB (a ~92-screen `/testimonials/` capture is ~35 MB). A UI review wears
the eyes once, not repeatedly: the **page top** (hero, first content) and the
**footer** carry the review value, while the **image gallery in between** is bulk
the owner explicitly declared unimportant. The harness therefore

- does a reconnaissance scroll to the page end (no screenshots) to learn the
  section geometry, prove the "scroller must advance" check and assert the page
  height does not grow — lazy images are forced eager and awaited before it, so
  any growth is a real failure (`HEIGHT_GROWTH_TOLERANCE` only absorbs sub-pixel
  rounding); the tail offsets are re-anchored from a fresh measurement after
  arriving at the bottom;
- then runs **one capture pass** over the sampled offsets only
  (`sampledSectionIndexes`, `tests/screenshots/ui-review.helpers.ts`):
  - the first `leadingSections` screens (default 4, page top); a route may raise
    this in the manifest (e.g. when a block and the headings it links to must
    stay in the sample),
  - the last `trailingSections` screens (default 2 — the **footer**, which must
    not fall out of the sample),
  - and nothing in between (short pages collapse into a complete capture because
    the windows overlap). A page at or below `FULL_PAGE_MAX_SECTIONS` (8; the
    owner's guideline is ~10, lowered to 8 to keep the tree under the 500 MB
    budget) gets the single full-page overview PNG; longer, gallery-dominated
    pages get none.
- writes the `.json` for **every** capture, recording `sections` (total screens),
  `capturedSectionIndexes`, `capturedSections`, `footerSectionIndex`
  (`sections - 1`) and `fullPageOverview`.

Coverage limit, stated plainly: **the page top and the footer are captured; the
image gallery in between is deliberately not** — one page per route family and
all twelve `simple` pages individually (rules/10-ui-review-findings.md holds the
per-finding evidence). `secN` filenames are **not contiguous** (`sec0`…`sec4`,
then the last two, e.g. `sec90`, `sec91`). Sampling reduces file count, not the
honesty of the coverage statement: every non-sampled screen is explicitly not
looked at.
**Table-of-contents coverage limit (2026-10-18):** no template emits a table of contents any more
(`rules/12-table-of-contents.md`), so no manifest route carries one and no capture shows one. The
former `content-toc` entry (with `leadingSections: 6`) was removed again for that reason. If a page
gets a hand-placed `<TableOfContents />` and is worth reviewing, add it as a route and give it
enough `leadingSections` for the block and its target headings — otherwise the sampled top window is
simply not evidence about the table of contents.
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

## Automated contrast matrix

Checklist item 11 (colour contrast) is covered by a focused, separate Playwright
spec; it is not part of the screenshot harness and adds no pixel baseline:

```sh
pnpm test:contrast                        # light + dark, all checked combinations
pnpm test:contrast --project contrast-dark
pnpm test:contrast --grep pricing-standard-student
UI_CONTRAST_PORT=44327 pnpm test:contrast # isolated dev server
```

`playwright.contrast.config.ts` drives `tests/contrast/contrast.spec.ts`. It
checks the colour combinations that the reviewed routes actually render (flow
text, links, primary/outline buttons, price and hint text, badges) and a theme
token matrix built from the class strings the components really use. Colours are
read from the live document and resolved through a canvas, so `oklch` and
`color-mix()` are measured exactly as the browser composites them; transparent
backgrounds are composited through the ancestor chain. Normal text must reach
WCAG AA 4.5:1, large text 3:1. A failing combination is a real finding — record
it and fix the token or the usage deliberately, never by widening the threshold.
Classes the project does not render (e.g. `alert-info`, `link-primary`) are
deliberately not probed: Tailwind emits only used classes, so probing them would
measure unstyled markup instead of a theme token.
