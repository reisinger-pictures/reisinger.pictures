# Shooting areas: two collections, two compositions, unchanged URLs

Owner commission 2026-10-18 (backlog "Shooting area pages redesign", step 1 and
2). The former single `areas` collection is split into a private and a sport
content structure, and the three private offer pages get their own
photography-led editorial composition. The sport pages keep their existing
composition until a separate, explicit commission.

## Collections and directories

One shared schema, two collections (`apps/reisinger.pictures/src/content.config.ts`):

| Collection | Base directory | Entry ids |
| --- | --- | --- |
| `privateAreas` | `src/content/privateAreas/` | `akt`, `beauty`, `couples` |
| `sportAreas` | `src/content/sportAreas/` | `sport`, `sport/<sub-area>` (14 sub-areas) |

- Both collections use the same frontmatter schema (`name`, `description`,
  `priority`, `testimonials`, `images`, `heroImage`). No content was rewritten:
  file names, frontmatter and bodies moved 1:1.
- **Directory shape is URL-relevant.** The glob loader derives an entry id from
  the path relative to `base` and strips a trailing `/index` segment only after
  a path segment. Therefore `sportAreas/sport/index.mdx` (base
  `./src/content/sportAreas`) yields the id `sport`, while a bare
  `sportAreas/index.mdx` would yield `index`. The `sport/` folder level must
  stay inside the sport collection for the URLs to survive.
- `src/content` is git-ignored (`apps/reisinger.pictures/src/.gitignore` →
  `/content`), so the file moves are invisible in `git status`. They are only
  visible in the build output and the dev server. A pre-move backup lives at
  `src/content/_areas-backup-2026-10-18/` (a leading `_` makes Astro ignore the
  whole folder — see `hasUnderscoreBelowContentDirectoryPath`).

## URL, meta, breadcrumbs, schema and sitemap preservation

- One route renders both collections:
  `src/pages/shootings/[...area]/index.astro` sets
  `params.area = entry.id`. Because the ids are unchanged, every existing URL is
  unchanged — `/shootings/akt|beauty|couples/`, `/shootings/sport/` and all
  `/shootings/sport/<sub>/`. There are no redirects.
- `<title>`, `<meta description>`, `<link rel="canonical">` and the
  `WebPage` schema.org node are derived from the unchanged entries (`name`,
  `description`, `heroImage`), so they stay identical.
- `Breadcrumbs.astro` builds ancestors from `contentPrefixConfig`, typed as
  `Record<DataCollectionKey, string>` (exhaustive over the configured
  collections). Removing `areas` therefore **requires** adding both
  `privateAreas: "shootings"` and `sportAreas: "shootings"`; otherwise the
  breadcrumb trail (and its `BreadcrumbList` JSON-LD) for `/shootings/**`
  silently disappears.
- The `@astrojs/sitemap` integration enumerates the generated routes, so the
  sitemap entries and the `/shootings/` priority (0.8) follow the unchanged URL
  set. Nothing else in `astro.config.mjs` refers to the collection.
- `/shootings/*area/testimonials` is a separate template driven by the
  `testimonials` collection; it is out of scope and untouched.

## Related posts: `getPortfolioPrefix`, `selectRelatedPosts`, `getRelatedPostsConfig`

The area → portfolio-prefix mapping moved unchanged from the route into
`src/data/shooting-areas.ts` (`getPortfolioPrefix`), with unit tests in
`src/data/shooting-areas.test.ts`. The mapping (direct map, sport team map,
`sport/` fallback to the general sport hub, otherwise the area id) is identical
to before.

`selectRelatedPosts(posts, prefix, limit = 3, tag?)` is newest-first, does not
mutate its input, and keeps the original prefix filter (`prefix + "/"` or bare
`prefix`) and the 3-post default for every existing caller. The optional fourth
argument is a D2 `PortfolioTag`: when it is set it **replaces** the prefix, so
only posts whose `data.tags` contains that tag are eligible and the general
`sport` mix never leaks in. A post without tags is never selected for a tag.

`getRelatedPostsConfig(areaId, name)` is the single source of the block's
selection and presentation (`rules/11-sport-area-redesign-proposal.md` §9 step 7):

| Area | Selection | Limit | Heading | Date |
| --- | --- | --- | --- | --- |
| `sport` (overview) | prefix `sport` | 6 | `Neu im Sport` | yes |
| 5 art hubs | prefix per mapping | 3 | `Neu in <name>` | yes |
| 5 prefix-mapped teams | prefix per mapping | 3 | `Neu bei <name>` | yes |
| 4 tag teams (Dragons, Vikings, ACSL, SteelVolleys) | explicit tag only | 3 | `Neu bei <name>` | yes |
| private offers (akt, beauty, couples) | prefix per mapping | 3 | `Aktuelle Einblicke` | no |

The heading reuses the entry's existing `name`; no wording is invented. The
shared `AreaRelatedPosts.astro` block renders the heading and forwards
`showDate` to `PortfolioCard`/`ContentCard`, whose optional date defaults **off**,
so archive, carousel and every other `ContentCard` consumer stay unchanged. The
date itself comes from the existing `FormattedDate.astro`. SteelVolleys has no
tagged post, so its block renders no heading — as today when a list is empty.

## Portfolio post tags (`tags`, D2)

The `portfolio` collection carries an optional, controlled `tags` field
(`apps/reisinger.pictures/src/content.config.ts`). It exists for one purpose: to
attach a post to a sport team/league area whose portfolio prefix is only the
broad `sport` bucket — Dragons, Vikings, ACSL and SteelVolleys
(`rules/11-sport-area-redesign-proposal.md` §8, D2). Step 7 consumes the tags in
the related-posts block; step 6 introduces only the field, the vocabulary and the
evidenced assignments, and leaves the prefix mapping and the filtering unchanged.

- **Controlled vocabulary.** The allowed values are the single source of truth in
  `src/data/portfolio-tags.ts` (`PORTFOLIO_TAGS`), imported by the schema. Each
  value equals the suffix of its `/shootings/sport/<team>/` area id: `dragons`,
  `vikings`, `acsl`, `steelvolleys`. All four are allowed by the schema even
  where no post carries the tag yet — there is no SteelVolleys portfolio post
  today. Never widen the vocabulary without the owner decision and the schema.
- **Evidence requirement.** A tag may be set only when the post's own `title`,
  `description` or body names the team or league. Never infer a tag from the
  sport, the opponent, an image slug, a filename or an unrelated page. A post
  that does not name a team stays **untagged**; it is not attached to a team area
  by guesswork.
- **Main subject, not a mere mention.** Naming the team is necessary but not
  sufficient: the post's **main subject** must be that team/league, its event or
  its coverage. A post that only mentions a team in passing (for example the
  Canon EOS R1 gear review `reviews/r1`, which names ACSL among many other
  sports while reviewing a camera) does **not** qualify and stays untagged. When
  in doubt, leave the post untagged — a wrong tag puts an unrelated post on a
  team page.
- **Single and multiple tags.** A post may carry one or several tags: a game that
  names two teams (e.g. the shared Dragons-vs-Vikings AFL entries) carries both
  `dragons` and `vikings`. Set every evidenced tag, in `PORTFOLIO_TAGS` order.
- **Boundary.** Tags serve the team-area related posts only. They do not replace
  `getPortfolioPrefix`, and the five other team pages keep their existing narrower
  portfolio prefixes and get no tags. A tag changes no URL, no slug, no image and
  no other frontmatter. The author-facing assignment policy lives in the
  project-local `blog-beitrag` skill.

## Two compositions, shared building blocks

- `src/components/areas/PrivateAreaPage.astro` — the redesigned private offer
  composition (Akt, Beauty, Pärchen).
- `src/components/areas/SportAreaPage.astro` — the sport composition, moved
  verbatim from the former single template. Sports are only redesigned on a
  separate owner request; do not restyle them while touching this split.
- Shared, repeating building blocks (one component per repeating element):
  - `AreaHero.astro` — eyebrow, `h1`, lead text and the hero photograph. On
    mobile the order is heading → photograph → lead text (photo early); on
    desktop one editorial grid with the photograph spanning both rows.
  - `AreaSection.astro` — semantic `<section>` with optional eyebrow/`h2` and a
    readable heading level, used for the reviews and gallery blocks.
  - `AreaOfferRoute.astro` — the route to the matching offer. It links only to
    **existing** pages (`/preise/` and `/shootings/<area>/testimonials`) and to
    the sibling private offers; the sibling labels are reused from
    `src/data/Menue.ts`, never re-invented from the long marketing `name`s.
  - `AreaRelatedPosts.astro` — the related-posts block, shared by both
    compositions; its heading and optional date are configurable per page.
- Design rules for the private pages: photography-led and quiet, semantic
  headings, readable sections instead of a grey card stack, left-aligned body
  headings inside the article (the global base layer centers `h1..h4`), no
  shadows or decorative pills, both daisyUI themes via semantic tokens
  (`base-*`, `primary`) and visible focus (`focus-visible:outline-*`).
- **No invented offers:** no prices, deliverables, durations or usage rights are
  added. Private-page copy links to the existing calculator and reviews; rule 06
  remains authoritative for pricing and publication wording.

## Verification boundary

Unit tests and lint run locally. The display was checked with targeted `curl`
requests against the running dev server: all 18 URLs return HTTP 200 with
unchanged titles, and the sport pages' `<main>` markup is byte-identical to the
pre-split baseline. **Not** covered here: the production build (`astro check`,
`prebuild`/`postbuild` `check_links`, sitemap output) and the screenshot/vision
UI review. Both are still required before this is called done; rule 05's note
about the dev server not re-reading a changed, git-ignored `areas/*.mdx` inside a
long-running daemon applies to content edits, not to this structural move.
