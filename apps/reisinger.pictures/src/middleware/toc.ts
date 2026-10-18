import { extname } from "node:path";

import { defineMiddleware } from "astro:middleware";
import { JSDOM, VirtualConsole } from "jsdom";

// No template emits the ToC placeholder any more: a page gets a table of
// contents only where the author wrote `<TableOfContents />` (which renders
// `<div data-toc>`) — see `src/components/TableOfContents.astro` and
// `rules/12-table-of-contents.md`. This middleware stays the single generator.

/**
 * Definiert die rekursive Struktur für einen Überschriftenknoten.
 */
type HeadingNode = {
  name: string;
  link: string;
  children?: HeadingNode[];
};

/**
 * Parst einen HTML-String, extrahiert Überschriften (H2-H6) und
 * erstellt eine verschachtelte Baumstruktur basierend auf ihrer Hierarchie.
 * @param htmlString - Der zu parsende HTML-Inhalt.
 * @returns Ein Array von HeadingNode-Objekten der obersten Ebene.
 */
export function parseHeadings(htmlString: string): HeadingNode[] {
  // Verwenden Sie JSDOM, um den HTML-String in einer Node.js-Umgebung zu parsen.
  const virtualConsole = new VirtualConsole();
  virtualConsole.forwardTo(console, { jsdomErrors: "none" });
  virtualConsole.on("jsdomError", (err) => {
    if (err.message !== "Could not parse CSS stylesheet") {
      console.error(err);
    }
  });
  const dom = new JSDOM(htmlString, { virtualConsole });
  const doc = dom.window.document;
  // Restrict the search to the element that wraps the ToC placeholder (the
  // article/content container). Parsing the whole document let any later
  // `h2[id]` outside the article silently join the ToC; the footer stays
  // excluded as well (see rules/10-ui-review-findings.md §10).
  const scope = doc.querySelector("[data-toc]")?.parentElement ?? doc.body;
  const headings = scope.querySelectorAll(":is(h2, h3, h4, h5, h6)[id]:not(footer *)");

  const tree: HeadingNode[] = [];
  // Ein Stack, um den Überblick über den aktuellen übergeordneten Knoten zu behalten.
  // Speichert sowohl die Ebene als auch den Knoten selbst.
  const parentStack: { level: number; node: HeadingNode }[] = [];

  headings.forEach(heading => {
    const level = parseInt(heading.tagName.substring(1));
    const name = heading.textContent?.trim() || "";
    const slug = encodeURIComponent(heading.id);

    const node: HeadingNode = {
      name: name,
      link: `#${slug}`,
      children: []
    };

    // Dies ist die Kernlogik:
    // Elemente vom Stack entfernen, bis das oberste Element ein direktes übergeordnetes Element des aktuellen Knotens ist.
    while (parentStack.length > 0 && parentStack[parentStack.length - 1].level >= level) {
      parentStack.pop();
    }

    // Das neue übergeordnete Element befindet sich nun oben auf dem Stack.
    const parent = parentStack.length > 0 ? parentStack[parentStack.length - 1].node : null;

    if (parent) {
      // Wenn kein children-Array vorhanden ist, initialisieren Sie es.
      parent.children ??= [];
      parent.children.push(node);
    } else {
      // Wenn es kein übergeordnetes Element gibt, ist es ein Knoten der obersten Ebene in unserer Struktur.
      tree.push(node);
    }

    // Den aktuellen Knoten auf den Stack legen, damit nachfolgende Knoten ihn verwenden können.
    parentStack.push({ level, node });
  });

  return tree;
}

/**
 * Recursively generates HTML list items from an array of heading nodes.
 * @param {HeadingNode[]?} nodes - The array of nodes to process.
 * @returns {string} The generated HTML string of <li> elements.
 */
function createTocItems(nodes?: HeadingNode[]): string {
  // If there are no nodes, return an empty string.
  if (!nodes || nodes.length === 0) {
    return "";
  }

  // Use reduce to build the HTML string for the current level.
  return nodes.reduce((html, node) => {
    // Recursively generate the HTML for any children.
    const childrenHtml = (node.children?.length ?? 0) > 0 ? `<ul>${createTocItems(node.children)}</ul>` : "";

    // Append the current item and its nested children list (if any). The
    // children need their own <ul>: without it the markup was
    // `<li><a>…</a><li>…</li></li>`, which no parser accepts — the browser
    // flattened the hierarchy (rules/10-ui-review-findings.md §10).
    return html + `<li><a href="${node.link}">${node.name}</a>${childrenHtml}</li>`;
  }, "");
}

export const onRequest = defineMiddleware(async (context, next) => {
  const response = await next();
  const { pathname } = context.url;

  // Combine all checks for a robust filter
  const isInternalAstroRoute = pathname.startsWith("/_");
  const isApiRoute = pathname.startsWith("/api/");
  const hasFileExtension = extname(pathname) !== "";

  // If it's ANY of these, it's not a standard page, so we skip our logic.
  if (isInternalAstroRoute || isApiRoute || hasFileExtension) {
    return response;
  }

  const html = await response.text();
  const tocRegex = /<div data-toc[^>]*>\s*<\/div>/;

  function generateTableOfContents() {
    const nodes = parseHeadings(html);
    if (nodes.length === 0) {
      return "";
    }
    // Mark the block up as a navigation landmark tied to its heading; child
    // entries are wrapped in their own <ul> so the nesting is real
    // (rules/10-ui-review-findings.md §10).
    return `<nav aria-labelledby="toc-heading"><h2 id="toc-heading" class="text-left">Inhaltsverzeichnis</h2><ul>${createTocItems(nodes)}</ul></nav>`;
  }

  const processedString = html.replace(tocRegex, generateTableOfContents);

  return new Response(processedString, {
    status: 200,
    headers: response.headers
  });
});