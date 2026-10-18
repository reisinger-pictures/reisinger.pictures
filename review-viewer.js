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

export function applyCommentInput({ value, remoteComment, hasRemoteEntry, existingDraft, sourceRecord }) {
  if (hasRemoteEntry && value === remoteComment) {
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
  if (!hasRemoteEntry && !draft.keepMissing) draft.conflict = true;
  return { draft, reRender: false };
}

function initializeViewer() {
  const hint = document.getElementById("hint");
  const items = document.getElementById("review-items");
  const downloadButton = document.getElementById("download");
  const saveStatus = document.getElementById("save-status");
  const conflictSummary = document.getElementById("conflict-summary");
  let latestData = [];
  let lastJson = null;
  let drafts = new Map();
  let loading = false;

  function appendLabel(parent, text, forId) {
    const label = document.createElement("label");
    label.htmlFor = forId;
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
    comment.rows = 3;
    comment.dataset.reviewId = entry.id;
    comment.value = draft ? draft.value : getReviewComment(entry);
    comment.addEventListener("input", () => updateDraft(entry, comment.value));
    section.appendChild(comment);
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
    });

    if (draft) {
      drafts.set(displayEntry.id, draft);
    } else {
      drafts.delete(displayEntry.id);
    }

    if (reRender) render();
    else updateStatus();
  }

  function updateStatus() {
    const conflicts = [...drafts.values()].filter(draft => draft.conflict).length;
    downloadButton.disabled = conflicts > 0;
    conflictSummary.hidden = conflicts === 0;
    conflictSummary.textContent = conflicts === 0
      ? ""
      : `${conflicts} Konflikt(e): Bitte die betroffenen Kommentare vor dem Download auflösen.`;

    if (drafts.size === 0) {
      saveStatus.textContent = `${latestData.length} Bilder geladen. Keine ungespeicherten Kommentaränderungen.`;
    } else {
      saveStatus.textContent = `${drafts.size} ungespeicherte Kommentaränderung(en). Nach dem Download die lokale review.json selbst ersetzen.`;
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
    hint.textContent = `${latestData.length} REVIEW-Bilder · Bild + Dateinamen + description + interner Kommentar. Live-Polling alle 2 s.`;
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
    try {
      const response = await fetch("review.json", { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (!Array.isArray(data)) throw new Error("review.json muss ein JSON-Array enthalten.");
      const json = JSON.stringify(data);
      if (json !== lastJson) {
        drafts = reconcileCommentDrafts(data, drafts);
        latestData = data;
        lastJson = json;
        render();
      }
    } catch (error) {
      if (lastJson === null) {
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

  downloadButton.addEventListener("click", () => {
    try {
      const updated = buildUpdatedReviewData(latestData, drafts);
      const blob = new Blob([`${JSON.stringify(updated, null, 2)}\n`], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "review.json";
      link.click();
      URL.revokeObjectURL(url);
      saveStatus.textContent = "Download gestartet. Ersetze damit die lokale, ignorierte review.json.";
    } catch (error) {
      saveStatus.textContent = `Export nicht möglich: ${error.message}`;
    }
  });

  load();
  setInterval(load, 2000);
}

if (typeof document !== "undefined") initializeViewer();
