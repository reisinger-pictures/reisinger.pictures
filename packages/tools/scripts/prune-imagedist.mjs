import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const IMAGE_DIST = ".imagedist";
const MANIFEST_PATH = path.join(".astro-image-cdn", "manifest.json");

async function removeEmptyChildDirectories(directory) {
  let entries;
  try {
    entries = await fs.readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") return;
    throw error;
  }
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const childDirectory = path.join(directory, entry.name);
    await removeEmptyChildDirectories(childDirectory);
    if ((await fs.readdir(childDirectory)).length === 0) await fs.rmdir(childDirectory);
  }
}

/**
 * Remove generated files the library manifest no longer references. The
 * library keeps old content-addressed files on purpose, so this postbuild step
 * mirrors only the currently referenced variants to the CDN directory.
 */
export async function pruneImageDist({ rootDir = process.cwd() } = {}) {
  const imageDist = path.join(rootDir, IMAGE_DIST);
  const manifestPath = path.join(rootDir, MANIFEST_PATH);

  let manifest;
  try {
    manifest = JSON.parse(await fs.readFile(manifestPath, "utf-8"));
  } catch (error) {
    if (error.code === "ENOENT") {
      console.log("📋 Kein Image-CDN-Manifest gefunden. Überspringe.");
      return { removed: 0, removedLegacyManifest: false };
    }
    throw error;
  }

  const expected = new Set();
  for (const image of Object.values(manifest.images ?? {})) {
    for (const variant of image.variants ?? []) {
      if (typeof variant.file === "string") expected.add(variant.file);
    }
  }

  let removed = 0;
  let removedLegacyManifest = false;

  const walk = async directory => {
    let entries;
    try {
      entries = await fs.readdir(directory, { withFileTypes: true });
    } catch (error) {
      if (error.code === "ENOENT") return;
      throw error;
    }
    for (const entry of entries) {
      const filePath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        await walk(filePath);
        continue;
      }
      if (entry.name.startsWith(".")) {
        // The library's writer lock lives inside the directory; never touch it.
        continue;
      }
      const relative = path.relative(imageDist, filePath).split(path.sep).join("/");
      if (relative === "manifest.json") {
        // The library never writes a public manifest; a leftover one from the
        // former slug-keyed CDN must not be deployed.
        await fs.unlink(filePath);
        removedLegacyManifest = true;
        continue;
      }
      if (!expected.has(relative)) {
        await fs.unlink(filePath);
        removed++;
      }
    }
  };

  await walk(imageDist);
  await removeEmptyChildDirectories(imageDist);

  if (removed > 0) {
    console.log(`🧹 ${removed} verwaiste Datei(en) aus .imagedist/ entfernt`);
  }
  if (removedLegacyManifest) {
    console.log("🧹 Veraltetes öffentliches .imagedist/manifest.json entfernt");
  }
  return { removed, removedLegacyManifest };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  pruneImageDist().catch(error => {
    console.error(`❌ prune-imagedist fehlgeschlagen: ${error.stack ?? error.message}`);
    process.exitCode = 1;
  });
}
