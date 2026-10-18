import { formatExactPrice } from "@reisinger/shared/utils";
import {
  calculateFlexPrice,
  calculateStandardPrice,
  flexImagesIncluded
} from "@reisinger/shared/utils/pricing";

/**
 * Homepage pricing derivations.
 *
 * The homepage never advertises a fixed package: it shows one transparent
 * EXAMPLE configuration for the Standard tariff. The amount is computed with
 * the very same shared pricing functions the `/preise/` calculators use, so the
 * two can never drift apart. Because the Standard sliders allow shorter
 * sessions and fewer images, the figure is explicitly NOT a minimum.
 */
export const standardExample = {
  hours: 1,
  images: 15,
  location: "outdoor"
} as const;

/** Formatted example price for the Standard tariff (1 h, 15 images, outdoor). */
export function standardExamplePrice(): string {
  return formatExactPrice(calculateStandardPrice(standardExample).finalPrice);
}

export const flexEntry = {
  type: "portrait",
  setup: "outdoor",
  extraImages: 0,
  isPrivacyOption: false
} as const;

// Explicit configurations make the linked calculator reproduce the advertised
// amount instead of opening an unrelated default or a previously selected tab.
export const standardExampleHref = `/preise/?${new URLSearchParams({
  tarif: "standard",
  h: String(standardExample.hours),
  img: String(standardExample.images),
  location: standardExample.location
})}`;

export const flexEntryHref = `/preise/?${new URLSearchParams({
  tarif: "flex"
})}`;

/**
 * Formatted entry price of the Flex tariff for creative private sessions.
 * Private use only and subordinate to the Standard tariff.
 *
 * The Flex price is a final total and is psychologically rounded like the
 * Standard price: a raw total that lands on a ten is displayed one euro lower
 * (e.g. 164 is displayed as 165).
 */
export function flexEntryPrice(): string {
  return formatExactPrice(calculateFlexPrice(flexEntry));
}

/** Edited images included in the Flex entry price. */
export const flexIncludedImages = flexImagesIncluded;
