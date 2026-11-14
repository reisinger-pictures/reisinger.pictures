# Regel 03 – Bild-CDN (images.reisinger.pictures) & Caddy-Konfiguration

## Kontext
Bilder werden im Astro-Build nach `.imagedist/` geschrieben und via `rsync` (siehe
`apps/reisinger.pictures/sync.sh`) auf den Remote `reisinger.pictures:` (Server-Pfad
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
- **Dev:** Astro rasiert SVG via Sharp-Dienst (`dangerouslyProcessSVG` aus `image-cdn-options.json`, von `astro.config.mjs` in `image.dangerouslyProcessSVG` gesetzt) zu WebP.
- **Build/CDN:** `packages/tools/scripts/process-images.mjs` ist ein dünner Wrapper um `processImages()` aus `@all-the.rest/astro-image-cdn` (keine eigene Bildlogik mehr). Prebuild und Integration lesen dieselbe `apps/reisinger.pictures/image-cdn-options.json`; nur so können Breiten/Formate/Efforts/`autoRotate`/SVG-Verarbeitung nicht auseinanderlaufen und abweichende Fingerprints erzeugen. `dangerouslyProcessSVG` steuert dort Astros `image.dangerouslyProcessSVG`, nicht ein Integrationsoption. Das Manifest ist pfad-keyed und privat (`.astro-image-cdn/manifest.json`); `src/images/image-manifest.ts` löst Slug → Pfad über `virtual:image-slug-map` auf, `ResponsiveImage` und `SchemaOrg` bauen die CDN-URL aus `variants[].file`. In `.imagedist/` liegen nur Varianten, kein öffentliches Manifest.
- **Warm-Lauf:** Das Manifest enthält Quell-Stat und Varianten-Stat; unveränderte Bilder werden ohne Sharp-Aufruf übersprungen. Die frühere Slug-Migration mit Profil-String entfällt — sie lief nur, weil das lokale Tool den Reuse-Zustand nicht selbst pflegte und das Manifest erst am Ende schrieb.
- **Scope:** `sources: ["src"]` lässt die Library **alle** Bilder unter `src/` verarbeiten, nicht nur die mit Slug-Sidecar (aktuell 7 Bilder ohne Sidecar in einem Event-Ordner). Sie stehen im Manifest und werden deshalb von Prune und Deployment mitgenommen; wer das nicht will, muss sie aus `src/` entfernen oder die Library-Scope-Frage dort lösen.
- **Variant validation:** A variant is reused only when the library's recorded size/mtime (or, on mismatch, its digest) still matches; corrupt outputs are encoded again.
- **Cleanup ownership:** Image and CDN handling belongs entirely to the library. Its variants are content-addressed and old files are intentionally kept, so `.imagedist` needs pruning before a deploy; until the package offers that API (all-the-rest/astro-image-cdn#10), the local `prune-imagedist.mjs` deletes unreferenced files and a leftover legacy `.imagedist/manifest.json` as a documented stopgap. Do not grow custom pipeline logic beyond that.
- **Deploy ordering:** `apps/reisinger.pictures/sync.sh` uploads image files without deleting old hashes, syncs the new site, then mirrors `.imagedist` with `--delete`. This keeps old page URLs available during the CDN/site cutover.

## Deployment / Validierung
- Validierung der Caddyfile vor jedem Reload mit einem temporären Container:
  ```bash
  docker run --rm -v "$(pwd)/Caddyfile:/etc/caddy/Caddyfile" caddy:latest \
    caddy validate --config /etc/caddy/Caddyfile
  ```
- Nach erfolgreicher Validierung: `docker compose -f deployment/docker-compose.yml up -d`
  (Container `caddy` lädt die Config automatisch neu, sofern Volume gemountet).
