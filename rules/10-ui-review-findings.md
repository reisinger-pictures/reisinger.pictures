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
| low | `apps/reisinger.pictures/src/components/home/HomeIntro.astro:25-61` | `light/mobile/home-sec0.png` | On mobile the reading order is H1 → "Beauty & Portrait" offering card → intro paragraph → CTA, so the hero's own photo card cuts the headline from its copy. `AreaHero.astro:17-21` documents this order as deliberate for area pages; for the homepage it reads like an accident. | Owner decision: either accept (consistent with area pages) or move the intro paragraph above the offering card on mobile. |
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
| medium | `apps/reisinger.pictures/src/components/HeroBanner.astro:27-36` (used by `SportAreaPage.astro:48` and `pages/[...simple].astro:50`) | `light/desktop/shootings-sport-sec0.png`, `dark/desktop/shootings-sport-sec0.png`, `light/mobile/shootings-sport-sec0.png` | The hero is a full-bleed `bg-base-200` band whose photo is height-capped (`max-h-[80vh]`) and centred. At 1920 the band is much wider than the photo, so ~390 px of empty band remain on each side; the H1 follows *below* the band instead of next to it. | Constrain the band (`max-w-*` or a two-column hero) so the image width matches the 1314 px content grid below it. |
| low | n/a | `light/desktop/shootings-sport-sec2.png` | The sport-art grid mixes label bars and photos across rows (label bar of row 1 sits visually above the photos of the previous row). Reading the grid requires scrolling. | Optional: put the label on the photo (`overlay`) to shorten the cards. |
| low | n/a | `light/desktop/shootings-sport-sec2.png` | The main CTA on the sport page reads "Jetzt **Event**-Begleitung anfragen", which is the event-photography wording. May be intentional (sport coverage booked as event coverage) — flagged as "unsure". | Decide the label; if not intentional, use a sport-specific CTA. |
| low | n/a | `light/desktop/shootings-sport-sec0.png` | The sport page has no "Privates Shooting" eyebrow and no lead text next to the hero, unlike Akt/Beauty/Pärchen — it is the one shooting area that keeps the old sport composition (see the comment in `SportAreaPage.astro:23-25`). | Known/planned: the sport pages are redesigned in a later, separately commissioned step. |

## 4. Preis-Konfigurator (`pricing-default`, `-standard`, `-flex`, `-flex-private`)

| Severity | Stelle (Datei:Zeile) | Screenshot | Befund | Vorschlag |
|---|---|---|---|---|
| behoben 2026-10-18 | n/a (`preise` content + configurator) | `light/desktop/pricing-standard-sec0.png`, `light/desktop/pricing-flex-sec0.png`, `light/intermediate/pricing-default-sec0.png`, `light/mobile/pricing-default-sec0.png` | Hierarchy inversion: the section heading "Faire **Preise** – für alle" (H2) renders clearly larger and heavier than the page's own H1 "Meine Tarife – Fair, transparent, flexibel". On the most important commercial page the second heading overpowers the page title. | Reduce the H2 one step (`text-2xl`/`md:text-3xl`) or raise the H1; at minimum keep the H2 below the H1 in visual weight. **Fixed 2026-10-18** in `src/content/simple/preise.mdx`: the H2 is now `text-2xl md:text-3xl font-bold` (was `text-4xl md:text-5xl font-black`). Measured on `/preise/`: H1 36 px / 800, H2 30 px / 700. |
| medium | n/a | `light/desktop/pricing-standard-sec0.png` vs `light/desktop/pricing-flex-sec0.png` | The two tabs are not structurally parallel: the Flex tab renders an extra bordered "TARIF-KONFIGURATOR / STELLE DEINE SESSION ZUSAMMEN" panel around the price, the Standard tab starts directly with the price block. | Give both tabs the same panel (or drop the panel on Flex). |
| low | n/a | `light/desktop/pricing-default-sec1.png`, `light/mobile/pricing-default-sec1.png` | The student/friend-discount checkbox is a pale outline circle at the far right of its row; on mobile it is visually detached from its label and is a small tap target. | Use a labelled `checkbox`/`toggle` in the same line rhythm as the location buttons. |
| low | n/a | `light/desktop/pricing-standard-sec0.png`, `light/desktop/pricing-flex-sec0.png` | The price meta lines use emoji (🕐 🖼️) while the rest of the site uses MDI icon classes — two icon languages in one card. | Use the same `icon-[mdi--…]` set as the rest of the UI. |
| — | n/a | `light/desktop/pricing-flex-private-sec0.png`, `dark/desktop/pricing-flex-private-sec0.png`, `light/mobile/pricing-flex-private-sec0.png` | The private Flex state (checked "Absolutes Online-Verbot") renders correctly in light, dark and mobile; the dark theme's lime active tab and lime CTA keep dark text. Not re-reported: the three testimonial/price badges were just moved to readable daisyUI variants. | none |

## 5. Simple pages — legal and content (`agb`, `dsb`, `impressum`, `ueber-mich`, `personal-branding`, `eventfotografie`, `share`, `portal`, `akt-ablauf`)

| Severity | Stelle (Datei:Zeile) | Screenshot | Befund | Vorschlag |
|---|---|---|---|---|
| behoben/entschieden 2026-10-18 | `apps/reisinger.pictures/src/content/simple/agb.mdx:14`, `apps/reisinger.pictures/src/content/simple/dsb.mdx:14` | `light/desktop/agb-sec0.png`, `-sec1.png`, `light/desktop/dsb-sec0.png`, `-sec1.png`, `dark/desktop/agb-sec0.png`, `dark/desktop/dsb-sec0.png`, `light/mobile/agb-sec0.png`, `light/mobile/dsb-sec0.png` | The current AGB/DSB text is only an `<iframe src="…/agb-1.pdf#navpanes=0">` inside an `aspect-paper-vertical` box. In every capture the framed area is empty, so (a) the screenshot pass cannot verify the legal text at all, and (b) on 480 px a full A4 page in an iframe is unreadable without pinch-zoom and needs nested scrolling; iOS Safari renders only the first page of an embedded PDF. **Not a "broken page" claim** — this is a headless-Chromium PDF-plugin limitation; the concern is the chosen embedding, not an empty file. | Render AGB/DSB as HTML (or a collapsed `<details>` per section) and keep the PDF as a download/secondary link. If the iframe stays, add a visible "PDF öffnen" fallback link inside the box. **Owner decision 2026-10-18:** the signed PDF stays the authoritative document, the legal text is *not* converted to HTML. Only the presentation changed in `agb.mdx`/`dsb.mdx`: a labelled "… als PDF öffnen (signierte Fassung)" link in a new tab, a note that it is the signed original, and a bounded embed height (`h-[45vh] sm:h-[70vh] max-h-[900px]`) instead of the A4 `aspect-paper-vertical` box. |
| behoben 2026-10-18 | `apps/reisinger.pictures/src/content/simple/dsb.mdx:23` | `light/desktop/dsb-sec3.png` | On the DSB page the version list says "**AGB** gültig ab 1. Jänner 2026" — the label is copy-pasted from `agb.mdx` and names the wrong document. | Change the label to "DSB gültig ab …" (the loop variable is already called `agb`, rename it too). **Fixed 2026-10-18:** label and loop variable renamed to `DSB`/`dsb`. |
| behoben 2026-10-18 | `apps/reisinger.pictures/src/components/pages/MinimalPage.astro:37` (`<main class="container prose max-w-none …">` — `max-w-none` cancels Tailwind Typography's `65ch` measure) | `light/desktop/ueber-mich-sec0.png`, `light/desktop/impressum-sec2.png`, `light/desktop/eventfotografie-sec0.png`, `-sec1.png` vs `light/desktop/tfp-sec0.png` | Prose measure is unbounded on most simple pages (and on every page using `MinimalPage`): paragraphs run to ~1310 px and ~95–110 characters per line at 1920, while TFP/TFP-Idee constrain their own paragraphs to ~766 px. Same content type, two very different reading widths. | Drop `max-w-none` or add a measure to the prose wrapper (`max-w-prose`/`max-w-3xl`), as the TFP page and `HomeIntro.astro:45` already do. **Fixed 2026-10-18** for the `simple` pages: `pages/[...simple].astro` wraps its text in `.content-measure`, whose direct `p/ul/ol/blockquote/heading` children are capped at `max-w-3xl mx-auto` (global.css). Measured on `/ueber-mich/` and `/impressum/`: widest paragraph 768 px (was ~1310 px). Other `MinimalPage` consumers (blog, area, portfolio, testimonials) are deliberately untouched. |
| behoben 2026-10-18 | `apps/reisinger.pictures/src/styles/global.css:30-32` (`h1,h2,h3,h4 { @apply text-center }`), opted out per component with `text-left!` (`AreaHero.astro:27`, `PrivateAreaPage.astro:69`, `HomeIntro.astro:30`) | `light/desktop/impressum-sec2.png`, `light/desktop/ueber-mich-sec0.png`, `light/desktop/eventfotografie-sec1.png` | Mixed alignment within one page: all headings are centred by the global rule while body text stays left-aligned, so on the legal/content pages a centred heading sits above a left-aligned paragraph that starts at the far left of a 1310 px column. | Scope the centring rule (e.g. only for hero/section headings) or opt the simple-page prose out with `text-left!`. **Fixed 2026-10-18:** scoped opt-out via `.content-measure` (see the row above) instead of touching the global rule; the `simple` page headings are left-aligned like the body text. |
| medium | n/a | `light/desktop/impressum-sec2.png` | Inconsistent vertical rhythm: the gap between the end of a paragraph and the next H2 varies between roughly 60 px and 200 px on the same page. | Normalise the heading margins (`prose` heading spacing) on the legal pages. |
| medium | `apps/reisinger.pictures/src/content/simple/share.mdx:2` | `light/desktop/share-sec0.png`, `light/mobile/share-sec0.png` | The share page's H1 is English ("Love it? Share it.") while everything below it is German; the campaign names ("Friends of Friends", "Extra Creative") are brand art, but the page title is UI copy. | Confirm as a deliberate slogan, or use a German H1 and keep the English line as a tag line. |
| behoben 2026-10-18 | n/a | `light/desktop/share-sec0.png`, `light/mobile/share-sec0.png` | The orientation text is very faint: "DU FEIERST DEINE BILDER? ERZÄHL ES WEITER." and the three "SCHRITT 01/02/03" labels are light grey on white and are the page's main structure. (Deliberately *not* covered by the automated badge finding — this is a different element.) | Raise the muted colour one step (e.g. `text-base-content/70`) for the hint line and the step labels. **Fixed 2026-10-18** in `share.mdx`: hint `text-base-content/60` → `/70`, step labels `opacity-50` → `opacity-70`. |
| behoben 2026-10-18 | `apps/reisinger.pictures/src/content/simple/impressum.md` (gitignored content) | `impressum-mobile` | The contact block was written as inline runs, so on 480 px labels and values interleaved: "Web: https://reisinger.pictures WhatsApp:" followed by the wa.me URL on its own line. Hard to scan. | Put each entry on its own line (`<dl>`/block list) instead of relying on wrapping. **Fixed 2026-10-18:** each contact entry is now terminated with an explicit `<br>` (the "Web:" line was the only one missing a hard break); wording unchanged. The file is gitignored, so the fix is local-only and will not be part of a commit. |
| low | `apps/reisinger.pictures/src/components/HeroBanner.astro:28-35` | `light/desktop/personal-branding-sec0.png`, `-sec1.png` | The HeroBanner band puts a ~500 px-wide photo inside a full-bleed 1920 px band above the H1, and the EXIF info badge floats at the band's top-right, i.e. outside the photo. | See the badge finding in §9; the band itself is the same issue as the sport hero. |
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
| medium | `apps/reisinger.pictures/src/components/ReviewCard.astro:32-97` | `light/desktop/testimonials-sec0.png`, `-sec1.png`, `-sec2.png`, `light/desktop/shootings-sport-sec2.png` | Two different card layouts share one grid: the `quote` layout puts a vertically centred avatar/logo in a `sm:w-1/3` column (leaving a large empty top-left quadrant and the body confined to the right half), the default layout puts the avatar on top above a full-width body. Cards without any image are also much shorter, so a 2-column row mixes strongly different heights. | Normalise the card: same avatar slot and same body width in both layouts, or force a minimum media area so rows align. |
| medium | n/a | `light/desktop/testimonial-detail-sec0.png` | The detail page wraps one ~500 px-wide portrait photo in a 1314 px-wide `bg-base-200` panel, so the photo is very tall and ~400 px of empty panel remain on each side. | Constrain the media column (e.g. `max-w-md`) or use the large image as the column background with the text beside it. |
| low | n/a | `light/desktop/testimonials-sec0.png`, `light/desktop/shootings-akt-testimonials-sec0.png` | The "KI ZUSAMMENFASSUNG BASIEREND AUF 85 REVIEWS" box is centred and noticeably narrower than the left-aligned intro paragraph above it. | Align both to the same measure, or leave the difference deliberately. |
| — | n/a | `light/desktop/shootings-akt-testimonials-sec0.png`, `-sec11.png`, `light/intermediate/testimonials-sec0.png` | The category page and the intermediate viewport render correctly (single column at 1024, cards full width, footers without the category link on category pages). | none |

## 8. TFP (`tfp`, `tfp-idea`) and 404 (`not-found`)

| Severity | Stelle (Datei:Zeile) | Screenshot | Befund | Vorschlag |
|---|---|---|---|---|
| medium | n/a | `light/desktop/tfp-idea-sec0.png` vs `light/desktop/tfp-sec0.png` | The idea detail page renders its H1 in the green brand colour while every other page (including the TFP overview) uses the dark base colour. | Use the standard H1 colour; if the green is wanted as a brand accent, use it consistently. |
| low | n/a | `light/desktop/tfp-sec0.png`, `light/mobile/tfp-sec0.png` | In the idea cards there is a large empty gap between the centred card title and the left-aligned body text; title centred, body left — two alignments inside one small card. | Tighten the gap and pick one alignment for the card. |
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

Not a component: `src/middleware/toc.ts` post-processes every page's HTML, finds `<div data-toc></div>` and injects `<h2 class="text-left">Inhaltsverzeichnis</h2><ul>…</ul>` built from all `h2`–`h6` elements that carry an `id` (headings inside `<footer>` are excluded). It appears in `BlogPost.astro:60` (every portfolio post) and in `[...simple].astro:55` (guarded by `showToc`, default true).

Measured on 2026-10-18 against the running dev server, in a real browser, on `/portfolio/sport/eishockey/ice/2025-26/s1-bwl-pvb/`:

| Severity | Stelle (Datei:Zeile) | Screenshot | Befund | Vorschlag |
|---|---|---|---|---|
| behoben 2026-10-18 | `apps/reisinger.pictures/src/styles/global.css` (`:is(h2, h3, h4, h5, h6)[id] { @apply scroll-mt-24 }`) | `content-toc-*` after a jump (measured) | Clicking a table-of-contents entry scrolled the target heading to `top: 0`, i.e. **directly under the sticky header** (`sticky top-0 z-50`, 69 px at 1440, 73 px at 390), so the reader arrived without seeing the heading they clicked. Applies to every ToC entry on all posts and the `simple` pages that show a ToC. | One central rule now gives every `h2–h6` anchor target `scroll-margin-top: 6rem`. **Fixed 2026-10-18** in `global.css`; measured after a real click on `/portfolio/sport/eishockey/ice/2025-26/s1-bwl-pvb/`: heading top 96.5 px vs header bottom 69 px (1440), 96.1 px vs 73 px (390) — visible below the header on both. Headings only, so the homepage's `#portfolio-blog` jump (`scroll-mt-24` on a `<div>`) is not offset twice (measured 96.1 px, not 192 px). |
| **offen** | `src/middleware/toc.ts:115-118` | — (65 of 136 posts carry a ToC; 7 have exactly one entry, 12 have two) | The ToC is rendered whenever at least one heading exists. A "Inhaltsverzeichnis" heading above a **single** entry is pure noise; 19 of 65 posts are in that range. **Deliberately not decided in the B1–B8 fix round:** whether a ToC is wanted at all (and at what threshold) is the open fundamental question this log keeps open. | Suppress the ToC below a threshold (e.g. fewer than three entries) or require two levels of nesting — **owner decision, still open**. |
| behoben 2026-10-18 | `src/middleware/toc.ts:118` | `content-toc-*` (sequential, ~~temp evidence~~) | The injected markup was a bare `<h2>` plus `<ul>`: no `<nav>`, no `aria-label`, so assistive technology did not announce it as a navigation region and the heading was not programmatically tied to the list. Visually fine (bullet list, `text-left` wins over the global centring rule). | Wrap it in `<nav aria-labelledby="…">` with an id on the heading. **Fixed 2026-10-18:** the generator now emits `<nav aria-labelledby="toc-heading"><h2 id="toc-heading" class="text-left">…`; the nested lists already sit inside their parent `<li>`. Optics unchanged. |
| behoben 2026-10-18 | `src/middleware/toc.ts:32,36-37,89` | — | Two robustness smells: the heading selector parsed the **whole page** and excluded only `footer *`, so any later `h2[id]` outside the article body would silently join the ToC; and `node.children?.length ?? 0 > 0` relied on `??` binding looser than `>`, so the guard only worked by accident. | Restrict the parse to the article container and write the guard explicitly. **Fixed 2026-10-18:** the query is scoped to the ToC placeholder's parent element (`[data-toc]` → `<article>`/`.content-measure`), the footer exclusion stays, and the guard reads `(node.children?.length ?? 0) > 0`. Equivalence checked against the built output — 72 pages carry a ToC and the before/after entry-and-level sequences are identical (0 mismatches); the `content-example` post still has none. |
| — | n/a | — | Anchor targets with umlauts work: the href is percent-encoded (`#…f%C3%BCr…`) while the `id` keeps the raw character, and the browser resolves it (measured: the click landed on the element). | none |
| behoben 2026-10-18 | n/a | — | **Coverage gap, now closed:** the manifest's `content-example` route renders a post **without** headings, so no capture had ever shown the ToC — which is why the earlier visual pass did not report it. | A ToC-bearing post (`s1-bwl-pvb`) was added to the manifest as `content-toc`. **Fixed 2026-10-18**, with `leadingSections: 6` so the ToC and the headings its entries jump to stay in the sampled images. |



**Status 2026-10-18:** points 1, 2, 4, 5 and 7 fixed, point 3 resolved by owner decision
(signed PDF kept, presentation improved), point 6 deliberately out of this scope (homepage hero).

**Status 2026-10-18 (defect-fix round B1–B8):** the eight unambiguous defects were fixed and
re-verified: §10 ToC anchor jump / nav landmark / parse scope / manifest coverage, §6 paginated
portfolio title/H1, §9 EXIF badge, §8 404 TFP link and contrast, §5 `/impressum/` contact
structure. The open fundamental question — *whether a table of contents is wanted at all, and at
what entry threshold* — is deliberately **still open** (§10, first row) and was not decided here.
The remaining `medium`/`low` rows (homepage hero weight, review-grid unification, testimonial
detail band, TFP-idea H1 colour, vertical rhythm, share H1, sport pages) are unchanged.

## Top-Verbesserungen (ranked by impact)

**Status 2026-10-18:** the earlier ranking (pricing H1/H2, simple-page measure, AGB/DSB PDF, DSB label,
stretched review card, gallery image, portfolio duplicate) is **done** — see the per-row status in the
sections above and the fix round commit. What remains, ranked:

1. ~~**Table of contents hides its own target.** Clicking a ToC entry scrolls the heading under the
   sticky header on every post and on the `simple` pages that show a ToC (§10, `high`) — a one-rule
   CSS fix with a large effect across 65 posts.~~ **Done 2026-10-18** (`scroll-margin-top` on
   anchored headings). The open question about whether a ToC is needed at all remains open (§10).
2. **Homepage hero primary action lacks weight.** The primary hero action is an underlined text link
   next to a nearly identical secondary link, while the header owns the only real button.
   (§1, `medium`)
3. **The review grid mixes two card layouts and very different row heights.** One layout centres the
   avatar/logo in a third-width column, the other puts it on top; rows therefore look uneven.
   (§7, `medium`)
4. **`/testimonials/<name>/` wraps a small portrait in a wide band**, leaving ~400 px of empty panel
   on each side (§7, `medium`).
5. **`/impressum/` has an uneven vertical rhythm and interleaved contact lines on mobile**
   (§5, `medium`).
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
