# Pricing calculator URL state

## Ownership and hydration
- `/preise/?tarif=flex` is the canonical Flex entry link. `tarif=standard`,
  an absent tariff or an unknown tariff select Standard.
- `PricingTabs.tsx` is the sole calculator history writer. Both calculators are
  controlled children; neither parses nor serializes browser state independently.
- Static HTML cannot know a query string. It renders the tab bar, not a potentially
  incorrect default calculator/price. On mount, the complete URL is parsed before
  rendering a calculator. Hydration and `popstate` never rewrite the incoming URL.
- No debounce/timer can write an obsolete configuration after changing tabs.

## Parameters and defaults
Pure parsing/serialization lives in `src/solid/pricing-url-state.ts`.

| Parameter | Default | Accepted values |
| --- | --- | --- |
| `tarif` | `standard` | `standard`, `flex` |
| `h` | `1` | 1–8 hours, half-hour steps |
| `img` | `15` | 1–50 total Standard images, integer |
| `location` | `outdoor` | `outdoor`, `indoor` |
| `student` | false | literal `true` enables |
| `code` | absent | `friend` reveals the friend option |
| `friend` | false | literal `true`, effective only with `code=friend` |
| `type` | `portrait` | `portrait`, `couples`, `akt` |
| `setup` | `outdoor` | `outdoor`, `outdoor_flash`, `indoor` |
| `extra` | `0` | 0–30 extra Flex images, integer |
| `private` | false | literal `true`, effective only for `type=akt` |

- Malformed/empty/non-finite numbers fall back to defaults. Finite numbers are
  clamped and rounded to the slider steps; unknown enums fall back to defaults.
- Serialization writes the explicit tariff and omits default calculator values.
  Crucially, Indoor is **not** the default and must remain in the URL.
- Both tariff configurations are retained in the URL. Switching tariffs maps the
  current **total** image count: Flex extras = total minus `flexImagesIncluded`,
  clamped to 0–30; Standard total = Flex extras plus `flexImagesIncluded`.
  Counts outside the target range necessarily become the target boundary.
  Duration, location, discounts, shooting type and setup retain their own values.
- Switching away from Akt clears the unavailable online-prohibition option.
- Unrelated query parameters (including repeated keys) and the hash are preserved.
- UI changes replace the current entry; an explicit tariff change pushes an entry.
  Back/forward reread both configurations and the tariff without remapping counts.
  These are normal browser history operations, not a separate application router.

## Price examples and inquiry boundary
- `/preise/?tarif=standard&h=1&img=15&location=outdoor`: **249 €**.
- `/preise/?tarif=flex`: **149 €**.
- `/preise/?tarif=flex&type=akt&private=true`: **349 €**.
- These are selected inputs to the existing shared formulas, not new formulas.
- Calculator inquiry links include the current tariff/configuration and the
  configuration-aware message/price. The shared contact modal must preserve all
  non-contact parameters and restore the previous hash on close.
- These modal-managed links carry `data-astro-reload` to opt out of Astro's
  ClientRouter. The modal handler prevents the browser default; a concurrent
  ClientRouter navigation would otherwise reinitialize the modal on `#kontakt`
  and lose the original hash. This is not a request for a page reload.
- A URL flag, calculator selection or inquiry prefill is **never** publication
  consent, booking acceptance or a licence grant. Rule 06 remains authoritative.

## Regression evidence
Before the fix, loading `?location=indoor` displayed 329 € but deleted that query
parameter; a reload then selected Outdoor and displayed 249 €. The serializer
incorrectly treated Indoor as the default while the UI default was Outdoor.
`?tarif=flex` also selected Standard because the tab container did not read or
persist a tariff. Browser coverage lives in `e2e/pricing-deeplink.spec.ts`.
