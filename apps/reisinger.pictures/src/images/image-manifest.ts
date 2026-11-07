import fs from "node:fs";
import path from "node:path";

import { IMAGE_BASE_URL } from "./image-config";

export type ManifestImage = {
  hash: string;
  sourceHash: string;
  migrationProfile: string;
  width: number;
  height: number;
  variants: number[];
}

export type ImageManifest = {
  version: number;
  generated: string;
  images: Record<string, ManifestImage>;
}

export type CdnImageInfo = {
  src: string;
  width: number;
  height: number;
  format: string;
}

let _manifest: ImageManifest | null = null;

export function getManifest(): ImageManifest {
  if (!_manifest) {
    const p = path.resolve(process.cwd(), ".imagedist", "manifest.json");
    _manifest = JSON.parse(fs.readFileSync(p, "utf-8")) as ImageManifest;
  }
  return _manifest;
}

export function getManifestImage(slug: string): ManifestImage | undefined {
  return getManifest().images[slug];
}

export function resolveCdnImage(slug: string, preferredWidth?: number): CdnImageInfo {
  const mi = getManifestImage(slug);
  if (!mi) {
    throw new Error(`resolveCdnImage: "${slug}" not found in manifest`);
  }
  const available = mi.variants;
  const w = preferredWidth != null && available.includes(preferredWidth)
    ? preferredWidth
    : (preferredWidth != null
        ? available.filter(x => x <= preferredWidth).pop() ?? available[0]
        : available[available.length - 1]);
  const h = Math.round(w * mi.height / mi.width);
  const src = `${IMAGE_BASE_URL}/${mi.hash.slice(0, 2)}/${mi.hash}_${w}.webp`;
  return { src, width: w, height: h, format: "webp" };
}
