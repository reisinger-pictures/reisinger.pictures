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
