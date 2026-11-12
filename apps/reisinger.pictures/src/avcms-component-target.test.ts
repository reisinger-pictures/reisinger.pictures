import { readFileSync } from "node:fs";
import { mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { createEditorServer } from "@all-the.rest/astro-visual-cms/server";
import { describe, expect, it } from "vitest";

type EditorTarget = {
  id: string;
  projectRoot: string;
  filePath: string;
  importSource: string;
  idProp: string;
  fields: { name: string; type: string; values?: string[] }[];
};

type EditorConfig = {
  port: number;
  sitePort: number;
  previewRoutes: { id: string; label: string; path: string }[];
  mdxComponentTargets: EditorTarget[];
};

const editorConfig = JSON.parse(readFileSync(resolve(process.cwd(), "avcms-editor.json"), "utf8")) as EditorConfig;

/** Mirrors the real `akt.mdx` invocation, including the nested wrapper and the opaque message. */
const syntheticSource = `import ContactCTA from "@reisinger/shared/components/ContactCTA.astro";

<div class="flex justify-center my-8">
  <ContactCTA design="primary" text="Synthetischer Akt-CTA" subjectPrefix="AKT"
              message={"Synthetische Nachricht"} />
</div>
`;

async function readJson(response: Response): Promise<Record<string, unknown>> {
  return (await response.json()) as Record<string, unknown>;
}

describe("astro-visual-cms component target", () => {
  it("previews the configured ContactCTA props without writing the target file", async () => {
    const root = await realpath(await mkdtemp(join(await realpath(tmpdir()), "avcms-target-")));
    const targetPath = join(root, "akt.mdx");
    const contentConfigPath = join(root, "content.config.ts");
    await writeFile(targetPath, syntheticSource);
    await writeFile(contentConfigPath, "export const collections = {};\n");

    const configured = editorConfig.mdxComponentTargets[0];
    const server = createEditorServer({
      port: 0,
      sitePort: editorConfig.sitePort,
      projectRoot: root,
      contentConfigPath,
      fixturePath: targetPath,
      previewRoutes: editorConfig.previewRoutes,
      mdxComponentTargets: [{ ...configured, projectRoot: root, filePath: targetPath }]
    });

    try {
      await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
      const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
      const session = await readJson(await fetch(`${origin}/api/session`));
      const headers = {
        origin,
        "content-type": "application/json",
        "x-editor-token": String(session.token)
      };

      const state = await readJson(await fetch(`${origin}/api/mdx-components`, { headers: { origin } }));
      const target = (state.targets as { id: string; supported: boolean; hash: string; instances: unknown[] }[])[0];
      expect(state.configured).toBe(true);
      expect(target).toMatchObject({
        id: "akt-contact-cta",
        supported: true,
        instances: [{ id: "AKT", props: { design: "primary", text: "Synthetischer Akt-CTA" } }]
      });

      const preview = await fetch(`${origin}/api/mdx-components/preview`, {
        method: "POST",
        headers,
        body: JSON.stringify({ targetId: target.id, instanceId: "AKT", prop: "design", value: "outline", hash: target.hash })
      });
      expect(preview.status).toBe(200);
      expect(await readJson(preview)).toMatchObject({
        diff: { before: '"primary"', after: '"outline"' }
      });

      const invalid = await fetch(`${origin}/api/mdx-components/preview`, {
        method: "POST",
        headers,
        body: JSON.stringify({ targetId: target.id, instanceId: "AKT", prop: "design", value: "ghost", hash: target.hash })
      });
      expect(invalid.status).toBe(422);
      expect(await readJson(invalid)).toMatchObject({ code: "UNSUPPORTED_VALUE" });

      const unconfigured = await fetch(`${origin}/api/mdx-components/preview`, {
        method: "POST",
        headers,
        body: JSON.stringify({ targetId: target.id, instanceId: "AKT", prop: "message", value: "Neu", hash: target.hash })
      });
      expect(unconfigured.status).toBe(422);
      expect(await readJson(unconfigured)).toMatchObject({ code: "UNSUPPORTED_VALUE" });

      const unauthenticated = await fetch(`${origin}/api/mdx-components/preview`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ targetId: target.id, instanceId: "AKT", prop: "text", value: "Neu", hash: target.hash })
      });
      expect(unauthenticated.status).toBe(403);

      const foreignOrigin = await fetch(`${origin}/api/mdx-components/preview`, {
        method: "POST",
        headers: { ...headers, origin: "http://evil.example" },
        body: JSON.stringify({ targetId: target.id, instanceId: "AKT", prop: "text", value: "Neu", hash: target.hash })
      });
      expect(foreignOrigin.status).toBe(403);

      const previewBody = await readJson(
        await fetch(`${origin}/api/mdx-components/preview`, {
          method: "POST",
          headers,
          body: JSON.stringify({ targetId: target.id, instanceId: "AKT", prop: "text", value: "Anderer Text", hash: target.hash })
        })
      );
      const commit = await fetch(`${origin}/api/mdx-components/commit`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          previewId: previewBody.previewId,
          targetId: target.id,
          instanceId: "AKT",
          prop: "text",
          value: "Anderer Text",
          hash: target.hash
        })
      });
      expect(commit.status).toBe(409);
      expect(await readJson(commit)).toMatchObject({ code: "SOURCE_REPLACEMENT_DISABLED" });
      expect(await readFile(targetPath, "utf8")).toBe(syntheticSource);
    } finally {
      server.closeAllConnections?.();
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await rm(root, { recursive: true, force: true });
    }
  });
});
