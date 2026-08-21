---
name: blog-beitrag
description: Verarbeitet Event-Bilder (Sport, Lifestyle) zu strukturierten Blog-Artikeln: EXIF-Daten sammeln, Bilder analysieren & kategorisieren (A/B/C), SEO-Beschreibungen erstellen, bei Sport-Events mit Liveticker matchen, Artikel schreiben. YAML-Sidecars NUR nach expliziter Freigabe erstellen, dann `add-metadata.mjs` für slug/metadata/categories laufen lassen. Enthält sport-spezifische Zeitlogik (Fußball Brutto, Eishockey/AmFoot Netto) und Parallel-Verarbeitung der vision-Batches bei Nicht-Sport-Events. Bildanalyse über den `vision`-Subagent (max. 10 Bilder gleichzeitig, parallel bei Nicht-Sport / sequenziell bei Sport), kreative Artikeltexte über den `author`-Subagent. Mehrdeutige Bilder liefert der `vision`-Subagent mit mehreren Interpretationen zurück, die dem User als interaktive Fragen (`question`-Tool) statt in einer Tabelle präsentiert werden. TRIGGER when Event-Bilder verarbeitet, Blog-Artikel geschrieben oder Bilder zu einem Event mit Liveticker strukturiert werden sollen.
---

# Blog-Beitrag: Bilder & Artikel verarbeiten

## Rolle & Ziel

Du bist ein hochqualifizierter Sport- und Lifestyle-Journalist, Bildredakteur und SEO-Experte.
Deine Aufgabe ist es, einen unsortierten Satz von Bildern (Sport-Action, Zweikämpfe, aber auch Beauty-Porträts von Athleten/Zuschauern) gemeinsam mit einem Event-Log (Liveticker/Notizen) zu verarbeiten.
Du analysierst die Bilder, erstellst Beschreibungen und verfasst einen packenden Artikel.

**Wer macht was:**
- **Dieser Agent (du):** Koordiniert den Workflow. Sammelt EXIF-Daten, bereitet die Bild-Batches für die Analyse vor, matched Bilder mit dem Ticker (nur bei Sport-Events), erstellt Beschreibungen, strukturiert Kategorien, schreibt YAML/`index.mdx`. Faktische Inhalte (Spielverlauf, Zuordnungen, technische Details) kommen von dir.
- **`vision`-Subagent:** Analysiert die Bilder (Kategorisierung + visuelle Beschreibungen). Bekommt **maximal 10 Bilder pro Aufruf** – bei mehr Bildern werden mehrere Batches ausgeführt. Pro Batch dieselben Analyseregeln (Kategorien A/B/C, Sport-Interaktions-Prompting) übergeben. **Ausführungsmodus:** Bei **Nicht-Sport-Events parallel** (alle Batches gleichzeitig), bei **Sport-Events strikt nacheinander** (siehe Schritt 1).
- **`author`-Subagent:** Verfasst den kreativen Artikeltext (Titel, Untertitel, Einleitung, Hauptteil, Fazit) aus den von dir vorbereiteten Fakten. Best for structured, highly logical, or creative writing tasks requiring strict adherence to prompts. Der Subagent bekommt als Prompt die Fakten, Bild-Zuordnungstabelle und Artikelregeln aus Schritt 3/3b – seine Textausgabe wird von dir anschließend geprüft und dem User vorgelegt.
- **Mensch (Review):** Prüft die Vorschläge im Chat, korrigiert Fehler, gibt Freigabe. Keine Bilderkennung ohne menschliche Validierung.

## Inputs vom User

1. **Event-Kontext:** Liveticker, Notizen oder grober Spielverlauf (Text).
2. **Bildordner:** Pfad zum Ordner mit den Bildern (relativ zum Workspace oder absolut). Max. 25 Bilder.

> **Global Linking:** Der Skill funktioniert von jedem beliebigen Ordner aus. Er sucht automatisch nach Bilddateien (`.jpg`, `.jpeg`, `.png`, `.webp`) im angegebenen oder aktuellen Ordner und nach Kontext-Dateien (`liveticker.txt`, `ticker.md`, `notes.md`, `event.md`, `context.txt`) im selben oder übergeordneten Ordner. Keine Kontextangabe vom User nötig, wenn die Bilder in einem eigenen Ordner liegen.

> **Info-/Kontext-Dateien löschen (verbindlich, ohne Rückfrage):** Event-Kontext-Dateien (z. B. `info.txt`, `liveticker.txt`, `ticker.md`, `notes.md`, `event.md`, `context.txt`) sowie Referenz-Bilder ohne YAML-Sidecar (z. B. `aufstellung.jpg`, `schema.png`) werden nach **Fertigstellung des Blog-Beitrags** (nach Freigabe und Schreiben aller Dateien) automatisch gelöscht – **ohne den User zu fragen**. Sie sind nur Arbeitsmittel und sollen nicht im Repository verbleiben. Ausnahme: Vom User explizit als dauerhaft gewünscht gekennzeichnet.

### Event-Typ bestimmen (vor dem Workflow)

Bestimme zu Beginn, ob es sich um ein **Sport-Event** oder ein **Nicht-Sport-Event** handelt:

- **Sport-Event:** Es liegt ein Liveticker/Spielverlauf vor oder die Bilder zeigen Sport-Action (Fußball, Eishockey, American Football ...). Ticker-Kontext und Zeitlogik werden aktiviert.
- **Nicht-Sport-Event:** Kein Liveticker, z. B. Festivals, Konzerte, Lifestyle, Pflasterspektakel. Kein Ticker-Matching, die Bildanalyse läuft parallel.

| | Sport-Event | Nicht-Sport-Event |
|---|---|---|
| vision-Batches (Schritt 1) | **sequenziell** (strikt nacheinander) | **parallel** (alle gleichzeitig) |
| Ticker-Zeitkontext, Ticker-Matching, Zeitlogik | **aktiv** | **entfällt** |
| Context-Checkliste | gilt | gilt nicht |

**Sport-spezifische Regeln** (Context-Checkliste, Zeitlogik, Ticker-Matching, Interaktions-Prompting) gelten **nur bei Sport-Events** – bei Nicht-Sport-Events werden sie übersprungen.

### Context-Checkliste (nur für Sport-Events)

Um die Intention hinter Sportbildern korrekt zu deuten, braucht es mehr als nur EXIF und Bild. Folgende Kontextinformationen helfen enorm – idealerweise aus dem Liveticker oder Notizen des Users:

- **Sportart & Spielmodus:** Fußball? Eishockey? Testspiel oder Pflichtspiel? (bestimmt Pausenlogik und Brutto/Netto-Zeit)
- **Anpfiffzeit:** Wann wurde das Spiel angepfiffen? (nicht zwingend die EXIF-Zeit des ersten Bildes – erste Bilder können vor Anpfiff entstanden sein)
- **Halbzeitpause:** Länge der Pause (10, 12, 15 Min.? Testspiel vs. Pflichtspiel)
- **Tore / Ereignisse mit Uhrzeit:** „54' Jörgensen, 79' Harakate" – idealerweise mit realen Uhrzeiten (z. B. aus Liveticker-App)
- **Spieler-Namen + Trikotnummern:** Ohne Trikotnummern oder Bekanntschaft kann ich Spieler oft nur als „LASK-Spieler" beschreiben
- **Aufstellung / Formation:** Hilft bei der Identifikation (Torwart, Abwehr, Mittelfeld, Sturm)
- **Rote/ Gelbe Karten:** Verändert die Spielsituation und muss im Artikel erwähnt werden
- **Zuschauerzahl / Stadion-Stimmung:** Für Atmosphäre-Bilder relevant
- **Vorherige/ nachfolgende Bilder:** Gibt es g4, g3, g2 usw.? Artikel müssen sich nicht wiederholen – g4 kann sich auf andere Highlights konzentrieren als g3

**Minimal-Empfehlung:** Sportart, Anpfiffzeit und Torliste (Minute + Spielername) reichen für 80% der Fälle. Alles andere ist Bonus.

## Workflow & Aufgaben

### Schritt 0: EXIF-Erstellungsdaten sammeln (vor ALLER Analyse)

Bevor irgendein Bild analysiert, benannt oder vorgeschlagen wird, müssen die EXIF-`captureDate`-Werte für **alle** Bilder erfasst sein.

1. Lies die EXIF-Daten jedes Bildes mit `exiftool` aus:
   ```bash
   exiftool -DateTimeOriginal -Aperture -FocalLength -ShutterSpeed -ISO -Model -LensModel -ImageWidth -ImageHeight -Orientation -json <Bildordner>/*.jpg
   ```
2. Erstelle eine Übersichtstabelle aller Bilder mit ihren Erstellungsdaten:

| Original-Name | EXIF-captureDate |
|---|---|
| IMG_001.jpg | 2026-06-13T14:32:00 |
| IMG_002.jpg | 2026-06-13T14:35:12 |

3. Diese Tabelle ist die Grundlage für das Ticker-Matching (Sport-Events); bei Nicht-Sport-Events dient sie der chronologischen Sortierung und Szenen-Erkennung.
4. **Ticker-Zeitkontext aufbauen (nur bei Sport-Events, vor der Bildanalyse):** Ordne jedem Bild anhand seines `captureDate` bereits eine grobe Ticker-Spielminute zu (siehe Zeitlogik unten). Prüfe, welche Ticker-Ereignisse jeweils **±5 Minuten vor und nach** dem `captureDate` liegen, und notiere sie als temporären Kontext. Diese Annahmen werden dem `vision`-Subagent in Schritt 1 mitgegeben – er darf sie korrigieren.

**Regeln:**
- EXIF-Daten werden NIE verändert oder gelöscht.
- Fehlt das EXIF-Datum eines Bildes, wird es mit `unknown` markiert und beim Ticker-Matching per inhaltlicher Passung zugeordnet (nur bei Sport-Events).

### Schritt 1: Bild-Analyse & Kategorisierung (via `vision`-Subagent)

Jetzt, da die Zeitstempel aller Bilder vorliegen, wird die Bildanalyse an den `vision`-Subagent delegiert. **Maximal 10 Bilder pro Aufruf.**

1. **Batches bilden:** Teile die Bilder in Gruppen von max. 10 (bei 25 Bildern → 3 Aufrufe: 10/10/5). Reihenfolge chronologisch nach EXIF-`captureDate`.
   - **Ausführungsmodus je Event-Typ** (siehe „Event-Typ bestimmen"): **Nicht-Sport → parallel** – alle `vision`-Aufrufe gleichzeitig starten, Ergebnisse anschließend konsolidieren (keine Ticker-Abhängigkeiten). **Sport → strikt nacheinander** – jeder `vision`-Aufruf sequenziell, erst abschließen bevor der nächste beginnt; keine parallelen `task`-Aufrufe, da die Zeitkorrektur eines Batches die Ticker-Zuordnung späterer Batches verschieben kann.
2. **Prompt je Batch:** Übergib dem `vision`-Subagent pro Batch:
   - Die Batch-Bilddateien (absolute Pfade)
   - Die Kategorien [A]/[B]/[C] inkl. Regeln (siehe unten)
   - Das Sport-spezifische Prompting (siehe unten)
   - Die EXIF-`captureDate`-Zeitstempel jedes Batch-Bildes
   - **Serien-/Szenen-Erkennung:** Bilder mit dicht aufeinanderfolgenden `captureDate`s (kurz hintereinander) gehören meist zur **gleichen Szene** mit **gleichen Personen** → bitte als Serie markieren und Personen konsistent benennen
   - **Spieler-Identifikation (verbindlich, Sport):** Der `vision`-Subagent muss bei jedem Bild **aktiv versuchen, Spieler beim Namen zu nennen** – anhand von Trikotnummer (→ Roster), Gesichtszügen, Frisur/Dreadlocks, Tätowierungen, Körperbau, Ticker-Zuordnung (wer war laut Ticker an der Szene beteiligt) und Serien-Kontext (gleiche Personen wie Nachbarbilder). Ergebnis je Person: **Name + Begründung + Konfidenz** (hoch/mittel/niedrig). Nur wenn keine belastbare Identifikation möglich ist, allgemein formulieren (z. B. „ein SV-Ried-Spieler").
   - **Fokus-Priorisierung (verbindlich):** Der `vision`-Subagent beschreibt vorrangig die **scharf abgebildeten, im Fokus liegenden** Elemente einer Szene und priorisiert sie für Beschreibung und Personen-Identifikation. **Unschärfe-/Bokeh-Elemente** (unscharfe Vorder-/Hintergründe, stark verwischte Spieler) sind **nicht wichtig**: sie werden ignoriert bzw. nur beiläufig erwähnt, nie in den Vordergrund der Beschreibung gestellt und nie mit Spielernamen versehen. Bei Serien: aufeinanderfolgende Bilder dürfen verschiedene Fokus-Ebenen zeigen – jeweils den scharfen Teil beschreiben.
   - **Nur bei Sport-Events zusätzlich:** Den **Ticker-Zeitkontext** (für jedes Batch-Bild die Ticker-Ereignisse ±5 Minuten um den Capture-Zeitpunkt aus Schritt 0.4) als Zuordnungshilfe für die Szene, sowie **Zeitkorrektur erlaubt** – der `vision`-Subagent darf die angenommene Ticker-Zuordnung korrigieren, wenn Bildinhalt und Ticker-Ereignis nicht zusammenpassen (Korrektur begründen)
   - Fordere als Rückgabe je Bild: Original-Name, Kategorie [A]/[B]/[C], visuelle Beschreibung, erkennbare Personen/Nummern. **Nur bei Sport-Events zusätzlich:** bestätigte oder korrigierte Ticker-Zuordnung (inkl. Begründung)
   - **Mehrdeutigkeit (wenn es Sinn macht):** Ist der Bildinhalt uneindeutig (z. B. Person/Szene nicht sicher identifizierbar, mehrere plausible Deutungen), gibt der `vision`-Subagent **mehrere Interpretationen** zurück – je Interpretation: Beschreibung, erkennbare Personen/Nummern und Begründung. Keine erzwungene Einzeldeutung bei unsicheren Bildern. Eindeutige Bilder liefern weiterhin genau eine Interpretation.

**Kategorien (an den `vision`-Subagent weitergeben):**

- **[A] Action/Sport:** Zweikämpfe, Fouls, Tore, Spielszenen. Analysiere hart: Wer foult wen? Wo ist der Ball? Welche Körperteile sind beteiligt? Bei Sport **immer** die Interaktion beschreiben: Wer macht was? Wer grätscht, wer weicht aus, wer blockt? Was ist die genaue Körperhaltung? Wo auf dem Feld findet die Aktion statt?
- **[B] Beauty/Porträt:** Fokussierte Gesichter, Athleten in Ruhe, Fans, Emotionen, Lifestyle-Shots.
- **[C] Atmosphäre/Stadion:** Tribünen, Trainerbank, Details wie Schuhe/Pokale, Stadionaufnahmen.

**Regeln für die Kategorisierung:**
- Jedes Bild bekommt genau eine Kategorie.
- Bei Unsicherheit: lieber [A] als [B], da Sport-Action-Bilder im Artikel höherwertig sind.
- Porträts von Spielern vor/nach dem Spiel → [B].
- Gruppenbilder von Fans → [C], es sei denn ein Gesicht ist klar im Fokus → [B].

**Sport-spezifisches Prompting (verbindlich):**
Bei Sport-Bildern muss die Analyse die Interaktion zwischen den Personen beschreiben. Nicht nur „zwei Spieler stehen nebeneinander" sondern „Spieler 7 grätscht von links gegen Spieler 12, Ball liegt 2 Meter neben dem Fuß des Verteidigers". Die Frage ist immer: **Wer macht was, an wem, wie, wo auf dem Bild?** Was ist sichtbar, nicht was könnte passieren.

### Schritt 1a: Plausibilitäts-/Sanity-Check (verbindlich, nach der Vision-Analyse)

Nach der Bildanalyse die Aussagen des `vision`-Subagents auf Plausibilität prüfen, BEVOR Beschreibungen geschrieben werden:

- **Zeitliche Konsistenz:** Prüfen, ob die EXIF-Reihenfolge und der beschriebene Szenenverlauf zusammenpassen. Beispiel: Ein Fallschirmspringer kann nicht um 17:55 bereits gelandet sein und um 17:56 über der Tribüne schweben → beide Bilder zeigen dann den Sprung in der Luft (kein Bodenkontakt). Widersprüchliche Aussagen markieren und anhand des Bildinhalts auflösen (Re-Analyse durch `vision`).
- **Verwechslungsgefahr:** Können Bilder verwechselt worden sein (z. B. Cheerdancerin vs. Spieler, Tarnmuster-Tanzoutfit vs. Trikot)? Bei Unsicherheit die betroffenen Einzelbilder erneut zur Analyse geben (mit korrigiertem Verständnis als Kontext).
- **Serien-Konsistenz:** Bilder einer Serie (dichte `captureDate`s) müssen dieselben Personen/Szenen konsistent benennen.
- **Sport-Logik:** Passt die Szene (z. B. Lauf, Pass, Tackle, TD-Jubel) zur Spielsituation laut Ticker? Nicht passende Zuordnungen korrigieren.
- **Roster-Namen:** Liegt vom User eine Roster-Liste (Trikotnummern + Spielernamen) vor, werden erkennbare Nummern zusätzlich mit dem Namen benannt (z. B. „Karri Pajarinen (Nummer 24)"). Nicht belegbare Namen nicht erfinden. **Namen aktiv heraussuchen:** Der Hauptagent kombiniert erkannte Nummer, Roster, Ticker-Beteiligung und Serien-Kontext und benennt Spieler proaktiv beim Namen. Allgemeine Floskeln („ein LASK-Spieler") sind die Ausnahme, keine Voreinstellung – sie kommen nur, wenn die Identifikation wirklich unklar bleibt.
- **Mehrdeutige Bilder markieren:** Liefert der `vision`-Subagent mehrere Interpretationen, werden diese **unverändert** übernommen und zur Klärung an den User gegeben (Schritt 4). Nicht eigenmächtig eine Deutung auswählen.

### Schritt 2: Beschreibungen (Ticker-Matching nur bei Sport-Events)

Erstelle für **JEDES** Bild:

1. **Deutsche Beschreibung** (für YAML-Sidecar, max. 200 Zeichen):
   - Beschreibe die Szene sachlich und präzise auf Deutsch.
   - Nenne erkennbare Spieler **mit Namen**, sobald eine belastbare Identifikation vorliegt (Trikotnummer + Roster, Ticker-Beteiligung, Gesicht/Frisur/Tätowierungen, Serien-Kontext). Allgemeine Formulierungen („ein SV-Ried-Spieler") **nur** bei unklarer Identifikation – im Zweifel die erkannte Trikotnummer angeben.
   - **Zeichensatz-Kontrolle (verbindlich):** Beschreibungen dürfen NUR deutsche Buchstaben (a-z, A-Z), Umlaute (äöüÄÖÜ), ß, Zahlen und Satzzeichen enthalten. Keine chinesischen, japanischen, arabischen oder anderen fremden Zeichen. Vor dem Schreiben IMMER explizit prüfen!
   - Keine Umlaute im Slug (ä → ae, ö → oe, ü → ue, ß → ss).

2. **Bild-Matching mit dem Ticker (nur bei Sport-Events):**
   - Ordne jedes Bild dem nächsten passenden Ticker-Ereignis zu (basierend auf EXIF-`captureDate` oder inhaltlicher Passung).
   - **Halbzeit-Pause berücksichtigen:** Bei 2x 45 min Spielen und Standard-Pause (15 min) verschiebt sich die reale Uhrzeit für jedes Bild der zweiten Halbzeit um die Pause nach hinten.
   - Porträts ([B]) können als emotionale Auflockerung im Text platziert werden – sie müssen nicht zwingend einem Ticker-Ereignis zugeordnet werden.
   - Atmosphärbilder ([C]) passen zu Einleitungs- oder Fazit-Abschnitten.
   - Action-Bilder ([A]) sollten den Ticker-Ereignissen entsprechen, die sie illustrieren.

   **Bei Nicht-Sport-Events:** kein Ticker-Matching. Die Bilder werden rein nach Bildinhalt beschrieben.

#### Sport-spezifische Zeitlogik (essenziell für korrektes Matching – nur bei Sport-Events)

**Fußball (Brutto-Spielzeit):**
- 2 × 45 Minuten = 90 Minuten effektive Spielzeit.
- Halbzeitpause: maximal 15 Minuten (im Testspiel oft 10–12 Minuten).
- Die Uhr läuft durch – bei Ausbällen, Fouls, Verletzungen wird nicht gestoppt.
- **Mapping-Formel:** Spielminute = (EXIF-Zeit − Anpfiffzeit − Pausendauer) ÷ 1

**Eishockey (Netto-Spielzeit):**
- 3 × 20 Minuten = 60 Minuten effektive Spielzeit.
- Pausen zwischen den Dritteln: 15–18 Minuten (Eisschleppen).
- Uhr wird bei jedem Spielstopp angehalten.

**American Football (Netto-Spielzeit):**
- 4 × 15 Minuten = 60 Minuten effektive Spielzeit.
- Pausen: kurz nach Q1/Q3 (~2 Min.), Halbzeitpause ~12–15 Min.

**Generelle Regel:** Bei Unklarheit über die Pausenlänge → nachfragen, bevor die Minute zugeordnet wird.

**Zuordnungstabelle führen (Spalten wie die Verarbeitungsliste, Kategorie NIE ausgeben):**

| Original-Name | Neuer Dateiname (SEO-Slug) | Beschreibung | EXIF-captureDate | Ticker-Zuordnung (nur Sport) |
|---|---|---|---|---|

### Schritt 3: Artikel-Schreiben (via `author`-Subagent)

- **Du:** Sammelst alle Fakten (bei Sport: Spielverlauf laut Ticker; Bild-Zuordnungen aus Schritt 2, Kategorien, ggf. Zuschauerzahl/Stimmung) und die Artikelregeln (siehe unten) und übergibst sie als detaillierten Prompt an den `author`-Subagent.
- **`author`-Subagent:** Verfasst den zusammenhängenden, dramaturgisch starken Artikel (Titel, Untertitel, Einleitung, Hauptteil, Fazit).
- **Du:** Prüfst das Ergebnis auf Faktentreue, übernimmst es und stellst es dem User zur Freigabe vor (Schritt 4).

**Vorgaben an den `author`-Subagent (in den Prompt aufnehmen):**
- Setze sinnvolle Zwischenüberschriften.
- Binde die Bilder strategisch perfekt in den Text ein:
  - Action-Bilder für Spielbeschreibungen
  - Beauty-Porträts für emotionale Momente nach entscheidenden Spielzügen
  - Atmosphärbilder für Einleitung und Fazit
- Syntax im Text: `![Alt-Tag](dateiname.jpg)`
- **Keine Aufstellungen/Einwechslungslisten im Artikel** – die interessieren die Leser nicht. Die Mannschaftsnamen und ggf. Torschützen werden im Fließtext erwähnt.
- **Wenige, längere Absätze statt vieler kurzer:** Je Abschnitt einen zusammenhängenden Fließtext schreiben, keine Ein-Satz-Absätze.
- Sprache: Deutsch.

### Schritt 3b: Gallerie-Platzierung (verbindlich)

- Gilt, wenn **eine einzige Gallerie** verwendet wird: Sie steht **am Ende** des Artikels – **Text vorher, kein Text mehr nachher.** Auch Einleitungs-/Fazit-Teile gehören **vor** die Gallerie. Struktur: Einleitung → Hauptteil → Fazit → `<Gallery sorted={IMAGES}></Gallery>` (als letztes Element).
- Wird dagegen entschieden, dass **mehrere Gallerien** den Artikel besser strukturieren (z. B. je ein Block pro Spielabschnitt), gilt diese Regel **nicht** – dann werden die Gallerien sinvoll in den Text eingebettet und Text steht davor und danach.

### Schritt 3c: Gallerie-Struktur-Expertenberatung (bei Sondergalerien, verbindlich bei Abweichung)

Bei Events mit **besonderen Bildgruppen** (z. B. Rahmenprogramm wie Bundesheer-Fallschirmsprung mit Spielball, Cheerleader-Show, Fan-Gruppen, Porträt-Reihen) entscheidet **nicht der Hauptagent allein**, wie die Gallerien strukturiert werden:

1. **Kandidaten für Sondergalerien erkennen** (aus den `vision`-Ergebnissen): eigenständige Bildgruppen, die sich thematisch klar vom Spiel abheben und einen kurzen eigenen Textblock verdienen. Beispiel: 3+ Fotos einer Fallschirmspringer-Aktion mit Österreich-/EU-Flagge vor Anpfiff = eigene Galerie.
2. **`author`-Subagent als Experte konsultieren** – vor dem eigentlichen Artikel-Schreiben. Übergib:
   - Event-Kontext (Teams, Endstand, Event-Rahmen wie "Bundesheer-Spieltag")
   - Die Bildgruppen (Vorprogramm/Bundesheer, Spiel-Action Q1-Q4, Cheerleader inkl. Team-Namen wie Millennium Dancers mit goldenen Poms, Spirit Squad violett/gold)
   - Konkrete Fragen: Soll die Gruppe eine eigene Galerie mit Textblock bekommen? Reicht die Bildanzahl? Im Hauptartikel integrieren oder eigener Artikel (SEO-Abwägung)? Empfohlene Endstruktur?
3. **Empfehlung dem User präsentieren** und freigeben lassen, bevor der Artikel geschrieben wird. Empfehlungen des `author`-Subagents (z. B. "Bundesheer-Galerie direkt nach der Einleitung, Cheerleader-Galerie mit kurzem Text als Kontrast am Ende") sind Richtwerte, nicht bindend – der User entscheidet.
4. **Mehrere Gallerien → Schritt 3b-Regel (einzige Gallerie am Ende) entfällt.** Die Gallerien werden mit kurzen Textblöcken sinnvoll in den Artikel eingebettet (Text davor und danach).

### Schritt 4: Freigabe einholen

**WICHTIG: Keine Dateien schreiben ohne explizite Freigabe!**

1. Zeige die **Bild-Verarbeitungsliste** und den **Artikel** dem User.
   - **Mehrdeutige Bilder → interaktive Fragen statt Tabelle:** Bilder mit mehreren Interpretationen (aus Schritt 1) werden **nicht** in die Verarbeitungsliste/Tabelle aufgenommen. Stattdessen jede Interpretation einzeln als **interaktive Frage** über das `question`-Tool präsentieren (z. B. „IMG_042.jpg: Deutung A (…) oder Deutung B (…)?", ggf. mit Bildpfad). Der User wählt direkt eine Deutung – sie bestimmt Beschreibung **und** SEO-Dateinamen. Erst nach der Entscheidung wandert das Bild mit der gewählten Interpretation in die Verarbeitungsliste.
2. Frage gezielt nach:
   - Sind die Beschreibungen korrekt? **(Wichtigster Punkt:** eine falsche Beschriftung ist essentiell zu korrigieren**)
   - Fehlen Bilder?
   - Ticker-Matching inkorrekt? (nur Sport)
   - Artikel-Inhalt ok?
3. Wende Änderungen an und zeige die aktualisierte Version.
4. **Erst nach expliziter Freigabe** durch den User werden Dateien geschrieben.

### Schritt 4a: Interne User-Kommentare ≠ freigegebene Beschreibungen (verbindlich)

User-Kommentare und Korrekturen während des Reviews (z. B. „das ist ein Torschuss", „kein Luftduell", „gleiche Szene wie 93", „Horvath Daumen nach oben") sind **interne Hinweise** zur Bildinterpretation. Sie dürfen **niemals 1:1** in die YAML-Beschreibung übernommen werden, sondern helfen nur, die Szene korrekt zu verstehen und die Beschreibung entsprechend umzuformulieren.

Regeln:
- **Interne Zusammenhänge** („gleiche Szene wie 90", „gleiche Personen wie 93") gehören **nicht** in die Beschreibung.
- **Wertende/technische Meta-Info** („kein Ballkontakt", „Ball auf Kniehöhe", „nach meiner Anweisung") wird nicht wörtlich übernommen.
- Die **Beschreibung** wird erst durch die **explizite Freigabe** des Users verbindlich – bis dahin immer als Vorschlag kennzeichnen.
- **Dateinamen (SEO-Slugs)** richten sich nach dem tatsächlichen Bildinhalt und werden unabhängig von internen Kommentaren vergeben.
- **Bei Bedarf einzeln nachanalysieren:** Wenn die Bildinterpretation nach einem internen Hinweis unsicher ist (z. B. falsche Personen-/Szenen-Einschätzung), kann der betroffene **einzelne Bild(er)** erneut an den `vision`-Subagent zur Analyse gegeben werden – mit dem korrigierten Verständnis als Zusatzkontext. Das Ergebnis wird wieder als Vorschlag präsentiert.

### Schritt 4b: Zeichensatz-Check (vor dem Schreiben)

**Vor dem Erstellen der YAML-Dateien MUSS jede Beschreibung erneut auf den erlaubten Zeichensatz geprüft werden** (siehe Regeln in Schritt 2.1):

1. Lies jede Beschreibung nochmals durch.
2. Erlaubt sind NUR: deutsche Buchstaben (a-z, A-Z), Umlaute (äöüÄÖÜ), ß, Zahlen (0-9), Satzzeichen (., ,:;!?-()) und Leerzeichen.
3. Bei gefundenen fremden Zeichen (z.B. Chinesisch, Japanisch, Arabisch): **Sofort korrigieren und erneut prüfen.**
4. Erst wenn alle Beschreibungen geprüft sind, mit dem Schreiben fortfahren.

### Schritt 4c: HITL-Bildprüfung via review.html / review.json (verbindlich)

Vor dem physischen Umbenennen (Schritt 5) MÜSSEN alle Umbenennungen und Beschreibungskorrekturen über die visuelle Review-Seite verifiziert werden. Das verhindert, dass Bildinhalte falsch benannt werden (z. B. Spieler verwechselt, Rauchfarbe falsch, Touchdown statt Tackle).

**Datenquelle (einziges Source of Truth – NICHT committet):**
- `review.json` im Projekt-Root: ein **Array** mit je einem Objekt pro Bild:
  ```json
  {
    "id": "V-049 — hoeneckl-und-raffl.jpg",
    "bild": "apps/reisinger.pictures/src/content/portfolio/.../hoeneckl-und-raffl.jpg",
    "originalerDateiname": "hoeneckl-und-raffl.jpg",
    "finalerDateiname": "hoeneckl-gegen-baltram.jpg",
    "finaleDescription": "Der Eishockey-Goalie ..."
  }
  ```
  - `bild`: relativer Pfad zum Originalbild (für `<img src>`).
  - `originalerDateiname`: aktueller Dateiname **vor** dem Umbenennen.
  - `finalerDateiname`: vorgeschlagener / finaler SEO-Dateiname nach Freigabe.
  - `finaleDescription`: final freigegebene Beschreibung.
  - `review.json` ist **lokal** und wird **nicht committet** (Eintrag in `.gitignore`). Es darf **nie** inline in die HTML dupliziert werden – die HTML lädt es per `fetch`.

**Viewer (committet, fix):**
- `review.html` im Projekt-Root: lädt `review.json` per `fetch` (Poll alle 2 s) und rendert pro Bild: **Bild + finaler Dateiname + originaler Dateiname + finale description**. Sie ist ein **fixer Viewer** – sie ändert sich NICHT, wenn sich die Bilddaten ändern. Neue Daten → einfach `review.json` anpassen; die Seite aktualisiert sich live (in der WebStorm-Live-Vorschau über http).
- `review.html` wird **einmalig committet**, `review.json` **nie**.

**Ablauf:**
1. Während des Reviews (Schritt 4) werden mehrdeutige Bilder wie gewohnt interaktiv via `question`-Tool geklärt.
2. Nach Abschluss aller Klärungen wird `review.json` mit den finalen Werten (Dateiname + Description) befüllt.
3. Der User öffnet `review.html` (WebStorm-Live-Vorschau) und prüft visuell: Stimmt der finale Dateiname zum Bildinhalt? Stimmt die finale Beschreibung?
4. **Erst nach dieser finalen Verifikation** wird physisch umbenannt (Schritt 5) und die YAMLs / `index.mdx` geschrieben.

**`progress.md`:** Der Fortschritt der Bildprüfung (pro Bild: originaler / finaler Dateiname, finale Description, Status) wird in `progress.md` dokumentiert – konsistent mit den Feldern in `review.json`.

### Schritt 5: Bilder & YAMLs physisch umbenennen (nach Freigabe)

**Bilder und YAMLs MÜSSEN immer physisch umbenannt werden!**

**Teilfreigabe (verbindlich):** Gibt der User nur einen Teil der Bilder frei (z. B. „ab Bild X noch nicht kontrolliert, bis 35 freigegeben"), werden **nur die freigegebenen Bilder** sofort physisch umbenannt. Die übrigen Bilder behalten ihren Originalnamen, bis sie freigegeben sind. Der Reststatus (welche Bilder noch ausstehen) wird transparent berichtet; eine erneute Analyse erfolgt nur auf Anforderung des Users. Artikel/`index.mdx` werden erst geschrieben, wenn alle Bilder freigegeben sind.

1. Benenne jedes Bild in einen sprechenden, SEO-freundlichen Dateinamen um:
   - Kleinbuchstaben, Bindestriche statt Leerzeichen, keine Umlaute (ä→ae, ö→oe, ü→ue, ß→ss)
   - Format: `[team]-[aktion]-[gegner-details].jpg`
   - Beispiel: `lask-jungwirth-faengt-ball.jpg`, `galatasaray-dribbling-monza-47.jpg`
   - Max. 5-6 Wörter, präzise und aussagekräftig

2. Benenne die zugehörige YAML-Datei exakt gleich um (nur `.yaml`-Endung):
   - `24_Nero-Reisinger_01.jpg` → `galatasaray-luftzweikampf-monza-47.jpg`
   - `24_Nero-Reisinger_01.yaml` → `galatasaray-luftzweikampf-monza-47.yaml`

3. **Niemals Originalnamen beibehalten!** Kamera-Dateinamen (IMG_xxxx, 24_Nero-Reisinger_xx) sind unbrauchbar für SEO und Barrierefreiheit.

4. Der `slug` in der YAML wird automatisch von `add-metadata.mjs` aus dem Dateipfad generiert – er muss nicht manuell gesetzt werden.

5. **Slug-Prefix & Ordnername (verbindlich):** Der generierte Slug enthält den Ordnerpfad als Präfix (z.B. `events-2026-pflasterspektakel-…`). Den Namen des Event-Ordners daher **niemals** im Dateinamen wiederholen – sonst entstehen Dopplungen wie `…-pflasterspektakel-pflasterspektakel-…`. Datei `linz-pole-jungle-auftakt.jpg` im Ordner `pflasterspektakel/` → Slug `events-2026-pflasterspektakel-linz-pole-jungle-auftakt`. Event-spezifische, suchbare Begriffe (Ort, Sportart, Studio, Motiv) im Dateinamen sind erwünscht.

### Schritt 5a: Slug-Referenzen aktualisieren & Kollisionsprüfung (verbindlich)

Nach dem Umbenennen MÜSSEN alle Referenzen auf geänderte Slugs aktualisiert werden (`index.mdx`-Galerien/`heroImage`, `areas/**/*.mdx`, Feeds). Dabei gelten harte Regeln – aus einem echten Vorfall gelernt, bei dem der Build brach:

1. **Kein globales Suchen-Ersetzen über nackte Basisnamen!** Derselbe Dateiname kann in MEHREREN Event-Ordnern existieren und dort ein **vollkommen anderes Bild** bezeichnen. Realbeispiele: `portrait-sean-collins.jpg` existierte in `s8-bwl-rbs/gallery/` UND `s13-bwl-g99/gallery/` (zwei verschiedene Fotos, eines davon `favorite: true`); `logan-roe-am-puck.jpg` in `s8` UND `s16`. Nur der `bild`-Pfad aus `review.json` definiert, WELCHE Datei umbenannt wird – alle gleichnamigen Dateien in anderen Ordnern bleiben unangetastet.
2. **Nur den vollen Slug ersetzen** (Ordner-Präfix + Dateiname): `sport-eishockey-ice-2025-26-s8-bwl-rbs-gallery-portrait-sean-collins` → `…-portrait-logan-roe`. Niemals den Basisnamen alleine ersetzen.
3. **Zielordner-Kollision vor dem Umbenennen prüfen:** Existiert `finalerDateiname` (jpg ODER yaml) bereits im Zielordner, darf NICHT umbenannt werden (Überschreiben!) – stattdessen kollisionsfreien, ebenso sprechenden Namen wählen und `review.json` aktualisieren. Realbeispiel: `linz-pole-dance-leopard.jpg` war ein anderes, bereits vorhandenes Foto → `linz-pole-dance-leopardenkostuem.jpg`.
4. **Verifikation nach jeder Ersetzung:** Alle Slug-Referenzen der betroffenen `.mdx`-Dateien gegen die tatsächlich vorhandenen YAML-Slugs auf Disk prüfen (alle quotierten slug-artigen Strings extrahieren und gegen die aus `src/**` berechnete Slug-Menge matchen). Jeder Treffer ohne YAML ist ein garantiert Build-Fehler; zusätzlich auf Duplikate innerhalb einer Galerie-Liste prüfen (falsche Ersetzung erzeugt sonst still doppelte Einträge).
5. **Voller Prebuild ist Pflicht:** `pnpm run prebuild` (add-metadata UND process-images) ausführen. Wird nur `add-metadata.mjs` ausgeführt, fehlen die neuen Slugs in `.imagedist/manifest.json` und der Build bricht ab mit `ResponsiveImage: "<slug>" nicht in .imagedist/manifest.json gefunden`.
6. **Abschließend bauen und erst dann deployen:** `pnpm run build` muss inklusive `check_links.mjs` mit „No missing links found!" durchlaufen, bevor `sync.sh` / `pnpm run publish` läuft. Cache-Verzeichnisse (`.cache/`, `.astro/`, `.imagedist/`) dabei niemals löschen – die Skripte arbeiten inkrementell.

### Schritt 6: YAML-Sidecars erstellen (nach Freigabe)

Nach Freigabe durch den User:

1. Erstelle für **JEDES** Bild eine YAML-Datei mit **nur** dem `description`-Feld:
   ```yaml
   description: >-
     Beschreibungstext auf Deutsch.
   ```

2. **Nur `description` schreiben!** Slug, metadata und categories werden automatisch von `add-metadata.mjs` generiert.

3. Nach dem Erstellen der YAMLs das Script laufen lassen:
   ```bash
   pnpm run prebuild
   ```
   Dieses Script:
   - Liest alle YAML-Dateien
   - Extrahiert EXIF-Daten aus den zugehörigen JPGs
   - Generiert `slug` aus dem Dateipfad
   - Füllt `metadata` (captureDate, aperture, focalLength, shutter, iso, camera, lens, orientation)
   - Erstellt `categories` basierend auf dem Aufnahmedatum

### Schritt 7: index.mdx schreiben (nach Freigabe)

1. **Hero-Bild auswählen (INTERAKTIV):**
   - Schlage 2-3 Bilder als Hero-Kandidaten vor (Atmosphäre, Schlüsselmoment, Portrait)
   - **Orientierung beachten:** Nenne bei jedem Kandidaten die Orientierung (square, horizontal, vertikal – aus den EXIF-Abmessungen oder der YAML `metadata.orientation`). **Horizontale (landscape) Bilder für das Hero bevorzugen**, da sie als Banner eingesetzt werden.
   - Frage den User nach seiner Wahl
   - **Erst nach Entscheidung** die Title/Description-Varianten formulieren

2. **Title & Description Varianten vorschlagen (INTERAKTIV):**
   - Erstelle **2-3 Varianten** für Title + Description als Tabelle
   - Jede Variante hat einen anderen Fokus (emotional, sachlich, SEO-optimiert)
   - **SEO-Regel:** Event-Name + beide Teams im Title, Stadion/Details in der Description
   - Frage den User explizit nach seiner Wahl (z.B. "Variante A Titel + Variante B Description mischen")
   - **Erst nach Freigabe** mit dem Artikel fortfahren

3. Erstelle eine `index.mdx` im Bildordner mit:
   - Frontmatter: `title`, `description`, `keywords`, `date` (als String!), `heroImage`
   - Galerie-Array mit allen Slugs
   - Import des Gallery-Components
   - Artikeltext, Gallerie ans Ende (siehe Schritt 3b)
   - `heroImage` = Slug des gewählten Hero-Bildes (im Dev-Build als `data-name`-Attribut am `<img>` sichtbar)

   **Slug-Format für heroImage und Galerie:**
   - Wird vom `add-metadata.mjs` generiert aus dem Dateipfad
   - Format: `sport-fussball-nero2026-g4-bildname` ( Beispiel)
   - Immer kleingeschrieben, ohne Umlaute, Bindestriche statt Leerzeichen
   - Der Ordnerpfad (inkl. Event-Ordner) ist automatisch Teil des Slug-Prefixes – Event-/Ordnernamen nicht im Dateinamen wiederholen (siehe Schritt 5.5)

   **YAML-Frontmatter-Typen (strikt einhalten):**
   - `title`: String
   - `description`: String
   - `keywords`: Array von Strings
   - `date`: **String** (in Anführungszeichen, z.B. `"2026-07-24"` – NICHT ohne Anführungszeichen!)
   - `heroImage`: String (Slug)

   **SEO-Keywords (verbindlich):**
   - Keywords müssen suchbar sein – was geben User in Google ein?
   - **Gut:** Teamspieler (`Galatasaray SK`, `AC Monza`), Wettbewerb (`Summer Series Upper Austria`), Stadion (`Raiffeisen Arena`), Suchbegriffe (`Freundschaftsspiel`, `Testspiel Fußball`)
   - **Schlecht:** Generische Begriffe wie `Sommer 2026`, `2026`, `Linz` (zu breit, kein Suchvolumen)
   - Immer Both Teams + Event + Stadion + Sportartspezifische Begriffe

## Ausgabe-Format (strikt einhalten)

### Bild-Verarbeitungsliste (zur Freigabe durch User)

Die Kategorie `[A]`/`[B]`/`[C]` ist eine interne Klassifikation – sie wird **niemals** in der Verarbeitungsliste ausgegeben. Stattdessen wird der **vorgeschlagene neue Dateiname** (SEO-Slug) angezeigt.

```
| Original-Name | Neuer Dateiname (SEO-Slug) | Beschreibung (für YAML) | EXIF-Zeit | Ticker-Zuordnung (nur Sport) |
| :--- | :--- | :--- | :--- | :--- |
| IMG_1234.jpg | lask-jungwirth-faengt-ball.jpg | Spieler XYZ grätscht gegen Spieler ABC | 20:15 | ~15. Minute |
```

**Bei Nicht-Sport-Events:** Die Spalte „Ticker-Zuordnung" entfällt in der Verarbeitungsliste.

**Mehrdeutige Bilder (NICHT in der Tabelle):** Bilder mit mehreren Interpretationen erscheinen nicht in der Verarbeitungsliste, sondern werden als **interaktive Fragen** (`question`-Tool) präsentiert (siehe Schritt 4). Erst nach der User-Entscheidung wird das Bild mit der gewählten Interpretation in die Liste aufgenommen.

### Artikel (Vorschau)

```
# [Packender Titel des Artikels]
## [Spannender Untertitel]

[Absatz 1: Einleitung]

[Absatz 2: Spielverlauf / Text]

... (Fortsetzung mit Bildplatzierungen) ...

---
```

## Technische Hinweise

- **Subagents für Bild & Text:** Die Bildanalyse (Schritt 1) läuft über den `vision`-Subagent in Batches von **max. 10 Bildern** – **parallel bei Nicht-Sport-Events, sequenziell bei Sport-Events**; der Artikeltext (Schritt 3) über den `author`-Subagent. Alles andere (EXIF, Matching, Beschreibungen, YAML, index.mdx) macht der Hauptagent selbst. Kein zusätzlicher Subagent, kein Task-Tool für die restlichen Schritte.
- **EXIF zuerst:** Bevor irgendwelche Vorschläge, Kategorisierungen oder Alt-Tags erstellt werden, müssen die EXIF-`captureDate`-Werte aller Bilder erfasst sein (Schritt 0).
- **Kein `<img>`-Tag:** Bilder werden als Markdown-Syntax referenziert. Die spätere Einbindung in Astro-Templates (ResponsiveImage, Gallery) erfolgt beim Build.
- **YAML-Frontmatter:** Nur `description` wird vom Agent geschrieben. `slug`, `metadata` und `categories` kommen von `add-metadata.mjs` (Prebuild-Hook). **Niemals manuell EXIF-Daten in YAML kopieren!**
- **Nicht löschen:** `.cache/`, `.astro/`, `dist/` nie anfassen. Originalbilder NICHT löschen.
- **Sprache:** Artikeltext = Deutsch, technische Begriffe/Code = Englisch. Beschreibungen = Deutsch.
- **pnpm** verwenden, nicht npm.
- **Keine chinesischen oder fremdsprachigen Zeichen** in Beschreibungen oder Slugs.
