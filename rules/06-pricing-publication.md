# Pricing & image-publication rules (Standard, Flex, discounts)

Owner clarification 2026-10-18. The **publication/use** part governs
**marketing/calculator copy only** — no legal document (AGB, DSB, consent
contracts) is changed. The **amount** part aligns the public calculator with the
portal's live settings (see "Source sync"). Legal wording stays the lawyer's job;
a later legal alignment is pending.

## Standard tariff
- The **Standard tariff serves private and business clients alike** under the
  agreed use. Do not invent a precise commercial-licence scope for Standard.
- **Standard without any discount: publication is not included.** Any use
  (portfolio, social media, …) requires the client's separate, express
  permission. Do not present publication as part of the base price.

## Discounts ⇒ agreed publication
- **Every discount against the Standard price requires agreed image
  publication.** This covers the **student discount (exactly one third off)**, the
  **friend discount (50 %)** and the Flex tariff, which is priced below Standard.
- The publication permission is an **offer condition**: it is communicated
  *before* the inquiry and finally agreed *before* the booking takes effect.
- **A click in the calculator is never consent or a licence grant.** Copy must
  say the condition is agreed together before booking, so no publication opt-in
  is hidden from the user. No new legal checkbox in the global contact form is
  needed for this.

## Flex tariff
- Flex is a **creative entry tariff for private persons only — no commercial
  image use.** It is intended to be *subordinate to Standard in price, not in
  photographic quality*.
- **Retained offer:** 1.5–2 h shooting time and **15 included images**. The
  portal's "extra images" are counted **beyond** those 15 — do not change the
  counts or the duration.
- For Flex, the **agreed publication of selected images is part of the offer**
  (same condition as the other discounts). Do not claim a Flex session is
  "fully private".

## Retained exception: Flex Act & Boudoir online prohibition (+ fee)
- The existing **Act & Boudoir option** in the Flex calculator (a **flat
  surcharge**, `flexPrivacyBase` in `packages/shared/utils/pricing.ts`) means:
  **no online publication** of those images (no Instagram, no website upload).
- It is **not** "fully private / no use / no showing": the photographer may show
  **selected pictures personally, 1:1, on his own devices** as work samples
  (face-to-face, offline). Files never leave his control and are never
  distributed digitally to third parties.
- The option is only offered for `shootingType === "akt"`; do not extend it to
  other shooting types or to Standard. Its URL parameter stays `private`, its
  checkbox and formula stay unchanged.
- The internal Solid signal is still named `isFullyPrivate` (kept to minimise
  behavioural drift). **Its meaning is the exception above** — the on-screen
  label is the clear "Absolutes Online-Verbot" wording, not the variable name.

## Amounts & arithmetic (owner-confirmed, portal-imported)
- **Standard:** base 50 €, hourly 80 €, 6 images/h indoor, 10 images/h outdoor,
  +20 % reportage. Rounding: **psychologically round the package first, apply the
  discount to that rounded package, then psychologically round the final**.
  Examples: 1 h / 15 / outdoor = **249 €**, 1 h / 15 / indoor = **329 €**,
  90 min / 15 / outdoor = **289 €**.
- **Flex:** base 80 €, setup 50 €, +15 € per extra image, privacy option 200 €.
  Intended rule: **round once, on the raw total** (80 → 79, 130 → 129,
  280 → 279); setup/extra/privacy amounts stay raw.
- The single source of truth is `packages/shared/utils/pricing.ts`
  (`calculateStandardPrice`, `calculateFlexPrice`); the Solid islands delegate to
  it. `apps/reisinger.pictures/src/pricing-parity.test.ts` pins the public result
  against a cents-based reproduction of the portal cases (incl. rounding
  boundaries and the `'33'`/`'50'` discounts).
- The portal's 90-min default and the public 60-min default are **input
  selections, not a formula** — the public page keeps its 60-min example. The
  reportage multiplier (1.2) is stored in the snapshot but is **not used by the
  public UI yet** (out of scope).

## Source sync: explicit import boundary
- `pnpm run import:portal-terms` (`packages/tools/scripts/import-portal-license-terms.ts`)
  fetches `https://portal.reisinger.pictures/api/settings/license-terms` (public,
  no auth) and writes the checked-in snapshot
  `packages/shared/data/portal-license-terms.ts`.
- **Only these nine fields** are ever persisted: `calc_base_price`,
  `calc_hourly_rate`, `calc_images_per_hour`, `calc_outdoor_images_per_hour`,
  `calc_flatrate_multiplier`, `srp_base_price`, `srp_setup_fee`,
  `srp_extra_image_fee`, `srp_privacy_fee`. The endpoint serves many more fields
  (legal texts, prices, multipliers) — **none of those may be stored**.
- **Validation before write:** money must be positive integer **cents**, counts
  positive integers, the multiplier a positive finite number. The write is
  **atomic** (temp file + rename). On an HTTP/parse/validation failure the
  existing snapshot is left **untouched** — no silent fallback.
- **Explicit only:** never part of `prebuild`, the runtime or CI. **Idempotent:**
  if the normalised terms are unchanged, the snapshot (and its timestamp) is not
  rewritten.
- `packages/shared/utils/pricing.ts` **consumes the snapshot** and derives every
  constant from it — the numbers are never duplicated by hand. Raw values are
  stored unchanged (e.g. Flex base 80 € = `"8000"` cents); the display rounds.
- The pure boundary logic lives in `packages/shared/utils/portal-license-terms.ts`
  and is unit-tested in `apps/reisinger.pictures/src/portal-terms-import.test.ts`
  (units, missing/malformed fields, HTTP failure, no-overwrite).
- **The snapshot does not guarantee live freshness by itself.** Import + review +
  build are required to pick up a settings change; an optional live comparison is
  non-deterministic and therefore not a unit test. `pricing-parity.test.ts` links
  the constants to the snapshot.

## Where the rule is visible
- `src/content/simple/preise.mdx` (local, git-ignored): page-level summary of the
  rule for Standard vs. Flex and the discount condition.
- `src/solid/PricingTabs.tsx`: Standard copy distinguishes no-discount
  (separate express permission) from discount (agreed publication); Flex intro
  states private / no commercial use plus the agreed-publication condition and
  points to the Act exception; the Act privacy block no longer promises full
  anonymity (hiding the face cannot *guarantee* unidentifiability) and states the
  flat surcharge via `formatExactPrice(flexPrivacyBase)` — no per-image claim.
- `src/solid/PricingCalculatorProfi.tsx`: the publication condition is shown
  next to the selected discount and added to the contact request **only when a
  discount actually applies**. Without a discount the request claims no
  publication grant. The student option is labelled "(ein Drittel)".
- `src/solid/PricingCalculator.tsx`: configuration-aware rights summary and
  request message (private / no commercial use + agreed publication, or the
  1:1 on-device exception when Act + the option is flagged).

## Deliberately unchanged (inspected, reported)
- `src/content/simple/share.mdx` (legacy referral/bonus programme): left as is.
  Its bonus amounts, free offers and legacy-product wording are unrelated to this
  rule; its program semantics stay ambiguous and are **not** re-invented here.
- Other content touchpoints (e.g. `src/content/simple/akt/ablauf/index.mdx`,
  "Veröffentlichung? Nur mit deinem Ja!") already match "publication only with
  consent" and are not modified.

## Pending / open points
- **Portal Flex rounding defect:** the portal's `calculateB2CFlexPrice` returns
  the raw sum without psychological rounding. That is a **known portal defect**,
  not the reference; the public Flex keeps the intended final-total rounding. The
  portal fix is pending separate owner permission and is not mirrored here.
- **Blast radius of the shared amounts:** `config.basePrice`, `hourlyRate` and
  `imagesPerHour` also feed the legacy derived exports (`calculatePackagePrice`,
  `pricingNext*`, `socialMediaSpecial`, `image1/5/10*`, `express`, `all`,
  `maxReductionNext`, `maxPriceImage5`) and the homepage derivations. The legacy
  exports are left untouched (no cleanup, no bonus-term change) — their derived
  numbers simply move with the new base rates; the `/share/` ticket values
  (`maxReductionNext`, `maxPriceImage5`) are the visible consequence and were not
  re-worded.
- **Student eligibility** is preserved from the source (scholars/students); only
  the rate (exact one third) and label changed.
- **Legal alignment:** the wording here is owner-clarified marketing copy and is
  pending review against AGB/DSB. No legal document is edited from this rule.
