import {
  buildPortalTermsArtifact,
  runPortalTermsImport,
  stripFetchedAt,
  validatePortalTerms
} from "@reisinger/shared/utils/portal-license-terms";
import { describe, expect, it } from "vitest";

// The live endpoint (HTTP 200) serves far more than the nine allowed fields;
// extra keys must never be persisted.
const VALID_PAYLOAD: Record<string, unknown> = {
  editorial: "Nur für redaktionelle Berichterstattung zugelassen.",
  commercial: "Uneingeschränkte kommerzielle Nutzung ist gestattet.",
  price_web: 7500,
  price_print: 14500,
  mult_commercial: "2.0",
  pricing_strategy: "scope_licensing",
  volume_pricing: null,
  calc_base_price: 5000,
  calc_hourly_rate: 8000,
  calc_images_per_hour: "6",
  calc_outdoor_images_per_hour: "10",
  calc_flatrate_multiplier: "1.2",
  srp_base_price: 8000,
  srp_setup_fee: 5000,
  srp_privacy_fee: 20000,
  srp_extra_image_fee: 1500
};

const EXPECTED_TERMS = {
  calc_base_price: "5000",
  calc_hourly_rate: "8000",
  calc_images_per_hour: "6",
  calc_outdoor_images_per_hour: "10",
  calc_flatrate_multiplier: "1.2",
  srp_base_price: "8000",
  srp_setup_fee: "5000",
  srp_extra_image_fee: "1500",
  srp_privacy_fee: "20000"
};

function memoryIO(payload: unknown, initial: string | null = null) {
  const state = { content: initial, writes: 0 };
  return {
    state,
    io: {
      fetchTerms: async () => payload,
      readArtifact: async () => state.content,
      writeArtifact: async (_path: string, content: string) => {
        state.writes += 1;
        state.content = content;
      }
    }
  };
}

describe("validatePortalTerms", () => {
  it("normalises the nine fields and drops every other endpoint field", () => {
    const terms = validatePortalTerms(VALID_PAYLOAD);
    expect(terms).toEqual(EXPECTED_TERMS);
    expect(Object.keys(terms)).toHaveLength(9);
    expect(terms).not.toHaveProperty("editorial");
    expect(terms).not.toHaveProperty("price_web");
  });

  it("rejects a missing required field", () => {
    const { calc_hourly_rate: _omitted, ...withoutHourly } = VALID_PAYLOAD;
    void _omitted;
    expect(() => validatePortalTerms(withoutHourly)).toThrow(/"calc_hourly_rate" is missing/);
  });

  it("rejects malformed money (fractional or non-positive cents)", () => {
    expect(() => validatePortalTerms({ ...VALID_PAYLOAD, calc_base_price: 5000.5 })).toThrow(/positive integer of cents/);
    expect(() => validatePortalTerms({ ...VALID_PAYLOAD, srp_privacy_fee: -1 })).toThrow(/positive integer of cents/);
    expect(() => validatePortalTerms({ ...VALID_PAYLOAD, srp_setup_fee: "abc" })).toThrow(/not a finite number/);
  });

  it("rejects malformed counts and multipliers", () => {
    expect(() => validatePortalTerms({ ...VALID_PAYLOAD, calc_images_per_hour: "0" })).toThrow(/positive integer count/);
    expect(() => validatePortalTerms({ ...VALID_PAYLOAD, calc_outdoor_images_per_hour: "10.5" })).toThrow(/positive integer count/);
    expect(() => validatePortalTerms({ ...VALID_PAYLOAD, calc_flatrate_multiplier: "0" })).toThrow(/positive finite factor/);
  });

  it("rejects a non-object payload", () => {
    expect(() => validatePortalTerms(null)).toThrow(/payload is not an object/);
    expect(() => validatePortalTerms("nope")).toThrow(/payload is not an object/);
  });
});

describe("runPortalTermsImport", () => {
  it("writes the snapshot on success and records the raw values", async () => {
    const { io, state } = memoryIO(VALID_PAYLOAD);
    const result = await runPortalTermsImport({ artifactPath: "x.ts", fetchedAt: "2026-10-18T00:00:00.000Z" }, io);

    expect(result.status).toBe("written");
    expect(state.writes).toBe(1);
    expect(state.content).toContain('calc_base_price: "5000"');
    expect(state.content).not.toContain("editorial");
  });

  it("is idempotent: unchanged terms are not rewritten (timestamp preserved)", async () => {
    const existing = buildPortalTermsArtifact(EXPECTED_TERMS, "2020-01-01T00:00:00.000Z");
    const { io, state } = memoryIO(VALID_PAYLOAD, existing);

    const result = await runPortalTermsImport({ artifactPath: "x.ts", fetchedAt: "2026-10-18T00:00:00.000Z" }, io);

    expect(result.status).toBe("unchanged");
    expect(state.writes).toBe(0);
    expect(state.content).toBe(existing);
  });

  it("leaves the existing snapshot untouched when the fetch fails", async () => {
    const existing = buildPortalTermsArtifact(EXPECTED_TERMS, "2020-01-01T00:00:00.000Z");
    const state = { writes: 0 };
    const io = {
      fetchTerms: async () => {
        throw new Error("Portal licence terms: unexpected HTTP 503");
      },
      readArtifact: async () => existing,
      writeArtifact: async () => {
        state.writes += 1;
      }
    };

    await expect(runPortalTermsImport({ artifactPath: "x.ts", fetchedAt: "2026-10-18T00:00:00.000Z" }, io)).rejects.toThrow(
      /HTTP 503/
    );
    expect(state.writes).toBe(0);
  });

  it("leaves the existing snapshot untouched when validation fails", async () => {
    const existing = buildPortalTermsArtifact(EXPECTED_TERMS, "2020-01-01T00:00:00.000Z");
    const { io, state } = memoryIO({ ...VALID_PAYLOAD, calc_base_price: null }, existing);

    await expect(runPortalTermsImport({ artifactPath: "x.ts", fetchedAt: "2026-10-18T00:00:00.000Z" }, io)).rejects.toThrow(
      /"calc_base_price" is missing/
    );
    expect(state.writes).toBe(0);
    expect(state.content).toBe(existing);
  });
});

describe("stripFetchedAt", () => {
  it("ignores the volatile timestamp line", () => {
    const a = buildPortalTermsArtifact(EXPECTED_TERMS, "2020-01-01T00:00:00.000Z");
    const b = buildPortalTermsArtifact(EXPECTED_TERMS, "2026-10-18T00:00:00.000Z");
    expect(a).not.toBe(b);
    expect(stripFetchedAt(a)).toBe(stripFetchedAt(b));
  });
});
