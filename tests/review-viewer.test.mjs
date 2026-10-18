import assert from "node:assert/strict";
import test from "node:test";

import {
  applyCommentInput,
  buildUpdatedReviewData,
  reconcileCommentDrafts,
} from "../review-viewer.js";

test("export adds comments without dropping other review fields", () => {
  const source = [{
    id: "image-1",
    bild: "images/source.jpg",
    originalerDateiname: "source.jpg",
    finalerDateiname: "final.jpg",
    finaleDescription: "Eine Beschreibung.",
    _technical: { exposure: "1/500" },
    reviewComment: "Vorheriger Hinweis",
  }];
  const result = buildUpdatedReviewData(source, new Map([
    ["image-1", {
      value: "<script>alert('internal')</script>",
      baseline: "Vorheriger Hinweis",
      conflict: false,
    }],
  ]));

  assert.deepEqual(result[0], {
    ...source[0],
    reviewComment: "<script>alert('internal')</script>",
  });
  assert.equal(source[0].reviewComment, "Vorheriger Hinweis");
});

test("export removes a cleared optional comment and keeps all other fields", () => {
  const source = [{
    id: "image-1",
    bild: "images/source.jpg",
    originalerDateiname: "source.jpg",
    finalerDateiname: "final.jpg",
    finaleDescription: "Eine Beschreibung.",
    reviewComment: "Zu entfernen",
  }];

  const result = buildUpdatedReviewData(source, new Map([
    ["image-1", { value: "  ", baseline: "Zu entfernen", conflict: false }],
  ]));

  assert.equal("reviewComment" in result[0], false);
  assert.equal(result[0].finaleDescription, source[0].finaleDescription);
});

test("a review record removed from review.json keeps the local comment and warns", () => {
  const sourceRecord = {
    id: "image-9",
    bild: "images/source.jpg",
    originalerDateiname: "source.jpg",
    finalerDateiname: "final.jpg",
    finaleDescription: "Eine Beschreibung.",
    reviewComment: "Vorheriger Hinweis",
  };
  const drafts = new Map([[
    "image-9",
    {
      value: "Neuer lokaler Hinweis",
      baseline: "Vorheriger Hinweis",
      sourceRecord,
      conflict: false,
      missing: false,
      keepMissing: false,
    },
  ]]);

  const reconciled = reconcileCommentDrafts([], drafts);
  assert.equal(reconciled.get("image-9").missing, true);
  assert.equal(reconciled.get("image-9").conflict, true);

  const kept = new Map([[
    "image-9",
    { ...reconciled.get("image-9"), conflict: false, keepMissing: true },
  ]]);
  assert.deepEqual(buildUpdatedReviewData([], kept), [
    { ...sourceRecord, reviewComment: "Neuer lokaler Hinweis" },
  ]);
});

test("export refuses to run while a comment conflict is unresolved", () => {
  const source = [{
    id: "image-1",
    bild: "images/source.jpg",
    originalerDateiname: "source.jpg",
    finalerDateiname: "final.jpg",
    finaleDescription: "Eine Beschreibung.",
  }];
  const drafts = new Map([[
    "image-1",
    { value: "Lokaler Entwurf", baseline: "", conflict: true },
  ]]);

  assert.throws(
    () => buildUpdatedReviewData(source, drafts),
    /Resolve the review comment conflict for image-1/,
  );
});

test("poll reconciliation preserves local edits and marks concurrent comment changes", () => {
  const drafts = new Map([[
    "image-1",
    {
      value: "Lokaler Entwurf",
      baseline: "",
      sourceRecord: { id: "image-1" },
      conflict: false,
    },
  ]]);

  const reconciled = reconcileCommentDrafts([
    { id: "image-1", reviewComment: "Neu aus der Datei" },
    { id: "image-2" },
  ], drafts);

  assert.equal(reconciled.get("image-1").value, "Lokaler Entwurf");
  assert.equal(reconciled.get("image-1").conflict, true);
  assert.equal(reconciled.size, 1);
});

test("typing the remote value back clears the draft and requests an immediate re-render", () => {
  const conflicted = {
    value: "Lokaler Entwurf",
    baseline: "",
    conflict: true,
    missing: false,
    keepMissing: false,
  };

  const { draft, reRender } = applyCommentInput({
    value: "Neu aus der Datei",
    remoteComment: "Neu aus der Datei",
    hasRemoteEntry: true,
    existingDraft: conflicted,
    sourceRecord: { id: "image-1" },
  });

  assert.equal(draft, null);
  assert.equal(reRender, true);
});

test("matching the remote value without a conflict clears the draft without re-rendering", () => {
  const typed = {
    value: "restored",
    baseline: "restored",
    conflict: false,
    missing: false,
    keepMissing: false,
  };

  const { draft, reRender } = applyCommentInput({
    value: "restored",
    remoteComment: "restored",
    hasRemoteEntry: true,
    existingDraft: typed,
    sourceRecord: { id: "image-1" },
  });

  assert.equal(draft, null);
  assert.equal(reRender, false);
});

test("a comment on an entry missing from review.json starts as a conflict", () => {
  const { draft, reRender } = applyCommentInput({
    value: "Lokaler Hinweis",
    remoteComment: "",
    hasRemoteEntry: false,
    existingDraft: undefined,
    sourceRecord: { id: "image-9" },
  });

  assert.equal(reRender, false);
  assert.equal(draft.conflict, true);
  assert.equal(draft.missing, true);
  assert.equal(draft.baseline, "");
  assert.deepEqual(draft.sourceRecord, { id: "image-9" });
});
