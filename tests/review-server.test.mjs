import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  createReviewValidator,
  parseReviewPayload,
  saveReviewBody,
  serializeReviewData,
  writeFileAtomic,
} from "../packages/tools/scripts/review-server.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const schema = JSON.parse(await fs.readFile(path.join(projectRoot, "schemas", "review.schema.json"), "utf8"));
const validate = createReviewValidator(schema);

const validEntry = {
  id: "image-1",
  bild: "images/source.jpg",
  originalerDateiname: "source.jpg",
  finalerDateiname: "final-name.jpg",
  finaleDescription: "Eine Beschreibung.",
};

async function createWorkspace() {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "review-server-"));
  return { directory, targetPath: path.join(directory, "review.json") };
}

async function withReviewServer(rootDirectory, reviewFile, callback) {
  const server = (await import("../packages/tools/scripts/review-server.mjs")).createReviewServer({
    validate,
    rootDirectory,
    reviewFile,
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  try {
    return await callback(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
}

test("the schema validator accepts a valid review payload", () => {
  assert.deepEqual(validate([validEntry]), []);
});

test("the schema validator reports issues for invalid entries", () => {
  const issues = validate([{ ...validEntry, finalerDateiname: "Ungueltig Name.JPG" }]);

  assert.equal(issues.length, 1);
  assert.match(issues[0], /^\/0\/finalerDateiname/);
});

test("invalid JSON is reported without throwing", () => {
  const result = parseReviewPayload("[{", validate);

  assert.equal(result.ok, false);
  assert.match(result.issues[0], /^Ungültiges JSON/);
});

test("a payload violating the schema is reported with issue paths", () => {
  const result = parseReviewPayload(JSON.stringify([{ id: "image-1" }]), validate);

  assert.equal(result.ok, false);
  assert.ok(result.issues.length > 0);
});

test("review data is serialized with two-space indentation and a trailing newline", () => {
  assert.equal(serializeReviewData([validEntry]), `${JSON.stringify([validEntry], null, 2)}\n`);
});

test("the atomic write replaces the file and leaves no temp file behind", async () => {
  const { directory, targetPath } = await createWorkspace();
  await fs.writeFile(targetPath, "alt\n", "utf8");

  await writeFileAtomic(targetPath, "neu\n");

  assert.equal(await fs.readFile(targetPath, "utf8"), "neu\n");
  assert.deepEqual(await fs.readdir(directory), ["review.json"]);
});

test("a failing atomic write keeps the previous file intact", async () => {
  const { directory, targetPath } = await createWorkspace();
  await fs.writeFile(targetPath, "alt\n", "utf8");

  await assert.rejects(writeFileAtomic(path.join(directory, "missing", "review.json"), "neu\n"));

  assert.equal(await fs.readFile(targetPath, "utf8"), "alt\n");
  assert.deepEqual(await fs.readdir(directory), ["review.json"]);
});

test("a valid payload replaces the file atomically", async () => {
  const { targetPath } = await createWorkspace();
  await fs.writeFile(targetPath, "[]\n", "utf8");

  const result = await saveReviewBody({
    body: JSON.stringify([{ ...validEntry, reviewComment: "Interner Hinweis" }]),
    validate,
    targetPath,
  });

  assert.equal(result.ok, true);
  assert.equal(result.count, 1);
  assert.deepEqual(JSON.parse(await fs.readFile(targetPath, "utf8")), [
    { ...validEntry, reviewComment: "Interner Hinweis" },
  ]);
});

test("an invalid payload never touches the existing file", async () => {
  const { targetPath } = await createWorkspace();
  const original = `${JSON.stringify([validEntry], null, 2)}\n`;
  await fs.writeFile(targetPath, original, "utf8");

  const result = await saveReviewBody({
    body: JSON.stringify([{ ...validEntry, finalerDateiname: "kein bild" }]),
    validate,
    targetPath,
  });

  assert.equal(result.ok, false);
  assert.ok(result.issues.length > 0);
  assert.equal(await fs.readFile(targetPath, "utf8"), original);
});

test("the HTTP server saves only same-origin JSON POSTs and preserves the file on rejected requests", async () => {
  const { directory, targetPath } = await createWorkspace();
  const original = `${JSON.stringify([validEntry], null, 2)}\n`;
  await fs.writeFile(targetPath, original, "utf8");

  await withReviewServer(directory, targetPath, async origin => {
    const initialResponse = await fetch(`${origin}/review.json`, { cache: "no-store" });
    const initialRevision = initialResponse.headers.get("etag");
    assert.match(initialRevision ?? "", /^"[a-f0-9]{64}"$/);
    const payload = JSON.stringify([{ ...validEntry, reviewComment: "Gespeichert" }]);
    const deniedRequests = [
      { headers: { "content-type": "application/json" } },
      { headers: { origin: "https://attacker.example", "content-type": "application/json" } },
      { headers: { origin, "content-type": "text/plain" } },
      { headers: { host: "attacker.example", origin: "http://attacker.example", "content-type": "application/json" } },
    ];

    for (const options of deniedRequests) {
      const response = await fetch(`${origin}/review.json`, { method: "POST", ...options, body: payload });
      assert.equal(response.status, 403);
      assert.equal(await fs.readFile(targetPath, "utf8"), original);
    }

    const response = await fetch(`${origin}/review.json`, {
      method: "POST",
      headers: { origin, "content-type": "application/json; charset=utf-8", "if-match": initialRevision },
      body: payload,
    });
    assert.equal(response.status, 200);
    assert.match(response.headers.get("etag") ?? "", /^"[a-f0-9]{64}"$/);
    assert.deepEqual(JSON.parse(await fs.readFile(targetPath, "utf8")), [
      { ...validEntry, reviewComment: "Gespeichert" },
    ]);
  });
});

test("a stale review revision cannot overwrite an external update", async () => {
  const { directory, targetPath } = await createWorkspace();
  const original = `${JSON.stringify([validEntry], null, 2)}\n`;
  await fs.writeFile(targetPath, original, "utf8");

  await withReviewServer(directory, targetPath, async origin => {
    const initialResponse = await fetch(`${origin}/review.json`, { cache: "no-store" });
    const staleRevision = initialResponse.headers.get("etag");
    const externalData = [{ ...validEntry, reviewComment: "Externe Änderung" }];
    const externalBytes = `${JSON.stringify(externalData, null, 2)}\n`;
    await fs.writeFile(targetPath, externalBytes, "utf8");

    const response = await fetch(`${origin}/review.json`, {
      method: "POST",
      headers: { origin, "content-type": "application/json", "if-match": staleRevision },
      body: JSON.stringify([{ ...validEntry, reviewComment: "Veralteter Kommentar" }]),
    });

    assert.equal(response.status, 409);
    assert.deepEqual(await response.json(), {
      code: "STALE_REVIEW_FILE",
      ok: false,
      error: "review.json wurde zwischenzeitlich geändert. Die neue Fassung wird geladen; prüfe mögliche Kommentar-Konflikte.",
      issues: [],
    });
    assert.equal(response.headers.get("etag"), (await fetch(`${origin}/review.json`)).headers.get("etag"));
    assert.equal(await fs.readFile(targetPath, "utf8"), externalBytes);
  });
});

test("the HTTP server refuses symlinks that escape the served project root", async () => {
  const { directory, targetPath } = await createWorkspace();
  const outsideDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "review-server-outside-"));
  const outsideFile = path.join(outsideDirectory, "secret.txt");
  await fs.writeFile(outsideFile, "private\n", "utf8");
  await fs.symlink(outsideFile, path.join(directory, "public-secret.txt"));

  await withReviewServer(directory, targetPath, async origin => {
    const response = await fetch(`${origin}/public-secret.txt`);
    assert.equal(response.status, 403);
    assert.match(await response.text(), /innerhalb des Repositorys/);
  });
});
