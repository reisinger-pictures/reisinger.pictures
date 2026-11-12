import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { reviewPort } from "../../../tests/screenshots/ui-review.helpers";
import { e2ePreviewPort } from "../e2e/preview-server.helpers";

type EditorField = {
  name: string;
  type: string;
  label?: string;
  values?: string[];
};

type EditorTarget = {
  id: string;
  projectRoot: string;
  filePath: string;
  importSource: string;
  idProp: string;
  fields: EditorField[];
};

type PreviewRoute = {
  id: string;
  label?: string;
  path: string;
};

type EditorConfig = {
  port: number;
  sitePort: number;
  projectRoot: string;
  contentConfigPath: string;
  fixturePath: string | null;
  previewRoutes: PreviewRoute[];
  mdxComponentTargets: EditorTarget[];
  [key: string]: unknown;
};

const editorConfig = JSON.parse(readFileSync(resolve(process.cwd(), "avcms-editor.json"), "utf8")) as EditorConfig;
const appPackage = JSON.parse(readFileSync(resolve(process.cwd(), "package.json"), "utf8")) as {
  scripts: Record<string, string>;
};
const astroConfig = readFileSync(resolve(process.cwd(), "astro.config.mjs"), "utf8");
const contactCta = readFileSync(resolve(process.cwd(), "../../packages/shared/components/ContactCTA.astro"), "utf8");

/** Design union from the component's own `Props` interface. */
function contactCtaDesignValues(): string[] {
  const declaration = /design\?:\s*("[^;]+);/.exec(contactCta)?.[1];
  if (!declaration) throw new Error("ContactCTA.astro no longer declares an optional design prop.");
  return [...declaration.matchAll(/"([^"]+)"/g)].map((match) => match[1]);
}

describe("astro-visual-cms trusted editor configuration", () => {
  it("keeps only trusted, unique same-origin preview routes", () => {
    const ids = editorConfig.previewRoutes.map((route) => route.id);
    const paths = editorConfig.previewRoutes.map((route) => route.path);

    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(paths).size).toBe(paths.length);
    for (const route of editorConfig.previewRoutes) {
      expect(route.id).toMatch(/^[\w-]{1,64}$/);
      expect(route.path.startsWith("/")).toBe(true);
      expect(route.path.startsWith("//")).toBe(false);
      expect(route.path.split("/")).not.toContain("..");
    }
  });

  it("maps the real Akt target to the /shootings/akt/ preview route", () => {
    expect(editorConfig.previewRoutes).toContainEqual({
      id: "shootings-akt",
      label: "Shooting Akt",
      path: "/shootings/akt/"
    });
  });

  it("configures exactly one real ContactCTA prop target on akt.mdx", () => {
    expect(editorConfig.mdxComponentTargets).toHaveLength(1);
    expect(editorConfig.mdxComponentTargets[0]).toMatchObject({
      id: "akt-contact-cta",
      projectRoot: ".",
      filePath: "src/content/privateAreas/akt.mdx",
      importSource: "@reisinger/shared/components/ContactCTA.astro",
      idProp: "subjectPrefix"
    });
    expect(contactCta).toContain('import { type ContactFormPrefill, generateContactLink }');
    expect(contactCta).toContain('subjectPrefix?: ContactFormPrefill["subject_prefix"];');
  });

  it("allows only text and the component's own design union", () => {
    const fields = editorConfig.mdxComponentTargets[0].fields;

    expect(fields.map((field) => [field.name, field.type])).toEqual([
      ["text", "string"],
      ["design", "enum"]
    ]);
    const design = fields.find((field) => field.name === "design");
    expect(design?.values).toEqual(contactCtaDesignValues());
    expect(contactCtaDesignValues()).toEqual(["primary", "outline", "elegant-link"]);
  });

  it("leaves unsupported adapters disabled", () => {
    expect(editorConfig.mdxBlockTargets).toBeUndefined();
    expect(editorConfig.mdxParagraphTargets).toBeUndefined();
    expect(editorConfig.markdownDraftTargets).toBeUndefined();
    expect(editorConfig.astroGalleryTargets).toBeUndefined();
  });

  it("explicitly disables the unused demo gallery fixture", () => {
    expect(editorConfig.fixturePath).toBeNull();
  });

  it("keeps the editor port distinct from the site and test-harness ports", () => {
    // The E2E preview and the UI-review/contrast harness own their own ports;
    // the editor must never take one of them (or the site port) by default.
    expect(editorConfig.port).not.toBe(editorConfig.sitePort);
    expect(editorConfig.port).not.toBe(e2ePreviewPort());
    expect(editorConfig.port).not.toBe(reviewPort());
    expect(editorConfig.sitePort).not.toBe(e2ePreviewPort());
    expect(editorConfig.sitePort).not.toBe(reviewPort());
    expect(e2ePreviewPort()).not.toBe(reviewPort());
  });

  it("pins dev and editor ports so they cannot silently collide", () => {
    expect(editorConfig.port).toBe(4323);
    expect(editorConfig.sitePort).toBe(4321);
    expect(appPackage.scripts.dev).toContain("--port 4321");
    // Astro's CLI has no --strictPort flag; Vite's option is the acting guard.
    expect(appPackage.scripts.dev).not.toContain("--strictPort");
    expect(astroConfig).toContain("strictPort: true");
    expect(astroConfig).toContain("createLoopbackDevIntegration");
    expect(astroConfig).toContain("editorConfig.previewRoutes");
    expect(appPackage.scripts["cms:editor"]).toContain("--config ./avcms-editor.json");
  });
});
