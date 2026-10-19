import type { BreakPoints } from "@reisinger/shared/utils/Breakpoints";
import { computeSizes, CONTAINER_SIZES } from "@reisinger/shared/utils/Breakpoints";

export enum GalleryLayout {
  Full = "11111",
  Presentation = "11122",
  Overview = "12223",
  Sport = "22222",
  Thumbnails = "44488"
}

export const GALLERY_BREAKPOINTS: Record<GalleryLayout, Omit<BreakPoints<number>, "default">> = {
  [GalleryLayout.Full]: {
    "sm": 1,
    "md": 1,
    "lg": 1,
    "xl": 1,
    "2xl": 1
  },
  [GalleryLayout.Presentation]: {
    "sm": 1,
    "md": 1,
    "lg": 1,
    "xl": 2,
    "2xl": 2
  },
  [GalleryLayout.Overview]: {
    "sm": 1,
    "md": 2,
    "lg": 2,
    "xl": 2,
    "2xl": 2
  },
  [GalleryLayout.Sport]: {
    "sm": 2,
    "md": 2,
    "lg": 2,
    "xl": 2,
    "2xl": 2
  },
  [GalleryLayout.Thumbnails]: {
    "sm": 4,
    "md": 4,
    "lg": 4,
    "xl": 8,
    "2xl": 8
  }
};

// Sport galleries use two columns with a 16px gap, including below `sm`.
export const SPORT_GALLERY_SIZES = computeSizes(GALLERY_BREAKPOINTS[GalleryLayout.Sport])
  .replace("100vw", `calc(min(100vw, ${CONTAINER_SIZES.sm}) / 2 - 8px)`)
  .replace(/calc\( (\d+)px \/ (\d+) \)/g, (_, containerWidth: string, columns: string) =>
    `calc( (${containerWidth}px - 16px) / ${columns} )`
  );
