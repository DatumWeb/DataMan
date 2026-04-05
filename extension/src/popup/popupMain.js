const CHARACTER_TILES = [
  { characterId: "char-default", name: "Runner" },
  { characterId: "char-stickman", name: "StickMan" },
  { characterId: "char-astroman", name: "AstroMan" },
  { characterId: "char-snake", name: "SnakeMan" }
];

let selectedCharacterIdx = 0;
let latestSummaryReadable = null;

function el(id) {
  return document.getElementById(id);
}

function activeCharacterId() {
  return CHARACTER_TILES[selectedCharacterIdx].characterId;
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

function statBox(label, value) {
  const div = document.createElement("div");
  div.className = "stat-box";
  div.innerHTML = `<span class="label">${label}</span><span class="value">${value}</span>`;
  return div;
}

function renderQuickStats(readable) {
  const container = el("stats-quick");
  container.textContent = "";

  const charId = activeCharacterId();

  if (charId === "char-snake") {
    container.className = "quick-stats quick-stats-3";
    container.appendChild(statBox("Total eaten", String(readable?.lettersEaten ?? 0)));
    const bankBox = statBox("Word bank", "…");
    container.appendChild(bankBox);
    const wordsBox = statBox("Words created", "…");
    container.appendChild(wordsBox);
    browser.runtime
      .sendMessage({ type: "GET_EATEN_LETTERS" })
      .then((res) => {
        if (res?.ok) {
          bankBox.querySelector(".value").textContent = String(res.wordBank.length);
        }
      })
      .catch(() => {});
    browser.runtime
      .sendMessage({ type: "GET_SPIT_WORDS" })
      .then((res) => {
        if (res?.ok) {
          wordsBox.querySelector(".value").textContent = String(res.wordsCreated);
        }
      })
      .catch(() => {});
  } else if (charId === "char-astroman") {
    container.className = "quick-stats";
    const shotsBox = statBox("Screenshots taken", "…");
    container.appendChild(shotsBox);
    container.appendChild(
      statBox("Max speed (px/s)", String(Math.round(readable?.maxVelocityPxPerSec ?? 0)))
    );
    browser.runtime
      .sendMessage({ type: "GET_SCREENSHOT_COUNT" })
      .then((res) => {
        if (res?.ok) {
          shotsBox.querySelector(".value").textContent = String(res.count);
        }
      })
      .catch(() => {});
  } else {
    container.className = "quick-stats";
    container.appendChild(statBox("Total jumps", String(readable?.totalJumps ?? 0)));
    container.appendChild(statBox("Pixels", String(readable?.distancePx ?? 0)));
    container.appendChild(statBox("Domains visited", String(readable?.domainsVisitedCount ?? 0)));
    container.appendChild(statBox("Total extractions", String(readable?.totalExtractions ?? 0)));
  }
}

function renderActionButtons() {
  const container = el("action-buttons");
  container.textContent = "";

  const charId = activeCharacterId();

  if (charId === "char-snake") {
    container.className = "actions actions-3";
    const btnLetters = document.createElement("button");
    btnLetters.type = "button";
    btnLetters.textContent = "All eaten";
    btnLetters.addEventListener("click", onViewEatenLetters);
    container.appendChild(btnLetters);

    const btnBank = document.createElement("button");
    btnBank.type = "button";
    btnBank.textContent = "Word bank";
    btnBank.addEventListener("click", onViewWordBank);
    container.appendChild(btnBank);

    const btnWords = document.createElement("button");
    btnWords.type = "button";
    btnWords.textContent = "Words created";
    btnWords.addEventListener("click", onViewSpitWords);
    container.appendChild(btnWords);
  } else if (charId === "char-astroman") {
    container.className = "actions";
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = "View screenshots";
    btn.addEventListener("click", onViewScreenshots);
    container.appendChild(btn);
  } else {
    container.className = "actions";
    const btnAll = document.createElement("button");
    btnAll.type = "button";
    btnAll.textContent = "All events";
    btnAll.addEventListener("click", onViewAllEvents);

    const btnExtracted = document.createElement("button");
    btnExtracted.type = "button";
    btnExtracted.textContent = "Extracted data";
    btnExtracted.addEventListener("click", onViewExtracted);

    container.appendChild(btnAll);
    container.appendChild(btnExtracted);
  }
}

async function refreshSummary() {
  try {
    const res = await browser.runtime.sendMessage({ type: "GET_STATE_SUMMARY" });
    if (!res?.ok || !res.summary?.readable) {
      latestSummaryReadable = null;
      renderQuickStats(null);
      setStatus("Could not load summary.");
      updateStatsTitle();
      return;
    }
    latestSummaryReadable = res.summary.readable;
    const activeId = latestSummaryReadable?.characterId;
    const idx = CHARACTER_TILES.findIndex((t) => t.characterId === activeId);
    if (idx >= 0) selectedCharacterIdx = idx;
    renderCharacterGrid();
    renderQuickStats(latestSummaryReadable);
    renderActionButtons();
    updateStatsTitle();
  } catch (error) {
    latestSummaryReadable = null;
    renderQuickStats(null);
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
    renderActionButtons();

    await browser.runtime.sendMessage({
      type: "SET_ACTIVE_CHARACTER",
      characterId
    });

    setStatus(`Switched to ${CHARACTER_TILES[selectedCharacterIdx].name}.`);
    el("data-view").textContent = "";
    await refreshSummary();
  } catch (error) {
    setStatus(error?.message || String(error));
  }
}

function renderEmpty(message) {
  const view = el("data-view");
  view.textContent = "";
  const p = document.createElement("div");
  p.className = "empty-note";
  p.textContent = message;
  view.appendChild(p);
}

function eventCardBase(ev) {
  const when =
    ev?.occurredAtMs != null ? new Date(ev.occurredAtMs).toLocaleString() : "—";
  const type = ev?.eventType || "unknown";
  const mode = ev?.collectionMode || "unknown";
  return { when, type, mode };
}

async function onViewEatenLetters() {
  setStatus("Loading eaten letters…");
  try {
    const res = await browser.runtime.sendMessage({ type: "GET_EATEN_LETTERS" });
    if (!res?.ok) {
      throw new Error(res?.error || "Could not load letters.");
    }
    const view = el("data-view");
    view.textContent = "";

    const letters = Array.isArray(res.letters) ? res.letters : [];
    if (!letters.length) {
      renderEmpty("No letters eaten yet. Move the snake over page text!");
      setStatus("0 letters eaten.");
      return;
    }

    setStatus(`${letters.length} letter(s) eaten by ${res.displayName}.`);

    const card = document.createElement("div");
    card.className = "letters-eaten-card";
    card.innerHTML = `<div class="letters-eaten-header">${letters.length} letters eaten</div>`;

    const body = document.createElement("div");
    body.className = "letters-eaten-body";
    body.textContent = letters.join("");
    card.appendChild(body);
    view.appendChild(card);
  } catch (error) {
    renderEmpty("Could not load eaten letters.");
    setStatus(error?.message || String(error));
  }
}

async function onViewWordBank() {
  setStatus("Loading word bank…");
  try {
    const res = await browser.runtime.sendMessage({ type: "GET_EATEN_LETTERS" });
    if (!res?.ok) {
      throw new Error(res?.error || "Could not load word bank.");
    }
    const view = el("data-view");
    view.textContent = "";

    const bank = Array.isArray(res.wordBank) ? res.wordBank : [];
    if (!bank.length) {
      renderEmpty("Word bank is empty. Eat more text to refill!");
      setStatus("0 letters in word bank.");
      return;
    }

    setStatus(`${bank.length} letter(s) available in word bank.`);

    const card = document.createElement("div");
    card.className = "letters-eaten-card";
    card.innerHTML = `<div class="letters-eaten-header">${bank.length} letters available</div>`;

    const body = document.createElement("div");
    body.className = "letters-eaten-body";
    body.textContent = bank.join("");
    card.appendChild(body);
    view.appendChild(card);
  } catch (error) {
    renderEmpty("Could not load word bank.");
    setStatus(error?.message || String(error));
  }
}

async function onViewSpitWords() {
  setStatus("Loading words…");
  try {
    const res = await browser.runtime.sendMessage({ type: "GET_SPIT_WORDS" });
    if (!res?.ok) {
      throw new Error(res?.error || "Could not load words.");
    }
    const view = el("data-view");
    view.textContent = "";

    const words = Array.isArray(res.words) ? res.words : [];
    if (!words.length) {
      renderEmpty("No words created yet. Eat some text and press Space to spit!");
      setStatus("0 words created.");
      return;
    }

    setStatus(`${words.length} word(s) created by ${res.displayName}.`);
    for (const entry of [...words].reverse()) {
      const card = document.createElement("article");
      card.className = "event-card";
      const when = entry.atMs ? new Date(entry.atMs).toLocaleString() : "—";
      card.innerHTML = `
        <div class="event-head">
          <span class="spit-word">${entry.word}</span>
          <span>${when}</span>
        </div>
      `;
      view.appendChild(card);
    }
  } catch (error) {
    renderEmpty("Could not load words.");
    setStatus(error?.message || String(error));
  }
}

async function onViewAllEvents() {
  setStatus("Loading all tracked event data…");
  try {
    const res = await browser.runtime.sendMessage({ type: "GET_ACTIVE_CHARACTER_EVENTS" });
    if (!res?.ok) {
      throw new Error(res?.error || "Could not load events.");
    }
    const events = Array.isArray(res.events) ? res.events : [];
    const meta = { displayName: res.displayName, characterId: res.characterId };
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
  } catch (error) {
    renderEmpty("Could not load events.");
    setStatus(error?.message || String(error));
  }
}

async function onViewExtracted() {
  setStatus("Loading extracted data…");
  try {
    const res = await browser.runtime.sendMessage({ type: "GET_ACTIVE_CHARACTER_EVENTS" });
    if (!res?.ok) {
      throw new Error(res?.error || "Could not load events.");
    }
    const events = (Array.isArray(res.events) ? res.events : []).filter(
      (ev) => ev?.collectionMode === "active_extract" && ev?.eventType === "extraction"
    );
    const meta = { displayName: res.displayName, characterId: res.characterId };
    const view = el("data-view");
    view.textContent = "";

    if (!events.length) {
      renderEmpty("No extracted data yet. Stand on a platform and press Up Arrow or W.");
      setStatus(`0 extractions for ${meta.displayName}.`);
      return;
    }

    setStatus(`${events.length} extraction(s) for ${meta.displayName} — clearer view.`);
    for (const ev of events) {
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
  } catch (error) {
    renderEmpty("Could not load extracted data.");
    setStatus(error?.message || String(error));
  }
}

function groupScreenshots(shots) {
  const groups = {};
  for (const ss of shots) {
    const d = ss.takenAtMs ? new Date(ss.takenAtMs) : new Date();
    const dateKey = d.toLocaleDateString();
    const site = ss.domain || "unknown";
    const key = `${dateKey}|||${site}`;
    if (!groups[key]) groups[key] = { dateKey, site, items: [] };
    groups[key].items.push(ss);
  }
  return Object.values(groups);
}

function downloadDataUrl(dataUrl, filename) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

async function onViewScreenshots() {
  setStatus("Loading screenshots…");
  try {
    const res = await browser.runtime.sendMessage({ type: "GET_SCREENSHOTS" });
    if (!res?.ok) {
      throw new Error(res?.error || "Could not load screenshots.");
    }
    const shots = Array.isArray(res.screenshots) ? res.screenshots : [];
    const view = el("data-view");
    view.textContent = "";

    if (!shots.length) {
      renderEmpty("No screenshots yet. Use AstroMan + Space to capture.");
      setStatus("0 screenshots.");
      return;
    }

    setStatus(`${shots.length} screenshot(s).`);
    const groups = groupScreenshots(shots);

    for (const group of groups) {
      const header = document.createElement("div");
      header.className = "screenshot-group-header";
      header.textContent = `${group.dateKey} · ${group.site}`;
      view.appendChild(header);

      for (const ss of group.items) {
        const card = document.createElement("div");
        card.className = "screenshot-card";
        const time = ss.takenAtMs
          ? new Date(ss.takenAtMs).toLocaleTimeString()
          : "—";
        card.innerHTML = `
          <div class="screenshot-meta">${time} · ${ss.rect?.w ?? "?"}×${ss.rect?.h ?? "?"}</div>
        `;
        if (ss.dataUrl) {
          const wrap = document.createElement("div");
          wrap.className = "screenshot-img-wrap";

          const img = document.createElement("img");
          img.src = ss.dataUrl;
          img.alt = `Screenshot from ${ss.domain || "unknown"}`;

          const dlBtn = document.createElement("button");
          dlBtn.className = "screenshot-dl-btn";
          dlBtn.title = "Download";
          dlBtn.textContent = "⬇";
          const filename = `dataman-${ss.domain || "screenshot"}-${ss.id || Date.now()}.png`;
          dlBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            downloadDataUrl(ss.dataUrl, filename);
          });

          wrap.appendChild(img);
          wrap.appendChild(dlBtn);
          card.appendChild(wrap);
        }
        view.appendChild(card);
      }
    }
  } catch (error) {
    renderEmpty("Could not load screenshots.");
    setStatus(error?.message || String(error));
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  renderCharacterGrid();
  updateStatsTitle();
  renderActionButtons();
  await refreshSummary();
  renderEmpty("Pick a view below to inspect data.");

  const dvBtn = el("btn-open-dataviewer");
  if (dvBtn) {
    dvBtn.addEventListener("click", () => {
      browser.tabs.create({ url: browser.runtime.getURL("src/dataviewer.html") });
    });
  }
});
