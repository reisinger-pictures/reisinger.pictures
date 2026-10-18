import { formatExactPrice } from "@reisinger/shared/utils";
import { calculateFlexPrice, calculateStandardPrice } from "@reisinger/shared/utils/pricing";
import { describe, expect, it } from "vitest";

import { flexEntry, flexEntryHref, flexEntryPrice, flexIncludedImages, standardExample, standardExampleHref, standardExamplePrice } from "./homepage";

// The homepage must never advertise a hardcoded amount: both figures are
// derived from the shared, centralised pricing functions. The authoritative
// tariff values are owned by the pricing source, so these tests assert the
// DERIVATION (not a frozen euro literal) and stay green when the central
// configuration changes.
describe("homepage pricing derivations", () => {
  it("derives the Standard example from the shared pricing functions", () => {
    expect(standardExamplePrice()).toBe(
      formatExactPrice(calculateStandardPrice(standardExample).finalPrice)
    );
  });

  it("describes the example configuration it advertises", () => {
    expect(standardExample).toEqual({ hours: 1, images: 15, location: "outdoor" });
  });

  it("formats the final rounded Flex price without another rounding pass", () => {
    expect(flexEntryPrice()).toBe(formatExactPrice(calculateFlexPrice(flexEntry)));
  });

  it("links each advertised configuration to its own calculator tab", () => {
    const standard = new URL(standardExampleHref, "https://reisinger.pictures").searchParams;
    expect(Object.fromEntries(standard)).toEqual({
      tarif: "standard", h: String(standardExample.hours), img: String(standardExample.images), location: standardExample.location
    });
    const flex = new URL(flexEntryHref, "https://reisinger.pictures").searchParams;
    expect(Object.fromEntries(flex)).toEqual({ tarif: "flex" });
  });

  it("renders both figures as formatted euro amounts", () => {
    // de-AT places the currency symbol before the number ("€ 249").
    expect(standardExamplePrice()).toMatch(/€\s?\d+/);
    expect(flexEntryPrice()).toMatch(/€\s?\d+/);
  });

  it("keeps the shared Flex image count", () => {
    expect(flexIncludedImages).toBe(15);
  });
});
