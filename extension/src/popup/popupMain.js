const CHARACTER_TILES = [
  { characterId: "char-default", name: "Runner" },
  { characterId: "char-stickman", name: "StickMan" },
  { characterId: "char-astroman", name: "AstroMan" },
  { characterId: "char-default", name: "Runner 3" }
];

let selectedCharacterIdx = 0;
let latestSummaryReadable = null;
let cachedEvents = [];

function el(id) {
  return document.getElementById(id);
}

function setStatus(text) {
  el("view-status").textContent = text;
}

function updateStatsTitle() {
  const placeholder = CHARACTER_TILES[selectedCharacterIdx];
  const liveName = latestSummaryReadable?.displayName;
  const name = liveName || placeholder.name;
  el("stats-title").textContent = `${name}'s stats`;
}

function renderCharacterGrid() {
  const grid = el("character-grid");
  grid.textContent = "";

  CHARACTER_TILES.forEach((char, idx) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = `character-tile${idx === selectedCharacterIdx ? " selected" : ""}`;
    b.textContent = char.name;
    b.addEventListener("click", () => {
      setActiveCharacter(char.characterId, idx);
    });
    grid.appendChild(b);
  });
}

function setQuickStats(readable) {
  el("stat-jumps").textContent = String(readable?.totalJumps ?? 0);
  el("stat-pixels").textContent = String(readable?.distancePx ?? 0);
  el("stat-domains").textContent = String(readable?.domainsVisitedCount ?? 0);
  el("stat-extractions").textContent = String(readable?.totalExtractions ?? 0);
}

async function refreshSummary() {
  try {
    const res = await browser.runtime.sendMessage({ type: "GET_STATE_SUMMARY" });
    if (!res?.ok || !res.summary?.readable) {
      latestSummaryReadable = null;
      setQuickStats(null);
      setStatus("Could not load summary.");
      updateStatsTitle();
      return;
    }
    latestSummaryReadable = res.summary.readable;
    const activeId = latestSummaryReadable?.characterId;
    const idx = CHARACTER_TILES.findIndex((t) => t.characterId === activeId);
    if (idx >= 0) selectedCharacterIdx = idx;
    renderCharacterGrid();
    setQuickStats(latestSummaryReadable);
    updateStatsTitle();
  } catch (error) {
    latestSummaryReadable = null;
    setQuickStats(null);
    setStatus(error?.message || String(error));
    updateStatsTitle();
  }
}

async function setActiveCharacter(characterId, idxToSelect) {
  try {
    const charIdx =
      idxToSelect ?? CHARACTER_TILES.findIndex((t) => t.characterId === characterId);
    if (charIdx >= 0) selectedCharacterIdx = charIdx;
    renderCharacterGrid();

    await browser.runtime.sendMessage({
      type: "SET_ACTIVE_CHARACTER",
      characterId
    });

    setStatus(`Switched to ${CHARACTER_TILES[selectedCharacterIdx].name}.`);
    await refreshSummary();
  } catch (error) {
    setStatus(error?.message || String(error));
  }
}

async function loadEvents() {
  const res = await browser.runtime.sendMessage({ type: "GET_ACTIVE_CHARACTER_EVENTS" });
  if (!res?.ok) {
    throw new Error(res?.error || "Could not load events.");
  }
  cachedEvents = Array.isArray(res.events) ? res.events : [];
  return {
    events: cachedEvents,
    displayName: res.displayName || res.characterId || "Character",
    characterId: res.characterId || "unknown"
  };
}

function eventCardBase(ev) {
  const when =
    ev?.occurredAtMs != null ? new Date(ev.occurredAtMs).toLocaleString() : "—";
  const type = ev?.eventType || "unknown";
  const mode = ev?.collectionMode || "unknown";
  return { when, type, mode };
}

function renderEmpty(message) {
  const view = el("data-view");
  view.textContent = "";
  const p = document.createElement("div");
  p.className = "empty-note";
  p.textContent = message;
  view.appendChild(p);
}

function renderAllEvents(events, meta) {
  const view = el("data-view");
  view.textContent = "";
  if (!events.length) {
    renderEmpty("No tracked events saved for this character yet.");
    setStatus(`0 events for ${meta.displayName}.`);
    return;
  }

  setStatus(`${events.length} tracked event(s) for ${meta.displayName} (${meta.characterId}).`);
  for (const ev of events) {
    const card = document.createElement("article");
    card.className = "event-card";
    const head = eventCardBase(ev);
    card.innerHTML = `
      <div class="event-head">
        <span>${head.type}</span>
        <span>${head.when}</span>
      </div>
      <div class="event-line">Mode: ${head.mode}</div>
      <div class="event-line">Domain: ${ev.domain || "—"}</div>
      <div class="event-line">Element: ${ev.elementTag || "—"}</div>
      <div class="event-line">Selector: ${ev.selectorGuess || "—"}</div>
      <div class="event-line">Text: ${ev.textPreview || "—"}</div>
    `;
    view.appendChild(card);
  }
}

function renderExtractedEvents(events, meta) {
  const extracted = events.filter(
    (ev) => ev?.collectionMode === "active_extract" && ev?.eventType === "extraction"
  );
  const view = el("data-view");
  view.textContent = "";

  if (!extracted.length) {
    renderEmpty("No extracted data yet. Stand on a platform and press Up Arrow or W.");
    setStatus(`0 extractions for ${meta.displayName}.`);
    return;
  }

  setStatus(`${extracted.length} extraction(s) for ${meta.displayName} — clearer view.`);
  for (const ev of extracted) {
    const card = document.createElement("article");
    card.className = "event-card";
    const head = eventCardBase(ev);
    const preview = ev.textPreview || "(no text found)";
    card.innerHTML = `
      <div class="event-head">
        <span>Extraction</span>
        <span>${head.when}</span>
      </div>
      <div class="event-line"><strong>From:</strong> ${ev.elementTag || "—"} (${ev.selectorGuess || "—"})</div>
      <div class="event-line"><strong>Domain:</strong> ${ev.domain || "—"}</div>
      <div class="event-line"><strong>Text preview:</strong> ${preview}</div>
    `;
    view.appendChild(card);
  }
}

async function onViewAllEvents() {
  setStatus("Loading all tracked event data…");
  try {
    const meta = await loadEvents();
    renderAllEvents(meta.events, meta);
  } catch (error) {
    renderEmpty("Could not load events.");
    setStatus(error?.message || String(error));
  }
}

async function onViewExtracted() {
  setStatus("Loading extracted data…");
  try {
    const meta = await loadEvents();
    renderExtractedEvents(meta.events, meta);
  } catch (error) {
    renderEmpty("Could not load extracted data.");
    setStatus(error?.message || String(error));
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  renderCharacterGrid();
  updateStatsTitle();
  await refreshSummary();
  renderEmpty("Pick a view below to inspect data.");

  el("view-all-events").addEventListener("click", onViewAllEvents);
  el("view-extracted").addEventListener("click", onViewExtracted);
});
