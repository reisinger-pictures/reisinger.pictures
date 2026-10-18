import path from "node:path";
import { reviewThemes, reviewViewports } from "./ui-review.config.ts";
import type { UiReviewState, UiReviewTheme, UiReviewViewport } from "./ui-review.config.ts";

export interface ReviewTarget {
  viewport: UiReviewViewport;
  theme: UiReviewTheme;
}

export const reviewTargets: ReviewTarget[] = Object.keys(reviewViewports).flatMap(
  (viewport) => reviewThemes.map((theme) => ({ viewport: viewport as UiReviewViewport, theme })),
);

/**
 * Section-sampling policy for the screenshot harness. One "section" is one
 * viewport-height screen, walked in 80 % steps. Capturing every screen made the
 * full run produce ~1900 PNGs / 1.5 GB; the middle of a long page is mostly
 * image gallery, which is worthless for a UI review. The owner's rule: *the top
 * and the footer matter, the gallery in between may be skipped.* Each capture
 * therefore keeps the first `leadingSections` screens and the last
 * `trailingSections` screens (the footer) and nothing in between
 * (rules/08-local-ui-review.md).
 */
export const SECTION_SAMPLE_DEFAULTS = {
  /** Screens captured from the top of each page. */
  leadingSections: 4,
  /** Final screens captured so the footer never falls out of the sample. */
  trailingSections: 2,
} as const;

/**
 * A capture whose full height is at most this many screens still gets a single
 * full-page overview PNG. The owner's guideline is "~10 screens"; 8 is used so
 * the whole artifact tree stays under the 500 MB budget. Longer full-page PNGs
 * are unreadable when downscaled (rules/08) and are the largest files (a
 * ~92-screen `/testimonials/` capture was ~35 MB), so long, gallery-dominated
 * pages get no overview; the `.json` still documents the coverage.
 */
export const FULL_PAGE_MAX_SECTIONS = 8;

/**
 * Allowed scrollHeight growth (px) before the capture fails instead of silently
 * recording a page whose geometry moved under it. Lazy images are forced eager
 * and awaited before the walk, so the height must be stable; the tolerance only
 * absorbs sub-pixel layout rounding.
 */
export const HEIGHT_GROWTH_TOLERANCE = 1;

export interface SectionSampleOptions {
  leadingSections?: number;
  trailingSections?: number;
}

/**
 * Returns the ascending, unique section indexes to screenshot: the leading
 * screens (page top) plus the trailing screens (footer), with the gallery in
 * between deliberately skipped. Overlap on short pages collapses into a
 * complete capture.
 */
export function sampledSectionIndexes(total: number, options: SectionSampleOptions = {}): number[] {
  if (total <= 0) return [];
  const leadingSections = options.leadingSections ?? SECTION_SAMPLE_DEFAULTS.leadingSections;
  const trailingSections = options.trailingSections ?? SECTION_SAMPLE_DEFAULTS.trailingSections;
  if (leadingSections < 0 || trailingSections < 0) throw new Error("section sampling windows must be >= 0");
  const selected = new Set<number>();
  for (let index = 0; index < Math.min(leadingSections, total); index += 1) selected.add(index);
  for (let index = Math.max(0, total - trailingSections); index < total; index += 1) selected.add(index);
  return [...selected].sort((a, b) => a - b);
}

/**
 * The ordered scroll offsets of all sections for a page of the given geometry,
 * using the same 80 % step as the capture. Shared by the capture pass and the
 * bottom re-anchor so the tail positions cannot drift.
 */
export function sectionPositions(height: number, max: number): number[] {
  const positions = [0];
  while (positions[positions.length - 1] < max) {
    const next = nextSectionPosition(positions[positions.length - 1], height, max);
    if (next <= positions[positions.length - 1]) break;
    positions.push(next);
  }
  return positions;
}

/** Reject unknown metadata instead of silently treating new projects as desktop. */
export function reviewTarget(metadata: Record<string, unknown>): ReviewTarget {
  const target = metadata.uiReview as Partial<ReviewTarget> | undefined;
  if (!target || !Object.hasOwn(reviewViewports, target.viewport ?? "") || !reviewThemes.includes(target.theme as UiReviewTheme)) {
    throw new Error("Screenshot project requires valid uiReview viewport/theme metadata");
  }
  return target as ReviewTarget;
}

export function screenshotPath(outputDir: string, state: UiReviewState, target: ReviewTarget, file: string): string {
  return path.resolve(process.cwd(), outputDir, state, target.theme, target.viewport, file);
}

export function reviewPort(value = process.env.UI_REVIEW_PORT): number {
  if (value === undefined) return 4325;
  if (!/^\d+$/.test(value) || Number(value) < 1024 || Number(value) > 65535) {
    throw new Error("UI_REVIEW_PORT must be an integer between 1024 and 65535");
  }
  return Number(value);
}

/** 20% overlap, including an exact final position rather than skipping the footer. */
export function nextSectionPosition(current: number, height: number, max: number): number {
  return Math.min(max, current + Math.max(1, Math.round(height * 0.8)));
}
