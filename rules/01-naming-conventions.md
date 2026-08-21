# Namenskonventionen & Fallbacks

## Team-Abkürzungen: BWL vs. SKV
- **Eishockey (Black Wings Linz):** Nutzt das Kürzel `bwl` durchgehend (sowohl in `areas/sport/bwl.md` als auch in den `einblicke`-Ordnern).
- **Fußball (Blau-Weiß Linz):** Nutzt für die Landingpage (Areas) das Kürzel `skv` (`areas/sport/skv.md`), um URL-Konflikte zu vermeiden. In den `einblicke`-Ordnern (z.B. `grunddurchgang-12-bwl-ask`) wird es hingenommen, da die Namen ohnehin hardcoded im Frontmatter der MDX-Dateien stehen.
- **Logos:** Es werden **keine** Vereinslogos mehr verwendet (Markenrecht).
- **KISS-Prinzip:** Keine komplexen Resolver-Funktionen in `utils.ts`. Frontmatter-Titel und klare Area-Pfade (`/sport/bwl` vs `/sport/skv`) reichen aus.

## Gleicher Dateiname in mehreren Event-Ordnern (Slug-Kollision)
- Derselbe Basisname kann in unterschiedlichen Galerien ein **verschiedenes Bild** bezeichnen. Realfälle aus dem Audit 08/2026: `portrait-sean-collins.jpg` in `s8-bwl-rbs/gallery/` UND `s13-bwl-g99/gallery/` (zwei verschiedene Spieler-Fotos); `logan-roe-am-puck.jpg` in `s8-bwl-rbs/gallery/` UND `s16-bwl-vic/`.
- **Konsequenz 1 – Umbenennen:** Nur die Datei umbenennen, deren voller Pfad in der Review-Datenquelle (`review.json` → `bild`) steht. Vorher prüfen, dass `finalerDateiname` im Zielordner nicht bereits existiert (sonst Überschreiben-Gefahr) → bei Kollision kollisionsfreien Namen wählen.
- **Konsequenz 2 – Slug-Referenzen:** Beim Nachziehen der Slug-Referenzen (`index.mdx`-Galerien, `areas/*.mdx`, `heroImage`) **niemals** den nackten Basisnamen global ersetzen – nur den vollen Slug mit Ordner-Präfix. Danach alle Referenzen der betroffenen Dateien gegen die vorhandenen YAML-Slugs validieren (0 Treffer ohne YAML, keine Duplikate in Galerie-Listen).
- **Konsequenz 3 – Build:** Nach Umbenennungen immer den vollen `pnpm run prebuild` laufen lassen (auch `process-images.mjs`), damit `.imagedist/manifest.json` die neuen Slugs enthält; erst nach grünem Build (`check_links`: „No missing links found!") deployen.
