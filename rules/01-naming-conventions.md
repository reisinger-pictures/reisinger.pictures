# Namenskonventionen & Fallbacks

## Team-Abkürzungen: BWL vs. SKV
- **Eishockey (Black Wings Linz):** Nutzt das Kürzel `bwl` durchgehend (sowohl in `areas/sport/bwl.md` als auch in den `einblicke`-Ordnern).
- **Fußball (Blau-Weiß Linz):** Nutzt für die Landingpage (Areas) das Kürzel `skv` (`areas/sport/skv.md`), um URL-Konflikte zu vermeiden. In den `einblicke`-Ordnern (z.B. `grunddurchgang-12-bwl-ask`) wird es hingenommen, da die Namen ohnehin hardcoded im Frontmatter der MDX-Dateien stehen.
- **Logos:** Es werden **keine** Vereinslogos mehr verwendet (Markenrecht).
- **KISS-Prinzip:** Keine komplexen Resolver-Funktionen in `utils.ts`. Frontmatter-Titel und klare Area-Pfade (`/sport/bwl` vs `/sport/skv`) reichen aus.

## Personennamen: Aufstellungsdaten schlagen die Ticker-Schreibweise
- Weichen offizielle Aufstellungsdaten und Live-Ticker in der Schreibweise eines Namens voneinander ab, gilt die **Aufstellung** als Quelle; im Artikel, in Bildbeschreibungen und in Dateinamen wird **nur eine Form** verwendet (nie gemischt).
- Realfall 2026-10-15 (`aut-kos-2026-2`): Aufstellung „Kirchberger" vs. Ticker „Kirchberger-Prohaska" → durchgehend „Kirchberger".
- Die abweichende Form nicht als Fehler „korrigieren" und nicht erneut abwägen: Sobald die Aufstellung die Form belegt, bleibt sie gesetzt.
- **A clearly readable shirt name takes precedence over a conflicting team roster entry.** This is separate from the official-lineup-over-live-ticker spelling rule above. Use the shirt name in the article and image descriptions when it is clear in the image. Briefly mention the discrepancy in the review comment only; do not log it in project documentation. Real case (`matchday-2-ask-liv`): shirt “TORNICH 43” vs. roster “43 – Alemão” → use “Tornich (43)”. If the shirt name is unreadable, identify a player by number only when the number is confidently recognized, the team is clearly identified, and that team's roster/jersey-number assignment has been manually verified or corrected. An owner-provided number may be used when the team is clear. If the number, team, or assignment is uncertain, do not guess: ask for clarification or use the number alone.
- **A captain's armband is never identity evidence on its own.** Do not infer a name solely from the armband. A name requires a confidently identified number, clear team context, and manual verification of the team's jersey-number assignment. Past error (2026-10-16): “16 → Andrade” was mistaken; the owner review and second vision pass confirmed “25 Dibango”.

## Ablage: Bilder und `index.mdx` im selben Ordner (kein `gallery/`-Unterordner mehr)
- Jeder Event-/Trips-Ordner enthält `index.mdx` **und** alle Bilder samt YAML-Sidecars direkt nebeneinander. Ein zusätzlicher `gallery/`-Unterordner wie in älteren Events (z.B. `trips/2025/prag/gallery/`) ist **veraltet** und wird nicht mehr angelegt.
- Der Slug ergibt sich aus dem Ordnerpfad: `portfolio/trips/2026/prag/<name>.jpg` → `trips-2026-prag-<name>`.
- Umbenennungen und Sidecar-Beschreibungen werden über `pnpm run review:apply <event-ordner>` angewendet (siehe unten).

## Review anwenden (`review:apply`)
- `pnpm run review:validate` prüft `review.json` gegen `schemas/review.schema.json`, bevor etwas angewendet wird.
- `pnpm run review:apply <ziel-ordner> [review-datei]` (Zielordner relativ zum Repo-Root, Standard-Datei `review.json`) benennt `bild` → `<ziel-ordner>/<finalerDateiname>` um und schreibt/aktualisiert im Sidecar **nur** `description`; `slug`, `metadata` und `categories` erzeugt weiterhin `add-metadata.mjs`. Das Skript ist idempotent und aktualisiert `bild` in der Review-Datei auf den neuen Pfad.
- `review*.json` ist lokal und wird nicht committet; `review.html` bleibt der feste Viewer.
- `reviewComment` is an optional per-image field in `review.json`. It is internal evidence only: it never reaches published text, filenames, YAML sidecars, or articles.
- `review-viewer.js` must be served alongside `review.html` over HTTP (never `file://`), because the viewer is now an ES module.
- The viewer only reads `review.json`: it loads the file and polls it every 2 s, and it never writes it. Saving stays an explicit `Download aktualisierte review.json` plus manually replacing the local, ignored `review.json`; the static page cannot overwrite its own source.
- Unresolved comment conflicts (a local comment edited while the remote file changed, or an entry removed remotely) block the export until the reviewer decides which version wins.
- `pnpm run review:unit` runs the viewer helper tests (`node --test tests/review-viewer.test.mjs`).

## Gleicher Dateiname in mehreren Event-Ordnern (Slug-Kollision)
- Derselbe Basisname kann in unterschiedlichen Galerien ein **verschiedenes Bild** bezeichnen. Realfälle aus dem Audit 08/2026: `portrait-sean-collins.jpg` in `s8-bwl-rbs/gallery/` UND `s13-bwl-g99/gallery/` (zwei verschiedene Spieler-Fotos); `logan-roe-am-puck.jpg` in `s8-bwl-rbs/gallery/` UND `s16-bwl-vic/`.
- **Konsequenz 1 – Umbenennen:** Nur die Datei umbenennen, deren voller Pfad in der Review-Datenquelle (`review.json` → `bild`) steht. Vorher prüfen, dass `finalerDateiname` im Zielordner nicht bereits existiert (sonst Überschreiben-Gefahr) → bei Kollision kollisionsfreien Namen wählen.
- **Konsequenz 2 – Slug-Referenzen:** Beim Nachziehen der Slug-Referenzen (`index.mdx`-Galerien, `areas/*.mdx`, `heroImage`) **niemals** den nackten Basisnamen global ersetzen – nur den vollen Slug mit Ordner-Präfix. Danach alle Referenzen der betroffenen Dateien gegen die vorhandenen YAML-Slugs validieren (0 Treffer ohne YAML, keine Duplikate in Galerie-Listen).
- **Konsequenz 3 – Build:** Nach Umbenennungen immer den vollen `pnpm run prebuild` laufen lassen (auch `process-images.mjs`), damit `.imagedist/manifest.json` die neuen Slugs enthält; erst nach grünem Build (`check_links`: „No missing links found!") deployen.
