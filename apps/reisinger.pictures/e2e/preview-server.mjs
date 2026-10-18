// The Astro 7 CLI auto-backgrounds `astro preview` when it detects an agent
// environment (am-i-vibing) and the CLI process then exits before Playwright
// considers the server started — that is the "Process from config.webServer
// exited early" failure. Astro's public preview() JS API keeps the preview
// server owned by this process instead of a CLI daemon.
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { e2ePreviewPort } from "./preview-server.helpers.ts";

const root = new URL("../", import.meta.url);
const require = createRequire(new URL("package.json", root));
// Match `pnpm --filter reisinger.pictures preview`: the static preview serves the
// app's built dist/ relative to the app's working directory.
process.chdir(fileURLToPath(root));
// The public JS API is marked experimental by Astro; re-check it on upgrades.
const { preview } = await import(require.resolve("astro"));
let stopping = false;
let server;

async function stop() {
  stopping = true;
  if (server) await server.stop();
}

process.once("SIGTERM", () => { void stop(); });
process.once("SIGINT", () => { void stop(); });

server = await preview({
  root: fileURLToPath(root),
  server: { host: "localhost", port: e2ePreviewPort() },
  // Vite preview silently picks the next free port unless strictPort is set.
  // The suite must bind exactly its port instead of testing a foreign server.
  vite: { preview: { strictPort: true } },
});
if (stopping) await server.stop();
else console.log(`[e2e] owned preview PID ${process.pid} at http://localhost:${server.port}`);
