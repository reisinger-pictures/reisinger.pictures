import crypto from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { load as parseYaml } from "js-yaml";
import sharp from "sharp";

const IMAGE_SOURCE_DIRS = [
  path.join("src", "images"),
  path.join("src", "content", "portfolio"),
  path.join("src", "content", "simple"),
];
const TARGET_WIDTHS = [256, 640, 828, 1080, 1200, 1920, 2048];
const WEBP_QUALITY = 75;
const WEBP_EFFORT = 4;
const AVIF_EFFORT = 4;
const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".svg"]);
const PACKAGE_VERSION = "@all-the.rest/astro-image-cdn@0.3.0";
const PREVIOUS_PACKAGE_VERSION = "@all-the.rest/astro-image-cdn@0.2.3";
const ADOPTION_OPTIONS = {
  sources: ["src"],
  outputDir: ".imagedist",
  cacheDir: ".astro-image-cdn",
  widths: TARGET_WIDTHS,
  formats: ["webp"],
  quality: WEBP_QUALITY,
  webpEffort: WEBP_EFFORT,
  avifEffort: AVIF_EFFORT,
  includeSourceFormat: false,
  includeNativeWidth: false,
  autoRotate: false,
  dangerouslyProcessSVG: true,
};

export const MIGRATION_PROFILE = JSON.stringify({
  version: 1,
  package: PACKAGE_VERSION,
  widths: ADOPTION_OPTIONS.widths,
  formats: ADOPTION_OPTIONS.formats,
  quality: ADOPTION_OPTIONS.quality,
  webpEffort: ADOPTION_OPTIONS.webpEffort,
  avifEffort: ADOPTION_OPTIONS.avifEffort,
  includeSourceFormat: ADOPTION_OPTIONS.includeSourceFormat,
  includeNativeWidth: ADOPTION_OPTIONS.includeNativeWidth,
  autoRotate: ADOPTION_OPTIONS.autoRotate,
  dangerouslyProcessSVG: ADOPTION_OPTIONS.dangerouslyProcessSVG,
  legacyTransform: "sharp-resize-webp-q75-no-autorotate-v1",
  sharp: sharp.versions.sharp,
  libvips: sharp.versions.vips,
});

const PREVIOUS_MIGRATION_PROFILE = JSON.stringify({
  version: 1,
  package: PREVIOUS_PACKAGE_VERSION,
  widths: ADOPTION_OPTIONS.widths,
  formats: ADOPTION_OPTIONS.formats,
  quality: ADOPTION_OPTIONS.quality,
  includeSourceFormat: ADOPTION_OPTIONS.includeSourceFormat,
  includeNativeWidth: ADOPTION_OPTIONS.includeNativeWidth,
  autoRotate: ADOPTION_OPTIONS.autoRotate,
  dangerouslyProcessSVG: ADOPTION_OPTIONS.dangerouslyProcessSVG,
  legacyTransform: "sharp-resize-webp-q75-no-autorotate-v1",
  sharp: sharp.versions.sharp,
  libvips: sharp.versions.vips,
});

function getHash(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

async function getAllFiles(dirPath) {
  let entries;
  try {
    entries = await fs.readdir(dirPath, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }

  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) files.push(...await getAllFiles(fullPath));
    else if (entry.isFile()) files.push(fullPath);
  }
  return files;
}

async function readSidecar(imagePath) {
  const basename = path.join(path.dirname(imagePath), path.basename(imagePath, path.extname(imagePath)));
  for (const extension of [".yaml", ".yml"]) {
    try {
      return parseYaml(await fs.readFile(`${basename}${extension}`, "utf8")) ?? {};
    } catch (error) {
      if (error.code === "ENOENT") continue;
      throw error;
    }
  }
  return undefined;
}

async function getSluggedImages(rootDir) {
  const imageFiles = [];
  for (const sourceDirectory of IMAGE_SOURCE_DIRS) {
    imageFiles.push(...await getAllFiles(path.join(rootDir, sourceDirectory)));
  }

  const bySlug = new Map();
  for (const imagePath of imageFiles
    .filter(file => IMAGE_EXTENSIONS.has(path.extname(file).toLowerCase()))
    .sort((left, right) => left.localeCompare(right))) {
    const yamlData = await readSidecar(imagePath);
    const slug = yamlData?.slug;
    if (!slug) continue;
    if (typeof slug !== "string") {
      throw new Error(`Image slug must be a string in the sidecar for ${imagePath}`);
    }
    if (bySlug.has(slug)) {
      throw new Error(`Duplicate image slug "${slug}" in ${bySlug.get(slug)} and ${imagePath}`);
    }
    bySlug.set(slug, imagePath);
  }

  return [...bySlug.entries()].map(([slug, imagePath]) => ({ slug, imagePath }));
}

async function readManifest(manifestPath) {
  let content;
  try {
    content = await fs.readFile(manifestPath, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return undefined;
    throw error;
  }

  let manifest;
  try {
    manifest = JSON.parse(content);
  } catch (error) {
    throw new Error(`Could not parse image manifest ${manifestPath}: ${error.message}`, { cause: error });
  }
  if (!manifest || typeof manifest !== "object" || !manifest.images || typeof manifest.images !== "object") {
    throw new Error(`Invalid image manifest shape in ${manifestPath}`);
  }
  return manifest;
}

function targetWidths(sourceWidth) {
  return TARGET_WIDTHS.filter(width => width <= sourceWidth);
}

function expectedHeight(width, sourceWidth, sourceHeight) {
  return Math.max(1, Math.round(width * sourceHeight / sourceWidth));
}

async function isValidWebp(filePath, width, height, { allowOnePixelHeightDifference = true } = {}) {
  try {
    const info = await fs.lstat(filePath);
    if (!info.isFile() || info.isSymbolicLink()) return false;
    const buffer = await fs.readFile(filePath);
    const metadata = await sharp(buffer, { failOn: "warning" }).metadata();
    const heightMatches = allowOnePixelHeightDifference
      ? Math.abs(metadata.height - height) <= 1
      : metadata.height === height;
    if (metadata.format !== "webp" || metadata.width !== width || !Number.isSafeInteger(metadata.height) || !heightMatches) {
      return false;
    }
    await sharp(buffer, { failOn: "warning" }).raw().toBuffer();
    return true;
  } catch {
    return false;
  }
}

function packageVariantsAreReusable(entry, sourceHash, widths, migrationProfile) {
  return entry?.sourceHash === sourceHash
    && entry?.migrationProfile === migrationProfile
    && typeof entry.hash === "string"
    && /^[a-f0-9]{64}$/.test(entry.hash)
    && Array.isArray(entry.variants)
    && entry.variants.length === widths.length
    && entry.variants.every((width, index) => width === widths[index]);
}

async function previousPackageVariantsAreReusable({ entry, sourceHash, widths, imageDist, sourceWidth, sourceHeight }) {
  if (!packageVariantsAreReusable(entry, sourceHash, widths, PREVIOUS_MIGRATION_PROFILE)) return false;

  for (const width of widths) {
    const filePath = variantPath(imageDist, entry.hash, width);
    if (!await isValidWebp(filePath, width, expectedHeight(width, sourceWidth, sourceHeight), {
      allowOnePixelHeightDifference: false,
    })) return false;
  }
  return true;
}

function legacyHashIsReusable(entry, sourceHash) {
  return typeof entry?.hash === "string"
    && entry.hash.length === 16
    && entry.hash.slice(0, 16) === sourceHash.slice(0, 16);
}

function variantPath(directory, hash, width) {
  return path.join(directory, hash.slice(0, 2), `${hash}_${width}.webp`);
}

async function getReusableVariant({
  width,
  height,
  sourceHash,
  currentEntry,
  legacyEntry,
  imageDist,
  legacyImageDist,
  widths,
  previousPackageReusable,
}) {
  if (packageVariantsAreReusable(currentEntry, sourceHash, widths, MIGRATION_PROFILE)) {
    const packagePath = variantPath(imageDist, currentEntry.hash, width);
    if (await isValidWebp(packagePath, width, height)) return packagePath;
  }

  if (previousPackageReusable) {
    return variantPath(imageDist, currentEntry.hash, width);
  }

  if (legacyHashIsReusable(legacyEntry, sourceHash)
    && Array.isArray(legacyEntry.variants)
    && legacyEntry.variants.includes(width)) {
    const legacyPath = variantPath(legacyImageDist, legacyEntry.hash, width);
    if (await isValidWebp(legacyPath, width, height)) return legacyPath;
  }

  return undefined;
}

async function makeLegacyVariant(sourceBuffer, width, targetPath) {
  const result = await sharp(sourceBuffer)
    .resize(width)
    .webp({ quality: WEBP_QUALITY, effort: WEBP_EFFORT })
    .toBuffer();
  await fs.writeFile(targetPath, result, { flag: "wx" });
}

export async function resolveAdoptImageVariants(rootDir) {
  const packageRoot = await fs.realpath(path.join(
    rootDir,
    "node_modules",
    "@all-the.rest",
    "astro-image-cdn",
  ));
  const packageJson = JSON.parse(await fs.readFile(path.join(packageRoot, "package.json"), "utf8"));
  const entry = packageJson.exports?.["."];
  const importTarget = typeof entry === "string" ? entry : entry?.import;
  if (typeof importTarget !== "string") {
    throw new Error(`Could not resolve the ESM export for ${PACKAGE_VERSION} from ${packageRoot}`);
  }
  const packageEntry = path.resolve(packageRoot, importTarget);
  const relativeEntry = path.relative(packageRoot, packageEntry);
  if (relativeEntry === ".." || relativeEntry.startsWith(`..${path.sep}`) || path.isAbsolute(relativeEntry)) {
    throw new Error(`Refusing to import ${PACKAGE_VERSION} outside its installed package directory`);
  }
  const packageModule = await import(pathToFileURL(packageEntry).href);
  if (typeof packageModule.adoptImageVariants !== "function") {
    throw new Error(`${PACKAGE_VERSION} does not export adoptImageVariants()`);
  }
  return packageModule.adoptImageVariants;
}

async function atomicWriteManifest(manifestPath, manifest) {
  const temporaryPath = `${manifestPath}.${process.pid}.${crypto.randomUUID()}.tmp`;
  try {
    await fs.writeFile(temporaryPath, `${JSON.stringify(manifest, null, 2)}\n`, { flag: "wx" });
    await fs.rename(temporaryPath, manifestPath);
  } catch (error) {
    await fs.unlink(temporaryPath).catch(() => {});
    throw error;
  }
}

function manifestsMatchWithoutGenerated(current, next) {
  if (!current) return false;
  const currentComparable = { ...current };
  const nextComparable = { ...next };
  delete currentComparable.generated;
  delete nextComparable.generated;
  return JSON.stringify(currentComparable) === JSON.stringify(nextComparable);
}

/** Migrate custom CDN entries while preserving the pre-existing public manifest on failure. */
export async function migrateImages({
  rootDir = process.cwd(),
  legacyImageDist = process.env.LEGACY_IMAGEDIST_DIR,
  adoptImageVariants,
} = {}) {
  rootDir = path.resolve(rootDir);
  const imageDist = path.join(rootDir, ".imagedist");
  const manifestPath = path.join(imageDist, "manifest.json");
  const legacyDist = path.resolve(legacyImageDist || imageDist);
  const currentManifest = await readManifest(manifestPath);
  const legacyManifest = await readManifest(path.join(legacyDist, "manifest.json")) ?? currentManifest;
  const currentImages = currentManifest?.images ?? {};
  const legacyImages = legacyManifest?.images ?? {};
  const images = await getSluggedImages(rootDir);
  const adopt = adoptImageVariants ?? await resolveAdoptImageVariants(rootDir);
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "reisinger-image-migration-"));
  const nextManifest = {
    ...(currentManifest ?? {}),
    version: 2,
    generated: currentManifest?.generated ?? new Date().toISOString(),
    images: { ...currentImages },
  };

  let processedCount = 0;
  let reusedCount = 0;
  try {
    console.log(`📷 Migriere ${images.length} Bilder in das astro-image-cdn-Format...`);

    for (const { slug, imagePath } of images) {
      const sourceBuffer = await fs.readFile(imagePath);
      const sourceHash = getHash(sourceBuffer);
      let metadata;
      try {
        metadata = await sharp(sourceBuffer).metadata();
      } catch (error) {
        throw new Error(`Could not read source image for "${slug}" (${imagePath}): ${error.message}`, { cause: error });
      }
      if (!metadata.width || !metadata.height) {
        throw new Error(`Could not determine source dimensions for "${slug}" (${imagePath})`);
      }

      const widths = targetWidths(metadata.width);
      const currentEntry = currentImages[slug];
      const legacyEntry = legacyImages[slug];
      const previousPackageReusable = await previousPackageVariantsAreReusable({
        entry: currentEntry,
        sourceHash,
        widths,
        imageDist,
        sourceWidth: metadata.width,
        sourceHeight: metadata.height,
      });
      const variants = [];

      for (let index = 0; index < widths.length; index++) {
        const width = widths[index];
        const height = expectedHeight(width, metadata.width, metadata.height);
        let inputPath = await getReusableVariant({
          width,
          height,
          sourceHash,
          currentEntry,
          legacyEntry,
          imageDist,
          legacyImageDist: legacyDist,
          widths,
          previousPackageReusable,
        });

        if (inputPath) {
          reusedCount++;
        } else {
          inputPath = path.join(tempDir, `${crypto.randomUUID()}_${width}.webp`);
          await makeLegacyVariant(sourceBuffer, width, inputPath);
        }
        variants.push({ path: inputPath, width, format: "webp" });
      }

      const sourcePath = path.relative(rootDir, imagePath);
      const adoption = await adopt({ ...ADOPTION_OPTIONS, rootDir }, {
        sourcePath,
        sourceHash,
        variants,
      });
      if (!/^[a-f0-9]{64}$/.test(adoption.fingerprint ?? "")) {
        throw new Error(`astro-image-cdn returned an invalid fingerprint for "${slug}"`);
      }

      for (const width of widths) {
        const targetPath = variantPath(imageDist, adoption.fingerprint, width);
        const height = expectedHeight(width, metadata.width, metadata.height);
        if (!await isValidWebp(targetPath, width, height)) {
          throw new Error(`astro-image-cdn did not produce a valid ${width}px WebP for "${slug}"`);
        }
      }

      nextManifest.images[slug] = {
        hash: adoption.fingerprint,
        sourceHash,
        migrationProfile: MIGRATION_PROFILE,
        width: metadata.width,
        height: metadata.height,
        variants: widths,
      };
      processedCount++;
      console.log(`  ✅ ${slug}: ${widths.length} Variante(n), ${adoption.fingerprint}`);
    }

    if (!manifestsMatchWithoutGenerated(currentManifest, nextManifest)) {
      nextManifest.generated = new Date().toISOString();
      await fs.mkdir(imageDist, { recursive: true });
      await atomicWriteManifest(manifestPath, nextManifest);
    }

    console.log(`✅ ${processedCount} Bilder migriert, ${reusedCount} Variante(n) wiederverwendet.`);
    return { processed: processedCount, reused: reusedCount, manifestPath };
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  migrateImages().catch(error => {
    console.error(`❌ Bildmigration fehlgeschlagen: ${error.stack ?? error.message}`);
    process.exitCode = 1;
  });
}
