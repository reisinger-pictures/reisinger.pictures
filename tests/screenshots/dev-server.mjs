// The Astro 7 CLI may hand off to a daemon. Its public dev() API keeps the
// server owned by Playwright, without CLI lock-file or background-process tricks.
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { reviewPort } from "./ui-review.helpers.ts";

const root = new URL("../../apps/reisinger.pictures/", import.meta.url);
const require = createRequire(new URL("package.json", root));
// Match `pnpm --filter reisinger.pictures dev`: image manifest/CDN paths are
// intentionally resolved relative to the app's working directory.
process.chdir(fileURLToPath(root));
const { dev } = await import(require.resolve("astro"));
let stopping = false;
let server;

async function stop() {
  stopping = true;
  if (server) await server.stop();
}

process.once("SIGTERM", () => { void stop(); });
process.once("SIGINT", () => { void stop(); });

server = await dev({
  root: fileURLToPath(root),
  server: { host: "localhost", port: reviewPort() },
  vite: { server: { strictPort: true } },
});
if (stopping) await server.stop();
else console.log(`[ui-review] owned server PID ${process.pid} at http://localhost:${server.address.port}`);
