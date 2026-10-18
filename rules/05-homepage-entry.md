# Homepage editorial entry

Scope: the introduction on `/`, above the complete existing portfolio/blog
feed. The feed retains 12 posts per page, pagination, titles, metadata and page 2.
No new content is inserted above the blog beyond this commissioned entry.

## Approved visual direction (2026-10-18)

- Photography, not a catalogue of tariff cards: open images, quiet typography,
  semantic theme colors, no grey card stacks, decorative pills or shadows.
- On mobile, the heading is followed immediately by the portrait, before the
  introduction and actions. Desktop uses one editorial text/image grid.
- The portrait also provides the Beauty & Portrait entry. It appears **once**.
  Paare and Boudoir form a two-image strip with captions/actions outside panels.
  All three offers use the same structure: photograph → offer title →
  `Mehr erfahren →`, with identical title/action typography and distinct targets.
  There is no intermediate “Privat vor der Kamera” heading. Link accessible names
  include the offer title while their visible text remains identical.
- The **complete, unmodified** Nicole Pecnik quote and name remain. It is a quiet
  pause after the private photographs and **before** prices. No claim that this
  is a paying customer, and no additional ornamental quotation panel.
- Standard is the primary example; Flex is a subordinate, compact explanation.
  No two large tariff containers and no unused grid column at intermediate
  widths. Review 1024, 1190 and 1280 px as well as wide desktop and mobile.
  The pricing section has two deliberate actions: `Standard berechnen`
  (`btn-primary`) and `Flex berechnen` (`btn-outline`), without extra contact
  actions. Do not add a redundant inline conditions link to the same Flex URL.
  Standard's short configuration line is separate from `Beispielpreis, kein
  Mindestpreis`; Flex's included images, private/noncommercial scope, publication
  condition and existing Akt/Boudoir exception are distinct readable statements.
- Personal Branding and Eventfotografie remain small secondary text links,
  without further promotion while the owner considers their future prominence.
  **TFP appears only in the existing footer** (explicit owner decision): no
  intro link, block, card, heading or button. The row has no “creative projects”
  label. Paid private shoots take precedence; the TFP page itself is unchanged.
- Keep the accessible `Zum Portfolio-Blog` jump to `#portfolio-blog`.

## Components and scope

- `src/components/home/HomeIntro.astro`: one `not-prose` root section, rendered
  on page 1 only. Keeping one root preserves the existing feed sibling selector.
- `src/components/OfferingCard.astro`: the **single reusable image/title/action
  implementation for all three offers**, including the large hero photograph.
  Props: `imageName`, `href`, `title`, optional `cta` (default `Mehr erfahren`),
  `headingTag` (h2/h3, default h2), `loading`, `sizes` and `class`.
  Contextual grid placement stays in `HomeIntro` through the class prop; the
  shared component owns the figure/caption, heading, action and styling. All
  homepage offer titles are h2 because no grouping heading precedes the strip.
  The action is a real, separate focus-visible link (no nested links), at least
  44 px high, with `mt-auto`. Hero loading is eager and preserves its explicit
  responsive sizes; the lower two images default to lazy with two-column sizes.
  The superseded `home/HomeOfferingCard.astro` is removed, not retained as a
  parallel template.
- `HomePricingCard.astro`: compact Standard/Flex section, not boxed cards.
- `src/data/homepage.ts`: shared homepage example configurations, derived
  formatted prices and hrefs; regression tests in `homepage.test.ts`.
- Native SSR, no additional client island, global font or theme changes.
  Homepage heading alignment overrides are local utilities where the existing
  global heading rules otherwise override `not-prose` and center captions.

## Contact density and URL preservation

The homepage has **no hero contact CTA and no floating contact button**. Its
header contact button and ordinary footer contact link remain functional.
The existing contact dialog is not removed. `MinimalPage` passes
`showFloatingContact={false}` to `Footer` only for homepage page 1; the default
remains `true` elsewhere, including page 2. `showContact` stays independent.

Opening a same-page contact link must merge only contact-prefill fields into
the current URL, preserving tariff/calculator state. Closing removes only
`name`, `email`, `phone`, `message`, `subject_prefix` and `subject`; it must not
clear unrelated query parameters. Restore the previous hash only if the current
hash is still `#kontakt`, without overwriting a newer unrelated hash. Always
read the current URL on close so updates made after opening survive. Calculator
parameters are never treated as contact-prefill fields. Existing TFP contact
prefills and the real modal behavior remain intact; browser tests mock form POSTs.

## Pricing: final calculator amounts, explicit links

- Prices come from the same `calculateStandardPrice` / `calculateFlexPrice`
  functions as the calculators. Use `formatExactPrice` on their **already rounded
  final totals**, not a second psychological-rounding pass. No euro literals in
  production markup, no modification of central pricing math or portal data.
- Standard's central homepage example is 1 hour, 15 edited images, outdoor.
  Current imported settings yield **249 EUR**, labelled `Beispielpreis` and
  explicitly **not a minimum**. Smaller configurations remain possible.
  Do not invent commercial/licence inclusions.
- Main/Standard price links serialize that same configuration:
  `/preise/?tarif=standard&h=1&img=15&location=outdoor`.
- Flex's central homepage example is the default creative private portrait,
  outdoor, zero extra images, no online-prohibition option. It yields **149 EUR**
  with 15 edited images. The owner-requested public link is
  `/preise/?tarif=flex`. The redundant inline `Bedingungen` link was removed;
  `Flex berechnen` is the single pricing-section link to that calculator.
  The calculator URL-state
  implementation owns parsing/defaults and is verified separately.
- Flex is for private persons, **no commercial image use**, discounted against
  **agreed publication**. Retain `Online-Verzicht bei Akt & Boudoir gegen
  Aufpreis – Details im Rechner`. The calculator supplies the conditions;
  do not point to unchanged legal text at `/agb/` or invent a conditions anchor.
- The homepage does not alter durations, included images, amounts, discounts or
  publication conditions. Shared snapshot/pricing ownership is separate.

## Images and content invariants

Only approved existing image slugs are used:
`beauty-sarah-home2025-portrait-rothaarig-intensiver-blick`, `couples-schule1`,
`akt-boudoir-fine-art-fa-02`. The owner explicitly selected `fa-02` to replace
`b-03` **only** in the homepage Boudoir offer and `/shootings/akt/` hero.
The unique existing source was inspected at
`src/content/portfolio/akt/boudoir-fine-art/fa-02.jpg`; its existing sidecar
resolves the exact slug. No new photos, sidecars, crops or renames.
`src/content/privateAreas/akt.mdx` is gitignored: its only change is `heroImage`.
(The file lived at `src/content/areas/akt.mdx` before the 2026-10-18 collection
split — see `rules/09-shooting-areas.md`; the path in this section is the
historical one.)
The dynamic shooting page derives HeroBanner, SocialImage and schema image from
this same field, keeping them consistent without changing shared rendering.
Its entire `images` gallery, article text and all other references are unchanged.

Development note (observed 2026-10-18): in the long-running `dev` daemon on port
4325 a change to the gitignored private-offer `akt.mdx` (the file lived at
`areas/akt.mdx`, now `privateAreas/akt.mdx`) was **not** picked up — the page
kept the previous hero while Vite HMR for `.astro` components worked in the same
process, `astro sync` reported `Synced content` without changing the served page,
and the on-disk `.astro/data-store.json` kept its pre-edit timestamp. A
dev-server restart re-reads the collection; the production build always reads the
file fresh. Do not force-refresh by deleting `.astro/` (AGENTS.md §5).
All use `ResponsiveImage`; the hero is eager. Natural aspect ratios retain the
full frames without cropping faces/heads. The quote is rendered directly from
the `nicolepecnik1` collection entry, without edits or paraphrasing.

## Verification boundary

The coordinated production build (including `astro check`, `prebuild` and
`postbuild` link validation) runs **after** the concurrent homepage and pricing
URL implementations finish. Dev E2E/screenshots are not production-build proof.
Independent verification and owner review precede any publication or push.
