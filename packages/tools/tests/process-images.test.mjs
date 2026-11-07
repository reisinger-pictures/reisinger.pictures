import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import {
  MIGRATION_PROFILE,
  migrateImages,
  resolveAdoptImageVariants,
} from "../scripts/process-images.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const adoptImageVariants = await resolveAdoptImageVariants(path.join(REPO_ROOT, "apps", "reisinger.pictures"));
const TARGET_WIDTHS = [256, 640, 828, 1080, 1200, 1920, 2048];

async function makeFixtureRoot() {
  const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), "astro-image-migration-test-"));
  const sourceDir = path.join(rootDir, "src", "images");
  await fs.mkdir(sourceDir, { recursive: true });
  const width = 2500;
  const height = 1800;
  const pixels = Buffer.alloc(width * height * 3);
  let state = 0x12345678;
  for (let index = 0; index < pixels.length; index++) {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    pixels[index] = state & 0xff;
  }
  const sourcePath = path.join(sourceDir, "noise.jpg");
  await sharp(pixels, { raw: { width, height, channels: 3 } }).jpeg({ quality: 85 }).toFile(sourcePath);
  await fs.writeFile(path.join(sourceDir, "noise.yaml"), "slug: synthetic-noise\ndescription: Test fixture\n");
  return { rootDir, sourceDir, sourcePath };
}

async function makeLegacyVariants({ sourcePath, legacyImageDist, missingWidths = [], invalidWidths = [] }) {
  const source = await fs.readFile(sourcePath);
  const sourceHash = crypto.createHash("sha256").update(source).digest("hex");
  const metadata = await sharp(source).metadata();
  const widths = TARGET_WIDTHS.filter(width => width <= metadata.width);
  const legacyHash = sourceHash.slice(0, 16);
  const variantDir = path.join(legacyImageDist, legacyHash.slice(0, 2));
  await fs.mkdir(variantDir, { recursive: true });

  for (const width of widths) {
    if (missingWidths.includes(width)) continue;
    const variantPath = path.join(variantDir, `${legacyHash}_${width}.webp`);
    if (invalidWidths.includes(width)) {
      await fs.writeFile(variantPath, Buffer.from("invalid legacy output"));
    } else {
      const variant = await sharp(source).resize(width).webp({ quality: 75 }).toBuffer();
      await fs.writeFile(variantPath, variant);
    }
  }

  await fs.writeFile(path.join(legacyImageDist, "manifest.json"), JSON.stringify({
    version: 1,
    generated: "fixture",
    images: {
      "synthetic-noise": {
        hash: legacyHash,
        width: metadata.width,
        height: metadata.height,
        variants: widths,
      },
    },
  }, null, 2));

  return {
    sourceHash,
    legacyHash,
    widths,
    variantDir,
  };
}

test("migration adopts valid legacy variants, repairs only missing outputs, and is idempotent", async () => {
  const { rootDir, sourcePath } = await makeFixtureRoot();
  const legacyImageDist = path.join(rootDir, "legacy-imagedist");
  const initial = await makeLegacyVariants({
    sourcePath,
    legacyImageDist,
    missingWidths: [256],
  });
  const legacyManifestBefore = await fs.readFile(path.join(legacyImageDist, "manifest.json"), "utf8");
  const yamlBefore = await fs.readFile(path.join(path.dirname(sourcePath), "noise.yaml"), "utf8");

  try {
    const firstRun = await migrateImages({ rootDir, legacyImageDist, adoptImageVariants });
    const manifestPath = path.join(rootDir, ".imagedist", "manifest.json");
    const firstManifestText = await fs.readFile(manifestPath, "utf8");
    const manifestImage = JSON.parse(firstManifestText).images["synthetic-noise"];

    assert.equal(manifestImage.hash.length, 64);
    assert.equal(manifestImage.sourceHash, initial.sourceHash);
    assert.equal(manifestImage.migrationProfile, MIGRATION_PROFILE);
    assert.deepEqual(manifestImage.variants, initial.widths);
    assert.equal(firstRun.reused, initial.widths.length - 1);
    assert.equal(await fs.readFile(path.join(legacyImageDist, "manifest.json"), "utf8"), legacyManifestBefore);
    assert.equal(await fs.readFile(path.join(path.dirname(sourcePath), "noise.yaml"), "utf8"), yamlBefore);
    assert.deepEqual(
      (await fs.readdir(path.join(rootDir, ".imagedist", manifestImage.hash.slice(0, 2)))).sort(),
      initial.widths.map(width => `${manifestImage.hash}_${width}.webp`).sort(),
    );

    for (const width of initial.widths) {
      const target = path.join(rootDir, ".imagedist", manifestImage.hash.slice(0, 2), `${manifestImage.hash}_${width}.webp`);
      const metadata = await sharp(target).metadata();
      assert.equal(metadata.format, "webp");
      assert.equal(metadata.width, width);
    }

    const secondRun = await migrateImages({ rootDir, legacyImageDist, adoptImageVariants });
    assert.equal(secondRun.reused, initial.widths.length);
    assert.equal(await fs.readFile(manifestPath, "utf8"), firstManifestText);

    const changedSource = await sharp(await fs.readFile(sourcePath)).jpeg({ quality: 76 }).toBuffer();
    await fs.writeFile(sourcePath, changedSource);
    const changedHash = crypto.createHash("sha256").update(changedSource).digest("hex");
    const changedRun = await migrateImages({ rootDir, legacyImageDist, adoptImageVariants });
    const changedEntry = JSON.parse(await fs.readFile(manifestPath, "utf8")).images["synthetic-noise"];
    assert.equal(changedRun.reused, 0);
    assert.equal(changedEntry.sourceHash, changedHash);
    assert.notEqual(changedEntry.hash, manifestImage.hash);
  } finally {
    await fs.rm(rootDir, { recursive: true, force: true });
  }
});

test("an invalid legacy variant is regenerated without changing the legacy input", async () => {
  const { rootDir, sourcePath } = await makeFixtureRoot();
  const legacyImageDist = path.join(rootDir, "legacy-imagedist");
  const initial = await makeLegacyVariants({
    sourcePath,
    legacyImageDist,
    invalidWidths: [256],
  });
  const invalidLegacyPath = path.join(initial.variantDir, `${initial.legacyHash}_256.webp`);
  const invalidLegacyBytes = await fs.readFile(invalidLegacyPath);

  try {
    const result = await migrateImages({ rootDir, legacyImageDist, adoptImageVariants });
    assert.equal(result.reused, initial.widths.length - 1);
    assert.deepEqual(await fs.readFile(invalidLegacyPath), invalidLegacyBytes);
    const manifestImage = JSON.parse(await fs.readFile(result.manifestPath, "utf8")).images["synthetic-noise"];
    const repairedPath = path.join(rootDir, ".imagedist", manifestImage.hash.slice(0, 2), `${manifestImage.hash}_256.webp`);
    const repairedMetadata = await sharp(repairedPath).metadata();
    assert.equal(repairedMetadata.format, "webp");
    assert.equal(repairedMetadata.width, 256);
  } finally {
    await fs.rm(rootDir, { recursive: true, force: true });
  }
});

test("a source failure leaves the existing public manifest byte-for-byte unchanged", async () => {
  const { rootDir, sourceDir, sourcePath } = await makeFixtureRoot();
  const manifestPath = path.join(rootDir, ".imagedist", "manifest.json");
  const baselineManifest = JSON.stringify({
    version: 1,
    generated: "unchanged",
    images: {
      "pre-existing": { hash: "legacy", width: 1, height: 1, variants: [] },
    },
  }, null, 2);
  await fs.mkdir(path.dirname(manifestPath), { recursive: true });
  await fs.writeFile(manifestPath, baselineManifest);
  await fs.writeFile(path.join(sourceDir, "z-broken.jpg"), Buffer.from("not an image"));
  await fs.writeFile(path.join(sourceDir, "z-broken.yaml"), "slug: broken\n");
  await fs.rename(path.join(sourceDir, "noise.jpg"), path.join(sourceDir, "a-noise.jpg"));
  await fs.rename(path.join(sourceDir, "noise.yaml"), path.join(sourceDir, "a-noise.yaml"));

  try {
    await assert.rejects(migrateImages({ rootDir, adoptImageVariants }), /Could not read source image for "broken"/);
    assert.equal(await fs.readFile(manifestPath, "utf8"), baselineManifest);
  } finally {
    await fs.rm(rootDir, { recursive: true, force: true });
  }
});
