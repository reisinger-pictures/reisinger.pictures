// Explicit, non-runtime importer for the portal licence-terms settings.
//
// Usage: pnpm run import:portal-terms
//
// Fetches the public endpoint, validates the nine required fields and writes the
// checked-in snapshot atomically. It is deliberately NOT wired into prebuild,
// the runtime or CI: a failed fetch/validation leaves the existing snapshot
// untouched.
//
// Run with Node's built-in TypeScript support (no build step):
//   node packages/tools/scripts/import-portal-license-terms.ts
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { PORTAL_LICENSE_TERMS_URL, runPortalTermsImport } from "../../shared/utils/portal-license-terms.ts";

const ARTIFACT_PATH = fileURLToPath(new URL("../../shared/data/portal-license-terms.ts", import.meta.url));

async function fetchTerms(url: string): Promise<unknown> {
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) {
    throw new Error(`Portal licence terms: unexpected HTTP ${response.status} from ${url}`);
  }
  return response.json();
}

async function readArtifact(file: string): Promise<string | null> {
  try {
    return await readFile(file, "utf8");
  } catch (error) {
    if ((error as { code?: string }).code === "ENOENT") return null;
    throw error;
  }
}

async function writeArtifact(file: string, content: string): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.tmp`;
  await writeFile(temporary, content, "utf8");
  // rename is atomic on the same filesystem: a reader never sees a half file.
  await rename(temporary, file);
}

async function main(): Promise<void> {
  const { status } = await runPortalTermsImport(
    { artifactPath: ARTIFACT_PATH, fetchedAt: new Date().toISOString(), url: PORTAL_LICENSE_TERMS_URL },
    { fetchTerms, readArtifact, writeArtifact }
  );
  console.log(`Portal licence terms ${status}: ${ARTIFACT_PATH}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
