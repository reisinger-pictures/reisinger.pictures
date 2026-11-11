import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

import {
  applyCommentInput,
  buildUpdatedReviewData,
  commentForSave,
  hasUnresolvedConflicts,
  reconcileCommentDrafts,
  settleDraftsAfterSave,
} from "../review-viewer.js";

const { JSDOM } = createRequire(new URL("../apps/reisinger.pictures/package.json", import.meta.url))("jsdom");
const viewerMarkup = `
  <div id="hint"></div>
  <div id="save-status"><span class="label"></span></div>
  <div id="conflict-summary"></div>
  <div id="review-items"></div>
`;
const initialRevision = `"${"a".repeat(64)}"`;
let viewerImportId = 0;

function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}

function entry(reviewComment, finaleDescription = "Eine Beschreibung.") {
  return {
    id: "image-1",
    bild: "images/source.jpg",
    originalerDateiname: "source.jpg",
    finalerDateiname: "final.jpg",
    finaleDescription,
    ...(reviewComment === undefined ? {} : { reviewComment }),
  };
}

function jsonResponse(data, { status = 200, revision } = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...(revision ? { ETag: revision } : {}),
    },
  });
}

async function waitFor(predicate, message) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (predicate()) return;
    await new Promise(resolve => setImmediate(resolve));
  }
  assert.fail(message);
}

async function mountReviewViewer(fetchImplementation) {
  const dom = new JSDOM(viewerMarkup, { url: "http://localhost/review.html" });
  const intervalCallbacks = [];
  const globalNames = ["window", "document", "fetch", "setInterval"];
  const originalGlobals = new Map(globalNames.map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
  const restoreGlobals = () => {
    for (const [name, descriptor] of originalGlobals) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else delete globalThis[name];
    }
  };

  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.fetch = fetchImplementation;
  globalThis.setInterval = callback => {
    intervalCallbacks.push(callback);
    return intervalCallbacks.length;
  };

  try {
    await import(`../review-viewer.js?dom-test=${++viewerImportId}`);
    await waitFor(() => dom.window.document.querySelector("textarea"), "The review viewer did not render its first entry.");
  } catch (error) {
    restoreGlobals();
    dom.window.close();
    throw error;
  }

  return {
    dom,
    intervalCallbacks,
    dispose() {
      restoreGlobals();
      dom.window.close();
    },
  };
}

function typeComment(dom, value) {
  const textarea = dom.window.document.querySelector("textarea");
  textarea.value = value;
  textarea.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
}

function flushSave(dom) {
  dom.window.dispatchEvent(new dom.window.Event("blur"));
}

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

test("blank and whitespace-only comments are dropped before saving", () => {
  assert.equal(commentForSave(""), "");
  assert.equal(commentForSave("   \n "), "");
  assert.equal(commentForSave("  Hinweis  "), "  Hinweis  ");
});

test("conflicts are detected before an automatic save starts", () => {
  assert.equal(hasUnresolvedConflicts(new Map()), false);
  assert.equal(hasUnresolvedConflicts(new Map([
    ["image-1", { value: "a", baseline: "b", conflict: false }],
  ])), false);
  assert.equal(hasUnresolvedConflicts(new Map([
    ["image-1", { value: "a", baseline: "b", conflict: false }],
    ["image-2", { value: "c", baseline: "d", conflict: true }],
  ])), true);
});

test("a successful automatic save drops persisted drafts and re-baselines late edits", () => {
  const drafts = new Map([
    ["image-1", { value: "Gespeichert", baseline: "", conflict: false }],
    ["image-2", { value: "Während des Speicherns getippt", baseline: "", conflict: false }],
    ["image-3", { value: "Nicht Teil des Schreibvorgangs", baseline: "", conflict: false }],
  ]);
  const savedValues = new Map([
    ["image-1", "Gespeichert"],
    ["image-2", "Vorheriger Text"],
  ]);

  const settled = settleDraftsAfterSave(drafts, savedValues);

  assert.equal(settled.has("image-1"), false);
  assert.equal(settled.get("image-2").value, "Während des Speicherns getippt");
  assert.equal(settled.get("image-2").baseline, "Vorheriger Text");
  assert.equal(settled.get("image-3").baseline, "");
  assert.equal(settled.size, 2);
});

test("a cleared comment counts as persisted when the written value is empty", () => {
  const drafts = new Map([["image-1", { value: "   ", baseline: "Alt", conflict: false }]]);

  assert.equal(settleDraftsAfterSave(drafts, new Map([["image-1", ""]])).size, 0);
});

test("the next poll after a save reports no conflict against the viewer's own write", () => {
  const payload = [{ id: "image-1", reviewComment: "Gespeichert" }];
  const drafts = settleDraftsAfterSave(
    new Map([["image-1", { value: "Gespeichert", baseline: "", conflict: false }]]),
    new Map([["image-1", "Gespeichert"]]),
  );

  assert.equal(drafts.size, 0);
  assert.equal(reconcileCommentDrafts(payload, drafts).size, 0);
});

test("the production viewer saves a cleared comment after an in-flight POST", async () => {
  const firstPostGate = deferred();
  const firstRevision = initialRevision;
  const savedRevision = `"${"b".repeat(64)}"`;
  let serverData = [entry()];
  let serverRevision = firstRevision;
  const postRequests = [];
  const viewer = await mountReviewViewer(async (_url, options = {}) => {
    if (options.method !== "POST") return jsonResponse(serverData, { revision: serverRevision });

    const request = {
      payload: JSON.parse(options.body),
      revision: options.headers["If-Match"],
    };
    postRequests.push(request);
    if (postRequests.length === 1) await firstPostGate.promise;
    if (request.revision !== serverRevision) {
      return jsonResponse({ ok: false, code: "STALE_REVIEW_FILE", error: "Die Revision ist veraltet." }, {
        status: 409,
        revision: serverRevision,
      });
    }

    serverData = request.payload;
    serverRevision = savedRevision;
    return jsonResponse({ ok: true }, { revision: serverRevision });
  });

  try {
    typeComment(viewer.dom, "Zwischenstand");
    flushSave(viewer.dom);
    await waitFor(() => postRequests.length === 1, "The first POST did not start.");

    const document = viewer.dom.window.document;
    const saveStatus = document.getElementById("save-status");
    assert.equal(saveStatus.dataset.state, "saving");
    assert.equal(saveStatus.querySelector(".label").textContent, "Speichert …");

    typeComment(viewer.dom, "");
    assert.notEqual(saveStatus.querySelector(".label").textContent, "Gespeichert");
    assert.notEqual(document.querySelector(".comment-status").querySelector(".label").textContent, "Gespeichert");

    firstPostGate.resolve();
    await waitFor(
      () => serverData[0].reviewComment === "Zwischenstand" && saveStatus.dataset.state === "unsaved",
      "The newer cleared draft was not retained after the first POST.",
    );
    assert.equal(document.querySelector("textarea").value, "");

    await new Promise(resolve => setImmediate(resolve));
    flushSave(viewer.dom);
    await waitFor(() => postRequests.length === 2, "The cleared draft did not trigger a second POST.");
    assert.equal(postRequests[1].revision, savedRevision);
    assert.equal("reviewComment" in postRequests[1].payload[0], false);

    await waitFor(
      () => !("reviewComment" in serverData[0]) && saveStatus.dataset.state === "saved",
      "The final server state did not clear the review comment.",
    );
    assert.equal(saveStatus.querySelector(".label").textContent, "Gespeichert");
    assert.equal(document.querySelector(".comment-status").dataset.state, "saved");
    assert.equal(document.querySelector(".comment-status .label").textContent, "Gespeichert");
    assert.equal(postRequests.length, 2);
  } finally {
    firstPostGate.resolve();
    viewer.dispose();
  }
});

test("the production viewer reloads a stale revision and blocks retry on a comment conflict", async () => {
  const remoteRevision = `"${"c".repeat(64)}"`;
  const postRequests = [];
  let getCount = 0;
  const viewer = await mountReviewViewer(async (_url, options = {}) => {
    if (options.method === "POST") {
      postRequests.push(JSON.parse(options.body));
      return jsonResponse({
        ok: false,
        code: "STALE_REVIEW_FILE",
        error: "review.json wurde zwischenzeitlich geändert.",
      }, { status: 409, revision: remoteRevision });
    }

    getCount += 1;
    const data = getCount === 1 ? [entry("Vorheriger Kommentar")] : [entry("Neuere Fassung")];
    return jsonResponse(data, { revision: getCount === 1 ? initialRevision : remoteRevision });
  });

  try {
    typeComment(viewer.dom, "Lokaler Kommentar");
    flushSave(viewer.dom);
    await waitFor(() => postRequests.length === 1, "The stale POST did not start.");
    await waitFor(
      () => viewer.dom.window.document.getElementById("save-status").dataset.state === "error",
      "The stale POST error was not displayed.",
    );

    await viewer.intervalCallbacks[0]();

    const document = viewer.dom.window.document;
    assert.equal(getCount, 2);
    assert.equal(document.getElementById("save-status").dataset.state, "conflict");
    assert.match(document.querySelector('[role="alert"]').textContent, /neueren review\.json/);
    assert.equal(document.querySelector("textarea").value, "Lokaler Kommentar");
    assert.equal(document.querySelectorAll(".comment-status")[0].dataset.state, "conflict");
    assert.equal(postRequests.length, 1, "A genuine remote comment conflict must block automatic retries.");
  } finally {
    viewer.dispose();
  }
});

test("a successful poll applied during a POST is not overwritten by the POST response", async () => {
  const pollGate = deferred();
  const postGate = deferred();
  const polledRevision = `"${"d".repeat(64)}"`;
  const postRevision = `"${"e".repeat(64)}"`;
  let getCount = 0;
  let postCount = 0;
  const viewer = await mountReviewViewer(async (_url, options = {}) => {
    if (options.method === "POST") {
      postCount += 1;
      await postGate.promise;
      return jsonResponse({ ok: true }, { revision: postRevision });
    }

    getCount += 1;
    if (getCount === 1) return jsonResponse([entry()], { revision: initialRevision });
    await pollGate.promise;
    return jsonResponse([entry("Kommentar aus der neueren Datei", "Beschreibung aus der neueren Datei.")], {
      revision: polledRevision,
    });
  });

  try {
    typeComment(viewer.dom, "Lokale Änderung");
    flushSave(viewer.dom);
    await waitFor(() => postCount === 1, "The POST did not start.");

    const poll = viewer.intervalCallbacks[0]();
    await waitFor(() => getCount === 2, "The poll did not start.");
    pollGate.resolve();
    await poll;

    const reviewItems = viewer.dom.window.document.getElementById("review-items");
    let renderCount = 0;
    const observer = new viewer.dom.window.MutationObserver(() => { renderCount += 1; });
    observer.observe(reviewItems, { childList: true });
    postGate.resolve();
    await waitFor(() => renderCount > 0, "The POST success did not re-render the polled data.");
    observer.disconnect();

    const document = viewer.dom.window.document;
    assert.ok(document.querySelector(".desc").textContent.includes("Beschreibung aus der neueren Datei."));
    assert.equal(document.querySelector("textarea").value, "Lokale Änderung");
    assert.equal(document.getElementById("save-status").dataset.state, "conflict");
    assert.equal(postCount, 1);
  } finally {
    pollGate.resolve();
    postGate.resolve();
    viewer.dispose();
  }
});
