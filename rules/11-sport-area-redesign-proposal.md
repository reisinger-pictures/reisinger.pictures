# Sport area pages redesign — proposal

**Status: STEPS 1–8 and 10 DONE; STEPS 9, 11–14 NOT STARTED.** The owner answered D1–D10 on 2026-10-18 and
clarified step 5 on 2026-10-19; §8 is the binding record. Steps 1, 3 and 4 are committed
(`a0f04ea`, `1129a37`); step 2 was already satisfied before step 1 was done. Step 5's directory code
is committed (`222d528`); its overview MDX presentation edit remains local in the git-ignored content
tree and is backed up. Step 6's D2 schema, rule, skill and evidence-backed assignments were
independently approved on 2026-10-19. No publication or deployment has occurred. The content backup
remains until publication and final owner approval. The owner authorized continuing the released
implementation steps through a local preview, except for the explicit image and text/name gates below.

- **Date:** 2026-10-18
- **Author:** planning subagent (not the owner, not the implementer)
- **Affected routes:** `/shootings/sport/` (overview) and all **14** `/shootings/sport/<sub-area>/`
  pages (5 sport-art hubs + 9 team/league pages — the verified count is 14 sub-areas plus 1
  overview, not 15 sub-areas; see the appendix).
- **Hard constraints taken as given:** every URL stays exactly as it is (no redirects, no renames,
  no new slugs); service names, description texts, image slugs, galleries, testimonials and body
  copy are **not** rewritten; `rules/06-pricing-publication.md` stays authoritative for prices and
  publication wording; `rules/10-ui-review-findings.md` is the current, living finding log.
- **Explicitly out of scope:** the three private offer pages and the business pages (they are the
  quality benchmark for restraint, *not* the target composition for sport), the
  `/shootings/<area>/testimonials` template, `rules/01-naming-conventions.md`, `AGENTS.todo.md`.
- **Evidence base:** the sources listed in the appendix were read in full via Codegraph and direct
  reads. Every factual statement about the current state below is traceable to one of them; where
  something was **not** verifiable, it is marked as such.

---

## 1. Target picture

Within one screen height, a club official, an organiser or an editor arriving from search should
understand that this is the work of a sports photographer who shoots in Austrian top leagues and at
international tournaments, see **one large, current action photograph** as immediate proof, and have
exactly two obvious next steps: **look at more pictures of that sport** and **make contact**.

The sport pages are the site's **work-sample and credibility area**, not a sales page: their job is
to show ongoing, named, dated work in Bundesliga / ICE / ÖFB / college-league environments and to
route visitors onward to the portfolio they came for. They sit beside the private offers
(`/shootings/akt|beauty|couples/`, sold quietly) and the business pages (`/eventfotografie/`,
`/personal-branding/`), which own the commercial and press-delivery offer; the sport pages point
there rather than duplicating them.

Commercially they stay deliberately restrained: no prices, no packages, no invented references, no
logo walls — the visible evidence is the photography itself, its provenance (competition, club,
season, date) and the existing customer statements.

---

## 2. Audiences and their needs

| Audience | What they look for | What exists today | What is missing today |
| --- | --- | --- | --- |
| **Club / organiser** (reports, social media, sponsors) | Their own sport, their own club, recent matches, images that carry sponsors' boards and shirts | One overview page with a 5-card sport-art grid, per-sport body copy, a hand-picked gallery and up to 3 related posts | The overview links only the 5 art hubs; the **9 team/league pages are reachable only from inside a hub body**, so a club like ACSL or the Steelvolleys is invisible on the overview. No date on any post card, so "recent" cannot be judged. No "get in touch" step that names sports work specifically. |
| **Editorial / press** (fast, named, high-resolution) | Fast availability, named people and events, IPTC metadata, live delivery | `/portal/` and `/eventfotografie/` describe IPTC metadata, live portal and batch download | **No sport page mentions press or links the portal/press route.** The sport pages are a dead end for an editor. |
| **Athlete / parents** | Their own team, their own competition, "can I find myself here?" | Team pages exist (LASK, Black Wings, Steelvolleys …) | No athlete/parent-facing sentence and no clear "this is the team's picture hub" framing; 4 of the 9 team pages (Dragons, Vikings, ACSL, Steelvolleys) fall back to the general `sport` portfolio bucket, so their "Aktuelle Einblicke" shows the newest *sport* posts overall, not that team's. |
| **Sponsor** | Proof that their brand is actually visible in published images | Body copy mentions boards, shirts and VIP activations | No reference or sponsor area exists, and none can be invented. If this audience is to be served, it must be through the existing photographs and existing facts only. |

---

## 3. Design principles

1. **Photography-led, one dominant photograph per screen.** The hero is the picture; the band
   (`bg-base-200`) is not. The image width equals the content grid width (`container`:
   540/720/960/1140/1320 px) — the defect described in `rules/10-ui-review-findings.md` §3 (band
   wider than the photo, H1 below the band) disappears by construction when the hero is an in-flow
   two/three-part block inside `<main>` instead of a full-bleed band above it.
2. **Recency is visible, not implied.** Post cards for sport show the publication date (the
   `portfolio` collection already carries `date`); "newest first" is the sorting that
   `selectRelatedPosts` already performs and must stay.
3. **Recognisability across 15 near-identical pages.** One hero skeleton, one grid skeleton, one
   gallery skeleton, varying only in the photographs and in how many child entries exist. No page
   gets its own ad-hoc composition.
4. **Serious restraint.** No prices, packages, discounts, invented numbers, logos, awards or
   customer quotes beyond the existing `testimonials` entries; business wording stays small and
   secondary, as on the homepage (`rules/05-homepage-entry.md`).
5. **Semantic tokens, both daisyUI themes.** Only `base-*`, `primary` and `*-content` tokens, no
   hard-coded grays, no `dark:` colour forks (see `daisyui-colors`); both `reisinger-light` and
   `reisinger-dark` are equally first-class, including overlay text if any is used.
6. **Mobile first — the device at the pitch-side.** Layout, tap targets and the first screen are
   designed for 480 px first, then checked at 1024, 1190, 1280 and wide desktop.
7. **No second parallel world.** Every repeating element reuses an existing component; only two
   genuinely new things are proposed (§5), each with a stated reason.

---

## 4. Wireframe in words

Legend: **[both]** = overview and sub-area pages · **[ov]** = `/shootings/sport/` only ·
**[sub]** = `/shootings/sport/<art>/` and `/shootings/sport/<team>/` only.

### 4.1 The hero (the fix for the band problem)

```
[both]  ┌───────────────────────────── container ─────────────────────────────┐
        │  SPORTFOTOGRAFIE                       (eyebrow, uppercase, muted)   │
        │  Sportfotografie                       (H1 = existing `name`)         │
        │  ┌───────────────────────────────────────────────────────────────┐   │
        │  │  heroImage — full content width, height-capped, cover         │   │
        │  │  (no bg-base-200 band behind it, no letterbox bars)           │   │
        │  └───────────────────────────────────────────────────────────────┘   │
        │  lead paragraph = existing `description`      [CTA] [secondary link] │
        └──────────────────────────────────────────────────────────────────────┘
```

- **Content:** eyebrow, H1 = `name`, photograph = `heroImage`, lead = `description` (existing
  values only).
- **Data source:** the `sportAreas` entry being rendered. `heroImage` is present on all 15 entries.
  `description` exists on the overview and on the 5 art hubs; the 9 team/league pages have **no**
  `description`, so their lead slot stays empty (correct: no invention) unless the owner supplies
  text.
- **Eyebrow:** the wireframe above shows an eyebrow, but it is deliberately **not** rendered yet.
  **Owner decision (2026-10-18): the eyebrow arrives with the parent-art map (D1).** The 14 sub-pages
  then get their art as context (e.g. "Eishockey" on team pages) and the overview gets none, because
  there it would only repeat its own H1.
- **Photo size/orientation:** landscape preferred (the existing hero images are editorial sports
  frames). Full content width, `object-cover`, height capped so that heading + photo + lead + CTA
  fit roughly into the first screen on a phone and one to one-and-a-bit screens on desktop.
  No `object-contain` letterboxing (that is what produced the 390 px empty band per side).
- **Known limitation — two portrait heroes (2026-10-18).** Two of the 15 sport heroes are portrait:
  `fussball` (`…mannschaft-jubelt-buehne`, 4000×6000) and `dragons` (`…action-touchdown`,
  3972×5958). In the `aspect-[3/2]` + `object-cover` box that discards about 62 % of the image height
  at desktop width, and on `dragons` the players' heads are cut at the top edge (measured and
  screenshotted by an independent verifier, both themes and all three viewports). **Owner decision
  (2026-10-18): the owner supplies a landscape hero for those two entries.** Until then the crop
  stands as this documented, known limitation — recorded as a sport row in
  `rules/10-ui-review-findings.md` §3 and **not** fixed.
- **Mobile behaviour:** order eyebrow → H1 → photograph → lead → CTA; the photo appears before the
  lead text, as on the private pages (`AreaHero.astro:70-74` in the default branch and `:30-34` in
  the sport branch document this as deliberate).
- **Both page types.**

### 4.2 `/shootings/sport/` (overview) — full section order

```
[ov] 0  Breadcrumb (existing MinimalPage)                       → "Startseite" only today
[ov] 1  Hero (4.1)                                            eyebrow SPORTFOTOGRAFIE
[ov] 2  Sportarten — the 5 art hubs as photo tiles            ← 5 hub entries
[ov] 3  Teams & Ligen — the 9 team pages, grouped by art      ← decided, see D1 in §8
[ov] 4  Neu im Sport — 6 newest sport posts + dates           ← portfolio prefix "sport"
[ov] 5  Press & Redaktionen — 3 factual lines + link          ← /portal/ + /eventfotografie/
[ov] 6  Bildstrecke/Galerie — existing gallery                ← existing `images`
[ov] 7  Kundenstimmen — 1 existing statement                  ← `testimonials`
[ov] 8  Weg zum Auftrag — the contact step (4.5)
```

- **2 — Sportarten.** Purpose: the primary router. Content: the 5 art hubs with a large photo each.
  Data: the 5 hub entries (`sport/american-football`, `sport/basketball`, `sport/eishockey`,
  `sport/fussball`, `sport/volleyball`), resolvable from the collection by id; their `priority`
  values (1–5) already exist and can supply the order (`sortAreasByPriority` is currently applied
  only to the private areas — see appendix).
  Images: today the overview's hand-written grid uses *different* slugs than the hubs' own
  `heroImage` (e.g. American Football card = AFL week 1, hub hero = AFL week 3). Grid = 1 column
  mobile / 2 columns tablet / 3 columns desktop, uniform aspect ratio, label **on** the photo
  (overlay) so the mixed "label bar above the next row's photo" rhythm from
  `rules/10-ui-review-findings.md` §3 cannot recur.
- **3 — Teams & Ligen.** Purpose: make the 9 club/league pages reachable directly from the
  overview and give each sport art its children. Grouping needs a data source that does not exist
  in the schema today → **decision D1**.
- **4 — Neu im Sport.** Purpose: prove that work is ongoing. Reuses the existing
  `AreaRelatedPosts` block with a larger limit and a visible date. Sorting is already newest-first.
  Link target: `/portfolio/sport/` (exists).
- **5 — Press & Redaktionen (new, tiny).** Purpose: give the editor a route. Purely a pointer to the
  two existing pages plus the existing facts (IPTC metadata, live portal, batch download); no new
  promise, no new price and no new deliverable is stated here. Whether this block is wanted at all
  is **decision D3**.
- **6 — Galerie.** Existing `Gallery`/`ImageGallery` over the existing `images`. On the overview
  this is the current hand-picked 15-image selection; consider whether it stays in full length on
  the overview or is reduced to the 6–8 strongest, since section 4 already shows fresh posts
  (**decision D4**).
- **7 — Kundenstimmen.** The one existing `testimonials` entry, wrapped in `AreaSection` the way the
  private pages already do. Note: only **2** testimonials of type `sport` exist, so
  `FeaturedTestimonials` never renders its "Alle N Bewertungen lesen" button
  (`length > 2` is false) — today and after the redesign.
- **8 — Weg zum Auftrag.** See 4.5.

### 4.3 `/shootings/sport/<sub-area>/` (art hub, e.g. `eishockey`, `fussball`)

```
[sub] 0  Breadcrumb                       → "Startseite / Sportfotografie" (already works)
[sub] 1  Hero (4.1)                       H1 = e.g. "Eishockey", lead = existing description
[sub] 2  Sport body (existing markdown)   → existing `##` sections, unchanged text
[sub] 3  Teams dieser Sportart            → e.g. BWL, SteelWings (5 hubs only) [D1]
[sub] 4  Neu in <Sportart> — newest posts + dates ← portfolio prefix sport/<art> [D2]
[sub] 5  Bildstrecke/Galerie              → existing `images` (6–15 photos)
[sub] 6  Weg zum Auftrag (4.5)
[sub] 7  Verwandte Sportarten             → the other 4 art hubs (cross-linking)
```

- Sections 2 and 3 mirror the markdown that already ends with a hand-written button grid linking
  the child teams. Those two belong together visually (text, then children) — today they are
  separated by a centred CTA block in the middle of the body, which is why the button grid reads as
  an appendix. Recommendation: move the CTA out of the markdown and into the layout's closing step,
  leaving the body text + children in one editorial flow. This changes where content is *rendered*,
  not what it says (**decision D5**).
- **Section 4** is the "path to current posts": for the 5 art hubs the prefix is `sport/<art>`, so
  the block shows that sport's own newest posts (e.g. `/portfolio/sport/fussball/…`).
- **No testimonials section on sub-area pages:** `FeaturedTestimonials` filters by area id, but
  reviews are typed only `akt | beauty | couples | sport` and `getStaticPaths` of the testimonials
  route generates **only 4 pages**. `/shootings/sport/<sub>/testimonials` therefore returns 404 and
  must never be linked. Only `/shootings/sport/testimonials` exists.

### 4.4 `/shootings/sport/<team>/` (team/league page, e.g. `lask`, `acsl`)

```
[sub] 0  Breadcrumb                       → "Startseite / Sportfotografie"
[sub] 1  Hero (4.1)                       no lead text today (no `description` in the entry)
[sub] 2  Neu bei <Team/Liga> — newest posts + dates ← prefix per team mapping [D2]
[sub] 3  Bildstrecke/Galerie              → existing `images` (3–15 photos): the page's core
[sub] 4  Weg zum Auftrag (4.5)
[sub] 5  Weitere Sportarten & Teams       → back to the parent art hub + overview
```

- Team pages have the shortest body text (one to three paragraphs, e.g. `lask.md`). The gallery is
  therefore the substance, not filler — it should start higher and, unlike today, not sit below a
  full-width old-style hero.
- **Section 2 caveat (verifiable today):** `getPortfolioPrefix` maps BWL/SWL → `sport/eishockey/ice`,
  LASK → `sport/fussball/bundesliga`, ÖFB/SKV → `sport/fussball`, and **Dragons, Vikings, ACSL,
  Steelvolleys → the general `sport` bucket**. For those four the "newest posts" block is the
  site-wide newest sport posts, not their own. Whether that is acceptable, or whether the fallback
  should instead show fewer/none and rely on the gallery, is **decision D2**.

### 4.5 The closing "way to contact" block (both page types)

```
        │  Vereine, Ligen & Veranstalter        │  Presse & Redaktionen            │
        │  Ein Satz, was angefragt werden kann  │  Ein Satz + Link zum Foto-Portal │
        │  [ Anfrage-Button ]  → Kontakt-Modal  │  [ /portal/ ]  [ /eventfotografie/ ]
```

- **No new form, no new endpoint.** The existing contact modal (`#kontakt`, `form__subject_prefix`)
  is the single entry point; `/eventfotografie/` and `/portal/` already own the business and press
  facts. The block only routes.
- Subject prefixes used by the sport content today are inconsistent and partly outside the typed
  union in `packages/shared/utils/index.ts:86`:
  `SPORT` (overview), `BUSINESS` (eishockey), `FUSSBALL`, `BASKETBALL`, `VOLLEYBALL`, `FOOTBALL`.
  Recommendation: settle on one prefix for the whole sport area (**decision D6**).

---

## 5. Reuse instead of new build

| Element | Existing building block | Verdict | Reason |
| --- | --- | --- | --- |
| Hero with eyebrow/H1/photo/lead | `areas/AreaHero.astro` | **Reuse + one new variant** | Already implements the editorial two-column hero *inside* `<main>` and is the exact answer to the band problem. But its balance (5/7 text-vs-photo) is the *private* taste; sport wants the photo dominant. Recommend a `variant`/`media` prop on `AreaHero` (photo full width, text row beneath) rather than a second hero component. |
| Full-bleed band hero | `HeroBanner.astro` | **Stop using it here; do not change it** | 10 call sites (blog post, `[...simple]`, portfolio overview, TFP). Its band/H1 defect is already logged in `rules/10-ui-review-findings.md` (§3 sport, §5 personal-branding) and is a *separate* task. Fixing it globally is a cross-cutting change the sport commission does not need. |
| Section wrapper with eyebrow + readable H2 | `areas/AreaSection.astro` | **Reuse as-is** | Semantic `<section>`, left-aligned H2, already used by the private composition. Exact fit for "Neu im Sport", "Sportarten", "Galerie", "Kundenstimmen". |
| Related-posts block | `areas/AreaRelatedPosts.astro` | **Reuse + 2 small parameters** | Already shared by both compositions and already does the newest-first selection. Needs (a) a configurable limit (formalise the hard-coded 3), (b) a per-page section heading instead of the fixed "Aktuelle Einblicke", and (c) a date in the card (below). |
| Post card | `PortfolioCard.astro` → `ContentCard.astro` | **Reuse + optional date** | Routed through one card component as required. Add an optional date line (the `portfolio` schema already has `date`); the current card renders image + title only, which is exactly why recency is invisible. Do **not** fork a sport card. |
| Gallery | `Gallery.astro` / `ImageGallery.astro` + `GalleryLayout` | **Reuse + possibly one new layout value** | Correct component, existing portrait-promotion guard from `rules/10-ui-review-findings.md` §2. Only question is grid density on a 480 px phone: `Presentation` and `Overview` both collapse to 1 column below `sm`, so 15 photos become 15 full screens of scrolling. A sport layout with 2 columns from the smallest breakpoint is the only candidate for something genuinely new — and it requires a matching `data-gallery` CSS rule in `global.css` (the enum value doubles as the attribute). |
| Reviews | `FeaturedTestimonials.astro` + `ReviewCards.astro` | **Reuse as-is** | Private pages already wrap it in `AreaSection`. The known two-layout inconsistency of the review grid (`rules/10-ui-review-findings.md` §7) is a shared defect, not a sport one — do not fix it in this commission. |
| Contact CTA | `packages/shared/components/ContactCTA.astro` | **Reuse as-is** | Opens the existing modal, produces the deep link (`?subject_prefix=…#kontakt`). Sport pages should stop hand-writing centred CTA divs inside markdown. |
| Grid of art hubs / teams | nothing suitable exists | **New: one small data module** | The 5-card grid is hand-written inside `index.mdx`; the art→team relation lives only in hub body buttons and in `getPortfolioPrefix`'s code map. A single `src/data/sport-areas.ts` map (art → child entry ids) consumed by the layout keeps one source of truth and is unit-testable, mirroring `shooting-areas.ts`. This is the only "new" structural piece; it depends on decision **D1**. |
| Metadata / schema | `BaseHead.astro` + `SchemaOrg.factory.ts` | **Reuse, extend for the hub** | The `WebPage` node already exists on every sport page. A hub/overview listing children is the textbook `CollectionPage`/`ItemList` case and `createCollectionPageSchema` already exists (used by the portfolio overview). See §7. |

Everything else (breadcrumbs, footer, header, `MinimalPage`, `ResponsiveImage`, contact modal,
`Photoswipe`) stays untouched.

---

## 6. Route to an order (Weg zum Auftrag)

- **Only existing paths are used.** Contact = the existing modal (`#kontakt`) reached through
  `ContactCTA` / `generateContactLink`, which merges prefill parameters
  (`subject_prefix`, `message`) into the URL without touching other query state
  (`rules/05-homepage-entry.md` §"Contact density"). Press = `/portal/` and `/eventfotografie/`.
  Pricing is never stated on a sport page; if a price is ever needed, it points at `/preise/`.
- **What is missing today, factually:** no sport page tells an editor where press images come from,
  and the CTA wording on every sport page is the event-photography label (also on the hockey and
  football pages).
- **Wording variants for the primary button** (the owner decides; these are proposals, not
  copy-overs):

  | Variant | Reasoning |
  | --- | --- |
  | **A — "Fotoanfrage für Verein oder Redaktion"** | Names both audiences the page actually serves and matches the section it sits in. Longest of the three; needs a `btn-wide`-style treatment or a two-line label on mobile. |
  | **B — "Sportfotografie anfragen"** | Shortest, keeps the area's own subject, reads correctly on all 15 pages, and removes the "Event" mismatch without introducing a new service claim. Safest for a 480 px button. |
  | **C — "Termin & Anfrage besprechen"** | Softer, consultation-style; fits the restrained tone but says less about the subject, so it is the weakest signal for "this is about sports pictures". |
  | *current* — "Jetzt Event-Begleitung anfragen" | Kept in the table only because it is the one the owner already flagged; it contradicts the page (sport, not event) and is used even on the hockey and football hubs. |

  Recommendation: **B** as the primary label, with a one-sentence "Vereine, Ligen, Veranstalter und
  Redaktionen" line above it, and a secondary outline link to `/eventfotografie/` for event jobs.
  Final call is decision **D6**.

---

## 7. SEO and technical measures

All of the following are checkable on the built output; none of them is a ranking promise.

1. **Meta description for the 9 team/league pages is missing entirely.** The schema makes
   `description` optional, and only the overview + 5 hubs have it; on the team pages
   `buildSeoMetaTags` therefore emits neither `meta description` nor `og:description`
   (`packages/shared/seo/meta.ts:38,47`). Measure: count `<meta name="description">` on all 15 built
   pages — target 15/15. Source of the text is an owner/writer decision (it is new copy).
2. **Duplicate-content risk across 15 near-identical pages.** `<title>` is literally `name` for
   every area page (`BaseHead.astro:44`) — "Eishockey", "LASK", "ACSL", "Sportfotografie". A
   distinguishing, non-templated pattern would help; a suffix changes the `<title>` that
   `rules/09-shooting-areas.md` records as frozen at split time, so it is an explicit owner call
   (**decision D7**). Do **not** auto-generate 14 boilerplate descriptions from a template; that
   trades one duplicate for another.
3. **Internal linking.** Today: overview → 5 hubs; the 9 team pages are unreachable from the
   overview, and no sport page links `/portal/` or `/eventfotografie/`. Measures: overview lists all
   14 children; each hub lists its own children; each sub-area links the other 4 hubs (a "Verwandte
   Sportarten" row); the closing block links both business/press pages. Check: `check_links` (runs
   as `postbuild`) reports zero broken or orphan targets.
4. **Never link `/shootings/sport/<sub>/testimonials`.** Only 4 testimonial routes exist. This is a
   404 trap, not an SEO measure — verify it explicitly during implementation.
5. **Structured data.** Keep `WebPage`; add a `CollectionPage`/`ItemList` node to the overview and
   to the art hubs using the existing `createCollectionPageSchema` factory, so the 14 child pages
   are declared as a list in one place. Validate the rendered JSON-LD for the parent/child
   relationship (no invented entities, no reviews, no ratings that do not exist).
6. **Alt text.** Every sport image goes through `ResponsiveImage`, which resolves the sidebar
   `description` when no `alt` is passed. Sport pages currently pass `alt={name}` for the hero,
   which yields "Eishockey"/"LASK" as alt text. Because sidecar descriptions exist for the portfolio
   images, prefer omitting `alt` where a real description exists, or pass a description-based
   string — do not invent per-image descriptions. Flag any image whose sidecar has no description.
7. **LCP and image weight.** The hero is already eager (`ResponsiveImageLoading.EAGER`); keep it
   eager and make sure its `sizes` matches the new full-width hero (today `AreaHero` declares
   `58vw`, `HeroBanner` `100vw`), otherwise the browser over- or under-fetches. Everything below the
   fold stays lazy; the gallery keeps its responsive `srcset`; the number of large hero-width
   variants should not increase.
8. **The overview itself gets a heading change decision — see D8.** A single H1 per page must hold
   (the harness checklist asserts this).
9. **Sitemap/priority and canonical stay untouched** (`astro.config.mjs`, `BaseHead`) — no URL
   change means no sitemap change beyond the pages that already exist.

---

## 8. Owner decisions (recorded 2026-10-18; step 5 clarified 2026-10-19)

The owner answered D1–D10 on 2026-10-18 and clarified the step-5 order and content-file scope on
2026-10-19. Each item below keeps the question and the options that were on the table and adds the
binding answer. The answers are transcribed, not reinterpreted: a recommendation that was not taken
is marked as such, and none of these items is reopened by the implementer. The owner's continuation
authorization in §9 releases the remaining implementation sequence, subject to the listed content
gates and the final real-URL review.

**D1 — How are the 9 team/league pages grouped and reached from the overview?**
- (a) A small, unit-tested `src/data/sport-areas.ts` map (art → child ids), reusing the existing
  `priority` values for order. No sport-entry metadata is edited; one source of truth; but the map
  duplicates the hub bodies' hand-written button lists.
- (b) A new optional frontmatter field (e.g. `parent`) on the 14 sport entries — single source, but
  it adds parent metadata to 14 content entries, which is unnecessary for this presentation change.
- (c) Leave the overview as a 5-art router only; teams stay reachable through hub bodies.
- **Decision (owner, 2026-10-18): (a).** A small, unit-tested `src/data/sport-areas.ts` map
  (art → child ids) reuses the existing `priority` values for order, without adding a `parent` field
  to any sport entry. The 9 team/league pages become reachable directly from the sport overview.
- **Owner clarification (2026-10-19):** necessary presentation edits to content files are permitted;
  D1 rules out parent metadata, not the overview's component markup. Step 5 changes only the import
  and card-grid markup in `sport/index.mdx`; its frontmatter, prose, heading and CTA remain unchanged.
  The 130-file Markdown backup at
  `/private/var/folders/vq/db6hdqsx32b1xg4z2mnzt8nm0000gn/T/opencode/sport-content-backup-2026-10-19`
  must be retained until publication and the owner's final approval.
- **Order direction (owner, 2026-10-19):** ascending `priority`, preserving the existing visible
  overview and hub-body link order. Entries without a priority sort after ranked entries; map order
  is the deterministic fallback among them.
- **Implementation fact (verified 2026-10-18, deliberately left as it is):** `acsl.md`,
  `steelvolleys.md` and `swl.md` carry **no** `priority`. The map must therefore define a
  deterministic order for those three entries. That order is the implementer's call and needs no
  owner decision.

**D2 — What should "newest posts" show for the 4 teams that map to the general `sport` prefix
(Dragons, Vikings, ACSL, Steelvolleys)?**
- (a) Accept the general sport mix. — superseded by (d).
- (b) For those pages, drop the post block and lead with the gallery instead (the page's own
  substance). — superseded by (d).
- (c) Add explicit team prefixes — requires portfolio content under those prefixes, i.e. a content
  decision, not a layout one. — **rejected.**
- **(d) Explicit tags — the chosen variant, and not one of the three options printed above.** A
  controlled `tags` frontmatter field plus a matching schema entry, a project rule and the
  project-local `blog-beitrag` skill carry the assignment of a post to a team/league area. Only tags
  that are evidenced in the content may be set; a post without evidence stays untagged.
- **Decision (owner, 2026-10-18): (d).** The recorded recommendation ((b) for the four teams, (a)
  for the other five) was not taken.
- **Consequence, recorded honestly:** for Dragons, Vikings, ACSL and SteelVolleys the general `sport`
  prefix no longer feeds the "newest posts" block, so a page whose posts stay untagged may show
  fewer posts than today. That is accepted.

**D3 — Is a "Presse & Redaktionen" block on the sport pages wanted?**
- (a) Yes, as a two-or-three-line pointer to `/portal/` + `/eventfotografie/` (no new promises).
- (b) No; keep sport purely as a portfolio and let `/eventfotografie/` own the press route.
- (c) Only on the overview, not on the 14 sub-pages.
- **Decision (owner, 2026-10-18): (a).** A two-or-three-line "Presse & Redaktionen" pointer ships on
  the overview **and** on the 5 art hubs — **not** on the 9 team pages — pointing at `/portal/` and
  `/eventfotografie/`, with no new promises.

**D4 — Gallery length on the overview.** The overview currently carries 15 hand-picked images on top
of the post block and the art grid, which is a lot of scrolling before the contact step.
- (a) Keep all 15. (b) Reduce to 6–8 and keep the full set on the art hubs. (c) Drop the gallery on
  the overview entirely (the art grid + posts already carry pictures).
- **Decision (owner, 2026-10-18): (b).** The overview gallery shrinks to 6–8 hand-picked images; the
  full sets stay on the art hubs. The concrete selection is an owner release that has not happened
  yet — nothing may be trimmed before it does.

**D5 — Does the CTA move out of the markdown bodies?** (the hub bodies end with a hand-written
centred `ContactCTA`; the closing block would duplicate it.)
- (a) Remove the in-body CTAs, render one closing step in the layout (content wording unchanged
  otherwise; affects the 5 hub `.mdx` bodies + the overview).
- (b) Leave the bodies exactly as they are and place no closing step.
- (c) Leave them and add the closing block anyway (two CTAs per page).
- **Decision (owner, 2026-10-18): (a).** The hand-written in-body `ContactCTA`s leave the 5 hub
  bodies and the overview; one closing block is rendered once in the layout. The remaining body
  wording is unchanged.

**D6 — Primary button label and the subject-prefix vocabulary.**
- Labels: see §6 (A/B/C); the recorded recommendation was B.
- Prefix: one value for the whole sport area. Options: keep `BUSINESS` (already in the typed union,
  but loses the sport context), use `SPORT` and add it to the `ContactFormPrefill` union, or keep
  per-sport values (`FUSSBALL`, `EISHOCKEY`, …) and widen the union accordingly.
- **Decision (owner, 2026-10-18) — label: variant A, "Fotoanfrage für Verein oder Redaktion".** The
  owner deliberately did **not** take the recommended variant B.
- **Decision (owner, 2026-10-18) — prefix: one sport-wide value `SPORT`,** newly added to the
  `ContactFormPrefill` union. None of the values currently used on sport pages (`SPORT`, `FUSSBALL`,
  `BASKETBALL`, `VOLLEYBALL`, `FOOTBALL`) is a member of that union today, so `SPORT` is a new
  addition, not a rename.

**D7 — Do the 15 sport pages get distinguishing `<title>`/meta?**
- (a) Leave `<title>` exactly as recorded in `rules/09-shooting-areas.md` (name only) and only add
  the missing meta descriptions (measure 1).
- (b) Add a consistent suffix (e.g. "… | Sportfotografie Linz") to all 15 titles.
- (c) Hand-write all 15 descriptions.
- **Decision (owner, 2026-10-18): (a) plus one hand-written meta description per page.** For the 9
  team pages the wording is released individually by the owner — no auto-generation.
- **Verified 2026-10-18:** the 9 team pages have no `description` at all, while `index.mdx` and the
  5 art hubs already carry one. Those existing descriptions stay untouched.

**D8 — Does the overview keep "Sportfotografie" as its H1, or get a hub-style heading?**
- (a) Keep the existing `name` "Sportfotografie" (zero content change).
- (b) A new H1 such as "Sportfotografie in Linz & Österreich" (new copy, changes the frozen title).
- (c) Two levels: keep "Sportfotografie" as H1 and add an H2 "Sportarten".
- **Decision (owner, 2026-10-18): (a).** The overview H1 stays "Sportfotografie": no new H1 and no
  added heading copy. The recorded recommendation ((c)) was not taken.

**D9 — Sponsors/references area?**
- (a) No dedicated area; sponsors appear only through the existing photographs and the existing
  body copy about boards and shirts (no logo wall).
- (b) A text-only "Für Sponsoren" line in the closing block, no logos.
- (c) A reference area with logos — **not proposed**: it requires assets and claims that do not
  exist in the repo today and would be an invented reference.
- **Decision (owner, 2026-10-18): (a).** No sponsors area, no logo wall and no "Für Sponsoren" line
  inside the closing block.

**D10 — Duplicate hero on the 4 team pages that belong to a hub** (e.g. BWL hero vs Eishockey hero).
No conflict today because the pages are only reachable via hub bodies.
- (a) Accept overlap between hub and team galleries. (b) Trim the hub galleries to a
  cross-team selection once the team pages are directly reachable from the overview.
- **Decision (owner, 2026-10-18): (b).** The overlap between the hub galleries and their team pages
  is reduced; the hub galleries become a cross-team selection once the team pages are directly
  reachable from the overview.
- **Consequence, recorded clearly:** this requires a concrete, owner-released image selection before
  any gallery list changes. Nothing may be trimmed on a guess. The recorded recommendation ((a)) was
  not taken.

### Open content points (2026-10-18)

These are content questions, not layout decisions, and they remain **open**. Nothing here is
corrected or assumed, and no "correct" club or league name is named in this file.

- **`swl.md` currently duplicates `bwl.md`'s name.** The observed frontmatter names are
  `skv.md` → "FC Blau-Weiß Linz", `bwl.md` → "Steinbach Black Wings Linz",
  `swl.md` → "Steinbach Black Wings Linz".
- **`acsl.md`'s spelling was previously flagged as "Sport" vs "Sports".** The entry's own body writes
  "Austrian College Sport League (ACSL)", while other pages spell it "Austrian College Sports
  League" (e.g. the `basketball.mdx` child button). Both spellings exist in the repo; neither is
  declared correct here.
- The owner decides the correct names **before** the team pages get their meta descriptions (§9
  step 11). Until then the team pages ship without a `description`, as today (D7).

---

## 9. Implementation steps (only after explicit owner release)

Each step is small and individually checkable. The owner continuation authorization below releases
implementation through the final local preview; steps requiring owner-selected images or
text/name inputs remain gated. Screenshot/contrast runs are dev-server based
(`rules/08-local-ui-review.md`) and never touch the cache directories (`AGENTS.md` §5).

**Owner continuation authorization (2026-10-19):** proceed autonomously through the released
implementation steps until a final local preview of the redesign is ready. This does not authorize
publication/deployment and does not waive the explicit owner-released image selections or text/name
inputs below. Do not invent those inputs; surface the remaining gates with the local preview.

1. **Owner decisions D1–D10 recorded** in §8 of this file, together with the open content points
    dated 2026-10-18. Exit: every decision has a binding answer and no item is left open. **Done
    2026-10-18 — commit `a0f04ea` (`docs(sport): record the owner's decisions for the sport-area
    redesign`).** The owner released the remaining implementation sequence on 2026-10-19, subject to
    the explicit content gates below and the final real-URL review in step 14.
2. **Extend the UI-review manifest** (`tests/screenshots/ui-review.config.ts`) with three routes:
   `/shootings/sport/`, one art hub (`/shootings/sport/eishockey/`) and one team page
   (`/shootings/sport/lask/`). Exit: `pnpm test:ui --grep 'sport'` captures all three in six
   projects; baseline captures exist for comparison. **Already satisfied before step 1 was written:
   the three routes are in the manifest since `f88e5d4`** — `shootings-sport`, `shootings-sport-hub`
   and `shootings-sport-team` (`tests/screenshots/ui-review.config.ts:142-161`), so no manifest change
   was needed. The before-captures for the redesign exist: an `18`-test run passed (3 routes × 6
   projects, 110 PNGs plus the 18 per-route JSONs). A safety copy lives outside the repo under
   `/private/var/folders/vq/db6hdqsx32b1xg4z2mnzt8nm0000gn/T/opencode/ui-review-baseline-sport-2026-10-18/`,
   because the harness clears its own `test-results/` output on every run — that is why the copy
   exists.
3. **`AreaHero` sport variant** (photo-dominant hero) — component only, no route change. Exit:
   `pnpm --filter reisinger.pictures lint` clean, private pages visually unchanged in a
   `pnpm test:ui --grep 'screenshot shootings(-beauty|-couples)? \(filled\)'` re-run. **Done together
   with step 4 on 2026-10-18 — commit `1129a37` (`feat(sport): give the sport pages a photo-led
   hero`).** **Command corrected 2026-10-18:** the literal
   `'shootings-akt|shootings-beauty|shootings-couples'` cannot match `/shootings/akt/`, because that
   route's manifest name is `shootings` (`tests/screenshots/ui-review.config.ts:93`) — `shootings-akt`
   exists only inside `shootings-akt-testimonials`. The working regex is
   `'screenshot shootings(-beauty|-couples)? \(filled\)'`. The manifest route name is therefore always
   named next to the path (route name `shootings` = `/shootings/akt/`), so this cannot recur.
4. **Sport hero + sub-area composition** in `SportAreaPage.astro`: hero variant, `HeroBanner`
   removed from the sport path, sections reordered. Exit: `pnpm test:ui --grep 'sport'` shows no
   band, no letterbox, exactly one H1, H1 attached to the photo; mobile 480 px first screen shows
   heading + photo. **Done 2026-10-18 in the same round as step 3 — commit `1129a37`.** Steps 3 and 4
   were merged into one round deliberately: a variant that is not wired in cannot be visually checked,
   and the step-2 baselines exist for exactly that comparison. Outcomes: the `bg-base-200` band and
   the letterbox bars are gone, the photograph sits at content-grid width with `object-cover`, exactly
   one H1 is attached to the photo, and the mobile order is eyebrow → H1 → photograph → lead. The
   private pages render byte-identically (108 PNG hashes, verified twice), and the default branch of
   `AreaHero` is the previous markup verbatim.
5. **Sections 2/3 (art grid, team grouping)** using the D1 data module (`src/data/sport-areas.ts`),
   with label-on-photo tiles. The map defines a deterministic order for `acsl`, `swl` and
   `steelvolleys`, which carry no `priority` (§8 D1; implementer's call). Exit: hub unit tests
   (`pnpm --filter reisinger.pictures test:unit`) cover the new map; all 14 children resolve;
   `pnpm test:ui` desktop grid shows no mixed label/photo rhythm.
     **Implementation note (2026-10-19, independently approved and committed — DONE).**
    `src/data/sport-areas.ts` holds the map (`SPORT_ART_HUBS`, `SPORT_CHILDREN`, `sportChildIds`,
    `orderSportAreas`, `groupSportAreas`), unit-tested in `src/data/sport-areas.test.ts`.
    `src/components/areas/SportAreaDirectory.astro` renders the art grid and the grouped team
     links where the hand-written 5-card grid sat in `index.mdx`; the frontmatter, the prose, the
     H2 and the `ContactCTA` are byte-identical. Link markup now emits trailing slashes, but all
     existing route targets remain unchanged.
    - **Order (owner, 2026-10-19):** ascending `priority`, preserving the existing visible order:
      American Football, Fußball, Eishockey, Basketball, Volleyball. Children likewise retain the
      old hub-body order (e.g. Dragons before Vikings and LASK before SKV before ÖFB).
    - **Fallback for the three without `priority`:** `shootingAreaSchema` fills an absent
      `priority` with the `9999` sentinel; the module treats `9999` as "unranked" and places
      those entries after the ranked ones of their group, with the map's declaration order as the
      stable tiebreak (Eishockey: BWL, then SWL).
    - **Responsive title sizing:** the sport tile title scales down at intermediate widths so
      "American Football & Cheerleading" remains on one line in the three-column grid; other
      `ContentCard` consumers retain the existing `text-lg` default.
6. **Tag work (D2)** — the controlled `tags` frontmatter field plus its schema entry, the project
    rule for it, the update to the project-local `blog-beitrag` skill, and the evidenced per-post
    assignments. Only tags that are evidenced in the content are set; a post without evidence stays
    untagged. Exit: the schema accepts `tags`; the rule and the skill carry the assignment; every set
    tag is traceable to the post's own content, none is guessed.
     **Implementation note (2026-10-19, independently approved — DONE).**
     `src/data/portfolio-tags.ts` is the single controlled vocabulary (`dragons`, `vikings`, `acsl`,
     `steelvolleys`); the optional `portfolio.tags` schema imports it. The project rule and local
     `blog-beitrag` skill document the evidence policy. Exactly ten portfolio entries have local,
     git-ignored tag assignments: four Dragons, six Vikings (including the two shared AFL posts),
     and two ACSL. No Steelvolleys post has direct evidence, so none is tagged. Independent review
     on 2026-10-19 APPROVED the change; `astro check` reported 0 errors/warnings/hints, lint was
     clean, and unit tests passed (10 files, 93 tests). The review's low-severity wording advisory
     about distinguishing an event post from a post that merely mentions a team is non-blocking.
 7. **Related-posts extension** (limit parameter, per-page heading, optional date on the card), now
    driven by the D2 tag mapping. Exit: unit tests for `selectRelatedPosts` still pass; the card shows
    a locale-formatted date (de-AT) in both themes; no other consumer of `ContentCard` regresses
    (portfolio overview pages in the same `pnpm test:ui` run); the four team pages without evidenced
    tags show the accepted, possibly shorter post list (§8 D2).
      **Implementation note (2026-10-19, independently approved — DONE).** Sport related-posts use
      per-area limits/headings/date settings; Dragons, Vikings, ACSL and SteelVolleys select only
      explicitly tagged posts. Dates use the existing `FormattedDate`; other `ContentCard` consumers
      remain unchanged by default, and private pages retain their previous selection and presentation.
      Verification: 10 unit-test files / 103 tests passed, lint clean, `astro check` reported 0
      errors/warnings/hints, `pnpm test:contrast` passed all 10 tests, and the affected screenshot
      batch passed 66/66 after the screenshot harness was fixed to force images eager on each
      `DOMContentLoaded` (Astro `ClientRouter` can reload the same URL during initial navigation).
      Independent review APPROVED. No production build, publication or deployment was run.
 8. **Gallery for sport** (layout decision; if a new `GalleryLayout` value is added, the matching
    `data-gallery` rule in `global.css` ships in the same step). Exit: `pnpm test:ui` at 480 px shows
    the intended column count; the portrait-promotion guard from `rules/10-ui-review-findings.md` §2
    still holds.
      **Implementation note (2026-10-19, independently approved — DONE).** Sport image
      sizes now derive their desktop container caps from the shared `computeSizes` helper and account
      for the 540px mobile cap and 16px inter-column gap. Default helper output is regression-tested;
      Presentation's landscape promotion is unchanged. Unit tests passed (11 files / 107 tests),
      package lint and `astro check` passed, and all 18 `shootings-sport` screenshots passed across
      six projects. Reviewed the 480px light/dark gallery captures and desktop light/dark captures;
      the gallery shows two columns without horizontal overflow. No content or image inputs changed.
 9. **Overview-gallery reduction (D4)** — shrink the overview gallery to the 6–8 hand-picked images,
   the full sets staying on the art hubs. This step depends on the owner-released image selection and
   does not start before it exists; nothing is trimmed on a guess. Exit: the released selection is
   in place on the overview, the full sets unchanged on the art hubs.
10. **Press/contact closing block (D3/D5/D6)** with the chosen label and prefix: variant A
    "Fotoanfrage für Verein oder Redaktion", the sport-wide prefix `SPORT` added to the
    `ContactFormPrefill` union, and the hand-written in-body `ContactCTA`s removed from the overview
    and the 5 hub bodies. Exit: modal opens with the prefilled subject from every sport page;
    `/eventfotografie/` and `/portal/` reachable from the overview and the 5 art hubs (not from the 9
    team pages); `check_links` clean.
      **Implementation note (2026-10-19, independently approved — DONE).**
      `SportAreaPage.astro` now places the press pointer on the overview and five art hubs, then the
      existing sport gallery/testimonial in the released order, and a shared `ContactCTA` closing
      section on all 15 sport routes. The CTA uses the exact owner-selected label and `SPORT` prefix;
      the prefix is now part of `ContactFormPrefill`. The in-body CTA import/wrapper was removed from
      the overview and five hub MDX files only; those ignored local content files remain uncommitted.
      Unit tests (11 files / 107 tests), package lint, `astro check` (0 errors/warnings/hints), and
      all 18 `shootings-sport` screenshot captures passed. Screenshots were visually reviewed in
      light/dark desktop and mobile. A dev Playwright check confirmed the CTA opens the existing
      modal with `SPORT` on all 15 routes and press links occur only on the overview and five hubs.
      `check_links` has no safe pre-build mode; the hrefs were checked against the existing
      `/portal/` and `/eventfotografie/` routes instead. No build, commit, push, publication or
      deployment was run. Steps 9/D4 and 12/D10 remain gated on owner image selections.
11. **SEO block** (meta descriptions, CollectionPage/ItemList, alt-text audit, hero `sizes`). The
    missing team-page descriptions are hand-written per page and wait on the owner-decided club and
    league names (open content points, §8); nothing is auto-generated. Exit: a description on all 15
    built pages once the owner releases the wording; JSON-LD parses; `check_links` clean.
12. **Hub-gallery trim (D10)** — reduce the overlap between the hub galleries and their team pages,
    the hub galleries becoming a cross-team selection. This step depends on the owner-released image
    selection and does not start before it exists; nothing is trimmed on a guess. Exit: the released
    selection is in place and no hub looks interchangeable with its team pages.
13. **Verification pass.** `pnpm --filter reisinger.pictures test:unit`, `pnpm --filter
    reisinger.pictures lint`, `pnpm build` (runs `astro check`, `prebuild`, `postbuild`
    `check_links`), `pnpm test:contrast`, and a full `pnpm test:ui` pass over the three sport routes
    plus the private/business pages that share components. Exit: no `critical`/`high` finding open in
    `rules/10-ui-review-findings.md` for sport; the sport rows in that file are updated (old rows
    removed or downgraded, new captures appended), in both themes and at 480/1024/1920.
14. **Owner review of real URLs** in dev before anything is committed or published. Publishing
    (`pnpm publish` / `sync.sh`) remains a separate, explicitly requested step
    (`AGENTS.md` §6).

### Carried into the next component step (recorded 2026-10-18, deliberately not fixed here)

Both items live in `AreaHero.astro` and do not block steps 1–4; they move with the next component step.

- **`sportHeroSizes` duplicates the `.container` caps as a CSS string.** `AreaHero.astro:24-25`
  hard-codes `1320/1140/960/720/540 px` in the eager hero's `sizes`, mirroring the `.container` caps
  in `global.css:130-132`. Correct today, but it silently drifts if those caps change; a shared
  constant would remove the duplication.
- **One redundant nested `<div>` in the sport hero markup.** The sport branch opens a classless outer
  `<div>` wrapping a single inner `<div>` (`AreaHero.astro:35-36`), left over from a replaced flex
  container. "No dead code" (`AGENTS.md` §2) would collapse it into one element; the rendering is
  unchanged.

---

## 10. What this proposal does not claim

- No statement about search rankings, traffic, conversion, lead volume or commercial effect.
- No new reference, logo, award, number, customer statement, price, deliverable or usage right.
- No claim that the sport pages should become more commercial; the opposite is the stated premise.
- No assumption that a decision in §8 is a formality — each one is a real fork, and several change
  user-visible copy.

---

## Appendix — verified state (facts this proposal is based on)

Sources read in full: `AGENTS.md`, `rules/02`, `rules/05`, `rules/08`, `rules/09`, `rules/10`;
skills `ui-review`, `daisyui`, `daisyui-colors`, `daisyui-usage`, `daisyui-config`, `daisyui-install`;
`src/components/areas/SportAreaPage.astro`, `AreaHero.astro`, `AreaSection.astro`,
`AreaRelatedPosts.astro`, `AreaOfferRoute.astro`, `PrivateAreaPage.astro`,
`src/components/HeroBanner.astro`, `Gallery.astro`, `ImageGallery.astro`, `GalleryLayout.ts`,
`PortfolioCard.astro`, `ContentCard.astro`, `ReviewCards.astro`, `ReviewCard.astro`,
`FeaturedTestimonials.astro`, `ResponsiveImage.astro`, `BaseHead.astro`, `Breadcrumbs.astro`,
`pages/MinimalPage.astro`, `SchemaOrg.factory.ts`, `src/pages/shootings/[...area]/index.astro`,
`src/pages/shootings/[...area]/testimonials.astro`, `src/data/shooting-areas.ts`,
`src/data/Menue.ts`, `src/data/testimonialTypes.ts`, `src/content.config.ts`,
`src/styles/global.css`, `packages/shared/components/ContactCTA.astro`,
`packages/shared/seo/meta.ts`, `packages/shared/utils/index.ts`, `tests/screenshots/ui-review.config.ts`,
and all 15 entries under `src/content/sportAreas/sport/`.

1. **Entry inventory.** 15 files: `index.mdx` (overview, `name: Sportfotografie`, 15 images, 1
   testimonial, landscape hero) + **14 sub-areas**: 5 art hubs with `description` and `priority`
   (`american-football` 1, `fussball` 2, `eishockey` 3, `basketball` 4, `volleyball` 5) and 9
   team/league pages without `description` (`lask`, `bwl`, `oefb`, `skv`, `swl`, `dragons`, `vikings`,
   `acsl`, `steelvolleys`; `bwl`/`dragons`/`oefb`/`skv`/`vikings` carry a `priority` that no sport
   composition consumes, `acsl`/`swl`/`steelvolleys` carry none). Every entry has a `heroImage`
   and 3–15 gallery images.
2. **One route, two compositions.** `pages/shootings/[...area]/index.astro` renders
   `PrivateAreaPage` for `privateAreas` and `SportAreaPage` for `sportAreas`; the sport branch still
   uses `HeroBanner` in the `hero` slot plus a bare `<h1>` *after* it, and renders `FeaturedTestimonials`
   → `Gallery` → `AreaRelatedPosts` without `AreaSection` wrappers or eyebrows.
3. **The band defect mechanically.** `HeroBanner` is `w-full bg-base-200` with
   `max-h-[80vh]` + `object-contain` on the image inside a `style="aspect-ratio"` wrapper: at
   1920 px the content grid is 1320 px while the band is full-bleed, hence the empty margins and the
   detached H1 (`rules/10-ui-review-findings.md` §3). `AreaHero` (used by the private pages) has no
   band, is in-flow and puts the H1 beside the photo.
4. **Related posts.** `getPortfolioPrefix` + `selectRelatedPosts(posts, prefix, 3)` (newest first,
   limit hard-coded at the call site). Direct map: `sport`, `american-football`, `basketball`,
   `volleyball` → `sport`; `eishockey` → `sport/eishockey/ice`; `fussball` → `sport/fussball`.
   Team map: `bwl`/`swl` → `sport/eishockey/ice`; `lask` → `sport/fussball/bundesliga`;
   `oefb`/`skv` → `sport/fussball`; `dragons`/`vikings`/`acsl`/`steelvolleys` → `sport`.
   All those `/portfolio/…` targets exist as overviews.
5. **Overview grid.** Hand-written in `index.mdx`: `grid md:grid-cols-3`, 5 × `ContentCard` with
   `ctaLabel` (a prop `ContentCard` does not have — it is silently ignored) and without `overlay`
   (so the non-overlay branch renders: `3/2` frame, `max-h-128`, label bar underneath), which is the
   mixed rhythm in `rules/10-ui-review-findings.md` §3. The card images differ from the hubs' own
   `heroImage` (verified for American Football: card = AFL week 1, hub = AFL week 3).
6. **Post cards have no date.** `PortfolioCard` → `ContentCard` renders `href`, image, title only;
   `portfolio` frontmatter already has `date` (not exposed).
7. **Testimonials.** `ReviewType` is `akt | beauty | couples | sport`; the testimonials route
   generates exactly 4 pages, so `/shootings/sport/<sub>/testimonials` 404s. 2 testimonials of type
   `sport` exist, so `FeaturedTestimonials`' "Alle N Bewertungen lesen" (needs `length > 2`) never
   renders for sport.
8. **SEO.** `BaseHead` sets `<title>` to the raw `name`; `buildSeoMetaTags` omits
   `meta description`/`og:description` when `description` is undefined → missing on all 9 team pages.
   Every sport page emits `WebPage` + `BreadcrumbList`; no `CollectionPage`/`ItemList`.
9. **Hero alt text** is `alt={name}` (`SportAreaPage.astro:50` passes `title={name}` to
   `<AreaHero … variant="sport" />`; the alt itself is set inside `AreaHero.astro:56`, sport branch,
   and `:89`, default branch), i.e. "LASK" / "Eishockey", while sidebar descriptions exist for the
   underlying portfolio images.
10. **CTA prefixes on sport pages** (`SPORT`, `BUSINESS`, `FUSSBALL`, `BASKETBALL`, `VOLLEYBALL`,
    `FOOTBALL`) include values outside the `ContactFormPrefill["subject_prefix"]` union; the form
    field is a hidden free-text input, so they pass through unvalidated.
11. **Test commands available:** `pnpm --filter reisinger.pictures test:unit` (vitest, includes
    `src/data/shooting-areas.test.ts`), `pnpm --filter reisinger.pictures lint`, `pnpm build`
    (`astro check` + `prebuild` + `postbuild check_links`), `pnpm test:ui` (screenshots, six
    projects), `pnpm test:contrast` (WCAG AA matrix, both themes).

### Not verifiable from the repository (stated as limits)

- **No visual judgement was made for this proposal.** It contains no screenshot pass; the three
  sport findings above are quoted from `rules/10-ui-review-findings.md`, not re-observed. The
  current captures cover `/shootings/sport/` only — no art hub and no team page is in the manifest,
  and `shootings-sport` `sec3–sec10` were never looked at.
  **Correction 2026-10-18:** the limit described the state when this proposal was written
  (2026-10-18 14:44); `f88e5d4` (2026-10-18 17:34) then added the hub and team routes
  (`shootings-sport-hub`, `shootings-sport-team`, `tests/screenshots/ui-review.config.ts:142-161`)
  **afterwards**, which is why the limit no longer holds.
- **No assessment of search performance.** No ranking, impression, click or traffic data is
  available here, and no external SEO tool was consulted.
- **No new imagery.** Whether enough *landscape, action-dense* hero-candidate images exist per
  sub-area was not checked image by image; only the entry lists and their `heroImage` fields were
  read. This is a real risk for the photo-dominant hero and should be checked in step 3/4.
- **No content authorship.** All copy in §6 and D8 is a proposal for the owner; no German text was
  written into any content file.
