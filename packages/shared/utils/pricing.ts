import { portalLicenseTerms } from "../data/portal-license-terms";
import { roundToPsychologicalValue } from "./index";

// The public website must represent the portal's live settings. The nine
// owner-confirmed fields are imported explicitly into the checked-in snapshot
// (`portal-license-terms.ts`); these constants are DERIVED from it, never
// duplicated. Money arrives in integer cents and is converted here.
const portal = portalLicenseTerms.terms;
const centsToEuro = (cents: string) => Number(cents) / 100;

const config = {
  basePrice: centsToEuro(portal.calc_base_price),
  hourlyRate: centsToEuro(portal.calc_hourly_rate),
  imagesPerHour: {
    indoor: Number(portal.calc_images_per_hour),
    outdoor: Number(portal.calc_outdoor_images_per_hour)
  }
};

export const basePrice = config.basePrice;
export const hourlyRate = config.hourlyRate;
export const reportageMultiplier = Number(portal.calc_flatrate_multiplier);
// Student = exactly one third off (portal discount `'33'`, owner-confirmed
// 2026-10-18); friend = 50 %. The package is rounded first, the discount is
// applied to that rounded package, then the result is rounded again.
export const studentDiscountMultiplier = 2 / 3;
export const friendDiscountMultiplier = 0.5;

/**
 * Zentralisierte Preis-Berechnung für Shootings
 * @param durationMinutes Dauer des Shootings in Minuten
 * @param images Anzahl der inkludierten Bilder
 * @param multiplier Multiplikator für Rabatte (z.B. 0.5) oder Aufschläge (z.B. 1.2)
 * @param location "indoor" (Studio) oder "outdoor" (unterschiedliche Bilder pro Stunde)
 */
export function calculatePackagePrice(
  durationMinutes: number,
  images: number,
  multiplier = 1,
  location: "indoor" | "outdoor" = "indoor"
): number {
  const durationHours = durationMinutes / 60;
  const timePrice = durationHours * config.hourlyRate;

  // Bilderpreis pro Stück: Stundensatz geteilt durch Bilder pro Stunde der jeweiligen Location
  const imagesPrice = (config.hourlyRate / config.imagesPerHour[location]) * images;

  return (config.basePrice + timePrice + imagesPrice) * multiplier;
}

// Next Specials getrennt berechnen
export const pricingNextIndoor = calculatePackagePrice(90, 15, 1, "indoor");
export const pricingNextIndoorReduced = pricingNextIndoor * (2 / 3);

export const pricingNextOutdoor = calculatePackagePrice(90, 20, 1, "outdoor");
export const pricingNextOutdoorReduced = pricingNextOutdoor * (2 / 3);

export const socialMediaSpecial = config.basePrice / 3 + config.hourlyRate / 2 + (2 * (config.hourlyRate / config.imagesPerHour.indoor));

export const image1 = (config.hourlyRate / config.imagesPerHour.indoor) * 1.8;
export const image5 = (config.hourlyRate / config.imagesPerHour.indoor) * 5 * 1.5;
export const image10 = (config.hourlyRate / config.imagesPerHour.indoor) * 10 * 1.2;

export const image1Indoor = image1;
export const image5Indoor = image5;
export const image10Indoor = image10;

export const image1Outdoor = (config.hourlyRate / config.imagesPerHour.outdoor) * 1.8;
export const image5Outdoor = (config.hourlyRate / config.imagesPerHour.outdoor) * 5 * 1.5;
export const image10Outdoor = (config.hourlyRate / config.imagesPerHour.outdoor) * 10 * 1.2;

export const express = 3 * config.hourlyRate;
export const all = 2 * 8 * config.hourlyRate;

export const maxReductionNext = Math.max(pricingNextIndoor - pricingNextIndoorReduced, pricingNextOutdoor - pricingNextOutdoorReduced);
export const maxPriceImage5 = Math.max(image5Indoor, image5Outdoor);

// Flex-Tarif (B2C). The 15 included images and the 1.5–2 h session are the
// retained owner offer (2026-10-18) and are NOT portal settings; the portal's
// "extra images" are counted beyond these 15.
export const flexBasePrice = centsToEuro(portal.srp_base_price);
export const flexImagesIncluded = 15;
export const flexImagePrice = centsToEuro(portal.srp_extra_image_fee);
export const flexSetupSurcharge = centsToEuro(portal.srp_setup_fee);
export const flexPrivacyBase = centsToEuro(portal.srp_privacy_fee);
export const flexPrivacyPerImage = 0;

// Standard-Tarif
export const standardImagePriceIndoor = config.hourlyRate / config.imagesPerHour.indoor;
export const standardImagePriceOutdoor = config.hourlyRate / config.imagesPerHour.outdoor;

// ---------------------------------------------------------------------------
// Configurator arithmetic (shared single source of truth)
//
// The `/preise/` Solid islands delegate to these functions so the website and
// its tests can never drift from one another. Values are owner-confirmed
// against the portal on 2026-10-18.
// ---------------------------------------------------------------------------

export interface StandardPriceInput {
  /** Shooting duration in hours (the public slider works in hours). */
  hours: number;
  images: number;
  location: "indoor" | "outdoor";
  isStudent?: boolean;
  /** Only pass `true` when the friend discount is actually unlocked. */
  isFriend?: boolean;
}

export interface PriceBreakdown {
  /** Pre-discount package price (already psychologically rounded). */
  packagePrice: number;
  /** Final price (rounded again only when a discount applied). */
  finalPrice: number;
}

/**
 * Standard tariff price in euros.
 *
 * Mirrors the portal rule (owner-confirmed 2026-10-18): the raw package is
 * psychologically rounded FIRST, the discount is applied to that rounded
 * package, and the discounted result is psychologically rounded again. Without
 * a discount the package price is already final.
 */
export function calculateStandardPrice(input: StandardPriceInput): PriceBreakdown {
  const imagesPerHour = config.imagesPerHour[input.location];
  const rawTotal =
    config.basePrice + input.hours * config.hourlyRate + input.images * (config.hourlyRate / imagesPerHour);
  const packagePrice = roundToPsychologicalValue(rawTotal);

  const multiplier =
    (input.isStudent ? studentDiscountMultiplier : 1) * (input.isFriend ? friendDiscountMultiplier : 1);

  return {
    packagePrice,
    finalPrice: multiplier === 1 ? packagePrice : roundToPsychologicalValue(packagePrice * multiplier)
  };
}

export interface FlexPriceInput {
  extraImages: number;
  setup: "outdoor" | "outdoor_flash" | "indoor";
  /** The Act & Boudoir online-prohibition option (only offered for `akt`). */
  isPrivacyOption: boolean;
}

/**
 * Flex tariff price in euros.
 *
 * Intended shared rule (owner-confirmed 2026-10-18): the raw sum is
 * psychologically rounded ONCE — on the final total. Setup, extra-image and
 * privacy amounts stay raw; only the sum is rounded (80 → 79).
 *
 * Note: the portal's `calculateB2CFlexPrice` currently returns the raw sum
 * WITHOUT this rounding. That is a known portal defect awaiting its own fix —
 * it is not the reference behaviour.
 */
export function calculateFlexPrice(input: FlexPriceInput): number {
  let total = flexBasePrice;
  if (input.setup === "outdoor_flash" || input.setup === "indoor") total += flexSetupSurcharge;
  total += input.extraImages * flexImagePrice;
  if (input.isPrivacyOption) total += flexPrivacyBase + (flexImagesIncluded + input.extraImages) * flexPrivacyPerImage;
  return roundToPsychologicalValue(total);
}
