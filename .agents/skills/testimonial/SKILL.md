---
name: testimonial
description: Erstellt neue Kunden-Testimonials (Bewertungen) für reisinger.pictures, bindet sie in Blog-Beiträge ein und aktualisiert Blog-Beiträge mit einem Testimonial. Deckt ab — ID-Namenskonvention (`sarahfrick3`), Frontmatter-Schema der Testimonial-Collection, Small-/Large-Bild-Logik (Small = Quadrat-Crop im Testimonial-Bildordner, Large = Hero-Image des Blog-Beitrags via Slug-Referenz), Datum = Shooting-Datum (Konvention), Einbindung per `TestimonialBlock`-Komponente im Portfolio-`index.mdx`. TRIGGER when ein neues Testimonial angelegt, ein Testimonial in einen Blog-Beitrag integriert oder ein bestehender Blog-Beitrag mit einem Testimonial aktualisiert werden soll.
---

# Testimonial: Anlegen, in Blog-Beitrag integrieren, Blog-Beitrag aktualisieren

## Rolle & Ziel

Du pflegst die Testimonial-Collection der Website. Eine Kundenbewertung gehört immer zu einem konkreten Shooting (Blog-Beitrag). Ziel ist ein konsistenter, reproduzierbarer Workflow:

1. **Neues Testimonial anlegen** (Markdown-Datei + Small-Avatar-Bild).
2. **In den zugehörigen Blog-Beitrag integrieren** (`TestimonialBlock`-Block im Portfolio-`index.mdx`).
3. **Blog-Beitrag mit einem Testimonial aktualisieren** (Text-/Bild-Änderungen propagieren, Referenzen pflegen).

## Struktur & Konventionen (verbindlich)

### Testimonial-Content

`apps/reisinger.pictures/src/content/testimonials/<id>.md`

- **`<id>`** = `[nachname][vorname][laufnummer]`, alles klein, ohne Umlaute (ä→ae, ö→oe, ü→ue, ß→ss). Laufnummer pro Person fortlaufend (erste = `1`). Beispiele: `sarahfrick1`, `sarahfrick2` → nächstes `sarahfrick3`.
- **Dateien mit `_`-Präfix** (z. B. `_mintha3.md`) sind **unsichtbar** – sie werden von der Collection ausgeschlossen (Glob `**/[^_]*.{md,mdx}`). Alte/ersetzte Testimonials werden so geparkt, statt gelöscht.
- **Frontmatter-Schema** (`src/content.config.ts`, Collection `testimonials`):

  ```yaml
  ---
  type: beauty            # Pflicht: akt | beauty | couples | sport
  name: Sarah Frick       # Pflicht: vollständiger Name
  date: 2026-07-10        # Pflicht: Datum des Shootings (= datum des Blog-Beitrags, KONVENTION)
  role: optional          # z. B. Vereinsrolle
  layout: default         # optional: default | quote
  rating: 100             # optional
  source: https://…       # optional: externe Quelle (z. B. Google-Rezension)
  large: <hero-slug>      # optional: verweist auf ein EXISTIERENDES Bild (z. B. Hero-Image des Blog-Beitrags)
  small: <slug>           # optional: eigener Small-Slug (default: <id>-small)
  imageFit: cover         # optional: cover | contain
  ---

  <Testimonial-Text auf Deutsch>
  ```

### Testimonial-Bilder

`apps/reisinger.pictures/src/images/testimonials/<id>/`

- **`small.jpg` + `small.yaml`**: Quadrat-Crop (1:1) für den Avatar, aus dem Hero-/Large-Bild geschnitten (Gesicht/Gesichtsausschnitt im Fokus). YAML-Slug = `<id>-small`, `description` = deutsche Porträt-Beschreibung. Nur `description` + `slug` selbst schreiben – `metadata`/`categories` kommen von `add-metadata.mjs` (Prebuild).
- **`large.jpg` + `large.yaml`**: NUR nötig, wenn kein bestehendes Bild referenziert wird. In der Regel entfällt sie: Für Blog-Beitrags-Testimonials wird im Frontmatter `large: <hero-slug>` gesetzt und das Hero-Image des Beitrags wiederverwendet (wie bei `sarahfrick2` → `large: beauty-sarah-home2025-portrait-rothaarig-intensiver-blick`).
- **Lookup-Logik** (`components/Review.astro` / `ReviewCard.astro`): `smallName = small ?? "<id>-small"`, `largeName = large ?? "<id>-large"`. Nicht vorhandene Bilder werden über `filterInvalidImageName`/`tryGetImage` still ignoriert.

### Weitere Integrationspunkte

- **Flächen-Seiten (Areas):** `src/content/areas/<area>.mdx` – Frontmatter-Array `testimonials: [<id>, …]` steuert die Featured-Bewertungen der Bereichsseite (Komponente `FeaturedTestimonials`).
- **Übersichtsseite:** `src/content/simple/testimonials.mdx` rendert automatisch **alle** sichtbaren Testimonials – keine Anpassung nötig.
- **Zähler:** `src/content/testimonialSummary.json` (`reviewCount` pro Kategorie + `general`). Bei neuen Testimonials die Zahl der passenden Kategorie (und `general`) erhöhen, wenn die Summen gepflegt werden.

## Workflow 1: Neues Testimonial anlegen

1. **ID bestimmen:** Vorhandene Dateien prüfen (`sarahfrick1`, `sarahfrick2` → `sarahfrick3`). Fortlaufende Nummer pro Person.
2. **Datum bestimmen:** = **Shooting-Datum**, identisch mit dem `date` des zugehörigen Blog-Beitrags (`index.mdx`-Frontmatter). Konvention, nicht das heutige Datum.
3. **Typ bestimmen:** `akt | beauty | couples | sport` – passend zur Area / zum Blog-Beitrag des Shootings.
4. **`large` bestimmen:** = **Hero-Image-Slug des Blog-Beitrags** (wiederverwendetes Bild, kein eigenes `large.jpg` nötig).
5. **Small-Bild erstellen:** Aus dem Hero-/Large-Bild einen **Quadrat-Crop (1:1)** schneiden (Gesicht fokussieren), als `src/images/testimonials/<id>/small.jpg` speichern. Dazu `small.yaml` mit `slug: <id>-small` + deutscher `description` anlegen.
6. **Testimonial-Datei schreiben:** `<id>.md` mit Frontmatter (siehe oben) und dem Testimonial-Text (Deutsch).
7. **Prebuild ausführen** (füllt `metadata`/`categories`, baut Image-Manifest):
   ```bash
   pnpm run prebuild
   ```
8. **Optional in Area einbinden:** `<id>` zur `testimonials:`-Liste der passenden Area (`areas/*.mdx`) hinzufügen.

> **HITL (verbindlich):** Testimonial-Text und Bildvorschlag im Chat zur Freigabe vorlegen. Dateien erst nach expliziter Freigabe schreiben. Korrekturen des Users 1:1 übernehmen.

## Workflow 2: Testimonial in einen Blog-Beitrag integrieren

Ein Blog-Beitrag = `src/content/portfolio/<bereich>/<shooting>/index.mdx`.

1. `TestimonialBlock` importieren (Tiefe richtet sich nach Ordnertiefe, siehe vorhandene Beispiele):
   ```mdx
   import TestimonialBlock from "../../../../components/TestimonialBlock.astro";
   ```
2. Block **vor der letzten `<Gallery … />`** platzieren (1 = einzelne Karte):
   ```mdx
   <TestimonialBlock slug="<testimonial-id>" />
   ```
   - `TestimonialBlock` bringt den `mb-8`-Abstand zur Galerie, `displayLargeImage={false}` und die Klickbarkeit automatisch mit – nichts davon manuell setzen.
3. Im Testimonial-Frontmatter `large: <hero-slug>` = Hero-Image dieses Beitrags setzen.
4. Fertig – Text und Bild werden automatisch aus der Testimonial-Collection gerendert.

> **Referenz-Beispiel (Mehr-Galerien-Beitrag):** `src/content/portfolio/beauty/sarah-donau2026/index.mdx` – Testimonial steht zwischen der zweiten und der letzten Galerie (vor der Schlussgalerie). Beiträge mit sehr vielen Bildern werden in mehrere Galerien nach **Set-/Lichtphasen** gegliedert (z. B. „Ankommen am Donauufer" → „Felsen, Kontrast und Perspektivwechsel" → „Von der goldenen Stunde in die Dämmerung"). Ein Farb-/Schwarzweiß-Pendant desselben Motivs bleibt **immer nebeneinander in derselben Galerie**.

## Workflow 3: Blog-Beitrag mit einem Testimonial aktualisieren

- **Text-/Datum-Änderung:** Nur `<id>.md` editieren – der Blog-Beitrag rendert automatisch die neue Version (Referenz über Slug). **Kein** Eingriff im `index.mdx` nötig.
- **Neues Testimonial in bestehenden Beitrag aufnehmen:** `TestimonialBlock`-Block ergänzen (Workflow 2).
- **Testimonial aus Beitrag entfernen:** `TestimonialBlock`-Block aus dem `index.mdx` entfernen; Datei optional mit `_`-Präfix parken statt löschen.
- **ID umbenennen:** Alle Referenzen anpassen – `TestimonialBlock slug` in allen `index.mdx`, `testimonials:`-Listen der Areas und ggf. `simple/testimonials.mdx`; Bildordner `src/images/testimonials/<id>/` mit umbenennen (inkl. YAML-Slugs `<id>-small`/`<id>-large`).
- **Small-Bild austauschen:** `small.jpg` ersetzen, danach `pnpm run prebuild` laufen lassen.

## Verifikation

- `pnpm run build` bzw. `astro check` in `apps/reisinger.pictures/`, um Schema-/Referenzfehler zu erkennen (z. B. falsche `large:`-Slugs).
- Sicherstellen, dass `large:` auf einen im Image-Manifest existierenden Slug zeigt.

## Technische Hinweise

- **Sprache:** Testimonial-Text = Deutsch; Code/Frontmatter = Englisch. Keine fremden Zeichen.
- **YAML-Sidecars:** Nur `description` (+ `slug` bei Testimonial-Bildern) selbst schreiben – `metadata`/`categories` kommen von `add-metadata.mjs`. **Niemals** EXIF-Daten manuell eintragen.
- **`pnpm`** verwenden, nicht npm.
- **Cache-Regeln:** `.cache/`, `.astro/`, `dist/` nie löschen; bei Content-Änderungen `astro sync` statt Caches löschen.
- **Kein `<img>`-Tag:** Bildreferenzen laufen ausschließlich über Slugs (ResponsiveImage/Gallery beim Build).
- **Konvention:** Testimonial-Datum = Shooting-Datum (Blog-Post-Datum), niemals automatisch das aktuelle Datum.
