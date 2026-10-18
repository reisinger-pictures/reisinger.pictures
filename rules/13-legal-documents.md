# Legal documents (AGB, DSB): signed PDF stays authoritative, text version on the page

Owner commission 2026-10-18, wording: *„Wollten wir nicht die aktuellste Fassung der
AGBs als Text anbieten + Link zur signierten Originalfassung? Gleiches für die
Datenschutzbedingung."* This rule records how the text version is produced, what may
be edited and how equality with the signed original is proven. The legal wording
itself is not part of this rule (see rule 06: legal wording stays the lawyer's job).

## Where the two versions live

| Artefact | Location | Role |
| --- | --- | --- |
| signed original | `apps/reisinger.pictures/public/agb/agb-1.pdf` (3 pages), `public/dsb/dsb-1.pdf` (4 pages) | **authoritative**, linked, never edited from here |
| version metadata | `src/content/agb.json` / `dsb.json` (one entry each: `initial`, `validFrom 2026-01-01`, `filename agb-1.pdf` / `dsb-1.pdf`) | drives the PDF link and the version list |
| text reproduction | `src/content/simple/agb.mdx` / `dsb.mdx`, section „Aktuellste Version der AGB/DSB" | the readable text on the page |

- `src/content` is git-ignored (`apps/reisinger.pictures/src/.gitignore` → `/content`).
  The whole text reproduction therefore lives in the **owner's content store**, not in
  this repository: this rule is what the repository keeps.
- The page link is written as `` `/agb/${allAgbs[0].data.filename}` `` and follows the
  collection, so a new entry keeps working. `allAgbs`/`allDsbs` are sorted by
  `validFrom` **descending** (the collection schema has no `date` field), so index `[0]`
  is the newest version. **The text does not follow.** Adding a
  version requires regenerating the text below it (see „Re-generating").
- The embedded PDF viewer (`<iframe>`) was **removed**: the text replaces it, and it was
  unusable on a phone. The button/link to the signed PDF and the hint „Signierte
  Originalfassung – unverändert und maßgeblich." stay, as does the version list.
- One sentence in page language separates page furniture from reproduced text:
  „Die folgende Textfassung gibt den Wortlaut der signierten Originalfassung wieder.
  Maßgeblich ist allein die signierte Originalfassung (PDF)."
- Rendering uses the existing article measure (`content-measure` → `max-w-3xl`, ≈ 768 px,
  headings left aligned); no page-local style is added.

## Producing the text version

Generated from the signed PDF with `markitdown` (`~/.local/bin/markitdown`, 0.1.8):

```
markitdown apps/reisinger.pictures/public/agb/agb-1.pdf > <temp>/agb.md
```

Working files (dump, generator, screenshots, word comparison) live **outside the
repository** — in the OS temp directory, never as helper files in the project.

## The hard rule: the wording is untouchable

The signed PDF is the reference; text and signature must not drift apart. **No word, no
punctuation mark, no quotation mark and no umlaut may change, nothing is added, nothing
is cut, nothing is summarised.** A wording defect in the signed version stays a defect in
the reproduction.

Only structure may be edited:

- section titles become `##` (`1. Geltung & Allgemeines`, `1. Datenschutz auf einen Blick`, …)
- sub-headings that already stand on their own line in the PDF become `###` (DSB:
  `Server-Log-Dateien`, `Kontaktformular und E-Mail-Kontakt`, `Zwecke und Rechtsgrundlagen:`,
  `Besonderheit bei TFP-Shootings (Time for Prints)`, `Hinweis zu TFP`,
  `YouTube mit erweitertem Datenschutzmodus`)
- PDF wrap breaks inside one paragraph are joined into one paragraph
- numbered clauses keep their numbers (markdown ordered list); `●` becomes `-`; the four
  sub-bullets of AGB §4 stay nested under clause 1
- the document header (title, byline / address block) keeps its own paragraphs

## Known defects of the signed originals (do not "fix" them)

- AGB §2.1: „Der Fotograf steht das alleinige Urheberrecht an allen Aufnahmen zu." —
  grammatically wrong, but that is the signed sentence.
- AGB §2.3: `“Fotos“` (two U+201C characters) versus „Fotograf“ in §1.1 — the mixed
  quotation marks are the original's. The reproduction copies the code points verbatim.
- AGB §11.3: „an Vereine  Marken, Designer oder Agenturen" (double space).
- AGB §11.4: „Nutzung gemäß Pkt. 11.3 Die genaue Anzahl …" (the full stop after 11.3 is
  missing in the original).
- DSB, last line: „… finden Sie in deren Datenschutzerklärung unter:" — the sentence ends
  with a colon, **no URL follows in the PDF**, and the file carries no `/URI` annotation at
  that place. The URL must not be invented; the PDF (owner/lawyer) has to fix it.
- No signature or date line is *drawn* on any page (all pages inspected, rendered via
  PDFKit) — the signature is embedded as an invisible signature object instead, see
  „Embedded digital signatures". The page hint „Signierte Originalfassung" is the owner's
  wording and stays.

## Embedded digital signatures (recorded, not validated)

Both PDFs carry an *invisible* digital signature: a signature field (`/FT /Sig`,
`/T (Signature1)`) with a signature dictionary holding `/Type /Sig`,
`/Name (Florian Reisinger)`, `/Location (Signature Box)`, `/Reason (Signature)`,
`/Filter /asign.ECDSA`, `/SubFilter /ETSI.CAdES.detached`, a signing time `/M` and a
`/ByteRange`:

| PDF | signing time `/M` | `/ByteRange` |
| --- | --- | --- |
| `agb-1.pdf` | `D:20260101192128+01'00'` | `[0 121546 140492 1126]` |
| `dsb-1.pdf` | `D:20251207192332+01'00'` | `[0 141008 159954 1136]` |

**No independent cryptographic validation was performed.** Neither the certificate chain
nor whether the byte ranges actually cover the whole document was checked, so this rule
makes no claim about the *validity* or trustworthiness of the signatures — it only records
that the signature objects and their metadata are present in both files.

## How word equality is verified

1. Normalise the markitdown template and the text on the page identically: drop markdown
   line markers (`#…`, `- ` at line start) and the `●` glyph, collapse whitespace.
   Everything else — punctuation, quotation marks, umlauts, hyphens inside words — is
   compared **verbatim and in order**.
2. Compare both word sequences with `difflib.SequenceMatcher`; the only accepted result is
   **0 non-`equal` opcodes**. Report the compared word counts.
3. Measured 2026-10-18, re-verified after the version-sort fix: AGB **1272/1272 words,
   0 deviations**; DSB **1256/1256 words, 0 deviations**. (`wc -w` of the raw markitdown
   output is 1276 / 1277 — it also counts the four (AGB) / 21 (DSB) `●` markers.)

Paragraph structure is not guessed from sentence endings (the originals wrap after a full
stop inside a paragraph). It is read from the PDF's own page geometry: a PDFKit row dump
(line gaps, x indents) is aligned word-wise to the markitdown template. Normal leading is
≈ 12.5–14.8 pt, real paragraph gaps are ≥ 20 pt; a gap ≤ 0 is a page break and must not
create a paragraph break. Two spots in the DSB where the measured gap is a layout artifact
(the SSL paragraph and the „Ich nutze YouTube …" paragraph) are recorded as explicit
`noBreakAfter` exceptions in the generator instead of being silently re-worded.

Markdown rendering may turn URLs and the e-mail address of the reproduction into links
(GFM autolink literals, e.g. `https://reisinger.pictures/dsb`, `florian@reisinger.pictures`
and the quoted `„https://“`). In the DSB, the quoted `„http://“` is instead emitted from an
MDX string expression, so the visible and accessible text remains exactly `„http://“` without
creating an autolink. This is a markup-only exception; the legal wording stays verbatim.

Page check after a change (built output, Playwright): PDF link present, **0 `<iframe>` /
`<embed>`**, headings carry ids, the nested list exists, paragraph measure ≈ 48 rem, and
the text is readable at 390 px as well as 1280 px. Run it against a fresh `dist` — a stale
build hid the whole change once.

## Re-generating when a new version arrives

A new signed PDF (new `agb-2.pdf` / `dsb-2.pdf` plus a new `src/content/agb.json` /
`dsb.json` entry) must be accompanied by a regenerated text: run `markitdown`, rebuild the
structure, run the word comparison above and only then publish. The link follows the
collection automatically, the text does not — a new version must never go live with the
old text, and the old text must not be offered as the new version.

## Out of scope / open

- Legal wording, amount of the texts and the DSB's truncated last line: owner/lawyer.
- Table of contents: rule 12 — no template emits one any more, so `/agb/` and `/dsb/`
  currently render none; a table of contents would have to be placed by hand with
  `<TableOfContents />` where wanted.
- The cryptographic validity of the embedded signatures (certificate chain, coverage of the
  byte ranges, timestamp trust) is not verified — see „Embedded digital signatures": only the
  presence of the `/Sig` objects and their metadata is recorded in this repository.
