import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import * as yaml from "js-yaml";

/**
 * Applies an approved review.json to a target folder:
 *
 *   node packages/tools/scripts/apply-review.mjs <target-dir> [review-file]
 *
 * - Preflight: refuses to run if any target file would be overwritten by a file
 *   that is not itself part of the rename plan (no unrelated file is ever lost).
 * - Renames every `bild` to `<target-dir>/<finalerDateiname>` (two-phase, so
 *   cyclic renames are safe).
 * - Writes/updates the `description` field of each companion `.yaml` sidecar
 *   (`slug`, `metadata`, `categories` are generated later by add-metadata.mjs).
 * - Updates `bild` in the review file to the new project-relative path, so the
 *   script is idempotent and the data stays valid.
 *
 * The target directory is relative to the project root (or absolute).
 */

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "../../..");

const args = process.argv.slice(2).filter(argument => argument !== "--");
const targetArgument = args[0];
const reviewFile = args[1] ?? "review.json";

if (!targetArgument) {
  console.error("Usage: node packages/tools/scripts/apply-review.mjs <target-dir> [review-file]");
  process.exit(1);
}

const targetDirectory = path.resolve(projectRoot, targetArgument);
const reviewPath = path.resolve(projectRoot, reviewFile);

function toProjectRelative(filePath) {
  return path.relative(projectRoot, filePath).split(path.sep).join("/");
}

async function fileExists(filePath) {
  try {
    return (await fs.stat(filePath)).isFile();
  } catch {
    return false;
  }
}

let reviewData;
try {
  reviewData = JSON.parse(await fs.readFile(reviewPath, "utf8"));
} catch (error) {
  console.error(`Could not read review data: ${error.message}`);
  process.exit(1);
}
if (!Array.isArray(reviewData)) {
  console.error(`${reviewFile} must contain an array.`);
  process.exit(1);
}

// ---- Preflight -----------------------------------------------------------
const plan = [];
const errors = [];
const seenDestinations = new Map();

for (const entry of reviewData) {
  const source = path.resolve(projectRoot, entry.bild);
  const destination = path.join(targetDirectory, entry.finalerDateiname);

  if (seenDestinations.has(destination)) {
    errors.push(`duplicate destination in review file: ${toProjectRelative(destination)} (${entry.id} and ${seenDestinations.get(destination)})`);
    continue;
  }
  seenDestinations.set(destination, entry.id);

  const sourceExists = await fileExists(source);
  const destinationExists = await fileExists(destination);

  if (source !== destination && !sourceExists && !destinationExists) {
    errors.push(`missing file: neither ${toProjectRelative(source)} nor ${toProjectRelative(destination)} exists (${entry.id})`);
    continue;
  }

  if (source !== destination && sourceExists && destinationExists) {
    errors.push(`collision: ${toProjectRelative(destination)} already exists and would be overwritten (${entry.id})`);
    continue;
  }

  plan.push({ entry, source, destination, move: source !== destination && sourceExists });
}

// A destination that is currently occupied may only be written if the occupying
// file is itself part of the plan and therefore vacated in phase one.
const occupiedByPlan = new Set(
  plan.filter(item => item.move).map(item => item.source),
);

for (const item of plan) {
  if (!item.move) continue;
  if (await fileExists(item.destination)) {
    if (!occupiedByPlan.has(item.destination)) {
      errors.push(`collision: ${toProjectRelative(item.destination)} is occupied by a file outside the plan`);
    }
  }
}

if (errors.length > 0) {
  console.error("Refusing to apply review data:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

// ---- Two-phase rename ----------------------------------------------------
const temporary = [];
for (const [index, item] of plan.entries()) {
  if (!item.move) continue;
  const temp = `${item.source}.apply-review-tmp-${index}`;
  await fs.rename(item.source, temp);
  temporary.push({ item, temp });
}
for (const { item, temp } of temporary) {
  await fs.rename(temp, item.destination);
}

// ---- Sidecars + review data ---------------------------------------------
let renamed = temporary.length;
let unchanged = plan.length - renamed;

for (const { entry, destination } of plan) {
  const sidecar = destination.replace(/\.[^.]+$/, ".yaml");
  let data = {};
  if (await fileExists(sidecar)) {
    data = yaml.load(await fs.readFile(sidecar, "utf8")) ?? {};
  }
  data.description = entry.finaleDescription;
  await fs.writeFile(sidecar, yaml.dump(data, { lineWidth: -1, noRefs: true }), "utf8");
  entry.bild = toProjectRelative(destination);
}

await fs.writeFile(reviewPath, `${JSON.stringify(reviewData, null, 2)}\n`, "utf8");

console.log(`Applied ${plan.length} review entries to ${toProjectRelative(targetDirectory)} (renamed: ${renamed}, already applied: ${unchanged}).`);
