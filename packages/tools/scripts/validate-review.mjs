import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import Ajv from "ajv";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "../../..");
const reviewFile = process.argv.slice(2).find(argument => argument !== "--") ?? "review.json";
const reviewPath = path.resolve(projectRoot, reviewFile);
const schemaPath = path.join(projectRoot, "schemas", "review.schema.json");

function isInsideProject(filePath) {
  const relativePath = path.relative(projectRoot, filePath);
  return relativePath !== "" && !relativePath.startsWith(`..${path.sep}`) && !path.isAbsolute(relativePath);
}

function reportIssues(issues) {
  if (issues.length === 0) return;
  console.error(`${path.relative(projectRoot, reviewPath)} validation failed:`);
  for (const issue of issues) console.error(`- ${issue}`);
  process.exitCode = 1;
}

let reviewData;
let schema;

try {
  reviewData = JSON.parse(await fs.readFile(reviewPath, "utf8"));
  schema = JSON.parse(await fs.readFile(schemaPath, "utf8"));
} catch (error) {
  console.error(`Could not read review data or schema: ${error.message}`);
  process.exitCode = 1;
  process.exit();
}

const validator = new Ajv({ allErrors: true, strict: true }).compile(schema);
const issues = [];

if (!validator(reviewData)) {
  for (const error of validator.errors ?? []) {
    issues.push(`${error.instancePath || "/"} ${error.message}`);
  }
}

if (Array.isArray(reviewData)) {
  const seenIds = new Set();
  const seenImagePaths = new Set();
  const seenTargetNames = new Set();

  for (const [index, item] of reviewData.entries()) {
    if (item === null || typeof item !== "object") continue;

    if (seenIds.has(item.id)) issues.push(`/[${index}]/id must be unique`);
    seenIds.add(item.id);

    if (seenImagePaths.has(item.bild)) issues.push(`/[${index}]/bild must be unique`);
    seenImagePaths.add(item.bild);

    if (seenTargetNames.has(item.finalerDateiname)) {
      issues.push(`/[${index}]/finalerDateiname must be unique`);
    }
    seenTargetNames.add(item.finalerDateiname);

    if (typeof item.bild === "string") {
      const imagePath = path.resolve(projectRoot, item.bild);
      if (!isInsideProject(imagePath)) {
        issues.push(`/[${index}]/bild must point inside the project`);
      } else {
        try {
          const stat = await fs.stat(imagePath);
          if (!stat.isFile()) issues.push(`/[${index}]/bild must point to a file`);
        } catch {
          issues.push(`/[${index}]/bild does not exist: ${item.bild}`);
        }
      }
    }
  }
}

reportIssues(issues);

if (issues.length === 0) {
  console.log(`Validated ${reviewData.length} review entries against ${path.relative(projectRoot, schemaPath)}.`);
}
