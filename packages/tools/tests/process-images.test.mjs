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
const PREVIOUS_MIGRATION_PROFILE = JSON.stringify({
  version: 1,
  package: "@all-the.rest/astro-image-cdn@0.2.3",
  widths: TARGET_WIDTHS,
  formats: ["webp"],
  quality: 75,
  includeSourceFormat: false,
  includeNativeWidth: false,
  autoRotate: false,
  dangerouslyProcessSVG: true,
  legacyTransform: "sharp-resize-webp-q75-no-autorotate-v1",
  sharp: sharp.versions.sharp,
  libvips: sharp.versions.vips,
});

async function makeFixtureRoot({ width = 2500, height = 1800 } = {}) {
  const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), "astro-image-migration-test-"));
  const sourceDir = path.join(rootDir, "src", "images");
  await fs.mkdir(sourceDir, { recursive: true });
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
      const variant = await sharp(source).resize(width).webp({ quality: 75, effort: 4 }).toBuffer();
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

async function makePreviousPackageVariants({ sourcePath, imageDist }) {
  const source = await fs.readFile(sourcePath);
  const sourceHash = crypto.createHash("sha256").update(source).digest("hex");
  const metadata = await sharp(source).metadata();
  const widths = TARGET_WIDTHS.filter(width => width <= metadata.width);
  const previousHash = crypto.createHash("sha256")
    .update(PREVIOUS_MIGRATION_PROFILE)
    .update(sourceHash)
    .digest("hex");
  const variantDir = path.join(imageDist, previousHash.slice(0, 2));
  await fs.mkdir(variantDir, { recursive: true });

  for (const width of widths) {
    const variant = await sharp(source).resize(width).webp({ quality: 75, effort: 4 }).toBuffer();
    await fs.writeFile(path.join(variantDir, `${previousHash}_${width}.webp`), variant);
  }

  const manifestPath = path.join(imageDist, "manifest.json");
  await fs.writeFile(manifestPath, JSON.stringify({
    version: 2,
    generated: "previous-package-fixture",
    images: {
      "synthetic-noise": {
        hash: previousHash,
        sourceHash,
        migrationProfile: PREVIOUS_MIGRATION_PROFILE,
        width: metadata.width,
        height: metadata.height,
        variants: widths,
      },
    },
  }, null, 2));

  return { sourceHash, previousHash, widths, manifestPath, variantDir };
}

async function corruptWebpPayloadWithReadableMetadata(filePath) {
  const original = await fs.readFile(filePath);
  const originalMetadata = await sharp(original).metadata();
  for (let offset = 20; offset < Math.min(original.length, 256); offset++) {
    const corrupted = Buffer.from(original);
    corrupted[offset] ^= 0xff;
    const metadata = await sharp(corrupted, { failOn: "none" }).metadata().catch(() => undefined);
    if (metadata?.format !== "webp" || metadata.width !== originalMetadata.width
      || metadata.height !== originalMetadata.height) continue;
    const decodes = await sharp(corrupted, { failOn: "warning" }).raw().toBuffer()
      .then(() => true, () => false);
    if (decodes) continue;
    await fs.writeFile(filePath, corrupted);
    return corrupted;
  }
  throw new Error(`Could not corrupt ${filePath} while retaining readable WebP metadata`);
}

function getVariantPath(imageDist, hash, width) {
  return path.join(imageDist, hash.slice(0, 2), `${hash}_${width}.webp`);
}

async function snapshotFiles(directory) {
  const files = new Map();
  async function walk(currentDirectory, relativeDirectory = "") {
    for (const entry of await fs.readdir(currentDirectory, { withFileTypes: true })) {
      const relativePath = path.join(relativeDirectory, entry.name);
      const filePath = path.join(currentDirectory, entry.name);
      if (entry.isDirectory()) await walk(filePath, relativePath);
      else if (entry.isFile()) files.set(relativePath, await fs.readFile(filePath));
    }
  }
  await walk(directory);
  return files;
}

async function assertFilesUnchanged(directory, before) {
  const after = await snapshotFiles(directory);
  assert.deepEqual([...after.keys()].sort(), [...before.keys()].sort());
  for (const [file, bytes] of before) assert.deepEqual(after.get(file), bytes, `${file} changed`);
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

test("migration adopts valid 0.2.3 package variants into the 0.3.0 profile without changing inputs", async () => {
  const { rootDir, sourcePath } = await makeFixtureRoot();
  const imageDist = path.join(rootDir, ".imagedist");
  const legacyImageDist = path.join(rootDir, "legacy-imagedist");
  const initial = await makePreviousPackageVariants({ sourcePath, imageDist });
  const legacy = await makeLegacyVariants({ sourcePath, legacyImageDist });
  const yamlPath = path.join(path.dirname(sourcePath), "noise.yaml");
  const sourceBefore = await fs.readFile(sourcePath);
  const yamlBefore = await fs.readFile(yamlPath);
  const previousManifestBefore = await fs.readFile(initial.manifestPath);
  const legacyFilesBefore = await snapshotFiles(legacyImageDist);
  const oldVariantBytes = new Map(await Promise.all(initial.widths.map(async width => {
    const variantPath = path.join(initial.variantDir, `${initial.previousHash}_${width}.webp`);
    return [width, await fs.readFile(variantPath)];
  })));

  try {
    const result = await migrateImages({ rootDir, legacyImageDist, adoptImageVariants });
    const manifest = JSON.parse(await fs.readFile(result.manifestPath, "utf8"));
    const image = manifest.images["synthetic-noise"];

    assert.equal(manifest.version, 2);
    assert.equal(result.reused, initial.widths.length);
    assert.equal(image.sourceHash, initial.sourceHash);
    assert.equal(image.migrationProfile, MIGRATION_PROFILE);
    const profile = JSON.parse(image.migrationProfile);
    assert.equal(profile.package, "@all-the.rest/astro-image-cdn@0.3.0");
    assert.deepEqual(profile.widths, TARGET_WIDTHS);
    assert.deepEqual(profile.formats, ["webp"]);
    assert.equal(profile.quality, 75);
    assert.equal(profile.webpEffort, 4);
    assert.equal(profile.avifEffort, 4);
    assert.equal(profile.includeSourceFormat, false);
    assert.equal(profile.includeNativeWidth, false);
    assert.equal(profile.autoRotate, false);
    assert.deepEqual(image.variants, initial.widths);
    assert.notEqual(image.hash, initial.previousHash);
    assert.match(image.hash, /^[a-f0-9]{64}$/);
    assert.notDeepEqual(await fs.readFile(initial.manifestPath), previousManifestBefore);

    for (const width of initial.widths) {
      const adoptedPath = path.join(rootDir, ".imagedist", image.hash.slice(0, 2), `${image.hash}_${width}.webp`);
      const adoptedBytes = await fs.readFile(adoptedPath);
      assert.deepEqual(adoptedBytes, oldVariantBytes.get(width));
      const metadata = await sharp(adoptedBytes).metadata();
      assert.equal(metadata.format, "webp");
      assert.equal(metadata.width, width);
    }

    assert.deepEqual(await fs.readFile(sourcePath), sourceBefore);
    assert.deepEqual(await fs.readFile(yamlPath), yamlBefore);
    await assertFilesUnchanged(legacyImageDist, legacyFilesBefore);
    for (const width of initial.widths) {
      const oldVariantPath = path.join(initial.variantDir, `${initial.previousHash}_${width}.webp`);
      assert.deepEqual(await fs.readFile(oldVariantPath), oldVariantBytes.get(width));
    }
    assert.deepEqual(legacy.widths, initial.widths);
  } finally {
    await fs.rm(rootDir, { recursive: true, force: true });
  }
});

test("migration rejects incomplete or mismatched 0.2.3 package variants as a set", async () => {
  const cases = [
    {
      name: "profile mismatch",
      mutateEntry(entry) {
        const profile = JSON.parse(entry.migrationProfile);
        profile.quality++;
        entry.migrationProfile = JSON.stringify(profile);
      },
    },
    {
      name: "source hash mismatch",
      mutateEntry(entry) {
        entry.sourceHash = "0".repeat(64);
      },
    },
    {
      name: "non-package fingerprint",
      mutateEntry(entry) {
        entry.hash = entry.hash.slice(0, 16);
      },
    },
    {
      name: "incomplete width list",
      mutateEntry(entry) {
        entry.variants = entry.variants.slice(0, -1);
      },
    },
    {
      name: "symlinked variant",
      async mutateVariant({ sourcePath, variantPath }) {
        const targetPath = path.join(path.dirname(sourcePath), "valid-webp-target.webp");
        const metadata = await sharp(await fs.readFile(variantPath)).metadata();
        assert.deepEqual(
          { format: metadata.format, width: metadata.width, height: metadata.height },
          { format: "webp", width: 256, height: 144 },
        );
        await fs.copyFile(variantPath, targetPath);
        await fs.unlink(variantPath);
        await fs.symlink(targetPath, variantPath);
        return { path: targetPath, bytes: await fs.readFile(targetPath) };
      },
    },
    {
      name: "one-pixel dimension mismatch",
      async mutateVariant({ sourcePath, variantPath }) {
        const expectedHeight = Math.round(256 * 360 / 640);
        await sharp(await fs.readFile(sourcePath))
          .resize(256, expectedHeight + 1, { fit: "fill" })
          .webp({ quality: 75, effort: 4 })
          .toFile(variantPath);
      },
    },
    {
      name: "corrupt WebP payload with readable metadata",
      async mutateVariant({ variantPath }) {
        const corrupted = await corruptWebpPayloadWithReadableMetadata(variantPath);
        const metadata = await sharp(corrupted, { failOn: "none" }).metadata();
        assert.equal(metadata.format, "webp");
        await assert.rejects(sharp(corrupted, { failOn: "warning" }).raw().toBuffer());
      },
    },
  ];

  for (const invalidCase of cases) {
    const { rootDir, sourcePath } = await makeFixtureRoot({ width: 640, height: 360 });
    const imageDist = path.join(rootDir, ".imagedist");
    const legacyImageDist = path.join(rootDir, "legacy-imagedist");
    const previous = await makePreviousPackageVariants({ sourcePath, imageDist });
    const manifest = JSON.parse(await fs.readFile(previous.manifestPath, "utf8"));
    const entry = manifest.images["synthetic-noise"];
    invalidCase.mutateEntry?.(entry);
    const invalidVariantPath = getVariantPath(imageDist, previous.previousHash, 256);
    const symlinkTarget = await invalidCase.mutateVariant?.({ sourcePath, variantPath: invalidVariantPath });
    const previousVariantsBefore = await snapshotFiles(previous.variantDir);
    const sourceBefore = await fs.readFile(sourcePath);
    const yamlPath = path.join(path.dirname(sourcePath), "noise.yaml");
    const yamlBefore = await fs.readFile(yamlPath);
    await fs.writeFile(previous.manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

    try {
      const result = await migrateImages({ rootDir, legacyImageDist, adoptImageVariants });
      assert.equal(result.reused, 0, invalidCase.name);
      await assertFilesUnchanged(previous.variantDir, previousVariantsBefore);
      if (symlinkTarget) {
        assert.equal(await fs.readlink(invalidVariantPath), symlinkTarget.path);
        assert.deepEqual(await fs.readFile(symlinkTarget.path), symlinkTarget.bytes);
      }
      assert.deepEqual(await fs.readFile(sourcePath), sourceBefore);
      assert.deepEqual(await fs.readFile(yamlPath), yamlBefore);
      const migrated = JSON.parse(await fs.readFile(result.manifestPath, "utf8")).images["synthetic-noise"];
      assert.equal(migrated.sourceHash, previous.sourceHash);
      assert.equal(migrated.migrationProfile, MIGRATION_PROFILE);
    } finally {
      await fs.rm(rootDir, { recursive: true, force: true });
    }
  }
});

test("current and legacy WebP reuse rejects corrupt payloads with readable metadata", async () => {
  const currentFixture = await makeFixtureRoot({ width: 256, height: 180 });
  const currentImageDist = path.join(currentFixture.rootDir, ".imagedist");
  const currentManifestPath = path.join(currentImageDist, "manifest.json");
  const currentYamlPath = path.join(path.dirname(currentFixture.sourcePath), "noise.yaml");
  try {
    await migrateImages({ rootDir: currentFixture.rootDir, adoptImageVariants });
    const manifestBefore = await fs.readFile(currentManifestPath);
    const entry = JSON.parse(manifestBefore.toString("utf8")).images["synthetic-noise"];
    const currentVariantPath = getVariantPath(currentImageDist, entry.hash, 256);
    const corruptCurrentBytes = await corruptWebpPayloadWithReadableMetadata(currentVariantPath);
    const sourceBefore = await fs.readFile(currentFixture.sourcePath);
    const yamlBefore = await fs.readFile(currentYamlPath);
    await assert.rejects(
      migrateImages({ rootDir: currentFixture.rootDir, adoptImageVariants }),
      /Refusing to replace an existing non-matching adopted output/,
    );
    assert.deepEqual(await fs.readFile(currentManifestPath), manifestBefore);
    assert.deepEqual(await fs.readFile(currentVariantPath), corruptCurrentBytes);
    assert.deepEqual(await fs.readFile(currentFixture.sourcePath), sourceBefore);
    assert.deepEqual(await fs.readFile(currentYamlPath), yamlBefore);
  } finally {
    await fs.rm(currentFixture.rootDir, { recursive: true, force: true });
  }

  const legacyFixture = await makeFixtureRoot({ width: 256, height: 180 });
  const legacyImageDist = path.join(legacyFixture.rootDir, "legacy-imagedist");
  try {
    const legacy = await makeLegacyVariants({ sourcePath: legacyFixture.sourcePath, legacyImageDist });
    const invalidLegacyPath = getVariantPath(legacyImageDist, legacy.legacyHash, 256);
    const corruptLegacyBytes = await corruptWebpPayloadWithReadableMetadata(invalidLegacyPath);
    const legacyFilesBefore = await snapshotFiles(legacyImageDist);
    const sourceBefore = await fs.readFile(legacyFixture.sourcePath);
    const yamlPath = path.join(path.dirname(legacyFixture.sourcePath), "noise.yaml");
    const yamlBefore = await fs.readFile(yamlPath);

    const result = await migrateImages({ rootDir: legacyFixture.rootDir, legacyImageDist, adoptImageVariants });
    assert.equal(result.reused, 0);
    await assertFilesUnchanged(legacyImageDist, legacyFilesBefore);
    assert.deepEqual(await fs.readFile(legacyFixture.sourcePath), sourceBefore);
    assert.deepEqual(await fs.readFile(yamlPath), yamlBefore);
    const image = JSON.parse(await fs.readFile(result.manifestPath, "utf8")).images["synthetic-noise"];
    const repairedPath = getVariantPath(path.join(legacyFixture.rootDir, ".imagedist"), image.hash, 256);
    const repaired = await fs.readFile(repairedPath);
    assert.notDeepEqual(repaired, corruptLegacyBytes);
    assert.equal((await sharp(repaired).metadata()).format, "webp");
    await sharp(repaired, { failOn: "warning" }).raw().toBuffer();
  } finally {
    await fs.rm(legacyFixture.rootDir, { recursive: true, force: true });
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
