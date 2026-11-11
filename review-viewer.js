export function getReviewComment(entry) {
  return typeof entry.reviewComment === "string" ? entry.reviewComment : "";
}

export function reconcileCommentDrafts(data, drafts) {
  const entriesById = new Map(data.map(entry => [entry.id, entry]));
  const reconciled = new Map();

  for (const [id, draft] of drafts) {
    const entry = entriesById.get(id);
    if (!entry) {
      reconciled.set(id, {
        ...draft,
        missing: true,
        conflict: !draft.keepMissing,
      });
      continue;
    }

    const remoteComment = getReviewComment(entry);
    if (remoteComment === draft.value) continue;

    reconciled.set(id, {
      ...draft,
      missing: false,
      conflict: remoteComment !== draft.baseline,
      keepMissing: false,
    });
  }

  return reconciled;
}

function withReviewComment(entry, value) {
  const updated = { ...entry };
  if (value.trim().length === 0) {
    delete updated.reviewComment;
  } else {
    updated.reviewComment = value;
  }
  return updated;
}

export function buildUpdatedReviewData(data, drafts) {
  const updated = data.map(entry => ({ ...entry }));
  const indexesById = new Map(updated.map((entry, index) => [entry.id, index]));

  for (const [id, draft] of drafts) {
    if (draft.conflict) {
      throw new Error(`Resolve the review comment conflict for ${id} before exporting.`);
    }

    const index = indexesById.get(id);
    if (index !== undefined) {
      updated[index] = withReviewComment(updated[index], draft.value);
    } else if (draft.keepMissing && draft.sourceRecord) {
      indexesById.set(id, updated.length);
      updated.push(withReviewComment(draft.sourceRecord, draft.value));
    }
  }

  return updated;
}

/** The value that ends up in review.json: blank comments are dropped entirely. */
export function commentForSave(value) {
  return value.trim().length === 0 ? "" : value;
}

export function hasUnresolvedConflicts(drafts) {
  return [...drafts.values()].some(draft => draft.conflict === true);
}

/**
 * Re-baselines drafts after a successful save so the next poll cannot report
 * a conflict against the viewer's own write. Drafts that are fully persisted
 * are dropped; drafts edited while the request was in flight stay pending
 * with the written value as their new baseline.
 */
export function settleDraftsAfterSave(drafts, savedValues) {
  const settled = new Map();

  for (const [id, draft] of drafts) {
    if (!savedValues.has(id)) {
      settled.set(id, draft);
      continue;
    }

    const savedValue = savedValues.get(id);
    if (commentForSave(draft.value) === savedValue) continue;

    settled.set(id, { ...draft, baseline: savedValue });
  }

  return settled;
}

function settleDraftsAfterPolledSave(drafts, data, savedValues) {
  const entriesById = new Map(data.map(entry => [entry.id, entry]));
  const settled = new Map(drafts);

  for (const [id, draft] of settled) {
    if (!savedValues.has(id)) continue;

    const remoteEntry = entriesById.get(id);
    if (!remoteEntry || getReviewComment(remoteEntry) !== savedValues.get(id)) continue;

    if (commentForSave(draft.value) === savedValues.get(id)) {
      settled.delete(id);
    } else {
      settled.set(id, {
        ...draft,
        baseline: savedValues.get(id),
        conflict: false,
        missing: false,
        keepMissing: false,
      });
    }
  }

  return settled;
}

export function applyCommentInput({ value, remoteComment, hasRemoteEntry, existingDraft, sourceRecord, preserveMatchingRemote = false }) {
  if (hasRemoteEntry && value === remoteComment && !preserveMatchingRemote) {
    const hadConflictNotice = existingDraft?.conflict === true;
    return { draft: null, reRender: hadConflictNotice };
  }

  const draft = existingDraft ?? {
    value,
    baseline: remoteComment,
    sourceRecord,
    conflict: !hasRemoteEntry,
    missing: !hasRemoteEntry,
    keepMissing: false,
  };
  draft.value = value;
  draft.missing = !hasRemoteEntry;
  if (preserveMatchingRemote) {
    draft.baseline = remoteComment;
    draft.conflict = false;
    draft.missing = false;
    draft.keepMissing = false;
  } else if (!hasRemoteEntry && !draft.keepMissing) {
    draft.conflict = true;
  }
  return { draft, reRender: false };
}

const autoSaveDelay = 500;

function initializeViewer() {
  const hint = document.getElementById("hint");
  const items = document.getElementById("review-items");
  const saveStatus = document.getElementById("save-status");
  const conflictSummary = document.getElementById("conflict-summary");
  let latestData = [];
  let lastJson = null;
  let lastRevision = null;
  let drafts = new Map();
  let loading = false;
  let saveTimer = null;
  let saving = false;
  let saveQueued = false;
  let inFlightValues = null;
  let inFlightRevision = null;
  let writeVersion = 0;
  let saveState = { kind: "idle", message: "" };

  function appendLabel(parent, text, forId) {
    const label = document.createElement("label");
    label.htmlFor = forId;
    label.className = "comment-label";
    label.textContent = text;
    parent.appendChild(label);
    return label;
  }

  function createConflictControls(section, entry, draft) {
    if (!draft.conflict) return;

    const notice = document.createElement("p");
    notice.className = "err";
    notice.setAttribute("role", "alert");
    notice.textContent = draft.missing
      ? "Dieses Bild wurde aus der neueren review.json entfernt. Deine Kommentaränderung bleibt erhalten."
      : "Der Kommentar in der neueren review.json wurde ebenfalls geändert. Wähle bewusst, welche Fassung gelten soll.";
    section.appendChild(notice);

    const actions = document.createElement("div");
    const useRemote = document.createElement("button");
    useRemote.type = "button";
    useRemote.className = "btn btn-sm";
    useRemote.textContent = draft.missing ? "Entfernten Eintrag verwerfen" : "Neuere Datei übernehmen";
    useRemote.addEventListener("click", () => {
      drafts.delete(entry.id);
      render();
      queueSave();
    });
    actions.appendChild(useRemote);

    const keepLocal = document.createElement("button");
    keepLocal.type = "button";
    keepLocal.className = "btn btn-sm";
    keepLocal.textContent = draft.missing ? "Lokalen Eintrag behalten" : "Lokalen Kommentar behalten";
    keepLocal.addEventListener("click", () => {
      const remoteEntry = latestData.find(candidate => candidate.id === entry.id);
      const currentDraft = drafts.get(entry.id);
      if (!currentDraft) return;
      if (remoteEntry) {
        currentDraft.baseline = getReviewComment(remoteEntry);
        currentDraft.missing = false;
        currentDraft.keepMissing = false;
      } else {
        currentDraft.missing = true;
        currentDraft.keepMissing = true;
      }
      currentDraft.conflict = false;
      drafts.set(entry.id, currentDraft);
      render();
      queueSave();
    });
    actions.appendChild(keepLocal);
    section.appendChild(actions);
  }

  function createReviewItem(entry, index) {
    const section = document.createElement("section");
    section.className = "review-item";

    const heading = document.createElement("h2");
    heading.textContent = entry.id;
    section.appendChild(heading);

    const image = document.createElement("img");
    image.src = entry.bild;
    image.alt = entry.originalerDateiname;
    image.loading = "lazy";
    section.appendChild(image);

    const path = document.createElement("div");
    path.className = "path";
    path.textContent = entry.bild;
    section.appendChild(path);

    const meta = document.createElement("div");
    meta.className = "meta";
    const renamed = entry.originalerDateiname !== entry.finalerDateiname;
    const original = document.createElement("span");
    original.className = renamed ? "changed" : "same";
    original.textContent = entry.originalerDateiname;
    const finalName = document.createElement("span");
    finalName.className = renamed ? "changed" : "same";
    finalName.textContent = entry.finalerDateiname;
    const originalLabel = document.createElement("b");
    originalLabel.textContent = "Originaler Dateiname: ";
    const finalLabel = document.createElement("b");
    finalLabel.textContent = "Finaler Dateiname: ";
    meta.append(originalLabel, original, document.createElement("br"), finalLabel, finalName);
    section.appendChild(meta);

    const description = document.createElement("div");
    description.className = "desc";
    const descriptionLabel = document.createElement("b");
    descriptionLabel.textContent = "Finale description:";
    description.append(descriptionLabel, document.createElement("br"), document.createTextNode(entry.finaleDescription));
    section.appendChild(description);

    const draft = drafts.get(entry.id);
    createConflictControls(section, entry, draft ?? {});

    const commentId = `review-comment-${index}`;
    appendLabel(section, "Interner Review-Kommentar (nur intern, nicht wörtlich veröffentlichen)", commentId);
    const comment = document.createElement("textarea");
    comment.id = commentId;
    comment.className = "textarea";
    comment.rows = 5;
    comment.dataset.reviewId = entry.id;
    comment.value = draft ? draft.value : getReviewComment(entry);
    comment.addEventListener("input", () => updateDraft(entry, comment.value));
    section.appendChild(comment);

    const commentStatus = document.createElement("div");
    commentStatus.className = "comment-status";
    commentStatus.dataset.reviewId = entry.id;
    commentStatus.dataset.state = "saved";
    const commentDot = document.createElement("span");
    commentDot.className = "dot";
    const commentLabel = document.createElement("span");
    commentLabel.className = "label";
    commentLabel.textContent = "Gespeichert";
    commentStatus.append(commentDot, commentLabel);
    section.appendChild(commentStatus);
    return section;
  }

  function updateDraft(displayEntry, value) {
    const remoteEntry = latestData.find(entry => entry.id === displayEntry.id);
    const remoteComment = remoteEntry ? getReviewComment(remoteEntry) : "";
    const { draft, reRender } = applyCommentInput({
      value,
      remoteComment,
      hasRemoteEntry: Boolean(remoteEntry),
      existingDraft: drafts.get(displayEntry.id),
      sourceRecord: remoteEntry ?? displayEntry,
      preserveMatchingRemote: saving
        && inFlightRevision === lastRevision
        && inFlightValues?.has(displayEntry.id)
        && value !== inFlightValues.get(displayEntry.id),
    });

    if (draft) {
      drafts.set(displayEntry.id, draft);
    } else {
      drafts.delete(displayEntry.id);
    }

    if (reRender) render();
    else queueSave();
  }

  function queueSave() {
    if (saveTimer !== null) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }

    if (hasUnresolvedConflicts(drafts) || drafts.size === 0) {
      if (drafts.size === 0 && !saving && saveState.kind !== "saved") saveState = { kind: "idle", message: "" };
      updateStatus();
      return;
    }

    saveState = { kind: "pending", message: "" };
    saveTimer = setTimeout(() => {
      saveTimer = null;
      void saveDrafts();
    }, autoSaveDelay);
    updateStatus();
  }

  function flushPendingSave() {
    if (saveTimer === null) return;
    clearTimeout(saveTimer);
    saveTimer = null;
    void saveDrafts();
  }

  async function saveDrafts() {
    if (hasUnresolvedConflicts(drafts) || drafts.size === 0) {
      updateStatus();
      return;
    }

    if (saving) {
      // A request is in flight; save the newer drafts as soon as it settles.
      saveQueued = true;
      return;
    }

    const savedValues = new Map([...drafts].map(([id, draft]) => [id, commentForSave(draft.value)]));
    const requestRevision = lastRevision;
    let payload;

    try {
      payload = buildUpdatedReviewData(latestData, drafts);
    } catch (error) {
      saveState = { kind: "error", message: error.message };
      updateStatus();
      return;
    }

    saving = true;
    inFlightValues = savedValues;
    inFlightRevision = requestRevision;
    saveState = { kind: "saving", message: "" };
    updateStatus();

    try {
      let response;
      try {
        if (!requestRevision) throw new Error("Die aktuelle review.json-Revision wurde noch nicht geladen.");
        response = await fetch("review.json", {
          method: "POST",
          headers: { "Content-Type": "application/json", "If-Match": requestRevision },
          body: JSON.stringify(payload),
        });
      } catch (error) {
        throw new Error(`Server nicht erreichbar (${error.message}). Läuft 'pnpm run review:serve'?`);
      }

      const result = await response.json().catch(() => null);

      if (!response.ok || result?.ok !== true) {
        const details = result?.issues?.length
          ? ` ${result.issues.join("; ")}`
          : result?.error
            ? ` ${result.error}`
            : "";
        throw Object.assign(
          new Error(`Server hat den Speicher-Request abgelehnt (HTTP ${response.status}).${details}`),
          { code: result?.code ?? "" },
        );
      }

      const savedRevision = response.headers.get("etag");
      if (!savedRevision) throw new Error("Der Server hat keine neue review.json-Revision zurückgegeben.");
      const pollAppliedDifferentRevision = lastRevision !== requestRevision && lastRevision !== savedRevision;
      if (pollAppliedDifferentRevision) {
        drafts = settleDraftsAfterPolledSave(drafts, latestData, savedValues);
      } else {
        latestData = payload;
        lastJson = JSON.stringify(payload);
        lastRevision = savedRevision;
        drafts = settleDraftsAfterSave(drafts, savedValues);
      }
      writeVersion += 1;
      saveState = {
        kind: "saved",
        message: `${savedValues.size} Kommentaränderung(en) in review.json gespeichert (${new Date().toLocaleTimeString("de-AT")}).`,
      };

      render();

      if (drafts.size > 0) queueSave();
    } catch (error) {
      saveState = { kind: "error", message: error.message, code: error.code ?? "" };
      updateStatus();
    } finally {
      saving = false;
      inFlightValues = null;
      inFlightRevision = null;
      if (saveQueued) {
        saveQueued = false;
        queueSave();
      } else {
        updateStatus();
      }
    }
  }

  function updateStatus() {
    const conflicts = [...drafts.values()].filter(draft => draft.conflict).length;
    conflictSummary.hidden = conflicts === 0;
    conflictSummary.textContent = conflicts === 0
      ? ""
      : `${conflicts} Konflikt(e): Bitte die betroffenen Kommentare vor dem Auto-Speichern auflösen.`;

    let pillState = "saved";
    let pillText = "Gespeichert";

    if (conflicts > 0) {
      pillState = "conflict";
      pillText = "Konflikt";
    } else if (saveState.kind === "saving") {
      pillState = "saving";
      pillText = "Speichert …";
    } else if (saveState.kind === "pending") {
      pillState = "unsaved";
      pillText = "Ungespeichert";
    } else if (saveState.kind === "error") {
      pillState = "error";
      pillText = `Speicherfehler: ${saveState.message}`;
    } else if (saveState.kind === "idle" && latestData.length === 0) {
      pillState = "idle";
      pillText = "Warte auf review.json …";
    }

    saveStatus.dataset.state = pillState;
    saveStatus.querySelector(".label").textContent = pillText;
    saveStatus.title = saveState.kind === "error" ? saveState.message : "";

    for (const status of items.querySelectorAll(".comment-status")) {
      const draft = drafts.get(status.dataset.reviewId);
      let state = "saved";
      let label = "Gespeichert";

      if (draft?.conflict) {
        state = "conflict";
        label = "Konflikt";
      } else if (draft) {
        if (saveState.kind === "saving") {
          state = "saving";
          label = "Speichert …";
        } else if (saveState.kind === "error") {
          state = "error";
          label = "Nicht gespeichert";
        } else {
          state = "unsaved";
          label = "Ungespeichert";
        }
      } else if (saving && inFlightValues?.has(status.dataset.reviewId)) {
        state = "saving";
        label = "Speichert …";
      }

      status.dataset.state = state;
      status.querySelector(".label").textContent = label;
    }
  }

  function render() {
    const activeComment = document.activeElement?.dataset?.reviewId;
    const selectionStart = document.activeElement?.selectionStart;
    const selectionEnd = document.activeElement?.selectionEnd;
    const displayData = [...latestData];
    const displayedIds = new Set(displayData.map(entry => entry.id));
    for (const [id, draft] of drafts) {
      if (draft.missing && draft.sourceRecord && !displayedIds.has(id)) {
        displayData.push(draft.sourceRecord);
      }
    }

    items.replaceChildren(...displayData.map(createReviewItem));
    hint.hidden = true;
    updateStatus();

    if (activeComment) {
      const replacement = [...items.querySelectorAll("textarea")]
        .find(element => element.dataset.reviewId === activeComment);
      if (replacement) {
        replacement.focus();
        if (typeof selectionStart === "number" && typeof selectionEnd === "number") {
          replacement.setSelectionRange(selectionStart, selectionEnd);
        }
      }
    }
  }

  async function load() {
    if (loading) return;
    loading = true;
    const versionAtStart = writeVersion;
    try {
      const response = await fetch("review.json", { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const revision = response.headers.get("etag");
      if (!revision) throw new Error("Der Server lieferte keine review.json-Revision.");
      const data = await response.json();
      if (!Array.isArray(data)) throw new Error("review.json muss ein JSON-Array enthalten.");
      // A save finished while this poll was in flight; its response is newer than
      // this body, so ignore the stale read instead of re-rendering against it.
      if (versionAtStart !== writeVersion) return;
      lastRevision = revision;
      const json = JSON.stringify(data);
      if (json !== lastJson) {
        drafts = reconcileCommentDrafts(data, drafts);
        latestData = data;
        lastJson = json;
        render();
      }
      if (saveState.code === "STALE_REVIEW_FILE" && drafts.size > 0) queueSave();
    } catch (error) {
      if (lastJson === null) {
        hint.hidden = false;
        hint.replaceChildren();
        const message = document.createElement("span");
        message.className = "err";
        message.textContent = `review.json konnte nicht geladen werden: ${error.message}. Über HTTP öffnen, nicht per file://.`;
        hint.appendChild(message);
      }
    } finally {
      loading = false;
    }
  }

  // Do not let a pending debounce timer die with the tab or when the reviewer
  // switches windows; flush immediately instead of waiting for the last tick.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushPendingSave();
  });
  window.addEventListener("blur", flushPendingSave);
  window.addEventListener("pagehide", flushPendingSave);

  load();
  setInterval(load, 2000);
}

if (typeof document !== "undefined") initializeViewer();
