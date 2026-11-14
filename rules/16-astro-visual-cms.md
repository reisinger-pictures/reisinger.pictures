# Dev-only visual CMS editor (`astro-visual-cms`)

`@all-the.rest/astro-visual-cms` is pinned exactly to `0.1.3` as a **dev dependency**.
It is a loopback-only editor plus a dev-only Astro bridge — no production CMS or auth.

## Trusted halves, ports, loopback

* `apps/reisinger.pictures/avcms-editor.json` is the trusted server configuration for the
  standalone editor (`cms:editor`, port 4323), its preview routes and component targets.
* `astro.config.mjs` imports the same file and passes `port` + `previewRoutes` to
  `createLoopbackDevIntegration`. Do not duplicate the route list; paths outside the
  catalog are never mapped.
* The integration returns early unless Astro runs `command === 'dev'`; build/preview get
  no bridge, toolbar entry or Vite overlay. It also forces `server.host: 127.0.0.1`, and
  the editor binds loopback only. Production builds must install devDependencies because
  `astro.config.mjs` imports this dev package (as it already did for `astro-image-cdn`).
* `dev` runs `astro dev --host 127.0.0.1 --port 4321`. App-wide
  `vite.server.strictPort: true` makes every dev run fail on a busy port instead
  of drifting into the editor's 4323; `sitePort` stays 4321.
* `devToolbar.enabled` stays `false`, so open `http://127.0.0.1:4323/` directly.
* `fixturePath` is `null`, explicitly disabling the unused demo Gallery adapter;
  the key is required, and omitting it is a configuration error. Reisinger galleries
  are content/prop driven, not literal Astro frontmatter arrays.

## Configured component target (proposal only)

* One real `mdxComponentTargets` entry: `src/content/privateAreas/akt.mdx`, import
  `@reisinger/shared/components/ContactCTA.astro`, identity prop `subjectPrefix`
  (`"AKT"`), editable `text` (string) and `design` enum. The enum mirrors the
  component's `Props` union (`primary`, `outline`, `elegant-link`); unconfigured props
  such as the `message` expression are preserved but never editable.
* `src/avcms-editor-config.test.ts` and `src/avcms-component-target.test.ts` keep config,
  route, component union and diff-only proposal behaviour in sync. The editor **requires
  the content store**: the target file must be a regular in-root file or the server
  refuses to start; clones without `src/content/` cannot run it (no synthetic fallback).
* Component prop preview is **diff only**: exact source range plus before/after literals
  and a path-free proposal. The iframe keeps rendering the **saved** page, so a proposal
  is never rendered and no file is written (`SOURCE_REPLACEMENT_DISABLED`).
* `mdxBlockTargets` stays empty. Block preview requires Astro's dev route to transform
  the draft source; Content Layer routes such as `/shootings/akt/` render from the
  collection store, so such a draft is cancelled and stays read-only. MDX remains the
  content source of truth; nothing is converted to a JSON/directive model.

## Collections stay read-only

* **Primary reason:** every glob collection uses the mixed `**/[^_]*.{md,mdx}` pattern,
  outside the supported literal `*.md`, `*.mdx`, `**/*.md`, `**/*.mdx` set.
* **Secondary limitations** (would still block a supported pattern): imported enums
  (`portfolio`, `testimonials`), shared `shootingAreaSchema` (`privateAreas`,
  `sportAreas`), `simple`'s `date` expression, and `file()` loaders (`agb`, `dsb`, …).
* Existing-source replacement is disabled, so the only possible write is exclusive
  creation of a new entry — unavailable while every collection is read-only.

## Verification scope
`src/content/` is git-ignored and `.astro-image-cdn/manifest.json` comes from `prebuild`.
Without them dev routes and `astro build` fail with content/image errors unrelated to
this integration. Validate the config test, editor startup, endpoint guards, the
diff-only component proposal and production-isolation markers here; leave rendered route
review and a green build to the owner's full checkout.
