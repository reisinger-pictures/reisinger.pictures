# TFP ideas: presentation, ordering and the removed Resident Model offer

## Scope: the `tfp` collection holds ideas, not a lifecycle
- Every entry of the `tfp` collection (rendered under `/tfp/<id>/` by
  `src/pages/tfp/[slug].astro`) is an **idea for a possible creative
  collaboration** — a proposal, not a running/limited offer.
- Therefore there is deliberately **no** status/lifecycle field and no
  `active`/`idea`/`archived` enum, no second collection and no
  active/archived labels in the UI. An idea that is not pursued stays a normal
  collection entry; nothing is "closed".
- The overview `/tfp/` (`src/content/simple/tfp.mdx`) renders the collection
  through the reusable `TfpIdeaList.astro` component (cards via
  `TfpIdeaCard.astro`).

## Order and progressive disclosure
- Order = **descending `priority`** from the frontmatter (unchanged numeric
  values). Ideas that share a priority keep the collection loader's stable,
  deterministic id order — `Array.prototype.sort` is stable, so the result
  never shuffles between builds.
- The overview shows `INITIAL_TFP_IDEA_COUNT` (6) ideas and discloses the rest
  behind a native `<details>/<summary>` ("Weitere Ideen anzeigen (n)"), styled
  with daisyUI `collapse collapse-arrow`. Reasons: the disclosure is
  keyboard-operable and screen-reader-announced without client JavaScript, all
  idea links stay in the server-rendered HTML (crawlable, `details` only
  hides them visually), and the count in the label is derived from the data —
  never hardcoded.
- Ordering and the split live in `src/data/tfp-ideas.ts` (`sortTfpIdeas`,
  `splitTfpIdeas`) and are unit-tested in `src/data/tfp-ideas.test.ts`
  (>6, exactly 6, <6, empty).

## Removed Resident Model offer and its URL
- `src/content/tfp/resident-model.mdx` was deleted; there is **no** archive
  offer. Existing commitments from that programme are untouched.
- Its incoming URL is preserved with the existing Astro `redirects` map in
  `apps/reisinger.pictures/astro.config.mjs`:
  `"/tfp/resident-model": "/tfp/"`. `trailingSlash` is not configured
  ("ignore"), so the generated route pattern matches **both**
  `/tfp/resident-model` and `/tfp/resident-model/`.
- **Honest mechanism:** the SSG build emits a static HTML page
  (`dist/tfp/resident-model/index.html`) with `<meta http-equiv="refresh">`,
  `<link rel="canonical">` and `noindex` — i.e. a client-side redirect, **not**
  an HTTP 301 from the static host. Only the dev server answers with a real
  HTTP 301. Do not describe this as an HTTP redirect.
- Redirect targets are not part of `dist/sitemap-0.xml` (verified: `/live` is
  a redirect and is absent), so the removed URL does not re-enter the sitemap.

## Content rules for the TFP pages
- `/tfp/` copy is idea-first and calm: it explains that TFP is a *selected*
  creative collaboration, that nothing is guaranteed, and that boundaries
  (including boudoir/nudity) are agreed together and are never a precondition
  for other projects.
- The page links to the existing **paid** alternative
  (`/shootings/beauty/`) without pressure or referral duties.
- The material/studio cost note on `/tfp/` keeps its amount (max. 50 €) and
  no longer mentions a Resident-Model exception.
- The generic idea-detail page (`src/pages/tfp/[slug].astro`) uses
  idea/interest wording ("Über diese Idee sprechen", TFP contact prefill); the
  individual concept bodies stay unchanged, as do prices and usage rights of
  all other offers.

## Note on tracking
`apps/reisinger.pictures/src/.gitignore` ignores `/content`, so the whole
content tree (including `src/content/tfp/` and `src/content/simple/tfp.mdx`)
is local-only and does not appear in `git status`. Content changes in this
area are therefore only visible in the build output, not in a diff.
