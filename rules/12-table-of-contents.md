# Table of contents on portfolio posts — decision record

**Status: DECIDED 2026-10-18 — Option C, manual placement only.** The owner's wording:
*"Meine Idee war eher das Inhaltsverzeichnis ganz zu entfernen und nur ausgewählt manuell hinzuzufügen.
Also dieses 'jeder Portfolio-Eintrag hat automatisch ein Inhaltsverzeichnis' — davon möchte ich weg."*
and *"das gleiche für alle templates wo das immer dabei ist."* So no template emits a table of contents
any more; an author places it explicitly. The recommendation from the analysis below was Option A; the
owner chose C, and this document now records that decision. The option sections are kept as the
rationale the decision was weighed against — read them as the argument, not as the state; where the
implementation differs from the original sketch, a note says so.

- **Date:** 2026-10-18
- **Author of the analysis:** main agent, not the owner, not the implementer
- **Decision:** the automatic trigger is removed from every template; the generator stays
  (`src/middleware/toc.ts` still fills a placeholder), so a page gets a table of contents only where
  `<TableOfContents />` was written by hand.
- **Out of scope:** the jump bug, the missing `nav` semantics, the parse scope (all three fixed
  independently); the sport pages (`rules/11`); prices, rights and legal wording.

## 0. What was implemented for Option C

| Item | Before | After |
|---|---|---|
| `src/components/pages/BlogPost.astro:60` | `<div data-toc />` — **every** portfolio post got a ToC as soon as it had one heading | placeholder removed; nothing is emitted automatically |
| `src/pages/[...simple].astro:55` | `{showToc && <div data-toc />}` — `simple` pages got one by default, switchable per page | placeholder removed |
| `src/content.config.ts` | `showToc: z.boolean().default(true)` on the `simple` schema | field removed (it only switched the automatic placeholder) |
| `src/components/TableOfContents.astro` | did not exist | new component: renders the placeholder at the author's position |
| `src/pages/portfolio/[...slug].astro` + `src/pages/[...simple].astro` | `<Content />` | `<Content components={{ TableOfContents }} />`, so `<TableOfContents />` works in MDX without an import |
| `src/middleware/toc.ts` | generator, triggered by the templates | unchanged trigger logic, **kept**: it still replaces `<div data-toc>` wherever it appears |
| `createTocItems` (same file) | child entries appended without a wrapping `<ul>` (`<li><a>…</a><li>…</li></li>`) | children are wrapped in their own `<ul>`, so the nesting is real HTML |

Measured after the change on the built site: **0 of 283 built pages** contain a table of contents
(before: 65 of 136 portfolio posts plus 4 of 12 `simple` pages, §2). `showToc: false` in five
gitignored `simple` content files is now an inert key: Astro's zod schema strips unknown frontmatter
keys, so those files stay valid and the build is green (verified with `astro sync` and a full build).

## 1. How it worked before the decision

Back then there was no component. `src/middleware/toc.ts` post-processes the finished HTML of every page, looks
for the placeholder `<div data-toc></div>` and replaces it with

```html
<h2 class="text-left">Inhaltsverzeichnis</h2>
<ul><li><a href="#…">…</a>…</li></ul>
```

built from all `h2`–`h6` elements that carry an `id` (headings inside `<footer>` are excluded,
`h2` is the deepest supported top level, nesting is preserved).

The placeholder existed in two places:

| Place | Guard | Consequence |
|---|---|---|
| `src/components/pages/BlogPost.astro:60` | none | **every** portfolio post gets one, as soon as it has at least one heading |
| `src/pages/[...simple].astro:55` | `showToc` (frontmatter, default `true`) | the `simple` pages get one, and the author can switch it off per page |

So the mechanism was automatic, per-page controllable only on `simple` pages, and invisible in the
content: an author never wrote it.

## 2. What the numbers say

Measured against the built site (`apps/reisinger.pictures/dist`, 2026-10-18):

- **65 of 136** portfolio posts render a table of contents at all — it only appears once a post has
  sub-headings. The other 71 posts have none and are unaffected by the whole question.
- Of those 65, counting the injected entries:

  | entries | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 10 | 12 | 14 |
  |---|---|---|---|---|---|---|---|---|---|---|---|
  | posts | 7 | 12 | 21 | 9 | 4 | 5 | 3 | 1 | 1 | 1 | 1 |

  *(the three longest lists are approximate — the count was taken from a fixed window of the markup)*
- **Read off that: 19 of 65 have one or two entries.** A heading "Inhaltsverzeichnis" above a single
  line costs vertical space before the article and gives nothing back. Cumulative: at least three
  entries → 46 posts, at least four → 25 posts, at least five → 16 posts.
- **26 of the pages that have headings use nested levels** (`h3` under `h2`), so the nesting support
  is not decorative.
- Text length per page (whole page text, so approximate): median ≈ 895 words, 75th percentile
  ≈ 1300, 90th ≈ 1850, longest ≈ 5270. The long end is exactly where a table of contents is useful.
- On the `simple` pages the built output carries one on **4 of 12** pages (`/agb/`, `/akt/ablauf/`,
  `/portal/`, `/eventfotografie/`); the rest have too few headings.
- **Review coverage:** the screenshot manifest's post example has no headings, so no capture has
  ever shown the table of contents. It was closed by adding a post that has one (`content-toc`); that
  manifest entry was removed again when the automatic trigger went away (§0), so today no route
  captures a table of contents.

## 3. What "user-friendly" would mean here

| Aspect | Today | Assessment |
|---|---|---|
| Position | after the lead paragraph and a separator, before the body | good — the reader sees it before committing to the text |
| Appearance | plain bulleted list, left aligned, inherits the page's type | adequate; it reads as a list, not as chrome |
| Cost on mobile | takes the full height of its entries before the first paragraph | **the crux**: for 10 entries this is a real aid, for 1–2 entries it is pure cost |
| Semantics | bare `h2` + `ul` | being fixed (navigation landmark) |
| Jump accuracy | target hides under the sticky header | being fixed |
| Per-post control | none on posts (`showToc` exists only on `simple`) | an automatic page that renders a pointless list has no way out |

Two things follow from that table. First: **the mechanism is not the problem — the trigger is.** The
content, position and wording are fine; what is missing is a condition under which the list earns
the space it occupies. Second: the missing per-post switch is the only thing an author would
plausibly want that manual authoring would provide.

## 4. The options

### Option A — keep it automatic, gate the trigger, add a per-post switch (recommended)

Show it only from **four entries** upwards, and give portfolio posts the same frontmatter switch the
`simple` pages already have (`showToc: true|false`, default `true`). Everything else stays.

- Keeps: zero authoring effort, one mechanism, one wording, no drift.
- Removes: the 19 pointless one-to-two-entry lists; at a threshold of four, 25 of 136 posts keep it.
- Adds: a way out for the single post where the list is unwanted, without a second mechanism.
- Cost: one condition in the middleware (or in the placeholder render) plus one schema field.

### Option B — keep it automatic and unconditional

Only the three running bug fixes, no threshold, no switch.

- Cheapest, but ships a known noise case on 19 posts and leaves no per-post way out.
- Defensible only if the owner values absolute predictability over signal.

### Option C — place it manually per post (**chosen 2026-10-18**)

The automatic trigger goes away; a component is positioned by hand in each post that should have one.
As implemented (see §0) the middleware did **not** go away: it stays the single generator and only
stops being wired into every template, so the heading data, anchors and nesting still come from one
central place.

- Buys: exact placement, individual wording, per-post decision by construction, nothing rendered
  where nobody asked.
- Costs: every future post with sub-headings has to be maintained by hand; the content lives in the
  owner's store outside this repository, so a schema or template change cannot be rolled out from
  here; and switching later means touching ~25–46 posts. It also invites exactly the drift this
  project otherwise avoids by generating structures centrally.
- Slugs, headings and anchors would still have to come from the same heading data, so the middleware
  logic would not disappear — it would move into the component. (In the implementation it did not
  even move: it stayed where it was.)

### Option D — drop it

No table of contents anywhere.

- Simplest and removes the mobile cost entirely.
- But 26 posts with nesting and up to 14 sections describe a 5000-word article; a list of its
  sections is a real reading aid, and the generated table can only ever be as long as the article's
  own headings.

## 5. Recommendation at the time (not followed)

**Option A.** The measurements say the automatic mechanism is right and only over-triggers: two
thirds of all posts never render one, and of those that do, the bottom third render a list that costs
space. Gating at four entries keeps the benefit where the article is genuinely sectioned (25 posts,
a median of 895 words rising to 1850 at the 90th percentile) and drops the noise. The per-post switch
covers the exception without introducing a second way of doing the same thing, and it is already the
established pattern on the `simple` pages.

Manual placement (C) is the option that sounds tidiest and ages worst here: the posts live outside
this repository, so the effort is permanently per-post, and the longest lists are exactly the ones
that would be maintained by hand.

**The owner decided for Option C anyway**, on the ground that a table of contents should be a
deliberate choice of the author, not a template default. The cost named above (per-post maintenance)
is accepted knowingly; the trigger is gone for every template.

## 6. Decisions the owner was asked for (superseded by §0)

- **D1 — threshold.** Four entries (recommended), three, or none. — *moot with Option C: there is no
  automatic trigger left to threshold.*
- **D2 — per-post switch on portfolio posts.** Add `showToc` to the portfolio schema (recommended,
  mirrors `simple`), or leave posts without a switch. — *moot: the switch would only have controlled
  the automatic placeholder; with placement by hand there is nothing to switch, and `showToc` was
  removed from the `simple` schema instead.*
- **D3 — `simple` pages.** Keep the default `true` there (recommended; only 4 pages are affected),
  or invert the default so a page has to ask for it. — *moot: no default remains.*
- **D4 — wording.** "Inhaltsverzeichnis" stays (no change proposed). — *unchanged; the generator's
  wording was not touched.*

## 7. Effort and verification if D1/D2 had been approved (superseded by §0)

Small: one condition around the placeholder, one optional boolean in `content.config.ts` for the
portfolio collection, one line in `rules/08-local-ui-review.md`. Verification is a build plus a
count of the rendered lists before and after (65 → expected 25) and a look at one gated post, one
kept post and the switch turned off on a post. No URL, no heading and no content changes.

What Option C actually cost is in §0: two template deletions, one schema field removed, one new
component, two `components` props, one nesting fix. Verified by a build plus a count of the rendered
lists (65 posts and 4 `simple` pages → 0 pages) and one page with a hand-placed component.

## 8. Honest limits

- The entry counts come from the injected markup of the built site; the three longest lists are
  approximate because the count was taken from a bounded window.
- The word counts are whole-page text, not article body, so they are an upper bound.
- No claim is made here about search engines, rankings or reader behaviour; no such measurement
  exists in this project. The argument is made from page structure alone.
- The opt-in path is proven with a temporary, uncommitted `<TableOfContents />` in one page's content
  (`/akt/ablauf/`, which has `h3` under `h2`) plus the built HTML and a DOM parse; the content itself
  is gitignored and was restored afterwards. No committed page currently carries a table of contents,
  so the everyday state of the site is "none anywhere" — until the owner places one.
