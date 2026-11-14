import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import imageMetaPlugin from "../../../apps/reisinger.pictures/vite-plugin-image-meta.mjs";
import { loadImageCdnOptions, processProjectImages, resolveProcessImages } from "../scripts/process-images.mjs";
import { pruneImageDist } from "../scripts/prune-imagedist.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const APP_ROOT = path.join(REPO_ROOT, "apps", "reisinger.pictures");
const processImages = await resolveProcessImages(APP_ROOT);

async function makeFixtureRoot({ width = 1200, height = 800 } = {}) {
  const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), "astro-image-process-test-"));
  await fs.copyFile(path.join(APP_ROOT, "image-cdn-options.json"), path.join(rootDir, "image-cdn-options.json"));
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

async function readManifest(rootDir) {
  return JSON.parse(await fs.readFile(path.join(rootDir, ".astro-image-cdn", "manifest.json"), "utf8"));
}

test("processing delegates to the library and leaves a path-keyed manifest", async () => {
  const { rootDir } = await makeFixtureRoot();

  try {
    const firstRun = await processProjectImages({ rootDir, processImages });
    assert.equal(firstRun.imageCount, 1);
    assert.equal(firstRun.processed, 1);
    assert.equal(firstRun.skipped, 0);
    assert.equal(firstRun.slugs, 1);
    assert.equal(firstRun.manifestPath, path.join(rootDir, ".astro-image-cdn", "manifest.json"));

    const manifest = await readManifest(rootDir);
    const entry = manifest.images["src/images/noise.jpg"];
    assert.ok(entry, "manifest must be keyed by the project-relative source path");
    assert.match(entry.fingerprint, /^[a-f0-9]{64}$/);
    assert.equal(entry.width, 1200);
    assert.equal(entry.height, 800);
    assert.deepEqual(entry.variants.map(variant => variant.width), [256, 640, 828, 1080, 1200]);
    assert.ok(entry.variants.every(variant => variant.format === "webp"));

    for (const variant of entry.variants) {
      const metadata = await sharp(path.join(rootDir, ".imagedist", variant.file)).metadata();
      assert.equal(metadata.format, "webp");
      assert.equal(metadata.width, variant.width);
    }

    const manifestBefore = await fs.readFile(path.join(rootDir, ".astro-image-cdn", "manifest.json"), "utf8");
    const secondRun = await processProjectImages({ rootDir, processImages });
    assert.equal(secondRun.processed, 0);
    assert.equal(secondRun.skipped, 1);
    assert.equal(
      await fs.readFile(path.join(rootDir, ".astro-image-cdn", "manifest.json"), "utf8"),
      manifestBefore,
      "a warm run must not rewrite the manifest",
    );
  } finally {
    await fs.rm(rootDir, { recursive: true, force: true });
  }
});

test("processing fails when a slugged image is missing from the manifest", async () => {
  const { rootDir } = await makeFixtureRoot();

  try {
    const fakeProcessImages = async ({ rootDir: fixtureRoot, cacheDir }) => {
      const manifestPath = path.join(fixtureRoot, cacheDir, "manifest.json");
      await fs.mkdir(path.dirname(manifestPath), { recursive: true });
      await fs.writeFile(manifestPath, JSON.stringify({ version: 2, images: {} }));
      return { processed: 0, skipped: 0, imageCount: 0, manifestPath };
    };

    await assert.rejects(
      processProjectImages({ rootDir, processImages: fakeProcessImages }),
      /astro-image-cdn did not process 1 slugged image\(s\): synthetic-noise \(src\/images\/noise\.jpg\)/,
    );
  } finally {
    await fs.rm(rootDir, { recursive: true, force: true });
  }
});

test("processing rejects duplicate slugs before touching images", async () => {
  const { rootDir } = await makeFixtureRoot();

  try {
    await fs.writeFile(path.join(rootDir, "src", "images", "noise-copy.yaml"), "slug: synthetic-noise\n");
    await fs.copyFile(
      path.join(rootDir, "src", "images", "noise.jpg"),
      path.join(rootDir, "src", "images", "noise-copy.jpg"),
    );

    await assert.rejects(
      processProjectImages({ rootDir, processImages }),
      /Duplicate image slug "synthetic-noise"/,
    );
    await assert.rejects(fs.access(path.join(rootDir, ".astro-image-cdn", "manifest.json")));
  } finally {
    await fs.rm(rootDir, { recursive: true, force: true });
  }
});

test("pruning removes unreferenced variants and the legacy public manifest", async () => {
  const { rootDir } = await makeFixtureRoot();
  const imageDist = path.join(rootDir, ".imagedist");

  try {
    await processProjectImages({ rootDir, processImages });
    const manifest = await readManifest(rootDir);
    const referenced = manifest.images["src/images/noise.jpg"].variants[0].file;

    const orphanPath = path.join(imageDist, "ff", "ffdeadbeef_256.webp");
    await fs.mkdir(path.dirname(orphanPath), { recursive: true });
    await fs.writeFile(orphanPath, "orphan");
    const emptyDirectory = path.join(imageDist, "ee");
    await fs.mkdir(emptyDirectory, { recursive: true });
    const lockPath = path.join(imageDist, ".astro-image-cdn.lock");
    await fs.writeFile(lockPath, "pid\n");
    const legacyManifest = path.join(imageDist, "manifest.json");
    await fs.writeFile(legacyManifest, JSON.stringify({ version: 2, images: {} }));

    const result = await pruneImageDist({ rootDir });
    assert.equal(result.removed, 1);
    assert.equal(result.removedLegacyManifest, true);
    await fs.access(path.join(imageDist, referenced));
    await fs.access(lockPath);
    await assert.rejects(fs.access(orphanPath));
    await assert.rejects(fs.access(legacyManifest));
    await assert.rejects(fs.access(emptyDirectory));
  } finally {
    await fs.rm(rootDir, { recursive: true, force: true });
  }
});

test("pruning without a manifest is a no-op", async () => {
  const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), "astro-image-prune-test-"));
  try {
    const result = await pruneImageDist({ rootDir });
    assert.deepEqual(result, { removed: 0, removedLegacyManifest: false });
  } finally {
    await fs.rm(rootDir, { recursive: true, force: true });
  }
});

test("pruning tolerates a manifest without an .imagedist directory", async () => {
  const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), "astro-image-prune-test-"));
  try {
    const manifestPath = path.join(rootDir, ".astro-image-cdn", "manifest.json");
    await fs.mkdir(path.dirname(manifestPath), { recursive: true });
    await fs.writeFile(manifestPath, JSON.stringify({ version: 2, images: {} }));
    assert.deepEqual(await pruneImageDist({ rootDir }), { removed: 0, removedLegacyManifest: false });
  } finally {
    await fs.rm(rootDir, { recursive: true, force: true });
  }
});

test("processing rejects mistyped option keys instead of silently using defaults", async () => {
  const { rootDir } = await makeFixtureRoot();
  try {
    const options = await loadImageCdnOptions(rootDir);
    await fs.writeFile(
      path.join(rootDir, "image-cdn-options.json"),
      JSON.stringify({ ...options, autoRotat: true }),
    );
    await assert.rejects(loadImageCdnOptions(rootDir), /Unknown image CDN option\(s\).*autoRotat/);
  } finally {
    await fs.rm(rootDir, { recursive: true, force: true });
  }
});

test("the shared options file feeds both prebuild and the Astro integration", async () => {
  const options = await loadImageCdnOptions(APP_ROOT);
  assert.deepEqual(options.widths, [256, 640, 828, 1080, 1200, 1920, 2048]);
  assert.deepEqual(options.formats, ["webp"]);
  assert.equal(options.outputDir, ".imagedist");
  assert.equal(options.cacheDir, ".astro-image-cdn");
  assert.equal(options.autoRotate, false);
  assert.equal(options.dangerouslyProcessSVG, true);
  assert.deepEqual(options.sources, ["src"]);
});

test("the slug map exposes the manifest path in both dev and build", async () => {
  const { rootDir } = await makeFixtureRoot();

  try {
    const plugin = imageMetaPlugin();
    let code;
    const context = { addWatchFile() {} };

    plugin.configResolved({ root: rootDir, command: "build" });
    code = plugin.load.call(context, "\0virtual:image-slug-map").code;
    const buildEntries = (await import(`data:text/javascript,${encodeURIComponent(code)}`)).default;
    assert.deepEqual(buildEntries["synthetic-noise"], { path: "src/images/noise.jpg" });

    plugin.configResolved({ root: rootDir, command: "serve" });
    code = plugin.load.call(context, "\0virtual:image-slug-map").code;
    assert.match(code, /"synthetic-noise": \{ path: "src\/images\/noise\.jpg", load: \(\) => import\("\/src\/images\/noise\.jpg"\) \}/);
  } finally {
    await fs.rm(rootDir, { recursive: true, force: true });
  }
});

