import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { load as parseYaml } from "js-yaml";

const IMAGE_RE = /\.(jpe?g|png|gif|webp|svg)$/i;
const ALREADY_WRAPPED = "__imgMeta_";

const VIRTUAL_META_ID = "virtual:image-meta-index";
const RESOLVED_META_ID = "\0" + VIRTUAL_META_ID;
const VIRTUAL_SLUG_ID = "virtual:image-slug-map";
const RESOLVED_SLUG_ID = "\0" + VIRTUAL_SLUG_ID;

function loadCompanionYaml(imagePath) {
  const yamlPath = imagePath.replace(/\.\w+$/, ".yaml");
  try {
    return parseYaml(fs.readFileSync(yamlPath, "utf-8"));
  } catch {
    return {};
  }
}

function discoverFiles(dir, predicate) {
  const results = [];
  try {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== "node_modules") {
          results.push(...discoverFiles(fullPath, predicate));
        }
      } else if (predicate(entry.name)) {
        results.push(fullPath);
      }
    }
  } catch {}
  return results;
}

const isYaml = (name) => name.endsWith(".yaml");
const isImage = (name) => IMAGE_RE.test(name);

function isRelevantFile(filePath) {
  return isYaml(filePath) || isImage(filePath);
}

function relativeImagePath(imgPath) {
  return imgPath.replace(/^\//, "").replaceAll("\\", "/");
}

export default function imageMetaPlugin() {
  let metaCache = null;
  let slugCache = null;
  let rootDir = "";
  let isBuild = false;

  function buildMetaIndex(srcDir) {
    if (metaCache) return metaCache;
    const result = {};
    for (const filePath of discoverFiles(srcDir, isYaml)) {
      try {
        const data = parseYaml(fs.readFileSync(filePath, "utf-8"));
        if (data?.slug) {
          if (result[data.slug]) {
            console.warn(`[image-meta] Duplicate slug "${data.slug}" in ${filePath}`);
          }
          result[data.slug] = data;
        }
      } catch {}
    }
    metaCache = result;
    return result;
  }

  function buildSlugMap(srcDir) {
    if (slugCache) return slugCache;
    const result = {};
    const processed = new Set();
    for (const imgPath of discoverFiles(srcDir, isImage)) {
      const yamlData = loadCompanionYaml(imgPath);
      if (!yamlData?.slug) continue;
      if (processed.has(yamlData.slug)) {
        console.warn(`[image-meta] Duplicate slug "${yamlData.slug}" in ${imgPath}`);
        continue;
      }
      processed.add(yamlData.slug);
      const relative = path.relative(rootDir, imgPath);
      result[yamlData.slug] = "/" + relative;
    }
    slugCache = result;
    return result;
  }

  return {
    name: "image-meta",
    enforce: "post",

    configResolved(config) {
      rootDir = config.root || process.cwd();
      isBuild = config.command === "build";
    },

    resolveId(id) {
      if (id === VIRTUAL_META_ID) return RESOLVED_META_ID;
      if (id === VIRTUAL_SLUG_ID) return RESOLVED_SLUG_ID;
    },

    load(id) {
      if (id === RESOLVED_META_ID || id === RESOLVED_SLUG_ID) {
        const srcDir = path.resolve(rootDir, "src");
        this.addWatchFile(path.join(srcDir, "content"));
      }
      if (id === RESOLVED_META_ID) {
        const srcDir = path.resolve(rootDir, "src");
        return {
          code: `export default ${JSON.stringify(buildMetaIndex(srcDir))};`,
          map: null,
        };
      }
      if (id === RESOLVED_SLUG_ID) {
        const srcDir = path.resolve(rootDir, "src");
        const map = buildSlugMap(srcDir);
        if (isBuild) {
          // Builds only need the project-relative path: the CDN manifest is
          // keyed by it, so pages resolve a slug to its manifest entry without
          // bundling the source image itself.
          const entries = Object.entries(map)
            .map(([slug, imgPath]) => `${JSON.stringify(slug)}: { path: ${JSON.stringify(relativeImagePath(imgPath))} }`)
            .join(",\n");
          return {
            code: `export default {\n${entries}\n};`,
            map: null,
          };
        }
        const entries = Object.entries(map)
          .map(([slug, imgPath]) => [
            `${JSON.stringify(slug)}: {`,
            `path: ${JSON.stringify(relativeImagePath(imgPath))},`,
            `load: () => import(${JSON.stringify(imgPath)})`,
            "}",
          ].join(" "))
          .join(",\n");
        return {
          code: `export default {\n${entries}\n};`,
          map: null,
        };
      }
    },

    handleHotUpdate(ctx) {
      const file = ctx.file;
      if (!isRelevantFile(file)) return [];
      metaCache = null;
      slugCache = null;
      const updated = [];
      for (const id of [RESOLVED_META_ID, RESOLVED_SLUG_ID]) {
        const mod = ctx.server.moduleGraph.getModuleById(id);
        if (mod) {
          ctx.server.moduleGraph.invalidateModule(mod);
          updated.push(mod);
        }
      }
      return updated;
    },

    transform(code, id) {
      if (!IMAGE_RE.test(id)) return;
      if (!code.startsWith("export default ")) return;
      if (code.includes(ALREADY_WRAPPED)) return;

      const cleanId = id.split("?")[0];
      const yamlData = loadCompanionYaml(cleanId);

      const meta = {
        metadata: yamlData.metadata ?? null,
        slug: yamlData.slug ?? "",
        description: yamlData.description ?? "",
        darkInvert: yamlData.darkInvert ?? false,
        favorite: yamlData.favorite ?? false,
      };

      const hash = crypto
        .createHash("md5")
        .update(cleanId)
        .digest("hex")
        .slice(0, 8);

      return {
        code: [
          `const __imgMeta_${hash} = ${JSON.stringify(meta)};`,
          `const __imgVal_${hash} = ${code.slice("export default ".length)};`,
          `export default { ...__imgVal_${hash}, ...__imgMeta_${hash} };`,
        ].join("\n"),
        map: null,
      };
    },
  };
}
