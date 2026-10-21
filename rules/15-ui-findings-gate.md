# The UI findings are a number, and the number may only fall

## The rule

The UI findings of the review live in two places, and they are migrated
together:

- `rules/10-ui-review-findings.md` — the **human record**: the finding, the
  screenshot, the suggestion, the discussion;
- `ratchet.findings.json` — the **machine-readable view**: id, title,
  severity, status, `status_since`, owner, ticket, the path of the defect and
  a note.

The gate counts the registry: `open-ui-findings` counts the findings whose
status is `open` or `in-progress`, and its baseline may only **fall**. A new
finding is therefore a **decision**: it either enters the registry with a
decision of its own (`accepted`, `wontfix`) or it enters as `open` — and then
the count rises above the baseline and the gate says so.

The **deliberate** move against the direction has its own command:
`ratchet baseline raise --rule open-ui-findings --value <n> --reason "<text>"`.
The reason is required and travels with the baseline record.

## What the gate does not cover

- The **open work** of the project is not a finding of the review. The two
  lists are counted by different means.
- The **closed rows** of the log are history: the gate counts what is open,
  not what was once found.
- The **re-grade** of the open rows is open work: the rows were graded under
  the retired reading of the levels, and the `ui-review` skill still grades
  the rounds that way.
- The **coverage limit of the review itself**: the log names what was *not*
  looked at (every `dark/mobile` and `dark/intermediate` capture, the
  unreviewed portfolio posts, the testimonial detail pages, the TFP ideas, and
  two pricing pages that were never opened). The count is the number of the
  open rows of **this** log — not the number of the open defects of the site.
- The **registry is a hand-maintained mirror**: an open row that is added to the
  log without an entry in `ratchet.findings.json` is invisible to the gate. The
  drift gate compares the *report*, and the report is generated *from* the
  registry — so a missing entry never shows up as a difference, it is simply
  not counted. The mirror is maintained by hand, in the same commit as the
  prose it mirrors.

## The rules of the registry

- An entry that is not `fixed` carries an **owner** and a **ticket**. The
  ticket of a UI finding is the **review round** it comes from
  (`ui-review-2026-10-18`) — this project has no decision log of its own.
- An entry's **id** is stable: the ids `UI-001`… were minted once, in the
  order of the log, and they stay.
- The **severity** is a property of the finding, the **status** a property of
  its handling. A status never changes a severity.
- A row whose severity was lost with its status is recorded as `info` **with
  a note** that says so — unless the row still supports a level, and then the
  level is recovered from it. An unknown level is stated, never guessed.

## The report

`docs/gates-report.md` is the report of the run — **generated**, never edited
by hand. The drift gate regenerates it and compares it with the committed
version, so a changed count shows up as a diff instead of as a number nobody
reads. Regenerate it with:

```sh
ratchet report --format md --output docs/gates-report.md
```

The report needs the `ratchet` binary on the `PATH` — the CI installs it with
the action, a local run needs it installed.

The report is committed **after** the files it reads: the note about the
baseline is part of the run, and a report generated before the baseline was
committed carries a note the next run does not.

## The CI

`.github/workflows/ratchet.yml` runs the gates on every push to `main`, on
every pull request against `main` and on every manual run
(`workflow_dispatch`): the action installs the released binary, verifies its
SHA-256 against the checksums of the release, and a failing gate fails the job.

The **config of this repository is executable**: the drift gate runs the
generator command from the config. A pull request from a fork therefore runs
the command of that pull request — with the permissions of the workflow
(read-only, no secrets). The commands of this repository are known; a fork that
changes them gets no more than the runner.
