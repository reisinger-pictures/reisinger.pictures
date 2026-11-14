import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { load as parseYaml } from "js-yaml";

const PACKAGE_NAME = "@all-the.rest/astro-image-cdn";
// The slug map registers every image below the app's src/, so the coverage
// guard scans the same scope instead of a hand-maintained subset.
const IMAGE_SOURCE_DIR = path.join("src");
const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"]);
const KNOWN_OPTIONS = new Set([
  "sources",
  "outputDir",
  "cacheDir",
  "widths",
  "formats",
  "quality",
  "webpEffort",
  "avifEffort",
  "includeSourceFormat",
  "includeNativeWidth",
  "autoRotate",
  "verification",
  "concurrency",
  "dangerouslyProcessSVG",
]);

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

/** Collect every slugged image below the app's src/ directory. */
export async function getSluggedImages(rootDir) {
  const imageFiles = await getAllFiles(path.join(rootDir, IMAGE_SOURCE_DIR));

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

  return [...bySlug.entries()].map(([slug, imagePath]) => ({
    slug,
    imagePath,
    relativePath: path.relative(rootDir, imagePath).split(path.sep).join("/"),
  }));
}

/**
 * The pipeline options live in the Astro app (image-cdn-options.json) and are
 * shared with astroImageCdn() in astro.config.mjs, so prebuild and build cannot
 * write different fingerprints for the same image.
 */
export async function loadImageCdnOptions(rootDir) {
  const optionsPath = path.join(rootDir, "image-cdn-options.json");
  let options;
  try {
    options = JSON.parse(await fs.readFile(optionsPath, "utf8"));
  } catch (error) {
    throw new Error(`Could not read the image CDN options at ${optionsPath}: ${error.message}`, { cause: error });
  }
  if (!options || typeof options !== "object" || !Array.isArray(options.widths) || !Array.isArray(options.formats)) {
    throw new Error(`Invalid image CDN options in ${optionsPath}`);
  }
  const unknownOptions = Object.keys(options).filter(key => !KNOWN_OPTIONS.has(key));
  if (unknownOptions.length > 0) {
    // The library silently ignores unknown keys, so a typo like "autoRotat"
    // would flip a default instead of failing.
    throw new Error(`Unknown image CDN option(s) in ${optionsPath}: ${unknownOptions.join(", ")}`);
  }
  return options;
}

/** Resolve processImages() from the Astro app's installed copy of the library. */
export async function resolveProcessImages(rootDir) {
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
    throw new Error(`Could not resolve the ESM export of ${PACKAGE_NAME} from ${packageRoot}`);
  }
  const packageEntry = path.resolve(packageRoot, importTarget);
  const relativeEntry = path.relative(packageRoot, packageEntry);
  if (relativeEntry === ".." || relativeEntry.startsWith(`..${path.sep}`) || path.isAbsolute(relativeEntry)) {
    throw new Error(`Refusing to import ${PACKAGE_NAME} outside its installed package directory`);
  }
  const packageModule = await import(pathToFileURL(packageEntry).href);
  if (typeof packageModule.processImages !== "function") {
    throw new Error(`${PACKAGE_NAME} does not export processImages()`);
  }
  return packageModule.processImages;
}

/**
 * Run the library's bulk image processing and fail when a slugged image is not
 * covered by the resulting manifest. The pages resolve every image through its
 * slug, so a silently skipped source would only surface as a broken build later.
 */
export async function processProjectImages({ rootDir = process.cwd(), processImages, options } = {}) {
  rootDir = path.resolve(rootDir);
  const imageOptions = options ?? await loadImageCdnOptions(rootDir);
  const images = await getSluggedImages(rootDir);
  const run = processImages ?? await resolveProcessImages(rootDir);

  const result = await run({ rootDir, ...imageOptions });

  const manifestPath = path.join(rootDir, imageOptions.cacheDir ?? ".astro-image-cdn", "manifest.json");
  const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
  const missing = images.filter(image => !manifest.images?.[image.relativePath]);
  if (missing.length > 0) {
    throw new Error(
      `astro-image-cdn did not process ${missing.length} slugged image(s): `
      + missing.map(image => `${image.slug} (${image.relativePath})`).join(", "),
    );
  }

  console.log(
    `📷 ${result.imageCount} Bilder geprüft: ${result.processed} verarbeitet, `
    + `${result.skipped} unverändert, ${images.length} Slugs im Manifest.`,
  );
  return { ...result, slugs: images.length };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  processProjectImages().catch(error => {
    console.error(`❌ Bildverarbeitung fehlgeschlagen: ${error.stack ?? error.message}`);
    process.exitCode = 1;
  });
}
