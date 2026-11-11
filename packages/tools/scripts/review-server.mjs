import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

import Ajv from "ajv";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "../../..");
const reviewPath = path.join(projectRoot, "review.json");
const schemaPath = path.join(projectRoot, "schemas", "review.schema.json");
const defaultPort = 8123;
const host = "127.0.0.1";
const maxBodyBytes = 20 * 1024 * 1024;

/**
 * Compiles the review schema once and returns a function that reports
 * human-readable issues instead of mutating Ajv state at the call site.
 */
export function createReviewValidator(schema) {
  const validate = new Ajv({ allErrors: true, strict: true }).compile(schema);

  return data => {
    if (validate(data)) return [];
    return (validate.errors ?? []).map(error => `${error.instancePath || "/"} ${error.message}`);
  };
}

/** Parses a raw request body and validates it against the compiled schema. */
export function parseReviewPayload(body, validate) {
  let data;
  try {
    data = JSON.parse(body);
  } catch (error) {
    return { ok: false, issues: [`Ungültiges JSON: ${error.message}`] };
  }

  const issues = validate(data);
  if (issues.length > 0) return { ok: false, issues };

  return { ok: true, data, issues: [] };
}

/** Serializes review data in the repository's formatting (2 spaces, trailing newline). */
export function serializeReviewData(data) {
  return `${JSON.stringify(data, null, 2)}\n`;
}

/** Writes a file via a temp file in the same directory plus rename, so a partial write can never win. */
export async function writeFileAtomic(filePath, content) {
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;

  try {
    const handle = await fs.open(tempPath, "w");
    try {
      await handle.writeFile(content, "utf8");
      await handle.sync();
    } finally {
      await handle.close();
    }
    await fs.rename(tempPath, filePath);
  } catch (error) {
    await fs.rm(tempPath, { force: true });
    throw error;
  }

  return filePath;
}

/**
 * Validates a raw review payload and atomically replaces the target file.
 * Invalid payloads never touch the existing file.
 */
export async function saveReviewBody({ body, validate, targetPath = reviewPath }) {
  const parsed = parseReviewPayload(body, validate);
  if (!parsed.ok) return parsed;

  await writeFileAtomic(targetPath, serializeReviewData(parsed.data));
  return { ok: true, data: parsed.data, issues: [], count: parsed.data.length };
}

function isInsideProject(filePath, rootDirectory) {
  const relativePath = path.relative(rootDirectory, filePath);
  return relativePath !== "" && relativePath !== ".." && !relativePath.startsWith(`..${path.sep}`) && !path.isAbsolute(relativePath);
}

function hasHiddenSegment(relativePath) {
  return relativePath.split(path.sep).some(segment => segment.startsWith("."));
}

function revisionTag(content) {
  return `"${createHash("sha256").update(content).digest("hex")}"`;
}

function contentTypeFor(filePath) {
  switch (path.extname(filePath).toLowerCase()) {
    case ".html": return "text/html; charset=utf-8";
    case ".js":
    case ".mjs": return "text/javascript; charset=utf-8";
    case ".json": return "application/json; charset=utf-8";
    case ".css": return "text/css; charset=utf-8";
    case ".svg": return "image/svg+xml";
    case ".jpg":
    case ".jpeg": return "image/jpeg";
    case ".png": return "image/png";
    case ".webp": return "image/webp";
    case ".avif": return "image/avif";
    case ".gif": return "image/gif";
    default: return "application/octet-stream";
  }
}

function sendJson(response, statusCode, payload, headers = {}) {
  const body = `${JSON.stringify(payload)}\n`;
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "no-store",
    ...headers,
  });
  response.end(body);
}

function sendText(response, statusCode, text) {
  response.writeHead(statusCode, {
    "Content-Type": "text/plain; charset=utf-8",
    "Content-Length": Buffer.byteLength(text),
    "Cache-Control": "no-store",
  });
  response.end(text);
}

function readBody(request, limit) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;

    request.on("data", chunk => {
      size += chunk.length;
      if (size > limit) {
        reject(new Error(`Anfrage zu groß (max. ${Math.round(limit / 1024 / 1024)} MB).`));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    request.on("error", reject);
  });
}

async function serveStatic(response, pathname, method, rootDirectory, realRootDirectory) {
  let relativePath;
  try {
    relativePath = pathname === "/" ? "review.html" : decodeURIComponent(pathname).replace(/^\/+/, "");
  } catch {
    sendText(response, 400, "Ungültiger Pfad.");
    return;
  }
  const filePath = path.resolve(rootDirectory, relativePath);

  if (!isInsideProject(filePath, rootDirectory) || hasHiddenSegment(path.relative(rootDirectory, filePath))) {
    sendText(response, 403, "Zugriff nur innerhalb des Repositorys erlaubt.");
    return;
  }

  let stat;
  let realFilePath;
  try {
    realFilePath = await fs.realpath(filePath);
    const realRelativePath = path.relative(realRootDirectory, realFilePath);
    if (!isInsideProject(realFilePath, realRootDirectory) || hasHiddenSegment(realRelativePath)) {
      sendText(response, 403, "Zugriff nur innerhalb des Repositorys erlaubt.");
      return;
    }
    stat = await fs.stat(realFilePath);
  } catch {
    sendText(response, 404, `Nicht gefunden: ${pathname}`);
    return;
  }

  if (!stat.isFile()) {
    sendText(response, 404, `Nicht gefunden: ${pathname}`);
    return;
  }

  const content = method === "HEAD" && path.extname(realFilePath).toLowerCase() !== ".json"
    ? undefined
    : await fs.readFile(realFilePath);
  const cacheControl = [".html", ".js", ".mjs", ".json"].includes(path.extname(realFilePath).toLowerCase())
    ? "no-store"
    : "public, max-age=3600";

  const headers = {
    "Content-Type": contentTypeFor(realFilePath),
    "Content-Length": stat.size,
    "Cache-Control": cacheControl,
    "X-Content-Type-Options": "nosniff",
  };
  if (content && path.basename(realFilePath) === "review.json") headers.ETag = revisionTag(content);
  response.writeHead(200, headers);

  if (method === "HEAD") {
    response.end();
    return;
  }

  response.end(content);
}

export function createReviewServer({ validate, rootDirectory = projectRoot, reviewFile = reviewPath }) {
  const resolvedRoot = path.resolve(rootDirectory);
  const resolvedReviewFile = path.resolve(reviewFile);
  if (!isInsideProject(resolvedReviewFile, resolvedRoot)) {
    throw new TypeError("The review file must be inside the served project root.");
  }
  const realRoot = fs.realpath(resolvedRoot);
  let writeQueue = Promise.resolve();

  return http.createServer(async (request, response) => {
    const method = request.method ?? "GET";
    const expectedHost = `${host}:${request.socket.localPort}`;
    if (request.headers.host !== expectedHost) {
      sendText(response, 403, "Ungültiger Host.");
      return;
    }

    let pathname;

    try {
      pathname = new URL(request.url ?? "/", `http://${host}`).pathname;
    } catch {
      sendText(response, 400, "Ungültige Anfrage.");
      return;
    }

    if (method === "POST") {
      if (pathname !== "/review.json") {
        sendJson(response, 405, { ok: false, error: "Nur POST /review.json ist erlaubt.", issues: [] });
        return;
      }
      const expectedOrigin = `http://${expectedHost}`;
      const contentType = request.headers["content-type"] ?? "";
      if (request.headers.origin !== expectedOrigin || !/^application\/json(?:\s*;|$)/i.test(contentType)) {
        sendJson(response, 403, { ok: false, error: "Nur gleich-originige JSON-Speicheranfragen sind erlaubt.", issues: [] });
        return;
      }
      const expectedRevision = request.headers["if-match"];
      if (typeof expectedRevision !== "string" || !/^"[a-f0-9]{64}"$/.test(expectedRevision)) {
        sendJson(response, 428, { code: "REVIEW_REVISION_REQUIRED", ok: false, error: "Zum Speichern ist eine aktuelle review.json-Revision erforderlich.", issues: [] });
        return;
      }

      let body;
      try {
        body = await readBody(request, maxBodyBytes);
      } catch (error) {
        console.error(`[review] rejected save: ${error.message}`);
        sendJson(response, 413, { ok: false, error: error.message, issues: [] });
        return;
      }

      try {
        // Serialize writes so two overlapping requests cannot interleave. The
        // stored queue swallows failures, otherwise one write error would
        // poison every later write.
        const pending = writeQueue.then(async () => {
          let current;
          try {
            current = await fs.readFile(resolvedReviewFile);
          } catch (error) {
            if (error.code !== "ENOENT") throw error;
            return { statusCode: 409, code: "REVIEW_FILE_MISSING", revision: null };
          }
          const revision = revisionTag(current);
          if (revision !== expectedRevision) return { statusCode: 409, code: "STALE_REVIEW_FILE", revision };

          const result = await saveReviewBody({ body, validate, targetPath: resolvedReviewFile });
          return {
            ...result,
            statusCode: result.ok ? 200 : 400,
            revision: result.ok ? revisionTag(serializeReviewData(result.data)) : revision,
          };
        });
        writeQueue = pending.catch(() => undefined);
        const result = await pending;

        if (result.statusCode === 409) {
          sendJson(response, 409, {
            code: result.code,
            ok: false,
            error: result.code === "STALE_REVIEW_FILE"
              ? "review.json wurde zwischenzeitlich geändert. Die neue Fassung wird geladen; prüfe mögliche Kommentar-Konflikte."
              : "review.json ist nicht mehr vorhanden.",
            issues: [],
          }, result.revision ? { ETag: result.revision } : {});
          return;
        }

        if (!result.ok) {
          console.error(`[review] rejected save (${result.issues.length} issue(s)):\n- ${result.issues.join("\n- ")}`);
          sendJson(response, 400, {
            ok: false,
            error: "review.json wurde nicht geschrieben: Daten verletzen schemas/review.schema.json.",
            issues: result.issues,
          });
          return;
        }

        console.log(`[review] saved ${result.count} entries to ${path.relative(resolvedRoot, resolvedReviewFile)} at ${new Date().toISOString()}`);
        sendJson(response, 200, { ok: true, entries: result.count }, { ETag: result.revision });
      } catch (error) {
        console.error(`[review] save failed: ${error.message}`);
        sendJson(response, 500, { ok: false, error: `Schreiben fehlgeschlagen: ${error.message}`, issues: [] });
      }

      return;
    }

    if (method !== "GET" && method !== "HEAD") {
      sendJson(response, 405, { ok: false, error: `Methode ${method} ist nicht erlaubt.`, issues: [] });
      return;
    }

    try {
      await serveStatic(response, pathname, method, resolvedRoot, await realRoot);
    } catch (error) {
      console.error(`[review] request failed for ${pathname}: ${error.message}`);
      if (!response.headersSent) sendText(response, 500, "Interner Fehler.");
      else response.end();
    }
  });
}

function parsePort(value, source) {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Ungültiger Port aus ${source}: ${value}`);
  }
  return port;
}

function readPort(args, environment) {
  const index = args.findIndex(argument => argument === "--port" || argument.startsWith("--port="));

  if (index !== -1) {
    const argument = args[index];
    const raw = argument.includes("=") ? argument.slice(argument.indexOf("=") + 1) : args[index + 1];
    if (raw === undefined || raw === "") throw new Error("--port braucht einen Wert, z. B. --port 9000.");
    return parsePort(raw, "--port");
  }

  if (environment.PORT !== undefined && environment.PORT !== "") return parsePort(environment.PORT, "PORT");

  return defaultPort;
}

async function start() {
  const port = readPort(process.argv.slice(2), process.env);
  const schema = JSON.parse(await fs.readFile(schemaPath, "utf8"));
  const validate = createReviewValidator(schema);
  const server = createReviewServer({ validate });

  server.on("error", error => {
    if (error.code === "EADDRINUSE") {
      console.error(`[review] port ${port} is already in use. Start with another port: pnpm run review:serve -- --port 9000`);
    } else {
      console.error(`[review] server error: ${error.message}`);
    }
    process.exitCode = 1;
  });

  server.listen(port, host, () => {
    console.log(`[review] serving ${projectRoot}`);
    console.log(`[review] open http://${host}:${port}/review.html`);
    console.log(`[review] auto-save endpoint: POST http://${host}:${port}/review.json`);
  });

  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.on(signal, () => {
      console.log(`[review] received ${signal}, shutting down`);
      server.close(() => process.exit(0));
    });
  }
}

const invokedDirectly = process.argv[1] !== undefined
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedDirectly) {
  await start();
}
