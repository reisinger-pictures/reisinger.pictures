# UI review findings — reisinger.pictures

Date: 2026-10-18 · Reviewer: vision pass over the captured PNGs (no code changed, no tests run)
Scope of the capture: **30 routes × 6 projects = 180 captures** (state `filled` only; the manifest
deliberately ships no `empty` state for static SSR content, see `rules/08-local-ui-review.md`).
Artifacts: `test-results/ui-screenshots/filled/<theme>/<viewport>/<name>.png` plus `-secN.png`
sections and the per-route `.json` (title, URL, theme, surface, section count).

Reviewed working tree: the state that produced the current `test-results/ui-screenshots/` run
(dev server on `http://localhost:4325`, six projects: `{mobile,intermediate,desktop}-{light,dark}`).
Full-page PNGs were not used for judgement — long pages are unreadable when downscaled; every
finding below was taken from `-secN` sections. Per-route coverage, including what was **not** looked
at, is listed at the end.

**This is a living review log.** Severities and rows get removed or downgraded when a finding is
fixed and re-verified; new captures append here instead of into a one-off report.

## Legend

Severity follows `ui-review/references/findings-report.md`:
`critical` broken/blank/cut-off · `high` visible layout/contrast/hierarchy defect · `medium` polish ·
`low` nitpick. `File:Line` points at the source of the suggested fix where it could be identified;
"n/a" means the screenshot alone does not identify the source.

---

## 1. Homepage (`home`)

| Severity | Stelle (Datei:Zeile) | Screenshot | Befund | Vorschlag |
|---|---|---|---|---|
| medium | `apps/reisinger.pictures/src/components/home/HomeIntro.astro:51,53-59` | `light/desktop/home-sec0.png`, `dark/desktop/home-sec0.png`, `light/mobile/home-sec0.png`, `light/intermediate/home-sec0.png` | The hero's primary action "Fotoshootings & Preise →" is a plain underlined text link (`class="link"`); the secondary "Zum Portfolio-Blog ↓" is almost the same weight (only `text-sm` plus a down arrow). The only visually dominant CTA on the first screen is the header's `btn btn-primary` "Jetzt kontaktieren". Primary and secondary action are hard to tell apart. | Make the hero's primary action a `btn btn-primary` (or `btn btn-outline`) so the button hierarchy used in the header also exists in the hero; keep the anchor link secondary. |
| low | `apps/reisinger.pictures/src/components/home/HomeIntro.astro:25-61` | `light/mobile/home-sec0.png` | On mobile the reading order is H1 → "Beauty & Portrait" offering card → intro paragraph → CTA, so the hero's own photo card cuts the headline from its copy. `AreaHero.astro:70-74` (default branch) and `:30-34` (sport branch) document this order as deliberate for area pages; for the homepage it reads like an accident. | Owner decision: either accept (consistent with area pages) or move the intro paragraph above the offering card on mobile. |
| — | `apps/reisinger.pictures/src/components/home/HomePricingCard.astro:26,38` | `light/desktop/home-sec2.png` | Standard (`btn btn-primary`) vs Flex (`btn btn-outline`) is correct, and the Flex column is visibly subordinate — no finding; listed here only to record that the intended Flex subordination survives the redesign. | none |

## 2. Private shootings (`shootings` = `/shootings/akt`, `shootings-beauty`, `shootings-couples`)

| Severity | Stelle (Datei:Zeile) | Screenshot | Befund | Vorschlag |
|---|---|---|---|---|
| behoben 2026-10-18 | `apps/reisinger.pictures/src/components/ImageGallery.astro:26` + `src/styles/global.css:25-28` (`section[data-gallery] img { max-h-none; object-fit: contain }`) | `light/desktop/shootings-couples-sec9.png`, `-sec10.png`, `-sec11.png` | The rule "last image and every even index gets `GalleryLayout.Full`" promotes a portrait photo to a one-per-row image at full content width (~1314 px at 1920); the gallery override removes the global `max-h-[80vh]`, so the image keeps its native aspect ratio and becomes ~2000 px tall — the end of `/shootings/couples/` is dominated by a single image spanning about three viewport sections. | Cap the promoted image (e.g. `max-h-[85vh]` + `object-cover`) or drop the `Full` promotion for portrait-native images. **Fixed 2026-10-18:** `ImageGallery.astro` resolves the native dimensions and only promotes a *landscape* last image to the full-width column (the `xl:last:odd:col-span-2` CSS rule was replaced by an `xl:col-span-2` class on that wrapper); the portrait last image now stays in the two-column grid. Measured on `/shootings/couples/`: the last tile is 652×978 instead of 1320×1980. |
| behoben 2026-10-18 | `apps/reisinger.pictures/src/components/ContentCard.astro:26,40,48` + `src/styles/global.css:21-23` (`img { max-h-[80vh]; object-contain }`) | `light/desktop/shootings-sec16.png` | In "Aktuelle Einblicke" every card image is forced into a `3/2` box with `fit="contain"`, so a portrait photo renders with grey bars on both sides inside a landscape frame (first card next to two landscape cards). Mixed aspect ratios look like a broken grid. | Use `fit="cover"` for card images, or give each card the image's own aspect ratio. **Fixed 2026-10-18:** `ContentCard`'s default `fit` is now `cover`; the 3/2 grid stays uniform and the letterbox bars are gone. |
| low | `apps/reisinger.pictures/src/components/areas/PrivateAreaPage.astro:73-77` | `light/desktop/shootings-sec2.png`, `-sec9.png` | The sticky "Dein Weg zum Shooting" sidebar stops with the article; from there the page runs with an empty right third for many sections. | Optional: let the sidebar follow longer, or accept the editorial whitespace. |
| low | n/a | `light/desktop/shootings-sec0.png`, `-sec1.png`, `light/mobile/shootings-sec0.png` | The breadcrumb on `/shootings/akt/` only shows "🏠 Startseite" although the page is two levels deep, while portfolio/testimonials pages show a full chain. | Add the intermediate level (or drop the breadcrumb on one-level-deep pages). |
| — | n/a | `light/desktop/shootings-beauty-sec9.png`, `light/mobile/shootings-beauty-sec0.png` | No defect found on Beauty: hero, article, sticky sidebar, "Aktuelle Einblicke" all render consistently; recorded for coverage. | none |

## 3. Sport shooting (`shootings-sport`)

| Severity | Stelle (Datei:Zeile) | Screenshot | Befund | Vorschlag |
|---|---|---|---|---|
| behoben 2026-10-18 | `apps/reisinger.pictures/src/components/HeroBanner.astro:27-36` (used by `BlogPost.astro:49`, `tfp/[slug].astro:45`, `[...simple].astro:51` and `portfolio/[...overview]/[...page].astro:67`) | `light/desktop/shootings-sport-sec0.png`, `dark/desktop/shootings-sport-sec0.png`, `light/mobile/shootings-sport-sec0.png` | The hero is a full-bleed `bg-base-200` band whose photo is height-capped (`max-h-[80vh]`) and centred. At 1920 the band is much wider than the photo, so ~390 px of empty band remain on each side; the H1 follows *below* the band instead of next to it. | Constrain the band (`max-w-*` or a two-column hero) so the image width matches the 1314 px content grid below it. **Fixed 2026-10-18 for the sport pages (commit `1129a37`):** the sport composition no longer renders `HeroBanner`; `AreaHero`'s sport variant puts the photograph at content-grid width with `object-cover`, so the band and the letterbox bars are gone and the H1 sits above the photo in one editorial column. `HeroBanner` itself is unchanged and keeps this defect on its other call sites (§5). |
| low | n/a | `light/desktop/shootings-sport-sec2.png` | The sport-art grid mixes label bars and photos across rows (label bar of row 1 sits visually above the photos of the previous row). Reading the grid requires scrolling. | Optional: put the label on the photo (`overlay`) to shorten the cards. |
| low | n/a | `light/desktop/shootings-sport-sec2.png` | The main CTA on the sport page reads "Jetzt **Event**-Begleitung anfragen", which is the event-photography wording. May be intentional (sport coverage booked as event coverage) — flagged as "unsure". | Decide the label; if not intentional, use a sport-specific CTA. |
| **entschieden 2026-10-18** | n/a | `light/desktop/shootings-sport-sec0.png` | The sport page has no "Privates Shooting" eyebrow and no lead text next to the hero, unlike Akt/Beauty/Pärchen — the hero itself is new (see the row above), but the page still keeps the old sport *section order* (see the comment in `SportAreaPage.astro:23-25`). | **Half done 2026-10-18 (commit `1129a37`): the lead renders** — the hero shows the existing `description` through `AreaHero`'s sport branch. The eyebrow is deliberately **not** rendered yet — **owner decision 2026-10-18:** it arrives with the parent-art map (D1), so the 14 sub-pages get their art as context (e.g. "Eishockey" on team pages) and the overview gets none (there it would only repeat its own H1). See `rules/11-sport-area-redesign-proposal.md` §4.1. |
| medium | `apps/reisinger.pictures/src/components/areas/AreaHero.astro:46` (sport branch: `aspect-[3/2]` with `fit="cover"`) | `light/desktop/shootings-sport-sec0.png`, `dark/desktop/shootings-sport-sec0.png`, `light/mobile/shootings-sport-sec0.png` (independent verifier, both themes and all three viewports) | Two of the 15 sport heroes are portrait: `fussball` (`…mannschaft-jubelt-buehne`, 4000×6000) and `dragons` (`…action-touchdown`, 3972×5958). In the `3/2` + `object-cover` box that discards about 62 % of the image height at desktop width, and on `dragons` the players' heads are cut at the top edge. | **Known limitation, not fixed.** Owner decision 2026-10-18: the owner supplies a landscape hero for those two entries; until then the crop stands as documented, with no `object-contain` clamp added. |

**Status 2026-10-18 (sport hero, `rules/11-sport-area-redesign-proposal.md` §9 steps 1–4):** steps 1
(`a0f04ea`), 3 and 4 (`1129a37`) are implemented; step 2 was already satisfied (the three sport
routes are in the manifest since `f88e5d4`). The band/letterbox row above is fixed for the sport
pages; the eyebrow/lead row is half done (lead renders, eyebrow deferred by owner decision to the
parent-art map, D1); the two portrait heroes are a documented known limitation the owner clears by
supplying a landscape image. The private pages render byte-identically (108 PNG hashes, verified
twice), and `AreaHero`'s default branch is the previous markup verbatim.

## 4. Preis-Konfigurator (`pricing-default`, `-standard`, `-flex`, `-flex-private`)

| Severity | Stelle (Datei:Zeile) | Screenshot | Befund | Vorschlag |
|---|---|---|---|---|
| behoben 2026-10-18 | n/a (`preise` content + configurator) | `light/desktop/pricing-standard-sec0.png`, `light/desktop/pricing-flex-sec0.png`, `light/intermediate/pricing-default-sec0.png`, `light/mobile/pricing-default-sec0.png` | Hierarchy inversion: the section heading "Faire **Preise** – für alle" (H2) renders clearly larger and heavier than the page's own H1 "Meine Tarife – Fair, transparent, flexibel". On the most important commercial page the second heading overpowers the page title. | Reduce the H2 one step (`text-2xl`/`md:text-3xl`) or raise the H1; at minimum keep the H2 below the H1 in visual weight. **Fixed 2026-10-18** in `src/content/simple/preise.mdx`: the H2 is now `text-2xl md:text-3xl font-bold` (was `text-4xl md:text-5xl font-black`). Measured on `/preise/`: H1 36 px / 800, H2 30 px / 700. |
| behoben 2026-10-19 | `apps/reisinger.pictures/src/solid/PricingCalculator.tsx` | `light/desktop/pricing-standard-sec0.png` vs `light/desktop/pricing-flex-sec0.png` | The two tabs are not structurally parallel: the Flex tab renders an extra bordered "TARIF-KONFIGURATOR / STELLE DEINE SESSION ZUSAMMEN" panel around the price, the Standard tab starts directly with the price block. | Give both tabs the same panel (or drop the panel on Flex). **Fixed 2026-10-19:** the redundant nested panel was removed, so the Flex calculator shares the Standard tab's exact framing (description → price summary → steps → CTA) inside the single bordered tab panel. Pricing formulas, URL parsing, settings, discounts and contact links unchanged (46/46 E2E green). |
| low | n/a | `light/desktop/pricing-default-sec1.png`, `light/mobile/pricing-default-sec1.png` | The student/friend-discount checkbox is a pale outline circle at the far right of its row; on mobile it is visually detached from its label and is a small tap target. | Use a labelled `checkbox`/`toggle` in the same line rhythm as the location buttons. |
| low | n/a | `light/desktop/pricing-standard-sec0.png`, `light/desktop/pricing-flex-sec0.png` | The price meta lines use emoji (🕐 🖼️) while the rest of the site uses MDI icon classes — two icon languages in one card. | Use the same `icon-[mdi--…]` set as the rest of the UI. |
| — | n/a | `light/desktop/pricing-flex-private-sec0.png`, `dark/desktop/pricing-flex-private-sec0.png`, `light/mobile/pricing-flex-private-sec0.png` | The private Flex state (checked "Absolutes Online-Verbot") renders correctly in light, dark and mobile; the dark theme's lime active tab and lime CTA keep dark text. Not re-reported: the three testimonial/price badges were just moved to readable daisyUI variants. | none |

## 5. Simple pages — legal and content (`agb`, `dsb`, `impressum`, `ueber-mich`, `personal-branding`, `eventfotografie`, `share`, `portal`, `akt-ablauf`)

| Severity | Stelle (Datei:Zeile) | Screenshot | Befund | Vorschlag |
|---|---|---|---|---|
| behoben/entschieden 2026-10-18 | `apps/reisinger.pictures/src/content/simple/agb.mdx:14`, `apps/reisinger.pictures/src/content/simple/dsb.mdx:14` | `light/desktop/agb-sec0.png`, `-sec1.png`, `light/desktop/dsb-sec0.png`, `-sec1.png`, `dark/desktop/agb-sec0.png`, `dark/desktop/dsb-sec0.png`, `light/mobile/agb-sec0.png`, `light/mobile/dsb-sec0.png` | The current AGB/DSB text is only an `<iframe src="…/agb-1.pdf#navpanes=0">` inside an `aspect-paper-vertical` box. In every capture the framed area is empty, so (a) the screenshot pass cannot verify the legal text at all, and (b) on 480 px a full A4 page in an iframe is unreadable without pinch-zoom and needs nested scrolling; iOS Safari renders only the first page of an embedded PDF. **Not a "broken page" claim** — this is a headless-Chromium PDF-plugin limitation; the concern is the chosen embedding, not an empty file. | Render AGB/DSB as HTML (or a collapsed `<details>` per section) and keep the PDF as a download/secondary link. If the iframe stays, add a visible "PDF öffnen" fallback link inside the box. **Owner decision 2026-10-18:** the signed PDF stays the authoritative document, the legal text is *not* converted to HTML. Only the presentation changed in `agb.mdx`/`dsb.mdx`: a labelled "… als PDF öffnen (signierte Fassung)" link in a new tab, a note that it is the signed original, and a bounded embed height (`h-[45vh] sm:h-[70vh] max-h-[900px]`) instead of the A4 `aspect-paper-vertical` box. |
| behoben 2026-10-18 | `apps/reisinger.pictures/src/content/simple/dsb.mdx:23` | `light/desktop/dsb-sec3.png` | On the DSB page the version list says "**AGB** gültig ab 1. Jänner 2026" — the label is copy-pasted from `agb.mdx` and names the wrong document. | Change the label to "DSB gültig ab …" (the loop variable is already called `agb`, rename it too). **Fixed 2026-10-18:** label and loop variable renamed to `DSB`/`dsb`. |
| behoben 2026-10-18 | `apps/reisinger.pictures/src/components/pages/MinimalPage.astro:37` (`<main class="container prose max-w-none …">` — `max-w-none` cancels Tailwind Typography's `65ch` measure) | `light/desktop/ueber-mich-sec0.png`, `light/desktop/impressum-sec2.png`, `light/desktop/eventfotografie-sec0.png`, `-sec1.png` vs `light/desktop/tfp-sec0.png` | Prose measure is unbounded on most simple pages (and on every page using `MinimalPage`): paragraphs run to ~1310 px and ~95–110 characters per line at 1920, while TFP/TFP-Idee constrain their own paragraphs to ~766 px. Same content type, two very different reading widths. | Drop `max-w-none` or add a measure to the prose wrapper (`max-w-prose`/`max-w-3xl`), as the TFP page and `HomeIntro.astro:45` already do. **Fixed 2026-10-18** for the `simple` pages: `pages/[...simple].astro` wraps its text in `.content-measure`, whose direct `p/ul/ol/blockquote/heading` children are capped at `max-w-3xl mx-auto` (global.css). Measured on `/ueber-mich/` and `/impressum/`: widest paragraph 768 px (was ~1310 px). Other `MinimalPage` consumers (blog, area, portfolio, testimonials) are deliberately untouched. |
| behoben 2026-10-18 | `apps/reisinger.pictures/src/styles/global.css:30-32` (`h1,h2,h3,h4 { @apply text-center }`), opted out per component with `text-left` (`AreaHero.astro:40,80`, `PrivateAreaPage.astro:69`, `HomeIntro.astro:30`) | `light/desktop/impressum-sec2.png`, `light/desktop/ueber-mich-sec0.png`, `light/desktop/eventfotografie-sec1.png` | Mixed alignment within one page: all headings are centred by the global rule while body text stays left-aligned, so on the legal/content pages a centred heading sits above a left-aligned paragraph that starts at the far left of a 1310 px column. | Scope the centring rule (e.g. only for hero/section headings) or opt the simple-page prose out with `text-left!`. **Fixed 2026-10-18:** scoped opt-out via `.content-measure` (see the row above) instead of touching the global rule; the `simple` page headings are left-aligned like the body text. |
| **widerbestehend 2026-10-19** | n/a | `light/desktop/impressum-sec0..sec2.png` (neu: `ui-review-simple-2026-10-19`) | Inconsistent vertical rhythm: the gap between the end of a paragraph and the next H2 varies between roughly 60 px and 200 px on the same page. | Normalise the heading margins (`prose` heading spacing) on the legal pages. **Re-evaluated 2026-10-19, not reproducible:** the computed values of the current render are uniform — every `h2` has `margin-top: 48px` / `margin-bottom: 24px`, every `p` has `margin-top/bottom: 20px` (the first paragraph after a heading has `margin-top: 0px`) (measured in the browser at 1920 px on `/impressum/`). The visible distance between a paragraph and the next H2 is therefore always 48 px (measured: 48 px in all six cases); the earlier impression came from long paragraphs pushing the heading down, not from differing margins. **No change made** — the legal text and the page layout stay as they are. |
| medium | `apps/reisinger.pictures/src/content/simple/share.mdx:2` | `light/desktop/share-sec0.png`, `light/mobile/share-sec0.png` | The share page's H1 is English ("Love it? Share it.") while everything below it is German; the campaign names ("Friends of Friends", "Extra Creative") are brand art, but the page title is UI copy. | Confirm as a deliberate slogan, or use a German H1 and keep the English line as a tag line. |
| behoben 2026-10-18 | n/a | `light/desktop/share-sec0.png`, `light/mobile/share-sec0.png` | The orientation text is very faint: "DU FEIERST DEINE BILDER? ERZÄHL ES WEITER." and the three "SCHRITT 01/02/03" labels are light grey on white and are the page's main structure. (Deliberately *not* covered by the automated badge finding — this is a different element.) | Raise the muted colour one step (e.g. `text-base-content/70`) for the hint line and the step labels. **Fixed 2026-10-18** in `share.mdx`: hint `text-base-content/60` → `/70`, step labels `opacity-50` → `opacity-70`. |
| behoben 2026-10-18 | `apps/reisinger.pictures/src/content/simple/impressum.md` (gitignored content) | `impressum-mobile` | The contact block was written as inline runs, so on 480 px labels and values interleaved: "Web: https://reisinger.pictures WhatsApp:" followed by the wa.me URL on its own line. Hard to scan. | Put each entry on its own line (`<dl>`/block list) instead of relying on wrapping. **Fixed 2026-10-18:** each contact entry is now terminated with an explicit `<br>` (the "Web:" line was the only one missing a hard break); wording unchanged. The file is gitignored, so the fix is local-only and will not be part of a commit. |
| behoben 2026-10-19 | `apps/reisinger.pictures/src/components/pages/EditorialHero.astro` (route-specific; `HeroBanner.astro` itself unchanged) | `light/desktop/personal-branding-sec0.png`, `-sec1.png`, `dark/desktop/personal-branding-sec0.png`, `light/mobile/personal-branding-sec0.png` (neu nach dem Owner-Wechsel: `ui-review-pb2-2026-10-19/filled/{light,dark}/{desktop,intermediate,mobile}/personal-branding*.png`) | The HeroBanner band puts a ~500 px-wide photo inside a full-bleed 1920 px band above the H1, and the EXIF info badge floats at the band's top-right, i.e. outside the photo. | See the badge finding in §9; the band itself is the same issue as the sport hero. **Fixed 2026-10-19 for `/personal-branding/` only:** the route now renders a route-specific editorial hero (`EditorialHero.astro`) — the portrait **floats right** from `lg` on (Tailwind `float-right`), so headline, lead and article text flow around it; the shared `HeroBanner` (blog, TFP idea detail, `/akt/ablauf/`) is untouched. The portrait keeps its native 2:3 ratio (no crop), the EXIF control is anchored to the rendered image (`showInfo`). The picture is the first element in the source order (a float only shapes the content that follows it); below `lg` the wrapper is a flex column and the picture is moved behind the headline with `order`, so the mobile reading order stays headline → lead → photograph → article. `clear-both` closes the float after the article. Measured at 1920: image 512×768 at x=1108 (768 px text + 40 px margin + 512 px picture = the 1320 px container), the first article H2 at x=300 with the 768 px measure of the other simple pages; at 1024: image 420×630 at x=572, the text beside it ~500 px; at 480: image 448×672 with a 24 px gap below the lead (stacked, no float). No horizontal overflow at any of the three widths. The article keeps the **same measure as the other simple pages** (`max-w-3xl` = 768 px; the CTA wrapper stays uncapped so its button remains centred in the content column), so this route does not return to the long-line band flagged in the row above. The portrait's `alt` is the page title — the same pattern as `HeroBanner` and `AreaHero` use for their hero image; the duplication with the H1 is therefore project-wide, not introduced here. The headline/lead classes duplicate `AreaHero`'s default variant **on purpose**: `AreaHero` is shared with the private area pages and the sport pages (both out of scope for this commission), wraps its whole markup in `not-prose` and has no slot for the article. The frontmatter `description` is rendered as the visible lead — the same pre-existing words that were in the meta description before (as `AreaHero` does it); the owner saw this lead in the preview on 2026-10-19. |
| low | n/a | `dark/desktop/impressum-sec0.png` | The WKO logo keeps its white logo background, which shows as a bright box on the dark surface. | Accept (official asset) or place the logo on a neutral `bg-base-100` chip in dark theme. |
| low | n/a | `light/desktop/akt-ablauf-sec19.png` | `/akt/ablauf/` ends with a single half-width image and an empty right half of the row before the footer. | Accept as a grid orphan, or balance the last row. |
| — | n/a | `light/desktop/portal-sec0.png` | No defect found on `portal` in the captured section. | none |

## 6. Portfolio / Blog (`portfolio`, `portfolio-page-mid`, `portfolio-page-last`, `content-example`)

| Severity | Stelle (Datei:Zeile) | Screenshot | Befund | Vorschlag |
|---|---|---|---|---|
| behoben 2026-10-18 | `apps/reisinger.pictures/src/content/portfolioOverviews/index.md:7,9` | `light/desktop/portfolio-sec1.png`, `light/mobile/portfolio-sec1.png` | Copy bug: the H2 "Eine Idee oder Lust auf ein Shooting?" is repeated verbatim as the first paragraph line directly below it, so the text reads twice in a row. | Delete the duplicated line 9 (or turn it into real body copy). **Fixed 2026-10-18:** duplicate paragraph removed; the section keeps its H2, intro sentence, three-item list and closing line. |
| behoben 2026-10-18 | `apps/reisinger.pictures/src/pages/portfolio/[...overview]/[...page].astro:64` | `portfolio-page-mid.png`, `portfolio-page-last.png` | All paginated portfolio URLs shared the same browser title and the same H1 ("Mehr Einblicke & Bilder - Willkommen in meiner Fotowelt"), which also duplicates the breadcrumb parent label. | Give page 2…n a distinguishing suffix. **Fixed 2026-10-18:** `pageTitle = currentPage > 1 ? \`${title} – Seite ${currentPage}\` : title` feeds both `<title>` and `<h1>`; page 1 is unchanged, URLs and breadcrumbs are untouched. The hyphen in the base title itself is content (`portfolioOverviews/index.md`) and was deliberately left as-is. |
| low | n/a | `light/desktop/portfolio-page-last-sec5.png`, `light/desktop/content-example-sec12.png` | The last portfolio row ends with a lone tile (two columns), and the blog article's closing gallery mixes portrait and landscape photos without captions. Cosmetic only. | Accept. |
| — | n/a | `light/desktop/portfolio-sec1.png`, `light/desktop/portfolio-page-last-sec5.png` | Pagination renders above *and* below the grid; "Vorherige Seite" is correctly greyed on page 1 and both buttons are enabled on the last page. | none |

## 7. Kundenbewertungen (`testimonials`, `testimonial-detail`, `shootings-akt-testimonials`)

| Severity | Stelle (Datei:Zeile) | Screenshot | Befund | Vorschlag |
|---|---|---|---|---|
| behoben 2026-10-18 | `apps/reisinger.pictures/src/components/ReviewCard.astro` (`h-full` on the card; `data-slug` at `:31`) | `light/desktop/testimonials-sec73.png`, `-sec74.png`, `-sec75.png` | A review card without a large image is stretched by `h-full` to the row height of its tall image neighbour (`mintha1`, "Martina Kremsmayr", beside the very tall `syannah1` card), so its body becomes a ~1210 px empty grey area with the footer far below the text. **Correction 2026-10-18:** an earlier revision of this document claimed the card rendered entirely empty ("no avatar, no name, no text, no image"). That was wrong: an independent check of all 87 `[data-slug]` cards found every one carrying a name and body text (shortest 110 characters). The claim came from misreading the 20 % section overlap. The real defect is the stretch, not missing content. | Do not stretch image-less cards to the row height (drop `h-full`, use `items-start`, or reserve a media area of equal height). **Fixed 2026-10-18:** `ReviewCards.astro` grid now uses `items-start`, so each card keeps its natural height and the empty grey body is gone. |
| behoben 2026-10-19 | `apps/reisinger.pictures/src/components/ReviewCard.astro` | `light/desktop/testimonials-sec0.png`, `-sec1.png`, `-sec2.png`, `light/desktop/shootings-sport-sec12.png` | Two different card layouts share one grid: the `quote` layout puts a vertically centred avatar/logo in a `sm:w-1/3` column (leaving a large empty top-left quadrant and the body confined to the right half), the default layout puts the avatar on top above a full-width body. Cards without any image are also much shorter, so a 2-column row mixes strongly different heights. | Normalise the card: same avatar slot and same body width in both layouts, or force a minimum media area so rows align. **Fixed 2026-10-19:** both layouts now use one shared card (surface `bg-base-200 border border-base-300 shadow-sm`), one centred identity slot (avatar + name + role) and one footer; the `quote` layout shows its logo centred above the name and renders its text as an italic `<blockquote>` instead of a left logo column with oversized quote glyphs. The default layout keeps avatar → name → photo → text. Image-less cards keep their natural height (`items-start`). |
| behoben 2026-10-19 | `apps/reisinger.pictures/src/pages/testimonials/[slug].astro` | `light/desktop/testimonial-detail-sec0.png` | The detail page wraps one ~500 px-wide portrait photo in a 1314 px-wide `bg-base-200` panel, so the photo is very tall and ~400 px of empty panel remain on each side. | Constrain the media column (e.g. `max-w-md`) or use the large image as the column background with the text beside it. **Fixed 2026-10-19:** the single card is wrapped in `mx-auto max-w-2xl`, so the panel is an editorial measure instead of a full-width band. The portrait is neither enlarged nor distorted (the `object-contain` render is unchanged) and mobile stays full-width. |
| low | n/a | `light/desktop/testimonials-sec0.png`, `light/desktop/shootings-akt-testimonials-sec0.png` | The "KI ZUSAMMENFASSUNG BASIEREND AUF 85 REVIEWS" box is centred and noticeably narrower than the left-aligned intro paragraph above it. | Align both to the same measure, or leave the difference deliberately. |
| — | n/a | `light/desktop/shootings-akt-testimonials-sec0.png`, `-sec11.png`, `light/intermediate/testimonials-sec0.png` | The category page and the intermediate viewport render correctly (single column at 1024, cards full width, footers without the category link on category pages). | none |

## 8. TFP (`tfp`, `tfp-idea`) and 404 (`not-found`)

| Severity | Stelle (Datei:Zeile) | Screenshot | Befund | Vorschlag |
|---|---|---|---|---|
| behoben 2026-10-19 | `apps/reisinger.pictures/src/pages/tfp/[slug].astro:49` | `light/desktop/tfp-idea-sec0.png` vs `light/desktop/tfp-sec0.png` | The idea detail page renders its H1 in the green brand colour while every other page (including the TFP overview) uses the dark base colour. | Use the standard H1 colour; if the green is wanted as a brand accent, use it consistently. **Fixed 2026-10-19:** the H1 colour is now `text-base-content`, matching the TFP overview and every other page H1; the title text is unchanged. |
| behoben 2026-10-19 | `apps/reisinger.pictures/src/components/TfpIdeaCard.astro:13` | `light/desktop/tfp-sec0.png`, `-sec1.png`, `dark/desktop/tfp-sec0.png`, `light/mobile/tfp-sec0.png` | In the idea cards there is a large empty gap between the centred card title and the left-aligned body text; title centred, body left — two alignments inside one small card. | Tighten the gap and pick one alignment for the card. **Fixed 2026-10-19:** the card title is left-aligned like the body (`items-start justify-start text-left!`), the fixed minimum height (`min-h-[4.5rem] lg:min-h-[5.5rem]`) is gone and the spacing to the description is `mb-3`. Titles, descriptions, order, the disclosure ("Weitere Ideen anzeigen") and the "Mehr erfahren" links are unchanged; the action stays at the bottom of every card (the description keeps `grow`). |
| — | n/a | `light/desktop/tfp-sec0.png` | The TFP content is written as "Vorschläge, keine Zusage", unpaid and mutually creative — wording and framing match the intended positioning (TFP only in the footer, no stronger promotion). No change suggested. | none |
| behoben 2026-10-18 | `apps/reisinger.pictures/src/pages/404.astro:38` | `not-found-sec0.png` | The 404 page linked "TFP Shootings" in its closing link row, i.e. TFP appeared outside the footer, and that row used `text-base-content/60` (faint grey). | Move the TFP link out of the 404 row (keep footer only) and raise the row's contrast. **Fixed 2026-10-18:** the TFP link is removed from the row (the footer still links `/tfp/` as "TFP"); the remaining four links moved from `text-base-content/60` to `/70` in line with the share-page fix. |
| — | n/a | `light/desktop/not-found-sec0.png` | Otherwise the 404 page is solid: one H1, readable copy, primary + outline button pair, secondary link row, footer present. | none |

## 9. Cross-cutting observations

| Severity | Stelle (Datei:Zeile) | Screenshot | Befund | Vorschlag |
|---|---|---|---|---|
| behoben 2026-10-18 | `apps/reisinger.pictures/src/components/HeroBanner.astro:28` (via `HeroBanner.astro:35`; the `ResponsiveImage` contain-branch wrapper already matches its image) | `personal-branding.png`, `shootings-sport.png` (measured) | The EXIF info control is an icon-only circle anchored to the wrapper, not the photo. Wherever the image is `object-contain` inside a wider box or band, the badge floats in the empty letterbox area outside the picture. | Anchor the badge to the rendered image (or place it in a static meta row) so it cannot detach. **Fixed 2026-10-18:** the band wrapper now caps its width at `min(100%, 80vh·W/H)`, so the wrapper is exactly the contained image box and the badge sits on the picture; the image itself keeps the same size. Measured on `/personal-branding/` (1920): image 507×760, label inside; `/shootings/sport/` (1920): image 1140×760, label inside. The `showInfo` containers in `ReviewCard`/`ContentCard` already matched their image. |
| low | n/a | all routes | The floating chat bubble (bottom-right) overlaps the last card or the footer band on every route and viewport captured. | Accept, or hide it while the footer is in view. |
| — | n/a | all routes | Header (logo, nav, active item highlighted, `btn btn-primary` CTA), footer (legal links + copyright) and one `h1` per page are present and consistent on every route looked at; no missing/duplicate branding, no horizontal overflow, no broken/missing images in the captured light/dark/mobile variants. | none |

---

## 10. Inhaltsverzeichnis (Portfolio-Beiträge und `simple`-Seiten)

Not a component: `src/middleware/toc.ts` post-processes every page's HTML, finds `<div data-toc></div>` and injects `<h2 class="text-left">Inhaltsverzeichnis</h2><ul>…</ul>` built from all `h2`–`h6` elements that carry an `id` (headings inside `<footer>` are excluded). **Update 2026-10-18 (owner decision):** the placeholder is no longer emitted by any template — `BlogPost.astro:60` and the `[...simple].astro` `showToc` block were removed, and `showToc` was dropped from the `simple` schema. A page now gets a table of contents only where the author writes `<TableOfContents />` in the MDX content; the middleware stays the single generator. Measured after the change: 0 of 283 built pages carry one (before: 65 of 136 posts and 4 of 12 `simple` pages).

Measured on 2026-10-18 against the running dev server, in a real browser, on `/portfolio/sport/eishockey/ice/2025-26/s1-bwl-pvb/`:

| Severity | Stelle (Datei:Zeile) | Screenshot | Befund | Vorschlag |
|---|---|---|---|---|
| behoben 2026-10-18 | `apps/reisinger.pictures/src/styles/global.css` (`:is(h2, h3, h4, h5, h6)[id] { @apply scroll-mt-24 }`) | `content-toc-*` after a jump (measured) | Clicking a table-of-contents entry scrolled the target heading to `top: 0`, i.e. **directly under the sticky header** (`sticky top-0 z-50`, 69 px at 1440, 73 px at 390), so the reader arrived without seeing the heading they clicked. Applies to every ToC entry on all posts and the `simple` pages that show a ToC. | One central rule now gives every `h2–h6` anchor target `scroll-margin-top: 6rem`. **Fixed 2026-10-18** in `global.css`; measured after a real click on `/portfolio/sport/eishockey/ice/2025-26/s1-bwl-pvb/`: heading top 96.5 px vs header bottom 69 px (1440), 96.1 px vs 73 px (390) — visible below the header on both. Headings only, so the homepage's `#portfolio-blog` jump (`scroll-mt-24` on a `<div>`) is not offset twice (measured 96.1 px, not 192 px). |
| **entschieden 2026-10-18** | `src/components/pages/BlogPost.astro:60`, `src/pages/[...simple].astro:55`, `src/middleware/toc.ts` | — (65 of 136 posts carried a ToC; 7 have exactly one entry, 12 have two) | The ToC was rendered whenever at least one heading existed. A "Inhaltsverzeichnis" heading above a **single** entry is pure noise; 19 of 65 posts were in that range. | **Owner decision 2026-10-18 (`rules/12-table-of-contents.md`): the automatic trigger is removed from every template and the table of contents is placed by hand.** No threshold was needed once nothing is automatic: `<TableOfContents />` (new, `src/components/TableOfContents.astro`) renders the placeholder, provided to MDX via the `components` prop. The middleware stays as the generator. Verified: 0 of 283 built pages carry a ToC, one hand-placed component renders a correct list and a real nested list. |
| behoben 2026-10-18 | `src/middleware/toc.ts:97` | — | **Correction of an earlier false statement in this row:** it claimed "the nested lists already sit inside their parent `<li>`". They did not. `createTocItems` appended the child `<li>` elements directly to the parent `<li>` (`<li><a>…</a><li>…</li></li>`), which is invalid HTML: no parser accepts an `<li>` as the child of an `<li>`, so the browser closed the parent early and flattened the hierarchy. Reproduced on the 10 of 72 pages that carry an `h3` under an `h2`. | Wrap the children in their own `<ul>`. **Fixed 2026-10-18** in `createTocItems`: children now render as `<ul>${…}</ul>` inside the parent `<li>`; the built HTML of `/akt/ablauf/` shows `<li><a href="#…">…</a><ul><li>…</li></ul></li>` and the parsed DOM nests the two child entries under their parent. Optics unchanged (daisyUI/Tailwind list styling is relative, not absolute). |
| behoben 2026-10-18 | `src/middleware/toc.ts:118` | `content-toc-*` (sequential, ~~temp evidence~~) | The injected markup was a bare `<h2>` plus `<ul>`: no `<nav>`, no `aria-label`, so assistive technology did not announce it as a navigation region and the heading was not programmatically tied to the list. Visually fine (bullet list, `text-left` wins over the global centring rule). | Wrap it in `<nav aria-labelledby="…">` with an id on the heading. **Fixed 2026-10-18:** the generator now emits `<nav aria-labelledby="toc-heading"><h2 id="toc-heading" class="text-left">…`; the child-list nesting defect above was still present at that point and was fixed in the later round. Optics unchanged. |
| behoben 2026-10-18 | `src/middleware/toc.ts:32,36-37,89` | — | Two robustness smells: the heading selector parsed the **whole page** and excluded only `footer *`, so any later `h2[id]` outside the article body would silently join the ToC; and `node.children?.length ?? 0 > 0` relied on `??` binding looser than `>`, so the guard only worked by accident. | Restrict the parse to the article container and write the guard explicitly. **Fixed 2026-10-18:** the query is scoped to the ToC placeholder's parent element (`[data-toc]` → `<article>`/`.content-measure`), the footer exclusion stays, and the guard reads `(node.children?.length ?? 0) > 0`. Equivalence checked against the built output — 72 pages carry a ToC and the before/after entry-and-level sequences are identical (0 mismatches); the `content-example` post still has none. |
| — | n/a | — | Anchor targets with umlauts work: the href is percent-encoded (`#…f%C3%BCr…`) while the `id` keeps the raw character, and the browser resolves it (measured: the click landed on the element). | none |
| behoben 2026-10-18 | n/a | — | **Coverage gap:** the manifest's `content-example` route renders a post **without** headings, so no capture had ever shown the ToC — which is why the earlier visual pass did not report it. | A ToC-bearing post (`s1-bwl-pvb`) was added to the manifest as `content-toc` with `leadingSections: 6`. **Superseded 2026-10-18:** with the automatic trigger gone, no post renders a ToC any more, so that entry documented a state the site no longer has; it and its `leadingSections: 6` were removed again (`tests/screenshots/ui-review.config.ts`, `rules/08-local-ui-review.md`). **Coverage limit from now on: the ToC is only captured where a page carries one by hand — at present no manifest route does, so no screenshot shows a ToC.** |



**Status 2026-10-18:** points 1, 2, 4, 5 and 7 fixed, point 3 resolved by owner decision
(signed PDF kept, presentation improved), point 6 deliberately out of this scope (homepage hero).

**Status 2026-10-18 (defect-fix round B1–B8):** the eight unambiguous defects were fixed and
re-verified: §10 ToC anchor jump / nav landmark / parse scope / manifest coverage, §6 paginated
portfolio title/H1, §9 EXIF badge, §8 404 TFP link and contrast, §5 `/impressum/` contact
structure. The remaining `medium`/`low` rows (homepage hero weight, review-grid unification, testimonial
detail band, TFP-idea H1 colour, vertical rhythm, share H1, sport pages) are unchanged.

**Status 2026-10-18 (table of contents, second round):** the open fundamental question of this
section was decided by the owner — no template emits a table of contents any more; it is placed by
hand per page (`rules/12-table-of-contents.md`, Option C). Counting, the earlier false claim about
the child lists (they did **not** sit inside their parent `<li>`) was corrected and the markup fixed;
`createTocItems` now wraps child entries in a real `<ul>`. Verified on `/akt/ablauf/` with a
temporarily hand-placed component: nested child entries appear inside a `<ul>` below their parent.

## Top-Verbesserungen (ranked by impact)

**Status 2026-10-18:** the earlier ranking (pricing H1/H2, simple-page measure, AGB/DSB PDF, DSB label,
stretched review card, gallery image, portfolio duplicate) is **done** — see the per-row status in the
sections above and the fix round commit. What remains, ranked:

1. ~~**Table of contents hides its own target.** Clicking a ToC entry scrolls the heading under the
   sticky header on every post and on the `simple` pages that show a ToC (§10, `high`) — a one-rule
   CSS fix with a large effect across 65 posts.~~ **Done 2026-10-18** (`scroll-margin-top` on
   anchored headings). The follow-up question — whether a ToC is needed at all — was also decided on
   2026-10-18: **no automatic ToC, placement by hand** (§10, `rules/12-table-of-contents.md`).
2. **Homepage hero primary action lacks weight.** The primary hero action is an underlined text link
   next to a nearly identical secondary link, while the header owns the only real button.
   (§1, `medium`)
3. **The review grid mixes two card layouts and very different row heights.** One layout centres the
   avatar/logo in a third-width column, the other puts it on top; rows therefore look uneven.
   (§7, `medium`)
4. **`/testimonials/<name>/` wraps a small portrait in a wide band**, leaving ~400 px of empty panel
   on each side (§7, `medium`).
5. **`/impressum/` has an uneven vertical rhythm and interleaved contact lines on mobile**
   (§5, `medium`). The interleaved contact lines were fixed 2026-10-18 (local
   content change only); the **vertical rhythm was re-evaluated 2026-10-19 and is
   not reproducible** — the computed heading/paragraph margins are uniform, so
   the page stays unchanged.
6. **Sport pages** — hero band wider than the photo, art grid mixing label bars and photos, CTA
   wording. All three are handled by the separately commissioned sport redesign
   (`rules/11-sport-area-redesign-proposal.md`), not here.

Immediately after those: the paginated portfolio URLs sharing one title and H1 (§6 — **done
2026-10-18**), the TFP idea H1 in brand green while every other H1 uses the base colour (§8 — open),
the EXIF badge detaching from `object-contain` images (§9 — **done 2026-10-18**) and the floating
chat bubble overlapping the last card (§9 — open).

## Bewusst nicht geändert / keine Beanstandung

* **Flex positioning.** The Flex tariff is presented as the subordinate, creative private entry
  (outline button, "keine kommerzielle Bildnutzung", publication as a reduced-price condition).
  That is the intended hierarchy — no change suggested.
* **Business restraint.** "Auch für Unternehmen: Personal Branding / Eventfotografie" on the homepage
  and the business pages themselves stay deliberately restrained; no stronger promotion is proposed.
* **TFP.** TFP appears in the footer (and, flagged separately, in the 404 link row). No stronger
  promotion is proposed; the wording "keine fertigen Angebote" is correct as-is.
* **Testimonial/price badges.** The three badges were just moved to readable daisyUI variants
  (≥ 5:1); they are not re-reported here.
* **Prices and legal promises.** No price, service or legal statement was invented or evaluated for
  correctness — only presentation and comprehensibility.
* **Dark theme primaries.** The lime primary with dark text (active tabs, CTAs) is legible in both
  themes; no contrast finding.
* **Pagination, empty-ish states.** No blank or leftover-spinner states were observed; the manifest
  intentionally captures only `filled`.
* **No horizontal overflow or cut-off content** was found in the light/dark/mobile variants looked
  at, and every assessed page has exactly one `h1`.

---

## Coverage — what was actually looked at

**light/desktop** (sections listed; every other section of these routes was *not* looked at):
`home` sec0-7 · `shootings` sec0,1,2,9,16,17 · `shootings-beauty` sec0,9,13 ·
`shootings-couples` sec0,2,5,8,9,10,11 · `shootings-sport` sec0,1,2,11 · `pricing-default` sec0,1 ·
`pricing-standard` sec0,1 · `pricing-flex` sec0,1,2 · `pricing-flex-private` sec0,1,2 · `agb` sec0,1,3 ·
`dsb` sec0,1,3 · `impressum` sec0,2 · `ueber-mich` sec0,1 · `personal-branding` sec0,1 ·
`eventfotografie` sec0,1 · `share` sec0,3 · `portal` sec0 · `akt-ablauf` sec0,1,10,19 ·
`portfolio` sec0,1 · `portfolio-page-mid` sec0 · `portfolio-page-last` sec5 · `content-example` sec0,12 ·
`testimonials` sec0,1,2,73,74,75 · `testimonial-detail` sec0 · `shootings-akt-testimonials` sec0,11 ·
`tfp` sec0 · `tfp-idea` sec0 · `not-found` sec0.

**dark/desktop:** `home` sec0,1,2,6,7 · `shootings` sec0 · `shootings-beauty` sec0 ·
`shootings-couples` sec0 · `shootings-sport` sec0 · `pricing-default` sec0 · `pricing-standard` sec1 ·
`pricing-flex` sec0 · `pricing-flex-private` sec0 · `agb` sec0 · `dsb` sec0 · `impressum` sec0.

**light/mobile:** `home` sec0,1,2 · `shootings` sec0 · `shootings-beauty` sec0 ·
`shootings-couples` sec0 · `shootings-sport` sec0 · `pricing-default` sec0,1 · `pricing-standard` sec0,1 ·
`pricing-flex` sec0 · `pricing-flex-private` sec0 · `agb` sec0 · `dsb` sec0 · `impressum` sec0 ·
`share` sec0 · `portfolio` sec1 · `ueber-mich` sec0 · `tfp` sec0.

**light/intermediate:** `home` sec0 · `shootings` sec0 · `testimonials` sec0 · `pricing-default` sec0.

### Not looked at (no finding above is based on these)

* **Entirely unreviewed variants:** every `dark/mobile` capture (30 routes), every `dark/intermediate`
  capture, and every `intermediate` route except the four above (`agb`, `dsb`, `impressum`,
  `ueber-mich`, `personal-branding`, `eventfotografie`, `share`, `portal`, `akt-ablauf`, `portfolio*`,
  `content-example`, `testimonial-detail`, `shootings-akt-testimonials`, `tfp*`, `not-found`,
  `pricing-*`).
* **Unreviewed routes:** `pricing-standard-friend` and `pricing-standard-student` were not opened at all.
* **Unreviewed sections of reviewed routes:** `testimonials` sec3-72 · `content-example` sec1-11 ·
  `akt-ablauf` sec2-9,11-18 · `shootings` sec3-8,10-15 · `shootings-beauty` sec1-8,10-12 ·
  `shootings-couples` sec1,3,4,6,7 · `shootings-sport` sec3-10 · `portfolio` sec2-6 ·
  `portfolio-page-mid` sec1-6 · `portfolio-page-last` sec0-4 · `testimonial-detail` sec1 ·
  `tfp-idea` sec1 · `tfp` sec1,2 · `personal-branding` sec2 · `portal` sec1 · `agb` sec2 ·
  `dsb` sec2 · `share` sec1,2 · `impressum` sec1 · `ueber-mich` sec1 (partially) ·
  `eventfotografie` sec2 · `home` (no section skipped).

### Unsicher / needs one more image

* **Resolved 2026-10-18 — was not a defect.** The "empty review card" in §7 was a misread of the
  20 % section overlap. An independent check of all 87 `[data-slug]` cards found every one carrying
  a name and body text; the card in question is `mintha1` ("Martina Kremsmayr"), which simply has no
  large image and is stretched by `h-full`. Severity changed from `high` to `medium`; there is no
  missing content to attribute.
* **Resolved 2026-10-18 — giant gallery image on `/shootings/couples/`** (§2): it is one promoted
  image (the odd-count last tile spanning two columns). It is no longer promoted because the last
  tile is a portrait photo; the promotion now only applies to landscape last images.
* **Resolved 2026-10-18 — AGB/DSB text** (§5): the owner decided the signed PDF stays the
  authoritative document (it proves the text was not altered); the legal text is not converted to
  HTML. Only the presentation changed (open-in-new-tab link, signed-original note, bounded height).
* **`share` H1 / sport CTA wording** (§5, §3): both need an owner decision on whether the English
  slogan and the "Event-Begleitung" label are intended.

---

## Coverage — defect-fix round B1–B8 (2026-10-18)

Capture basis: the **sampled** screenshot run (`rules/08-local-ui-review.md`), 33 routes × 6
projects = 198 captures, 10.9 min. Per capture only the page top (`leadingSections`, `content-toc`
6) and the footer (last 2 screens) are written; **the image gallery in between is deliberately not
captured**. The reviews below are therefore based on the page top and the footer, not on the
gallery. Ten images were opened for the eight defects (desktop unless noted):

* **B1/B2/B3 — ToC and anchor jump** (`content-toc` = `/portfolio/sport/eishockey/ice/2025-26/s1-bwl-pvb/`):
  `content-toc-sec1` (light/desktop + light/mobile) and two targeted jump captures
  (`/tmp/toc-jump-{desktop,mobile}.png`, click on the first ToC entry). The target heading sits in
  **section index 2** of the sequence (measured `headingDocTop` 1597 desktop / 1808 mobile), which is
  inside the captured `[0,1,2,3,4,5,7,8]`; after the click the heading top is 96 px vs a 69/65 px
  header, i.e. visible below the header. This is the one route whose top window is widened to 6 so
  the target cannot be sampled away.
* **B4 — paginated portfolio titles**: `portfolio-page-mid-sec1` and `portfolio-page-last-sec1`
  (light/desktop) show the H1 "… – Seite 4" / "… – Seite 8"; `<title>` confirmed identical to the H1
  in the built output.
* **B5 — EXIF badge over `object-contain`**: `personal-branding-sec0` (light/desktop, portrait
  letterboxed in a wider band) and `shootings-sport-sec0` (light/desktop, the sport band). The green
  badge sits on the image's top-right corner, not in the empty band.
* **B6 — 404**: `not-found-sec0` (light/desktop): the closing row is "Beauty & Portrait · Akt &
  Boudoir · Pärchen · Über mich" (no TFP); the footer still links `TFP`.
* **B7 — `/impressum/` contact block**: `impressum-sec0` (light/mobile): E-Mail, Web, WhatsApp and
  Telefon each on their own line. The file is gitignored.
  **Observed but not fixed (outside B7):** the "Unternehmensdaten" block on the same page still joins
  the GISA line with "Zuständige Aufsichtsbehörde:" (same missing hard-break mechanism) — left
  untouched because B7 scoped the contact block only.

### Page coverage (one page per route family + all twelve simple pages)

Looked at (light/desktop `sec0` unless noted): `home`; the private areas `shootings`
(`/shootings/akt/`), `shootings-beauty`, `shootings-couples`; the sport overview `shootings-sport`,
the hub `shootings-sport-hub` (`/shootings/sport/eishockey/`) and the team page
`shootings-sport-team` (`/shootings/sport/lask/`); the six pricing states `pricing-default`,
`pricing-standard`, `pricing-flex`, `pricing-flex-private`, `pricing-standard-student`,
`pricing-standard-friend`; the portfolio overview `portfolio`; `content-example`; `content-toc`;
`testimonials`; `testimonial-detail`; `shootings-akt-testimonials`; `tfp`; `tfp-idea`; `not-found`.
Simple pages individually: `agb`, `dsb`, `eventfotografie`, `impressum` (mobile), `personal-branding`,
`portal`, `preise` (= `pricing-default`), `share`, `testimonials`, `tfp`, `ueber-mich`, Startseite
(= `home`), plus `akt-ablauf`.

**Not looked at in this round** (stated plainly, no claim is made about them): the other **135
portfolio posts** (only the five manifest representatives were opened), the other **87 testimonial
detail pages**, the other **14 TFP ideas**, the other **14 sport sub-areas**, every `dark/*` and
`intermediate/*` capture, gallery and page-end screens of every route, and every page of the site
outside the 33-route manifest. No horizontal overflow, cut-off content or branding defect was
assessed beyond the images listed above.

---

## Selective site-wide redesign round — 2026-10-19

Owner-commissioned selective polish of the remaining public page families (open item in
`AGENTS.todo.md`). Capture basis: the **full** manifest, 32 routes × 6 projects = **192/192**
screenshots/cases (`ui-review-redesign-2026-10-19`, dev server `http://localhost:44345`), plus
`pnpm test:contrast` (10/10) and the app E2E suite (46/46). Only real defects were changed; good
layouts were left alone.

### Genuinely changed

| Family / route | File | Change |
|---|---|---|
| Testimonials list + category pages, the testimonial section of the private and sport area pages, blog `TestimonialBlock` | `apps/reisinger.pictures/src/components/ReviewCard.astro` | One shared card for **both** layouts: same surface (`bg-base-200 border border-base-300 shadow-sm`), same centred identity slot (avatar + name + role) and same footer. The `quote` layout no longer uses the `sm:w-1/3` logo column (the empty top-left quadrant / right-half-confined body of §7 are gone); its logo sits centred above the name and the text is an italic `<blockquote>` (prose) instead of the two oversized `❝/❞` glyphs. The default layout keeps avatar → name → photo → text; only its surface moved from `bg-base-300` to `bg-base-200 border`. The source badge now sits top-right on every card (was inline for quote). All review text, source, role, image, detail/category links retained; image-less cards keep their natural height (`items-start`). |
| Testimonial detail `/testimonials/[slug]/` | `apps/reisinger.pictures/src/pages/testimonials/[slug].astro` | Single card wrapped in `mx-auto max-w-2xl`; the panel is an editorial measure instead of a 1314 px band around a ~500 px portrait (§7). The portrait is neither enlarged nor distorted; mobile stays full-width. |
| TFP idea `/tfp/[slug]/` | `apps/reisinger.pictures/src/pages/tfp/[slug].astro:49` | H1 colour `text-primary` → `text-base-content`, matching the TFP overview and every other page H1 (§8). Title text unchanged. |
| Pricing `/preise/` — Flex tab | `apps/reisinger.pictures/src/solid/PricingCalculator.tsx` | Removed the redundant nested `TARIF-KONFIGURATOR` card (a second `border-2 border-primary/30` card inside the tab panel) and its heading; Flex now shares the Standard tab's exact framing (description → price summary → steps → CTA) inside the single bordered panel (§4). Pricing formulas, URL parsing/query behavior, settings, discounts and contact links unchanged. |

### Deliberately left unchanged

- **Homepage / `HomeIntro`** (owner: liked) — verified pixel-identical to the audited baseline.
- **Sport pages / `SportAreaPage`** — untouched; the only sport change is the shared `ReviewCard` in
  the sport testimonial section, and its behaviour is preserved (E2E green).
- The three **private offer pages** (`/shootings/akt|beauty|couples/`) and `/akt/ablauf/` — the
  photo-led/editorial layouts read well and were kept; only the shared testimonial card changed.
- The **manifest's** portfolio and blog samples (`portfolio`, `portfolio-page-mid`,
  `portfolio-page-last`, `content-example`), plus 404, legal/text, portal, business, event photography
  and share, were pixel-identical to the audited baseline. Blog posts outside the manifest that embed
  `TestimonialBlock` also inherit the shared `ReviewCard` change; they were not part of this pixel
  comparison.
- Still-open, out-of-scope rows remain: homepage hero action weight (§1), the English share H1 (§5,
  owner decision), the floating chat bubble (§9), the KI-summary measure (§7). The `/impressum/`
  vertical rhythm (§5) and the TFP card title/body alignment (§8) were closed in the
  simple-page round of 2026-10-19 (see below).

### Coverage — what was actually looked at

An objective pixel comparison of the post-change run against the audited baseline
(`ui-review-all-routes-audit-2026-10-19`) shows differences **only** on these routes:
`pricing-flex`, `pricing-flex-private`, `testimonials`, `shootings-akt-testimonials`,
`testimonial-detail`, `tfp-idea`, and the testimonial sections of `shootings`, `shootings-beauty`,
`shootings-couples`, `shootings-sport`. Every other route renders pixel-identical (a ≤11-value
difference in 2 px on `home-sec1` / `portfolio-page-last-sec2|3` is render non-determinism, not
content). Changed routes were reviewed at **desktop, intermediate and mobile** in **light and dark**;
sampled sections only (the harness captures the page top + footer, so long-page interiors were not
re-inspected). Other families were spot-checked rather than exhaustively re-opened.

---

## Simple-page round — 2026-10-19 (owner-commissioned, one page at a time)

Owner commission: all **12 routable entries** of the `simple` collection (`index.mdx` is not routed)
were looked at individually and rebuilt **only where a concrete layout defect was visible**. Copy,
legal wording, prices, testimonials, links/URLs, image selections and functionality are unchanged;
the homepage and `/shootings/sport/**` are out of scope and were not touched.

Routes in scope: `/agb/`, `/dsb/`, `/eventfotografie/`, `/impressum/`, `/personal-branding/`,
`/portal/`, `/preise/`, `/share/`, `/testimonials/`, `/tfp/`, `/ueber-mich/`, `/akt/ablauf/`.

### Changed (3 routes)

| Route | File | Change |
|---|---|---|
| `/dsb/` | `apps/reisinger.pictures/src/pages/[...simple].astro` (H1 class, route-specific) | The H1 "Datenschutzbestimmungen (DSB)" broke mid-word on narrow screens ("Datenschutzbestimmung" + "en (DSB)"). The compound is 477 px wide at the standard 36 px H1 size, so it cannot fit into the 448 px mobile measure. The H1 now scales fluidly below the `sm` breakpoint (`max-sm:text-[clamp(1.25rem,6.4vw,2.25rem)]`), so the word stays whole and the title wraps at the space instead ("Datenschutzbestimmungen" / "(DSB)"). Measured font size 30.7 px at 480, 25.0 px at 390, 20.5 px at 320; the word never breaks and no horizontal overflow occurs (checked at 320/360/390/480/540/640/768/1024/1920). The title text, the page title, the schema and the PDF block are unchanged. |
| `/tfp/` | `apps/reisinger.pictures/src/components/TfpIdeaCard.astro` | The idea cards mixed two alignments (centred title, left body) and a fixed `min-h` on the title produced a conspicuous empty band above the description. The title is now left-aligned like the body, the minimum height is removed and the gap to the description is `mb-3`. Titles, descriptions, order, the "Weitere Ideen anzeigen" disclosure and the "Mehr erfahren" links are unchanged, and the action still sits at the bottom of every card. |
| `/personal-branding/` | `apps/reisinger.pictures/src/components/pages/EditorialHero.astro` (new), `apps/reisinger.pictures/src/pages/[...simple].astro` | The portrait (2:3, 4000×6000) sat in the full-bleed `HeroBanner` band — at 1920 a ~507 px photo inside a 1920 px grey band, with the H1 below the band. The route now renders a **route-specific editorial hero**: the portrait **floats right** from `lg` on (Tailwind `float-right`, no band, no letterbox, no crop, EXIF control anchored to the picture via `showInfo`), so headline, lead and article text flow around it. The shared `HeroBanner` (blog, TFP idea detail, `/akt/ablauf/`) is **not** changed. The article keeps the **same measure as the other simple pages** (`max-w-3xl` = 768 px; the CTA wrapper, a `div`, stays uncapped so its button remains centred in the content column), and the headings are forced left with `[&>h2]:text-left!` etc. because the global rule centres h1–h4. Below `lg` the wrapper is a flex column and the picture moves behind the headline (`order`), so the mobile order stays headline → lead → photograph → article. |

### Deliberately kept unchanged (9 routes)

| Route | Why nothing was changed |
|---|---|
| `/agb/` | The legal page renders the signed PDF as a link + bounded embed; the H1 and the section rhythm are clean. The signed-PDF decision of 2026-10-18 stands. |
| `/eventfotografie/` | Headline, lead, bullet list and the portal link form one consistent left-aligned column; no gap, overflow or hierarchy defect. |
| `/impressum/` | The open "vertical rhythm" item was **re-evaluated and is not reproducible** (uniform computed margins, see the row in §5). The contact block, the legal fields and the official WKO image stay as they are. |
| `/portal/` | Text page with one clear hierarchy (H1 → two intro paragraphs → H2 → list); no defect in the captured sections. |
| `/preise/` | The pricing configurator is **unchanged by this round** (the discount labels changed in the parallel pricing round — see rules/06 §Display decisions); the seven reload states of `e2e/pricing-deeplink.spec.ts` and the friend deep link (`rules/06`, `rules/07`) are covered by the E2E suite (49/49 green). The H1/H2 hierarchy was fixed on 2026-10-18 and still holds. |
| `/share/` | The campaign layout (uppercase hint line, three "Schritt" steps, tier cards) is intentional. The English H1 "Love it? Share it." remains an **open owner decision** (copy, not layout) — not changed here. |
| `/testimonials/` | The unified review card (2026-10-19, previous round) plus the AI summary read consistently; the narrower AI-summary box is a known `low` item (§7), not a rebuild. |
| `/ueber-mich/` | One left-aligned column with a pull quote; measure, rhythm and hierarchy are correct. |
| `/akt/ablauf/` | The long-form guide with its photo sequence is deliberate (owner note) — the `HeroBanner` band above it was kept unchanged because the guide's own first screen works with it. |

### Open items that stay open (not layout defects, or out of scope)

* `/share/` English H1 — **owner decision** on copy (unchanged).
* `/impressum/` contact lines: the "Unternehmensdaten" block still joins the GISA line with
  "Zuständige Aufsichtsbehörde:" (missing hard break). The file is **git-ignored content** and was
  therefore not touched here — it needs a content-store fix, not a template fix.
* Homepage hero action weight (§1), floating chat bubble (§9), KI-summary measure (§7),
  WKO logo on the dark surface (§5) — outside this commission.
* `/preise/` deep links, prices, discount logic: untouched, E2E green.

### Coverage — what was actually looked at

* **Full manifest suite** after the change: 32 routes × 6 projects = **192/192** cases, output
  `ui-review-simple-2026-10-19` (dev server `http://localhost:44345`, started with the project-owned
  `tests/screenshots/dev-server.mjs`). All 12 simple routes were captured in **light and dark** at
  **desktop (1920×950), intermediate (1024×900) and mobile (480×1040)**.
* **Visually re-opened** (light + dark where the change is visible): the new captures of `dsb`
  (mobile sec0, intermediate sec0, desktop sec0), `personal-branding` (desktop sec0/sec1,
  intermediate sec0, mobile sec0) and `tfp` (desktop sec0/sec1, intermediate sec0, mobile sec0);
  the changed pages were additionally inspected by scrolling in the browser (personal-branding at
  700 px and at the page end). The nine deliberately unchanged pages were looked at individually
  in the audited baseline run (light **and** dark desktop sec0, plus mobile sec0 for `dsb`,
  `share`, `ueber-mich`, `eventfotografie`, `portal` and `pricing-default`) and are pixel-identical
  in the new run.
* **Measured in the browser** (not only screenshots): the DSB H1 at 9 viewport widths (320–1920) and
  the personal-branding hero geometry at 1920/1024/480, plus the `/impressum/` margin table.
* **Objective pixel comparison** (new run vs. the audited baseline `ui-review-redesign-2026-10-19`,
  per PNG, tolerance > 2/255): differences **only** on `dsb` (mobile only — the intended H1 fix),
  `personal-branding` and `tfp` (all six projects — the intended changes) and `home`
  (6 px in one intermediate frame, known render non-determinism). Every other route of the manifest
  is pixel-identical to the baseline, including all nine simple routes that were deliberately kept.
  Two deviations belong to the **parallel pricing/area round** in the same working tree, not to this
  round: `pricing-default`, `pricing-standard`, `pricing-standard-student`, `pricing-standard-friend`
  (discount labels) and `shootings` (the "Ablauf-Leitfaden" entry in the route block). One further
  deviation is unrelated and not reproducible from the code: `content-example` at intermediate differs
  in the breadcrumb row (different line wrapping of the same four levels; the live DOM and the new
  capture agree, the route is untouched here and renders pixel-identical at desktop and mobile).
* **Owner change after the round (2026-10-19):** on the owner's request the article text on
  `/personal-branding/` now **flows around the portrait** — the picture floats right from `lg` on
  instead of standing in a grid column, so the text fills the space next to it and widens below it.
  The change touches that one route only (`EditorialHero.astro` + the route wrapper). The route was
  re-captured afterwards (6/6 cases) in `ui-review-pb3-2026-10-19` and measured in the browser at
  1920/1024/480 (image 512×768 at x=1108 at 1920 with the 768 px text measure of the other simple
  pages, headline and lead wrapping beside it, article text ending at the picture's margin; stacked
  below `lg` with a 24 px gap; no horizontal overflow). The nine
  deliberately unchanged routes and the two other changed routes are not affected by it.
* **The capture folders are ephemeral.** `ui-review-*` are screenshot collections in the OS temp
  directory, not in the repository; the owner released the temp area on 2026-10-19, so the folders of
  the finished rounds were deleted afterwards. The measurements quoted here are the evidence — the
  PNGs are not archived. Two collections deliberately survive until the open tasks are done:
  `ui-review-before-sport-step5-2026-10-19` (the before-captures the open sport steps compare
  against) and `sport-content-backup-2026-10-19` (the content backup the carry-over note refers to).
* **Limits of this pass:** the harness samples the page top and the footer of long pages, so the
  interior of `/dsb/`, `/agb/`, `/impressum/`, `/akt/ablauf/`, `/testimonials/` and `/tfp/` was **not**
  re-inspected section by section; the interior of `/personal-branding/` was opened once by scrolling
  (700 px and the page end). No claim is made about the un-inspected sections.

### Verification

`test:unit` 108/108 · `lint` clean · `astro check` 0 errors/0 warnings · `build` 280 pages,
`check_links` "No missing links found!" · `test:contrast` 10/10 · app E2E 49/49 (TFP disclosure,
pricing deep links, homepage, contact, private areas) · `git diff --check` clean.

UI evidence: **192/192** cases of the full manifest suite (18:43, `ui-review-simple-2026-10-19`) for
the state of this round, plus a **6/6** re-capture of the one route the owner changed afterwards
(`/personal-branding/`, 19:04, `ui-review-pb2-2026-10-19`). The build, unit, lint and E2E figures
above were re-run after that owner change and cover the final source; `test:contrast` and the
192-case suite do not touch `/personal-branding/` (contrast routes: beauty, couples, preise ×2),
so the re-capture is the UI evidence for that route.
