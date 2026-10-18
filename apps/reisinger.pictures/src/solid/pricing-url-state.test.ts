import { describe, expect, it } from "vitest";

import { parsePricingUrl, serializePricingUrl, switchPricingTariff } from "./pricing-url-state";

const parse = (query = "") => parsePricingUrl(new URLSearchParams(query));

describe("pricing URL boundary", () => {
  it("defaults to Standard and preserves legacy configurations without a tariff", () => {
    expect(parse().tariff).toBe("standard");
    expect(parse("tarif=unknown").tariff).toBe("standard");
    expect(parse("h=1.5&img=21&location=indoor&student=true").standard).toEqual({
      hours: 1.5, images: 21, location: "indoor", isStudent: true, isFriend: false, friendCode: false
    });
    expect(parse("tarif=flex").tariff).toBe("flex");
    expect(parse("tarif=standard").tariff).toBe("standard");
  });

  it("parses both configurations independently of parameter order", () => {
    const query = "tarif=flex&type=akt&private=true&setup=indoor&extra=3&h=2&img=18&location=indoor&code=friend&friend=true";
    expect(parse(query)).toEqual(parse(query.split("&").reverse().join("&")));
    expect(parse(query).flex).toEqual({ shootingType: "akt", setupType: "indoor", extraImages: 3, isFullyPrivate: true });
    expect(parse(query).standard.isFriend).toBe(true);
  });

  it.each(["NaN", "Infinity", "-Infinity", "", "1oops"])("defaults non-finite or malformed numbers: %s", (value) => {
    const state = parse(`h=${value}&img=${value}&extra=${value}`);
    expect(state.standard.hours).toBe(1);
    expect(state.standard.images).toBe(15);
    expect(state.flex.extraImages).toBe(0);
  });

  it("clamps and quantizes to the actual slider ranges", () => {
    expect(parse("h=-2&img=-50&extra=-1").standard).toMatchObject({ hours: 1, images: 1 });
    expect(parse("extra=-1").flex.extraImages).toBe(0);
    expect(parse("h=999&img=999&extra=999")).toMatchObject({ standard: { hours: 8, images: 50 }, flex: { extraImages: 30 } });
    expect(parse("h=1.6&img=15.7&extra=2.3")).toMatchObject({ standard: { hours: 1.5, images: 16 }, flex: { extraImages: 2 } });
  });

  it("validates enumerations, boolean flags and the conditional options", () => {
    const state = parse("location=moon&type=unknown&setup=unknown&student=yes&friend=true&private=true&code=invalid");
    expect(state.standard).toMatchObject({ location: "outdoor", isStudent: false, isFriend: false, friendCode: false });
    expect(state.flex).toEqual({ shootingType: "portrait", setupType: "outdoor", extraImages: 0, isFullyPrivate: false });
  });

  it("roundtrips complete state without touching unrelated parameters/hash or input URL", () => {
    const source = new URL("https://example.test/preise/?utm_source=mail&tag=one&tag=two#details");
    const state = parse("tarif=flex&type=akt&private=true&setup=indoor&extra=3&h=2&img=18&location=indoor&code=friend&friend=true&student=true");
    const result = serializePricingUrl(source, state);
    expect(parsePricingUrl(result.searchParams)).toEqual(state);
    expect(result.searchParams.getAll("tag")).toEqual(["one", "two"]);
    expect(result.searchParams.get("utm_source")).toBe("mail");
    expect(result.hash).toBe("#details");
    expect(source.searchParams.has("tarif")).toBe(false);
  });

  it("serializes outdoor as the default, but never drops the non-default indoor setting", () => {
    const url = new URL("https://example.test/preise/?location=indoor");
    const state = parsePricingUrl(url.searchParams);
    expect(serializePricingUrl(url, state).searchParams.get("location")).toBe("indoor");
    expect(serializePricingUrl(url, parse()).searchParams.has("location")).toBe(false);
  });

  it("maps TOTAL images on tariff switches while retaining other settings", () => {
    const source = parse("h=3&img=20&location=indoor&type=akt&private=true&setup=outdoor_flash");
    const flex = switchPricingTariff(source, "flex");
    expect(flex.flex).toMatchObject({ extraImages: 5, shootingType: "akt", setupType: "outdoor_flash", isFullyPrivate: true });
    expect(switchPricingTariff(flex, "standard").standard).toEqual(source.standard);
    expect(switchPricingTariff(parse("img=1"), "flex").flex.extraImages).toBe(0);
    expect(switchPricingTariff(parse("img=50"), "flex").flex.extraImages).toBe(30);
    expect(switchPricingTariff(flex, "flex")).toBe(flex);
  });
});
