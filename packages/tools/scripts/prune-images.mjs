import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { loadImageCdnOptions } from "./process-images.mjs";

const PACKAGE_NAME = "@all-the.rest/astro-image-cdn";

/** Resolve pruneImages() from the Astro app's installed copy of the library. */
export async function resolvePruneImages(rootDir) {
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
  if (typeof packageModule.pruneImages !== "function") {
    throw new Error(`${PACKAGE_NAME} does not export pruneImages()`);
  }
  return packageModule.pruneImages;
}

/**
 * Prune the persistent CDN directory through the library. Old variants are kept
 * by design during processing, so this postbuild step removes everything the
 * private manifest no longer references and a leftover legacy public manifest.
 */
export async function pruneProjectImages({ rootDir = process.cwd(), pruneImages, dryRun = false } = {}) {
  rootDir = path.resolve(rootDir);
  const options = await loadImageCdnOptions(rootDir);
  const manifestPath = path.resolve(rootDir, options.cacheDir ?? ".astro-image-cdn", "manifest.json");
  try {
    await fs.access(manifestPath);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    console.log("📋 Kein Image-CDN-Manifest gefunden. Überspringe.");
    return undefined;
  }

  const prune = pruneImages ?? await resolvePruneImages(rootDir);
  const result = await prune({
    rootDir,
    sources: options.sources,
    outputDir: options.outputDir,
    cacheDir: options.cacheDir,
    dryRun,
    removeLegacyPublicManifest: true,
  });

  const megabytes = (result.bytesFreed / 1024 / 1024).toFixed(1);
  const legacySuffix = result.legacyPublicManifestRemoved
    ? dryRun
      ? ", altes öffentliches Manifest würde entfernt"
      : ", altes öffentliches Manifest entfernt"
    : "";
  console.log(
    `🧹 ${result.removed} Datei(en) ${dryRun ? "würden entfernt" : "entfernt"}, `
    + `${result.kept} behalten, ${megabytes} MB, ${result.removedDirectories} leere Verzeichnisse`
    + `${legacySuffix}.`,
  );
  return result;
}

const ARGUMENTS = new Set(["--dry-run"]);

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const unknownArguments = process.argv.slice(2).filter(argument => !ARGUMENTS.has(argument));
  if (unknownArguments.length > 0) {
    console.error(`❌ Unbekannte Argumente: ${unknownArguments.join(", ")} (erlaubt: --dry-run)`);
    process.exitCode = 1;
  } else {
    pruneProjectImages({ dryRun: process.argv.includes("--dry-run") }).catch(error => {
      console.error(`❌ prune-images fehlgeschlagen: ${error.stack ?? error.message}`);
      process.exitCode = 1;
    });
  }
}
