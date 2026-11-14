import type { ImageMetadata } from "astro";
import slugMap from "virtual:image-slug-map";

export const IMAGES = slugMap;
const isBuild = import.meta.env.PROD;

export function tryGetImage(name: string | undefined) {
  if (name === undefined) return undefined;
  return slugMap[name];
}

export async function getImage(name: string) {
  const entry = tryGetImage(name);
  if (entry === undefined) {
    throw new Error(`Image "${name}" does not exist!`);
  }
  if (isBuild || typeof entry.load !== "function") {
    throw new Error(
      `slug-map getImage("${name}") called during production build. ` +
      `Use the CDN manifest (getManifestImage) instead.`
    );
  }
  return await entry.load();
}

export function filterInvalidImageName(name?: string) {
  if (name === undefined) return undefined;
  return tryGetImage(name) !== undefined ? name : undefined;
}

export type ImageModule = { default: ImageMetadata };
