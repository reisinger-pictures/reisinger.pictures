---
name: blog-beitrag
description: Use when turning a set of event photographs and optional context into a reviewed German blog article with image descriptions, SEO filenames, galleries, and project metadata. Supports sports and non-sports events, optional technical image classification, and human approval before any deliverable is written.
---

# Event Blog Production

## Purpose and Scope

Use this skill to turn an unordered set of event images into:

- accurate, standalone German image descriptions;
- safe, descriptive filenames and generated image slugs;
- a factually grounded German blog article in the repository's content format;
- an approved gallery and hero-image selection;
- valid YAML sidecars and content references.

The workflow is deliberately event-agnostic. Do not assume a sport, teams,
people, venue, competition, event format, or timing model. Derive those facts
from user-provided context, repository content, EXIF data, and visible image
content. Treat every interpretation as a proposal until the user approves it.

Read the repository's `AGENTS.md`, relevant files in `rules/`, the content
schema, and applicable skills before starting. Repository rules override this
skill when they are more specific.

## Agent Responsibilities

The global OpenCode configuration defines these relevant subagents:

- **`vision-creative`:** Visual interpretation, subject/action description, internal grouping, and creative image categorization. The configured limit is 10 images per call. It cannot edit files or run shell commands. Use it for what is visible, not for unverified facts.
- **`vision-technical`:** Technical or classification work such as colors, equipment, insignia, uniforms, or visual group membership. The configured limit is 10 images per call. Request it only when that classification affects the article or metadata. It must return evidence and uncertainty, not polished copy.
- **`author`:** Drafts or restructures the article from verified facts, approved image mappings, and the requested tone. It must not invent facts or silently resolve ambiguous image interpretations.

The main agent remains responsible for file discovery, repository inspection,
EXIF extraction, context matching, fact checking, descriptions, filenames,
renames, YAML/MDX changes, and verification. Do not refer to an undefined
generic `vision` agent or delegate file operations to a vision subagent.

Run independent vision batches in parallel only when the results do not affect
one another and the runtime permits it. Use sequential calls when an earlier
result changes chronology, matching, or context for a later batch.

## Inputs and Discovery

Accept any of the following inputs:

- an image directory or an explicit list of image paths;
- an event description, notes, or an official event log;
- a roster, participant list, glossary, or other identification aid;
- optional preferences for article structure, audience, or SEO focus.

If the user gives only a directory, inspect that directory and its relevant
parent directories for context files. Do not assume a filename or silently use
unrelated notes. If no context is found, continue with visible facts and mark
missing information instead of guessing.

When context is available, include the complete relevant context in every
vision prompt. Do not reduce it to team names or a short event label when it
also contains lineups, numbers, colors, timing, locations, or other facts that
can affect identification.

Use the formats supported by the repository's image pipeline. Do not impose an
arbitrary total-image limit. Split the work into batches of at most 10 images
for each vision-agent call.

## Event Classification

Classify the work before analysis:

- **Timed event:** An official clock, period, round, or event log can be matched to image timestamps. This includes sports, but is not limited to sports.
- **Untimed event:** Images are ordered by EXIF time and visual continuity; no official event clock is inferred.
- **Mixed event:** Process separately timed and untimed sections when an event contains both, such as a competition and a staged programme.

For a timed event, identify the actual timing model before matching images:

- running clock or stopped clock;
- periods, rounds, stages, or halves;
- breaks, interruptions, overtime, or other timing offsets;
- timezone and clock accuracy of the source data.

Never apply a sport-specific formula by habit. If the timing model or break
duration is unclear and exact matching matters, ask the user before assigning
precise event times.

## Workflow

### 0. Prepare the Workspace

1. Locate the repository root and the relevant application/content root.
2. Read the applicable schema and inspect nearby existing content before choosing a format.
3. Check the working tree. Preserve user changes and do not overwrite unrelated files.
4. Establish the input image list and exclude generated assets, thumbnails, and unrelated reference material.

Do not write published files during preparation. Scratch data may be kept only
when the repository explicitly provides a place for it.

### 1. Build the Image Inventory First

Before any visual interpretation, collect capture metadata for every input
image, regardless of whether a live ticker or other event log exists. Use
`exiftool` or the repository's metadata utility and record:

- full path and current filename;
- `DateTimeOriginal` or the best available capture date;
- dimensions and orientation;
- relevant camera/lens data when the project uses it;
- missing or ambiguous values.

Example command shape, adapted to the discovered image paths:

```bash
exiftool -DateTimeOriginal -Aperture -FocalLength -ShutterSpeed -ISO -Model -LensModel -ImageWidth -ImageHeight -Orientation -json <image-paths>
```

Preserve the original EXIF data. An absent timestamp is `unknown`; it is not a
reason to invent a time. Sort timestamped images chronologically and retain a
stable fallback order for images without timestamps. For untimed events, use
the EXIF sequence together with visual continuity to detect moments that belong
to the same situation. EXIF is not only for ticker matching.

For timed events, create a provisional time mapping only after the timing model
is understood. Use at least two trustworthy anchors where possible and prefer a
time range or relative position over false precision. The image itself can
correct a provisional match, but cannot prove an event fact that is not visible.

### 2. Read and Normalize Context

Read the supplied event context directly. Extract only facts that can be
supported by the source and keep the source distinction clear:

- **Observed:** directly visible in the image;
- **Documented:** stated in the event context or supplied reference data;
- **Inferred:** plausible combination of observations and documentation;
- **Unknown:** not sufficiently supported.

For identification, use a supplied roster or participant list together with
visible numbers, names, clothing, role, sequence, and event context. Never
identify a person from facial resemblance alone. Do not turn an uncertain name
into a fact merely because it is the only plausible candidate.

### 2.1 Handling User Comments About Images

User comments about an image are internal evidence, corrections, or hypotheses;
they are never publishable copy. Never transfer a comment verbatim into an
image description, filename, gallery text, or article paragraph.

Process every comment in this order:

1. Extract the semantic correction or observation from the comment.
2. Compare it with the pixels, EXIF sequence, event context, and available roster.
3. If the main model is vision-capable, it must read and inspect the affected
   image itself before changing the interpretation. Do not delegate that single
   image to a vision subagent.
4. If the main model is not vision-capable and the correction changes the
   action, identity, or scene interpretation, re-read a larger coherent batch
   with `vision-creative` (for example the complete series or neighbouring
   scene), never an isolated single-image correction call.
5. Rewrite the affected description and filename from scratch as standalone,
   factual German copy.
6. Remove conversational wording, internal references, instructions, and
   uncertainty notes that belong only to the working process.

This applies even when the comment is precise or phrased as a ready-made
caption. A comment such as a scene correction may change the final wording, but
the final wording must be newly composed from the validated meaning. Preserve
only the underlying fact that is supported by the image or context.

### 3. Analyse Images with `vision-creative`

Split the inventory into chronological or thematically coherent batches of no
more than 10 images. The batch plan must ensure:

- all images that belong to one recognizable situation or continuous series in
  the same batch, even when that batch contains fewer than 10 images;
- no unrelated images merely to fill the remaining batch capacity;
- neighbouring images when they are needed to understand the sequence or
  distinguish the moment from a similar adjacent moment.

Send each batch with:

- absolute image paths;
- event type and relevant context;
- EXIF capture times and known sequence information;
- roster or participant mapping, if supplied;
- the output contract below;
- timed-event context only when it is applicable.

Ask for one result per image containing:

- current filename;
- one internal category;
- visible subjects, action, setting, and composition;
- visible names or numbers and the evidence for each identification;
- confidence for non-obvious identifications;
- series or scene membership;
- ambiguity flags and alternative interpretations when more than one reading is credible;
- a timed-event reference and reasoning, only for timed events.

Prioritize sharp, central, relevant content. Treat strongly blurred foregrounds,
backgrounds, and incidental people as secondary. Describe what is visible, not
what might have happened immediately before or after the exposure.

Use these internal categories consistently, without exposing them in the user
approval table:

- **[A] Main action:** the central performance, interaction, movement, or event;
- **[B] People and emotion:** a portrait, reaction, participant, or personal moment;
- **[C] Context and atmosphere:** venue, audience, environment, equipment, or detail.

Every image gets exactly one category. The category is editorial metadata, not a
claim about importance or quality.

**Incremental `review.json` updates (mandatory).** Convert each returned vision
batch immediately: derive the German description and the filename proposal for
every image in that batch, and insert the entries into the root `review.json`
in chronological order (contract in Section 8). Never wait until all batches
have returned before writing. Check each proposed filename against the entries
already present so no name collides, and revise affected entries as soon as new
context (a later batch, a user comment, or the reconciliation pass) corrects or
disambiguates an interpretation. The viewer polls `review.json` live, so a
human can start reviewing the approved images while the remaining batches are
still in flight.

### 4. Add Technical Classification When Needed

Use `vision-technical` for questions that require visual classification rather
than creative wording, for example a color-based group distinction or an
equipment/insignia classification. Batch no more than 10 images per call.

The output must state the observation, the resulting classification, the
confidence, and any limitation. Do not use a technical classification to
override a clear visible fact or to fabricate a person's identity.

### 5. Reconcile and Sanity-Check

Before writing descriptions or an article, the main agent checks:

- EXIF order versus the claimed scene progression;
- consistency of people, clothing, numbers, and group membership across a series;
- duplicate or near-duplicate images;
- timed-event matches against the source context and the actual timing model;
- contradictions between agent outputs and source facts;
- whether a name is supported strongly enough to publish;
- whether each ambiguity is resolved or must be presented to the user.

For the initial analysis, keep every recognizable situation or continuous series
together, even when doing so creates smaller batches. Never split a situation
only to reach the maximum batch size.

When a contradiction can be resolved by a more focused inspection, the
vision-capable main model performs that inspection itself. If the main model
cannot read images, re-run a larger coherent batch through `vision-creative`
with the correction as context. Avoid isolated single-image subagent calls for
corrections because they lose series context and create inconsistent naming.
Do not silently choose between credible interpretations.

### 5.1 Result and Tone Guard

Keep three kinds of statements separate:

- **Image observation:** what the photograph visibly shows;
- **Source fact:** a result, statistic, event detail, or quote stated in the supplied context;
- **Editorial interpretation:** a conclusion about dominance, momentum, importance, or emotional meaning.

A final score proves the result and, depending on the sport, may indicate a
large margin. It does not by itself prove that one side dominated every phase,
that the opponent was without a chance, or that every pictured action reflects
the overall match. Do not infer those claims from a single image or from the
score alone.

Before publishing a strong result-related statement, require explicit support
in the event context, such as period scores, statistics, a documented match
report, or a direct quote. Otherwise use a neutral factual formulation or omit
the claim. Treat wording such as `deklassiert`, `chancenlos`, `jederzeit im
Griff`, `nichts entgegenzusetzen`, `ließ nichts anbrennen`, `klar überlegen`,
`Sinnbild für den gesamten Abend`, or similar victory praise as a warning for
manual verification, not as automatically valid copy.

This is an editorial warning, not a schema error. Do not reject a complete
review because one description is too promotional. Flag the affected entries,
verify each claim against the context, and revise only the unsupported or
excessive wording. A strong formulation may remain when the source clearly
supports it, but it should not be repeated mechanically across the gallery.

Do not repeat the final result in every image description. Include it only when
it adds useful, source-backed context; the article introduction or match
summary is usually the right place for the overall result. Descriptions should
remain primarily about the pictured subject and action.

### 6. Prepare Image Descriptions and Filename Proposals

Create one proposal per unambiguous image. Each German description must be:

- factual, concise, and understandable without neighbouring images;
- based on visible content and verified context;
- explicit about a clearly identifiable main person when the identity is supported;
- newly formulated from validated observations; never copied from a user comment;
- free of internal review notes, references to other images, and speculative claims;
- free of unsupported victory praise, superlatives, or claims about the complete event;
- phrased positively rather than describing absent objects or failed possibilities;
- suitable for the repository's SEO and accessibility conventions;
- free of generic filler tails such as “am Spielfeldrand”, “an der Seitenlinie”, “im Bild zu sehen” or a bare stadium name when they add no distinguishing information — end on the action, emotion or relevant context instead.

For this project, aim for concise sidecar descriptions around 200 characters as a
soft target (not a hard limit) and use only the permitted German letters, ASCII
letters, digits, standard punctuation, and spaces. Do not include emoji or
accidental non-Latin output. **Never truncate a description to meet the length**
— rewrite it from scratch as a complete, grammatically closed German sentence
(ending with a period). If a description naturally needs more than 200
characters for clarity, a slightly longer complete sentence is preferable to an
abruptly cut one; avoid orphaned phrases (e.g. "der Wiener."). Before writing
and before the review, run a soft check: `python3 -c "import json; [print(e['id'], len(e['finaleDescription'])) for e in json.load(open('review.json')) if len(e['finaleDescription'])>220 or not e['finaleDescription'].endswith('.')]"` — long
descriptions are a warning for concise rewriting, not an automatic rejection.

Propose filenames that are:

- lowercase, descriptive, and separated with hyphens;
- free of umlauts and `ß` (`ae`, `oe`, `ue`, `ss`);
- concise, normally no more than five or six meaningful words;
- based on the image content, not internal comments or an invented identity;
- free of a repeated event-folder name when the generated slug already includes that folder path.

Do not expose the internal category in the approval table. Use this format:

```text
| Current filename | Proposed filename | German description | EXIF time | Event reference |
| :--- | :--- | :--- | :--- | :--- |
| <current-file> | <proposed-file> | <description> | <timestamp-or-unknown> | <reference-or-not-applicable> |
```

Omit the event-reference column for untimed events. Keep ambiguous images out
of the table until the user has selected an interpretation.

### 7. Propose the Article Structure, Then Draft with `author`

After image analysis and reconciliation, the main agent must derive a rough
article structure from the material itself. Do not let `author` invent the
structure from a flat image list. The main agent identifies:

- the dominant story or visual theme;
- chronological or thematic image groups and their boundaries;
- a possible opening image, hero image, climax, transition, and conclusion;
- which groups deserve a gallery and which are supporting material;
- the facts and images that belong to each article section;
- gaps, uncertain identifications, and facts that must not be stated.

The structure is an editorial plan, not a second source of facts. It must be
based on the reconciled image analysis, EXIF order, and verified context. It
should remain useful for any event type and must not force a sports-style
narrative onto a portrait, cultural, travel, or lifestyle event.

When the material allows more than one reasonable editorial treatment, prepare
two or three concrete structure proposals before requesting the final article
draft. Each proposal states:

- whether one article or multiple articles are recommended;
- the proposed article focus and search intent;
- the number of galleries and the image group assigned to each gallery;
- the section order and the role of the hero image;
- which facts and images are shared or deliberately excluded;
- the advantages, risks, and likely thin-content or duplication problems;
- the recommended option and the reason for that recommendation.

Do not split an event merely because there are many images. Multiple articles
make sense only when the groups have independent topics, audiences, narratives,
or search intents and each resulting article can stand on its own. Multiple
galleries make sense when groups have a clear editorial distinction or change
of scene, phase, perspective, or subject. Avoid galleries that exist only to
divide a long list without improving navigation or storytelling.

The main agent presents these options to the user and records the selected
option before asking `author` for the final article draft. The user decides
the number of articles and galleries. The agent's recommendation is advisory,
not an automatic approval.

Use this structure for the decision material:

```text
## Structure option <A/B/C>
Articles: <one or more>
Focus: <distinctive editorial focus and search intent>
Hero: <candidate and reason>
Galleries: <number and image group for each>
Sections: <ordered section list>
Benefits: <why this helps the reader>
Risks: <thin content, duplication, weak transitions, or SEO risks>

Recommendation: <option and concise reason>
```

If multiple articles are selected, each article needs its own coherent focus,
title, description, hero image, gallery plan, and search intent. Do not reuse
the same image in several articles unless there is a deliberate editorial
reason. Avoid near-duplicate articles that differ only by headline or gallery
selection; merge them or leave the weaker topic unpublished.

Give `author` the verified facts, this article structure, image mapping,
intended audience, tone, SEO requirements, and the repository's content
constraints. If an event context file exists, pass its direct path as well as
the fact summary; a summary must not replace the source document.

Call `author` only after the user has selected the article and gallery
structure and after the image mapping has passed the viewer review. The draft
must use the reviewed filenames and descriptions, not an earlier provisional
mapping.

Require the article to:

- be written in German;
- use only supported facts and clearly mark uncertainty for the main agent;
- begin with a concise newspaper-style lead paragraph in bold Markdown (`**...**`). The lead summarizes the central event, subject, or result and must add information beyond the title;
- have a meaningful title, optional subtitle, introduction, coherent sections,
  and a conclusion appropriate to the event;
- use longer, connected paragraphs instead of a stream of one-sentence paragraphs;
- place images where they strengthen the narrative;
- use the repository's Gallery/component conventions, never raw `<img>` tags;
- avoid line-up, substitution, or technical lists unless the user explicitly requests them.

If the material contains clearly separate image groups and the best gallery
structure is uncertain, `author` may comment on the selected proposal after
receiving it. This is a secondary editorial opinion; the main agent must keep
the alternatives, trade-offs, and user decision explicit.

Gallery rule for this project:

- one gallery: place it after the complete text, including the conclusion;
- multiple galleries: group them by meaningful scene or editorial section, with
  explanatory text before and after where appropriate.

Also prepare two or three title/description options when the final SEO framing
is not already approved. Prefer specific event, participant, location, and
activity terms supported by the source over generic keyword stuffing.

### 8. Visual Review via `review.json` and `review.html`

The visual review happens outside the chat. `review.json` is the local source
of truth for the proposed/final image filename and description; `review.html`
is the fixed viewer. Do not replace this workflow with a chat table or a chat
questionnaire.

1. Write one object per reviewable image to the root `review.json`. Fill the
   file **incrementally and immediately**: after every returned vision batch,
   insert its entries (chronologically) without waiting for the remaining
   batches. Correct entries right away when a later batch, a user comment, or
   the reconciliation pass changes an interpretation. Do this before the final
   article draft so the draft cannot drift away from the reviewed image
   mapping.
2. Each object contains at least `id`, `bild`, `originalerDateiname`,
   `finalerDateiname`, and `finaleDescription`. Keep `bild` relative to the
   project root. Preserve optional technical fields only when the viewer or
   workflow supports them.
3. Keep `review.html` fixed. It loads `review.json` and must not be regenerated
   for individual events. Open it through an HTTP server, not `file://`.
4. Validate the data against `schemas/review.schema.json` before opening the
   viewer:
   ```bash
   pnpm run review:validate
   ```
5. The user checks the actual image against its proposed/final filename and
   description in the viewer. A short approval signal is sufficient; detailed
   caption discussion does not take place in the chat.
6. If a correction is needed, update the corresponding `review.json` entry,
   reload the viewer, and repeat the visual check.

An image with unresolved interpretations must not be silently assigned a
specific person, action, or event. Either resolve it through a focused
re-analysis before adding it to `review.json`, use a genuinely neutral
description and filename, or exclude it from the article. Do not add fields
for alternatives, approval status, or comments unless `review.html` has been
updated to render and support those fields.

`review.json` is local and must not be committed. `review.html` is the shared,
committed viewer. Do not create additional review UIs or progress files.
The committed `schemas/review.schema.json` is the data contract for all
`review*.json` files; IntelliJ is configured to associate that schema with the
review files in this project.

The article structure and article draft are produced from the reconciled image
analysis and are not part of the image-caption table. The main agent must still
verify factual consistency before writing the article. The selected article and
gallery structure is the user's editorial decision, not an implicit result of
the visual viewer. Once the viewer review and structure decision are complete,
the main agent passes the final mapping and structure to `author` and then
writes the approved deliverables.

No published image, YAML sidecar, `index.mdx`, rename, or reference update may
be written before the viewer-based review has been completed. If the workflow
supports partial approval, process only the reviewed images and leave the
remaining work pending.

### 9. Rename and Write Only After Approval

Before changing files:

1. Build a complete rename plan from full paths, not bare filenames.
2. Check each target image and companion YAML for collisions in the target directory.
3. Resolve collisions with another descriptive filename and obtain approval for the changed proposal.
4. If renames form a cycle, use temporary names so no file is overwritten.
5. Update references using the full generated slug, including its folder prefix. Never perform a global replacement of a bare image basename.
6. Preserve all unrelated user changes.

Run `pnpm run review:validate` again after every correction to `review.json` and
before applying the rename plan. Schema validity does not replace the visual
review: it only proves that the data has the expected shape and references
existing image files. The result-and-tone guard is a separate semantic check by
the main agent and is intentionally not encoded as a hard JSON-Schema failure.

For each published image, create or update the companion YAML with only the
fields allowed by the repository workflow. In this project, the agent writes
only `description`; `slug`, `metadata`, and `categories` are generated by
`add-metadata.mjs`. Never copy EXIF values into YAML manually.

For each portfolio article, write `index.mdx` according to the discovered
content schema. In the current portfolio collection, the frontmatter must
contain `title`, `date`, and `heroImage`; `description`, `keywords`, and
`updated` are optional according to the schema. Use image slugs in `heroImage`
and gallery arrays, import the existing Gallery component, and keep each
article's gallery list free of duplicates.

### 10. Generate Metadata and Verify the Build

Run commands from `apps/reisinger.pictures/` unless the repository scripts say
otherwise:

```bash
node ../../packages/tools/scripts/add-metadata.mjs
```

Inspect the generated slug and metadata before processing images. Then run the
complete prebuild, which also creates the image manifest:

```bash
pnpm run prebuild
```

Verify that:

- every generated slug has the expected folder prefix;
- metadata and categories contain no undefined values;
- orientation and capture dates are plausible;
- every `heroImage` and gallery reference resolves to an existing generated slug;
- no gallery contains an accidental duplicate;
- the final descriptions pass the character and length checks.

Run the project build after reference changes:

```bash
pnpm run build
```

Do not run publishing or deployment commands unless the user explicitly asks
for publication. Report failed checks with the relevant file and cause.

## Repository-Specific Guardrails

- Use `pnpm`, not `npm`.
- Do not delete `.cache/`, `.astro/`, `dist/`, or `.imagedist/`. Run `astro sync` for content-index changes instead of deleting caches.
- Do not delete published source images. After all approved deliverables are complete, remove temporary event-context files and reference-only images according to the repository's `AGENTS.md`; preserve anything explicitly marked as permanent.
- Keep article text and image descriptions in German. Keep code, filenames, frontmatter keys, and technical documentation in English unless an existing project convention requires otherwise.
- Use the project's `ResponsiveImage` and Gallery mechanisms. Never add a standard `<img>` tag to published site content. The standalone `review.html` viewer is an intentional technical exception because it loads local review images directly.
- Follow the naming and full-slug reference rules in `rules/01-naming-conventions.md`.
- Follow the content schema rather than assuming frontmatter types. In the current portfolio collection, `title` and `heroImage` are required, `date` is coerced to a date, and `description`, `keywords`, and `updated` follow the schema's optionality.

## Completion Criteria

The task is complete only when:

- all processed images have approved descriptions and filenames;
- all ambiguities have been resolved by the user or remain explicitly excluded;
- the user-selected article and gallery structure is documented in the working context;
- renames and full-slug references are consistent;
- generated metadata and image manifests are valid;
- `review.json` passes `schemas/review.schema.json` validation;
- the build and link checks pass;
- no temporary review UI or unapproved deliverable remains;
- the final response states what was changed and which checks were run.
