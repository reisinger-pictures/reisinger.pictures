import { portalLicenseTerms } from "@reisinger/shared/data/portal-license-terms";
import { roundToPsychologicalValue } from "@reisinger/shared/utils";
import {
  basePrice,
  calculateFlexPrice,
  calculateStandardPrice,
  flexBasePrice,
  flexImagePrice,
  flexPrivacyBase,
  flexSetupSurcharge,
  hourlyRate,
  reportageMultiplier
} from "@reisinger/shared/utils/pricing";
import { describe, expect, it } from "vitest";

// Ported from the portal logic (`frontend/src/logic/shootingCalculator.ts`) to
// verify the PUBLIC result against a reproducible portal case. The portal
// computes Standard prices in CENTS; `CENTS_PER_EURO` keeps the conversion in
// one place so the parity claim is explicit about its unit boundary.
const CENTS_PER_EURO = 100;

// Owner-confirmed portal settings (2026-10-18, amounts re-set 2026-11-01), kept
// literal here on purpose so the parity test is an independent reference rather
// than a re-read of config.
const imagesPerHourIndoor = 6;
const imagesPerHourOutdoor = 8;

/** Verbatim portal `roundToPsychologicalValue`, in cents. */
function portalRoundCents(value: number): number {
  if (value < 12 * CENTS_PER_EURO) return Math.max(CENTS_PER_EURO, Math.round(value));
  let rounded: number;
  if (value >= 1000 * CENTS_PER_EURO) {
    rounded = Math.round(value / (50 * CENTS_PER_EURO)) * (50 * CENTS_PER_EURO);
  } else {
    rounded = Math.round(value / (5 * CENTS_PER_EURO)) * (5 * CENTS_PER_EURO);
  }
  if (
    rounded !== 0 &&
    (rounded % (10 * CENTS_PER_EURO) === 0 || (value >= 1000 * CENTS_PER_EURO && rounded % (50 * CENTS_PER_EURO) === 0))
  ) {
    rounded -= CENTS_PER_EURO;
  }
  return rounded;
}

/** Portal `calculateCustomStudioPrice` in cents (package-first rounding, then discount, then final rounding). */
function portalStandardCents(input: {
  durationMinutes: number;
  images: number;
  location: "indoor" | "outdoor";
  discountPercent: number;
}): { packageCents: number; finalCents: number } {
  const imagesPerHour = input.location === "outdoor" ? imagesPerHourOutdoor : imagesPerHourIndoor;
  const raw = basePrice * CENTS_PER_EURO + (input.durationMinutes / 60) * hourlyRate * CENTS_PER_EURO + (hourlyRate * CENTS_PER_EURO / imagesPerHour) * input.images;
  const packageCents = portalRoundCents(raw);
  const rawFinal = packageCents - (packageCents * input.discountPercent) / 100;
  const finalCents = input.discountPercent !== 0 ? portalRoundCents(rawFinal) : packageCents;
  return { packageCents, finalCents };
}

function euro(cents: number): number {
  return cents / CENTS_PER_EURO;
}

describe("Standard tariff parity with the portal (owner-confirmed 2026-11-01)", () => {
  it("keeps the public EUR rounding identical to the portal cents rounding for whole-euro values >= 12", () => {
    for (let euros = 12; euros <= 1200; euros += 1) {
      expect(roundToPsychologicalValue(euros)).toBe(euro(portalRoundCents(euros * CENTS_PER_EURO)));
    }
  });

  it("matches the portal for the advertised example (1 h / 15 images / outdoor = 339)", () => {
    // 50 + 1*100 + 15*(100/8) = 50 + 100 + 187.5 = 337.5 -> 340 -> 339
    const result = calculateStandardPrice({ hours: 1, images: 15, location: "outdoor" });
    expect(result.packagePrice).toBe(339);
    expect(result.finalPrice).toBe(339);
  });

  it("matches the portal across configurations, including rounding boundaries", () => {
    const cases = [
      { durationMinutes: 60, images: 15, location: "outdoor" as const, discountPercent: 0 },
      { durationMinutes: 60, images: 15, location: "outdoor" as const, discountPercent: 100 / 3 },
      { durationMinutes: 60, images: 15, location: "outdoor" as const, discountPercent: 50 },
      { durationMinutes: 90, images: 15, location: "indoor" as const, discountPercent: 0 },
      { durationMinutes: 90, images: 15, location: "indoor" as const, discountPercent: 100 / 3 },
      { durationMinutes: 90, images: 15, location: "indoor" as const, discountPercent: 50 },
      { durationMinutes: 90, images: 15, location: "outdoor" as const, discountPercent: 0 },
      { durationMinutes: 120, images: 25, location: "outdoor" as const, discountPercent: 0 },
      { durationMinutes: 480, images: 50, location: "outdoor" as const, discountPercent: 0 },
      { durationMinutes: 480, images: 50, location: "outdoor" as const, discountPercent: 100 / 3 }
    ];

    for (const c of cases) {
      const portal = portalStandardCents(c);
      const publicResult = calculateStandardPrice({
        hours: c.durationMinutes / 60,
        images: c.images,
        location: c.location,
        isStudent: c.discountPercent === 100 / 3,
        isFriend: c.discountPercent === 50
      });
      expect(publicResult.packagePrice, `package for ${JSON.stringify(c)}`).toBe(euro(portal.packageCents));
      expect(publicResult.finalPrice, `final for ${JSON.stringify(c)}`).toBe(euro(portal.finalCents));
    }
  });

  it("applies the discount to the rounded package, not the raw total", () => {
    // package 339 -> -50% = 169.5 -> 169
    expect(calculateStandardPrice({ hours: 1, images: 15, location: "outdoor", isFriend: true }).finalPrice).toBe(169);
    // student is EXACTLY one third off (portal '33'): 339 * 2/3 = 226 -> 225
    expect(calculateStandardPrice({ hours: 1, images: 15, location: "outdoor", isStudent: true }).finalPrice).toBe(225);
    // both discounts combine multiplicatively, like the existing public UI: 339/3 = 113 -> 115
    expect(calculateStandardPrice({ hours: 1, images: 15, location: "outdoor", isStudent: true, isFriend: true }).finalPrice).toBe(115);
  });
});

describe("Flex tariff intended rule (final-total rounding only)", () => {
  it("rounds the raw sum once on the final total", () => {
    // The owner's 149 € base already ends in 9, so these default sums are
    // psychologically round as-is.
    expect(calculateFlexPrice({ extraImages: 0, setup: "outdoor", isPrivacyOption: false })).toBe(149); // 149 -> 149
    expect(calculateFlexPrice({ extraImages: 0, setup: "indoor", isPrivacyOption: false })).toBe(199); // 199 -> 199
    expect(calculateFlexPrice({ extraImages: 0, setup: "outdoor", isPrivacyOption: true })).toBe(399); // 399 -> 399
  });

  it("keeps setup and extra-image amounts raw and rounds only their sum", () => {
    // 149 + 50 + 3*15 = 244 -> 245
    expect(calculateFlexPrice({ extraImages: 3, setup: "outdoor_flash", isPrivacyOption: false })).toBe(245);
    // 149 + 50 + 2*15 + 250 = 479 -> 480 -> 479
    expect(calculateFlexPrice({ extraImages: 2, setup: "indoor", isPrivacyOption: true })).toBe(479);
  });

  it("documents the current portal defect (raw total, no rounding) as NOT the reference", () => {
    // The portal's calculateB2CFlexPrice returns the raw sum. The intended public
    // rule rounds the final total. The owner's 149 € base already ends in 9, so
    // the three default sums are psychologically round as-is and the defect is
    // invisible there; an extra image still exposes it (149 + 15 = 164 -> 165).
    // This test pins the distinction so the portal fix is a one-line change.
    const rawSums = [
      { extraImages: 0, setup: "outdoor" as const, isPrivacyOption: false, raw: 149 },
      { extraImages: 0, setup: "indoor" as const, isPrivacyOption: false, raw: 199 },
      { extraImages: 0, setup: "outdoor" as const, isPrivacyOption: true, raw: 399 }
    ];
    for (const c of rawSums) {
      expect(calculateFlexPrice(c)).toBe(roundToPsychologicalValue(c.raw));
    }

    const withExtraImage = { extraImages: 1, setup: "outdoor" as const, isPrivacyOption: false };
    expect(calculateFlexPrice(withExtraImage)).toBe(roundToPsychologicalValue(164));
    expect(calculateFlexPrice(withExtraImage)).not.toBe(164);
  });
});

describe("Portal terms snapshot link (single source, no duplicated constants)", () => {
  it("stores the owner-confirmed values as raw cent/count strings", () => {
    expect(portalLicenseTerms.terms).toEqual({
      calc_base_price: "5000",
      calc_hourly_rate: "10000",
      calc_images_per_hour: "6",
      calc_outdoor_images_per_hour: "8",
      calc_flatrate_multiplier: "1.25",
      srp_base_price: "14900",
      srp_setup_fee: "5000",
      srp_extra_image_fee: "1500",
      srp_privacy_fee: "25000"
    });
  });

  it("derives every pricing constant from the snapshot", () => {
    const t = portalLicenseTerms.terms;
    expect(basePrice).toBe(Number(t.calc_base_price) / 100);
    expect(hourlyRate).toBe(Number(t.calc_hourly_rate) / 100);
    expect(reportageMultiplier).toBe(Number(t.calc_flatrate_multiplier));
    expect(flexBasePrice).toBe(Number(t.srp_base_price) / 100);
    expect(flexSetupSurcharge).toBe(Number(t.srp_setup_fee) / 100);
    expect(flexImagePrice).toBe(Number(t.srp_extra_image_fee) / 100);
    expect(flexPrivacyBase).toBe(Number(t.srp_privacy_fee) / 100);
  });
});
