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
| high | `apps/reisinger.pictures/src/components/ImageGallery.astro:26` + `src/styles/global.css:25-28` (`section[data-gallery] img { max-h-none; object-fit: contain }`) | `light/desktop/shootings-couples-sec9.png`, `-sec10.png`, `-sec11.png` | The rule "last image and every even index gets `GalleryLayout.Full`" promotes a portrait photo to a one-per-row image at full content width (~1314 px at 1920); the gallery override removes the global `max-h-[80vh]`, so the image keeps its native aspect ratio and becomes ~2000 px tall — the end of `/shootings/couples/` is dominated by a single image spanning about three viewport sections. | Cap the promoted image (e.g. `max-h-[85vh]` + `object-cover`) or drop the `Full` promotion for portrait-native images. |
| medium | `apps/reisinger.pictures/src/components/ContentCard.astro:26,40,48` + `src/styles/global.css:21-23` (`img { max-h-[80vh]; object-contain }`) | `light/desktop/shootings-sec16.png` | In "Aktuelle Einblicke" every card image is forced into a `3/2` box with `fit="contain"`, so a portrait photo renders with grey bars on both sides inside a landscape frame (first card next to two landscape cards). Mixed aspect ratios look like a broken grid. | Use `fit="cover"` for card images, or give each card the image's own aspect ratio. |
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
| high | n/a (`preise` content + configurator) | `light/desktop/pricing-standard-sec0.png`, `light/desktop/pricing-flex-sec0.png`, `light/intermediate/pricing-default-sec0.png`, `light/mobile/pricing-default-sec0.png` | Hierarchy inversion: the section heading "Faire **Preise** – für alle" (H2) renders clearly larger and heavier than the page's own H1 "Meine Tarife – Fair, transparent, flexibel". On the most important commercial page the second heading overpowers the page title. | Reduce the H2 one step (`text-2xl`/`md:text-3xl`) or raise the H1; at minimum keep the H2 below the H1 in visual weight. |
| medium | n/a | `light/desktop/pricing-standard-sec0.png` vs `light/desktop/pricing-flex-sec0.png` | The two tabs are not structurally parallel: the Flex tab renders an extra bordered "TARIF-KONFIGURATOR / STELLE DEINE SESSION ZUSAMMEN" panel around the price, the Standard tab starts directly with the price block. | Give both tabs the same panel (or drop the panel on Flex). |
| low | n/a | `light/desktop/pricing-default-sec1.png`, `light/mobile/pricing-default-sec1.png` | The student/friend-discount checkbox is a pale outline circle at the far right of its row; on mobile it is visually detached from its label and is a small tap target. | Use a labelled `checkbox`/`toggle` in the same line rhythm as the location buttons. |
| low | n/a | `light/desktop/pricing-standard-sec0.png`, `light/desktop/pricing-flex-sec0.png` | The price meta lines use emoji (🕐 🖼️) while the rest of the site uses MDI icon classes — two icon languages in one card. | Use the same `icon-[mdi--…]` set as the rest of the UI. |
| — | n/a | `light/desktop/pricing-flex-private-sec0.png`, `dark/desktop/pricing-flex-private-sec0.png`, `light/mobile/pricing-flex-private-sec0.png` | The private Flex state (checked "Absolutes Online-Verbot") renders correctly in light, dark and mobile; the dark theme's lime active tab and lime CTA keep dark text. Not re-reported: the three testimonial/price badges were just moved to readable daisyUI variants. | none |

## 5. Simple pages — legal and content (`agb`, `dsb`, `impressum`, `ueber-mich`, `personal-branding`, `eventfotografie`, `share`, `portal`, `akt-ablauf`)

| Severity | Stelle (Datei:Zeile) | Screenshot | Befund | Vorschlag |
|---|---|---|---|---|
| high | `apps/reisinger.pictures/src/content/simple/agb.mdx:14`, `apps/reisinger.pictures/src/content/simple/dsb.mdx:14` | `light/desktop/agb-sec0.png`, `-sec1.png`, `light/desktop/dsb-sec0.png`, `-sec1.png`, `dark/desktop/agb-sec0.png`, `dark/desktop/dsb-sec0.png`, `light/mobile/agb-sec0.png`, `light/mobile/dsb-sec0.png` | The current AGB/DSB text is only an `<iframe src="…/agb-1.pdf#navpanes=0">` inside an `aspect-paper-vertical` box. In every capture the framed area is empty, so (a) the screenshot pass cannot verify the legal text at all, and (b) on 480 px a full A4 page in an iframe is unreadable without pinch-zoom and needs nested scrolling; iOS Safari renders only the first page of an embedded PDF. **Not a "broken page" claim** — this is a headless-Chromium PDF-plugin limitation; the concern is the chosen embedding, not an empty file. | Render AGB/DSB as HTML (or a collapsed `<details>` per section) and keep the PDF as a download/secondary link. If the iframe stays, add a visible "PDF öffnen" fallback link inside the box. |
| high | `apps/reisinger.pictures/src/content/simple/dsb.mdx:23` | `light/desktop/dsb-sec3.png` | On the DSB page the version list says "**AGB** gültig ab 1. Jänner 2026" — the label is copy-pasted from `agb.mdx` and names the wrong document. | Change the label to "DSB gültig ab …" (the loop variable is already called `agb`, rename it too). |
| medium | `apps/reisinger.pictures/src/components/pages/MinimalPage.astro:37` (`<main class="container prose max-w-none …">` — `max-w-none` cancels Tailwind Typography's `65ch` measure) | `light/desktop/ueber-mich-sec0.png`, `light/desktop/impressum-sec2.png`, `light/desktop/eventfotografie-sec0.png`, `-sec1.png` vs `light/desktop/tfp-sec0.png` | Prose measure is unbounded on most simple pages (and on every page using `MinimalPage`): paragraphs run to ~1310 px and ~95–110 characters per line at 1920, while TFP/TFP-Idee constrain their own paragraphs to ~766 px. Same content type, two very different reading widths. | Drop `max-w-none` or add a measure to the prose wrapper (`max-w-prose`/`max-w-3xl`), as the TFP page and `HomeIntro.astro:45` already do. |
| medium | `apps/reisinger.pictures/src/styles/global.css:30-32` (`h1,h2,h3,h4 { @apply text-center }`), opted out per component with `text-left!` (`AreaHero.astro:27`, `PrivateAreaPage.astro:69`, `HomeIntro.astro:30`) | `light/desktop/impressum-sec2.png`, `light/desktop/ueber-mich-sec0.png`, `light/desktop/eventfotografie-sec1.png` | Mixed alignment within one page: all headings are centred by the global rule while body text stays left-aligned, so on the legal/content pages a centred heading sits above a left-aligned paragraph that starts at the far left of a 1310 px column. | Scope the centring rule (e.g. only for hero/section headings) or opt the simple-page prose out with `text-left!`. |
| medium | n/a | `light/desktop/impressum-sec2.png` | Inconsistent vertical rhythm: the gap between the end of a paragraph and the next H2 varies between roughly 60 px and 200 px on the same page. | Normalise the heading margins (`prose` heading spacing) on the legal pages. |
| medium | `apps/reisinger.pictures/src/content/simple/share.mdx:2` | `light/desktop/share-sec0.png`, `light/mobile/share-sec0.png` | The share page's H1 is English ("Love it? Share it.") while everything below it is German; the campaign names ("Friends of Friends", "Extra Creative") are brand art, but the page title is UI copy. | Confirm as a deliberate slogan, or use a German H1 and keep the English line as a tag line. |
| medium | n/a | `light/desktop/share-sec0.png`, `light/mobile/share-sec0.png` | The orientation text is very faint: "DU FEIERST DEINE BILDER? ERZÄHL ES WEITER." and the three "SCHRITT 01/02/03" labels are light grey on white and are the page's main structure. (Deliberately *not* covered by the automated badge finding — this is a different element.) | Raise the muted colour one step (e.g. `text-base-content/70`) for the hint line and the step labels. |
| medium | n/a | `light/mobile/impressum-sec0.png` | The contact block is written as inline runs, so on 480 px labels and values interleave: "Web: https://reisinger.pictures WhatsApp:" followed by the wa.me URL on its own line. Hard to scan. | Put each entry on its own line (`<dl>`/block list) instead of relying on wrapping. |
| low | `apps/reisinger.pictures/src/components/HeroBanner.astro:28-35` | `light/desktop/personal-branding-sec0.png`, `-sec1.png` | The HeroBanner band puts a ~500 px-wide photo inside a full-bleed 1920 px band above the H1, and the EXIF info badge floats at the band's top-right, i.e. outside the photo. | See the badge finding in §9; the band itself is the same issue as the sport hero. |
| low | n/a | `dark/desktop/impressum-sec0.png` | The WKO logo keeps its white logo background, which shows as a bright box on the dark surface. | Accept (official asset) or place the logo on a neutral `bg-base-100` chip in dark theme. |
| low | n/a | `light/desktop/akt-ablauf-sec19.png` | `/akt/ablauf/` ends with a single half-width image and an empty right half of the row before the footer. | Accept as a grid orphan, or balance the last row. |
| — | n/a | `light/desktop/portal-sec0.png` | No defect found on `portal` in the captured section. | none |

## 6. Portfolio / Blog (`portfolio`, `portfolio-page-mid`, `portfolio-page-last`, `content-example`)

| Severity | Stelle (Datei:Zeile) | Screenshot | Befund | Vorschlag |
|---|---|---|---|---|
| medium | `apps/reisinger.pictures/src/content/portfolioOverviews/index.md:7,9` | `light/desktop/portfolio-sec1.png`, `light/mobile/portfolio-sec1.png` | Copy bug: the H2 "Eine Idee oder Lust auf ein Shooting?" is repeated verbatim as the first paragraph line directly below it, so the text reads twice in a row. | Delete the duplicated line 9 (or turn it into real body copy). |
| low | n/a | `light/desktop/portfolio-sec0.png`, `light/desktop/portfolio-page-mid-sec0.png`, `light/desktop/portfolio-page-last-sec5.png` | All paginated portfolio URLs share the same browser title and the same H1 ("Mehr Einblicke & Bilder - Willkommen in meiner Fotowelt"), which also duplicates the breadcrumb parent label; the title uses a hyphen instead of an en dash. | Give page 2…n a distinguishing suffix ("… – Seite 4") and unify the dash. |
| low | n/a | `light/desktop/portfolio-page-last-sec5.png`, `light/desktop/content-example-sec12.png` | The last portfolio row ends with a lone tile (two columns), and the blog article's closing gallery mixes portrait and landscape photos without captions. Cosmetic only. | Accept. |
| — | n/a | `light/desktop/portfolio-sec1.png`, `light/desktop/portfolio-page-last-sec5.png` | Pagination renders above *and* below the grid; "Vorherige Seite" is correctly greyed on page 1 and both buttons are enabled on the last page. | none |

## 7. Kundenbewertungen (`testimonials`, `testimonial-detail`, `shootings-akt-testimonials`)

| Severity | Stelle (Datei:Zeile) | Screenshot | Befund | Vorschlag |
|---|---|---|---|---|
| medium | `apps/reisinger.pictures/src/components/ReviewCard.astro` (`h-full` on the card; `data-slug` at `:31`) | `light/desktop/testimonials-sec73.png`, `-sec74.png`, `-sec75.png` | A review card without a large image is stretched by `h-full` to the row height of its tall image neighbour (`mintha1`, "Martina Kremsmayr", beside the very tall `syannah1` card), so its body becomes a ~1210 px empty grey area with the footer far below the text. **Correction 2026-10-18:** an earlier revision of this document claimed the card rendered entirely empty ("no avatar, no name, no text, no image"). That was wrong: an independent check of all 87 `[data-slug]` cards found every one carrying a name and body text (shortest 110 characters). The claim came from misreading the 20 % section overlap. The real defect is the stretch, not missing content. | Do not stretch image-less cards to the row height (drop `h-full`, use `items-start`, or reserve a media area of equal height). |
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
| low | `apps/reisinger.pictures/src/pages/404.astro:38` | `light/desktop/not-found-sec0.png` | The 404 page links "TFP Shootings" in its closing link row, i.e. TFP appears outside the footer, and that row uses `text-base-content/60` (faint grey). | Move the TFP link out of the 404 row (keep footer only) and raise the row's contrast. |
| — | n/a | `light/desktop/not-found-sec0.png` | Otherwise the 404 page is solid: one H1, readable copy, primary + outline button pair, secondary link row, footer present. | none |

## 9. Cross-cutting observations

| Severity | Stelle (Datei:Zeile) | Screenshot | Befund | Vorschlag |
|---|---|---|---|---|
| low | `apps/reisinger.pictures/src/components/ExifInfoOverlay.astro` (via `HeroBanner.astro:35`, `ReviewCard.astro:78`, `ContentCard.astro:47`) | `light/desktop/personal-branding-sec0.png`, `light/desktop/shootings-couples-sec8.png` | The EXIF info control is an icon-only circle anchored to the wrapper, not the photo. Wherever the image is `object-contain` inside a wider box or band, the badge floats in the empty letterbox area outside the picture. | Anchor the badge to the rendered image (or place it in a static meta row) so it cannot detach. |
| low | n/a | all routes | The floating chat bubble (bottom-right) overlaps the last card or the footer band on every route and viewport captured. | Accept, or hide it while the footer is in view. |
| — | n/a | all routes | Header (logo, nav, active item highlighted, `btn btn-primary` CTA), footer (legal links + copyright) and one `h1` per page are present and consistent on every route looked at; no missing/duplicate branding, no horizontal overflow, no broken/missing images in the captured light/dark/mobile variants. | none |

---

## Top-Verbesserungen (ranked by impact)

1. **Preis-Konfigurator — H1/H2 hierarchy inversion.** The H2 "Faire Preise – für alle" is bigger than
   the page's own H1 on the commercially most important page; a one-line type-scale fix.
   (§4, `high`)
2. **Simple pages — unbounded prose measure + mixed alignment.** ~1310 px lines (~100 chars) and
   centred headings over left-aligned body text affect ueber-mich, impressum, eventfotografie,
   personal-branding, share and portal, while TFP already shows the correct treatment.
   (§5, `medium` ×2)
3. **AGB/DSB legal text exists only as a PDF in an iframe.** Not reviewable from screenshots and
   effectively unreadable on mobile / iOS; render the text as HTML and keep the PDF as a download.
   (§5, `high`)
4. **DSB page labels its version list "AGB gültig ab …".** Wrong document name in legal content,
   one-string fix (`dsb.mdx:23`). (§5, `high`)
5. **`/testimonials/` — image-less review cards are stretched to the row height** of a tall image
   neighbour, leaving a ~1210 px empty card body with the footer detached from the text. See the
   correction in §7: an earlier revision wrongly reported this card as completely empty.
   (§7, `medium`)
6. **Homepage hero primary action lacks weight.** The primary hero action is an underlined text link
   next to a nearly identical secondary link, while the header owns the only button. (§1, `medium`)
7. **`/shootings/couples/` ends with a single gallery image ~3 viewports tall** (full content width,
   native portrait aspect), plus the duplicated "Eine Idee oder Lust auf ein Shooting?" line on the
   portfolio overview — the two content/scale defects that are most obviously visible in a walk-through.
   (§2, §6)

Immediately after those: the `ContentCard` 3:2 `contain` letterbox in "Aktuelle Einblicke" (§2), the
two-layout review grid on `/testimonials/` (§7) and the `share` page's faint orientation text (§5).

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
* **Giant gallery image on `/shootings/couples/`** (§2): the unbounded height is sourced
  (`ImageGallery.astro:26` + `global.css:25-28`), but sections 9-11 overlap by 20 %, so it is not
  certain whether it is one promoted image or two consecutive full-width portrait images. A capture of
  `light/desktop/shootings-couples-sec9,10,11` at a taller viewport (or the full-page PNG for the
  x/y extent only) would settle it.
* **AGB/DSB text** (§5): whether the PDF renders in a real browser cannot be decided from a headless
  capture. A manual look at `/agb/` and `/dsb/` on desktop and iOS Safari is needed before judging the
  iframe decision itself.
* **`share` H1 / sport CTA wording** (§5, §3): both need an owner decision on whether the English
  slogan and the "Event-Begleitung" label are intended.
