import { file, glob } from "astro/loaders";
import { z } from "astro/zod";
import { defineCollection, reference } from "astro:content";

import { PORTFOLIO_TAGS } from "./data/portfolio-tags";

const portfolio = defineCollection({
  // Verwende einen puren String-Glob: **/[^_]*.{md,mdx} schließt alle Dateien aus, die mit _ beginnen
  loader: glob({ pattern: "**/[^_]*.{md,mdx}", base: "./src/content/portfolio" }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    keywords: z.array(z.string()).optional(),
    // Controlled team/league tags (D2). The vocabulary lives in
    // `src/data/portfolio-tags.ts`; see `rules/09-shooting-areas.md`.
    tags: z.array(z.enum(PORTFOLIO_TAGS)).optional(),
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    heroImage: z.string()
  })
});

const portfolioOverviews = defineCollection({
  loader: glob({ pattern: "**/[^_]*.{md,mdx}", base: "./src/content/portfolioOverviews" }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional()
  })
});
export enum ReviewType {
  Akt = "akt",
  Beauty = "beauty",
  Paare = "couples",
  Sport = "sport",
}

export enum OrientationEnum {
  Horizontal = "horizontal",
  Vertical = "vertical",
}

const testimonials = defineCollection({
  loader: glob({ pattern: "**/[^_]*.{md,mdx}", base: "./src/content/testimonials" }),
  schema: z.object({
    name: z.string(),
    role: z.string().optional(),
    layout: z.enum(["default", "quote"]).default("default"),
    type: z.enum(ReviewType),
    date: z.coerce.date(),
    rating: z.number().optional(),
    source: z.url("Must be a valid URL").optional(),
    large: z.string().optional(),
    small: z.string().optional(),
    imageFit: z.enum(["cover", "contain"]).default("cover")
  })
});

// Shooting area pages are split into two collections that share one schema:
// the private offers (Akt, Beauty, Pärchen) and the sport areas. Splitting is a
// content-structure decision only — both collections still render under
// `/shootings/<id>/`, so no URL changes and no content rewrite is required.
// See `rules/09-shooting-areas.md`.
const shootingAreaSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  priority: z.number().optional().default(9999),
  testimonials: z.array(reference("testimonials")).optional(),
  images: z.array(z.string()),
  heroImage: z.string().optional()
});

/** Private paid offers: ids `akt`, `beauty`, `couples`. */
const privateAreas = defineCollection({
  loader: glob({ pattern: "**/[^_]*.{md,mdx}", base: "./src/content/privateAreas" }),
  schema: shootingAreaSchema
});

/** Sport areas: id `sport` plus every `sport/<sub-area>` entry. */
const sportAreas = defineCollection({
  loader: glob({ pattern: "**/[^_]*.{md,mdx}", base: "./src/content/sportAreas" }),
  schema: shootingAreaSchema
});

const simple = defineCollection({
  loader: glob({ pattern: "**/[^_]*.{md,mdx}", base: "./src/content/simple" }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    keywords: z.array(z.string()).optional(),
    showContact: z.boolean().optional(),
    index: z.boolean().optional(),
    heroImage: z.string().optional(),
    date: z.coerce.date().optional(),
    updated: z.coerce.date().optional()
  })
});

const agb = defineCollection({
  loader: file("src/content/agb.json"),
  schema: z.object({
    validFrom: z.coerce.date(),
    filename: z.string()
  })
});

const testimonialSummary = defineCollection({
  loader: file("src/content/testimonialSummary.json"),
  schema: z.object({
    summary: z.string(),
    reviewCount: z.number()
  })
});

const dsb = defineCollection({
  loader: file("src/content/dsb.json"),
  schema: z.object({
    validFrom: z.coerce.date(),
    filename: z.string()
  })
});

const categories = defineCollection({
  loader: file("src/content/categories.json"),
  schema: z.object({
    name: z.string()
  })
});

const tfp = defineCollection({
  loader: glob({ pattern: "**/[^_]*.{md,mdx}", base: "./src/content/tfp" }),
  schema: z.object({
    title: z.string(),
    priority: z.number(),
    description: z.string().optional(),
    keywords: z.array(z.string()).optional(),
    heroImage: z.string().optional()
  })
});

export const collections = {
  agb,
  categories,
  dsb,
  portfolio,
  portfolioOverviews,
  privateAreas,
  simple,
  sportAreas,
  testimonialSummary,
  testimonials,
  tfp
};