# Regel 03 – Bild-CDN (images.reisinger.pictures) & Caddy-Konfiguration

## Kontext
Bilder werden im Astro-Build nach `.imagedist/` geschrieben und via `rclone` auf den
Remote `reisinger.pictures:/images.reisinger.pictures` (Server-Pfad
`/srv/websites/images.reisinger.pictures`) hochgeladen. Ausgeliefert werden sie über
Caddy (Subdomain `images.reisinger.pictures`) – kein nginx-Container mehr.

## Gelungsregeln
- **Caching:** Alle Bildassets (`.webp`, `.avif`, `.jpg`, `.jpeg`, `.png`, `.gif`,
  `.svg`) sowie `/_astro/*` werden mit `public, max-age=31536000, immutable` ausgeliefert.
  Astro benennt Assets hash-basiert, daher ist langes Cache sicher.
- **Kein Cache:** `.html`, Root (`/`) und 404-Antworten erhalten `no-cache`,
  `no-store`, `must-revalidate` (über den `(cdn)`-Snippet in der Caddyfile).
- **404-Verhalten bei direkten Zugriffen:** Reines `404` ohne Redirect. Ein CDN liefert
  keine schöne 404-Seite aus – Bilder werden ohnehin nur per Hash-URL referenziert.
- **Struktur:** Die Caddy-Konfiguration nutzt einen wiederverwendbaren `(cdn)`-Snippet.
  Inline-Duplikate des Caching-Blocks sind verboten.

## SVG-Unterstützung (Vereins-Logos)
Die Bild-Pipeline unterstützt seit 2026-08 auch SVG-Quellen (z. B. Vereins-Logos):
- **Slug-Map:** `apps/reisinger.pictures/vite-plugin-image-meta.mjs` (`IMAGE_RE`) enthält `.svg` → SVG-Dateien mit Companion-YAML-Slug werden wie Rasterbilder in `virtual:image-slug-map` registriert.
- **Dev:** Astro rasiert SVG via Sharp-Dienst (`image.dangerouslyProcessSVG: true` in `astro.config.mjs`) zu WebP.
- **Build/CDN:** `packages/tools/scripts/process-images.mjs` (`IMAGE_EXTENSIONS`) rasiert SVG zu WebP-Varianten im `.imagedist`-Manifest; `ResponsiveImage` baut daraus die CDN-URL. Der Slug liegt unter `src/images/vereine/` (Beispiel: `bwl.svg` → Slug `vereine-bwl`).
- **Fingerprint migration:** The public `.imagedist/manifest.json` keeps its slug map and stores the full `@all-the.rest/astro-image-cdn` fingerprint in `hash`; `sourceHash` and `migrationProfile` gate safe reuse. Set `LEGACY_IMAGEDIST_DIR` to a separate, read-only legacy `.imagedist` directory to migrate from it. The process reads its manifest and variants but writes only to the current app worktree.
- **Variant validation:** A WebP is reusable only when it is a regular file, has the expected format/dimensions, and fully decodes. Corrupt current-profile outputs are never adopted or overwritten; a fingerprint collision with such an output fails safely and leaves the manifest and file unchanged.
- **0.2.3 → 0.3.0 compatibility:** Only a current `.imagedist/manifest.json` package entry may use this compatibility path. Its exact prior v1 profile (including SVG, transform, and the current locked Sharp/libvips versions), full `sourceHash`, 64-hex package fingerprint, and complete expected widths must match; every stored variant must be a regular, fully decodable WebP at its expected dimensions. Compatible variants are adopted under the new 0.3.0 fingerprint, while old files and any separate legacy `.imagedist` inputs remain untouched. Partial sets, invalid files, arbitrary profiles, and 16-character legacy hashes do not qualify. The 0.3.0 WebP and AVIF efforts are explicitly 4.
- **Deploy ordering:** `apps/reisinger.pictures/sync.sh` uploads image files without deleting old hashes, syncs the new site, then mirrors `.imagedist` with `--delete`. This keeps old page URLs available during the CDN/site cutover.

## Deployment / Validierung
- Validierung der Caddyfile vor jedem Reload mit einem temporären Container:
  ```bash
  docker run --rm -v "$(pwd)/Caddyfile:/etc/caddy/Caddyfile" caddy:latest \
    caddy validate --config /etc/caddy/Caddyfile
  ```
- Nach erfolgreicher Validierung: `docker compose -f deployment/docker-compose.yml up -d`
  (Container `caddy` lädt die Config automatisch neu, sofern Volume gemountet).
