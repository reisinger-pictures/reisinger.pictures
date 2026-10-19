import { computeSizes } from "@reisinger/shared/utils/Breakpoints";
import { describe, expect, it } from "vitest";

import {
  GALLERY_BREAKPOINTS,
  GalleryLayout,
  SPORT_GALLERY_SIZES,
} from "./GalleryLayout";

describe("sport gallery layout", () => {
  it("uses two columns at every Tailwind breakpoint", () => {
    expect(GALLERY_BREAKPOINTS[GalleryLayout.Sport]).toEqual({
      sm: 2,
      md: 2,
      lg: 2,
      xl: 2,
      "2xl": 2,
    });
  });

  it("requests half-width image variants on mobile and larger viewports", () => {
    expect(SPORT_GALLERY_SIZES).toContain(
      "(max-width: 640px) calc(min(100vw, 540px) / 2 - 8px)",
    );
    expect(SPORT_GALLERY_SIZES).toContain(
      "(min-width: 1536px ) calc( (1320px - 16px) / 2 )",
    );
    expect(SPORT_GALLERY_SIZES).toContain(
      "(min-width: 640px ) calc( (540px - 16px) / 2 )",
    );
  });

  it("preserves the default shared sizes output", () => {
    expect(computeSizes({ sm: 1, md: 2, lg: 2, xl: 2, "2xl": 2 })).toBe(
      "(max-width: 640px) 100vw ,(min-width: 1536px ) calc( 1320px / 2 ) ,(min-width: 1280px ) calc( 1140px / 2 ) ,(min-width: 1024px ) calc( 960px / 2 ) ,(min-width: 768px ) calc( 720px / 2 ) ,(min-width: 640px ) calc( 540px / 1 )",
    );
  });

  it("keeps non-sport gallery sizing modifiers unchanged", () => {
    expect(GALLERY_BREAKPOINTS[GalleryLayout.Presentation]).toEqual({
      sm: 1,
      md: 1,
      lg: 1,
      xl: 2,
      "2xl": 2,
    });
    expect(GALLERY_BREAKPOINTS[GalleryLayout.Overview]).toEqual({
      sm: 1,
      md: 2,
      lg: 2,
      xl: 2,
      "2xl": 2,
    });
  });
});
