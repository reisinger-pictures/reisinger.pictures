import fs from "node:fs";
import path from "node:path";

import slugPaths from "virtual:image-slug-map";

import { IMAGE_BASE_URL } from "./image-config";

/** One generated CDN variant as recorded by @all-the.rest/astro-image-cdn. */
export type ManifestVariant = {
  width: number;
  format: string;
  height: number;
  file: string;
}

/** One processed source image, keyed by its project-relative path in the manifest. */
export type ManifestImage = {
  source: string;
  fingerprint: string;
  sourceHash: string;
  sourceFormat: string;
  width: number;
  height: number;
  variants: ManifestVariant[];
}

export type ImageManifest = {
  version: number;
  images: Record<string, ManifestImage>;
}

export type CdnImageInfo = {
  src: string;
  width: number;
  height: number;
  format: string;
}

let _manifest: ImageManifest | null = null;

/**
 * The library keeps its private manifest in .astro-image-cdn and keys it by the
 * project-relative source path. Images are addressed by slug throughout the
 * site, so the slug map resolves the slug to that manifest key.
 */
export function getManifest(): ImageManifest {
  if (!_manifest) {
    const manifestPath = path.resolve(process.cwd(), ".astro-image-cdn", "manifest.json");
    _manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8")) as ImageManifest;
  }
  return _manifest;
}

function normalizeSourcePath(sourcePath: string): string {
  return sourcePath.replaceAll("\\", "/").replace(/^\/+/, "");
}

export function getManifestImage(slug: string): ManifestImage | undefined {
  const entry = slugPaths[slug];
  if (!entry) return undefined;
  return getManifest().images[normalizeSourcePath(entry.path)];
}

export function resolveCdnImage(slug: string, preferredWidth?: number): CdnImageInfo {
  const image = getManifestImage(slug);
  if (!image) {
    throw new Error(`resolveCdnImage: "${slug}" not found in manifest`);
  }
  const variants = image.variants
    .filter(variant => variant.format === "webp")
    .sort((left, right) => left.width - right.width);
  if (variants.length === 0) {
    throw new Error(`resolveCdnImage: "${slug}" has no WebP variants in manifest`);
  }
  const variant = preferredWidth == null
    ? variants[variants.length - 1]
    : variants.find(candidate => candidate.width === preferredWidth)
      ?? variants.filter(candidate => candidate.width <= preferredWidth).pop()
      ?? variants[0];
  return {
    src: `${IMAGE_BASE_URL}/${variant.file}`,
    width: variant.width,
    height: variant.height,
    format: variant.format,
  };
}
