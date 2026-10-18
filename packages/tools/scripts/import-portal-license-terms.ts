// Explicit, non-runtime importer for the portal licence-terms settings.
//
// Usage:
//   pnpm run import:portal-terms                                  # anonymous read
//   PORTAL_ADMIN_EMAIL=... PORTAL_ADMIN_PASSWORD=... pnpm run import:portal-terms
//
// Authentication is optional. The owner plans to protect the endpoint with
// super-admin access (`rp_jwt`); until then it is still readable anonymously.
// When both credentials are present the importer logs in with that portal
// super-admin account (credentials from the environment, never committed or
// logged) and forwards the httpOnly `rp_jwt` access cookie to the terms
// request; when neither is set it reads the endpoint anonymously. Setting only
// one of the two is a misconfiguration and fails loudly — there is no silent
// downgrade. It then validates the nine required fields and writes the
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

const LOGIN_URL = new URL("/api/auth/login", PORTAL_LICENSE_TERMS_URL).toString();
const ACCESS_COOKIE_NAME = "rp_jwt";

/**
 * Return the portal access credential as a `name=value` Cookie header fragment,
 * or `null` when no credentials are configured.
 *
 * The endpoint is not protected yet, so an anonymous read works today. When the
 * owner protects it (separate portal task), setting both environment variables
 * is enough — no code change needed. Setting only one of the two is a
 * misconfiguration and fails loudly instead of silently reading anonymously.
 * Credentials and the returned token are never written to disk or logged.
 */
async function portalAccessCookie(): Promise<string | null> {
  const email = process.env.PORTAL_ADMIN_EMAIL;
  const password = process.env.PORTAL_ADMIN_PASSWORD;
  if (!email && !password) return null;
  if (!email || !password) {
    throw new Error("Set both PORTAL_ADMIN_EMAIL and PORTAL_ADMIN_PASSWORD, or neither (anonymous read).");
  }

  const response = await fetch(LOGIN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) {
    throw new Error(`Portal login: unexpected HTTP ${response.status} from ${LOGIN_URL}`);
  }

  const accessCookie = response.headers
    .getSetCookie()
    .map((cookie) => cookie.split(";", 1)[0].trim())
    .find((cookie) => cookie.startsWith(`${ACCESS_COOKIE_NAME}=`));
  if (!accessCookie) {
    throw new Error(`Portal login: no ${ACCESS_COOKIE_NAME} access cookie in the response.`);
  }
  return accessCookie;
}

async function fetchTerms(url: string): Promise<unknown> {
  const cookie = await portalAccessCookie();
  const response = await fetch(url, {
    headers: cookie ? { Accept: "application/json", Cookie: cookie } : { Accept: "application/json" },
  });
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
