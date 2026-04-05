/* DataMan — Data Viewer (full-page). */
(function () {
  const CHARACTER_NAMES = {
    "char-default": "Runner",
    "char-stickman": "StickMan",
    "char-snake": "SnakeMan",
    "char-astroman": "AstroMan"
  };

  const el = (id) => document.getElementById(id);

  let allEvents = [];
  let allScreenshots = [];
  let allCharacters = {};
  let currentSort = { key: "occurredAtMs", asc: false };

  /* ── Helpers ── */

  function charName(id) {
    return CHARACTER_NAMES[id] || id;
  }

  function fmtDate(ms) {
    if (!ms) return "—";
    const d = new Date(ms);
    return d.toLocaleDateString() + " " + d.toLocaleTimeString();
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function downloadDataUrl(dataUrl, filename) {
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  /* ── Data loading ── */

  async function loadAllData() {
    const [stateRes, ssRes] = await Promise.all([
      browser.runtime.sendMessage({ type: "GET_ALL_DATA" }),
      browser.runtime.sendMessage({ type: "GET_SCREENSHOTS" })
    ]);

    if (!stateRes?.ok) {
      console.warn("[DataViewer] could not load state", stateRes);
      return;
    }

    allCharacters = stateRes.characters || {};
    allEvents = [];
    for (const [cid, ch] of Object.entries(allCharacters)) {
      const events = Array.isArray(ch.events) ? ch.events : [];
      for (const ev of events) {
        allEvents.push({ ...ev, _characterId: cid });
      }
    }

    allScreenshots = ssRes?.ok && Array.isArray(ssRes.screenshots)
      ? ssRes.screenshots
      : [];

    populateCharacterFilter();
  }

  function populateCharacterFilter() {
    const sel = el("filter-character");
    while (sel.options.length > 1) sel.remove(1);
    for (const [cid] of Object.entries(allCharacters)) {
      const opt = document.createElement("option");
      opt.value = cid;
      opt.textContent = charName(cid);
      sel.appendChild(opt);
    }
  }

  /* ── Filtering ── */

  function getFiltered() {
    const charFilter = el("filter-character").value;
    const typeFilter = el("filter-type").value;
    const modeFilter = el("filter-mode").value;
    const search = el("filter-search").value.trim().toLowerCase();

    let events = [...allEvents];

    if (charFilter !== "all") {
      events = events.filter((e) => e._characterId === charFilter);
    }

    if (typeFilter === "events") {
      /* keep events; hide non-event types */
    } else if (typeFilter !== "all" && typeFilter !== "screenshots") {
      events = [];
    }

    if (modeFilter !== "all") {
      events = events.filter((e) => e.collectionMode === modeFilter);
    }

    if (search) {
      events = events.filter((e) => {
        const haystack = [
          e.domain, e.eventType, e.collectionMode, e.elementTag,
          e.selectorGuess, e.textPreview,
          charName(e._characterId)
        ].filter(Boolean).join(" ").toLowerCase();
        return haystack.includes(search);
      });
    }

    return events;
  }

  function getFilteredScreenshots() {
    const charFilter = el("filter-character").value;
    const search = el("filter-search").value.trim().toLowerCase();
    let shots = [...allScreenshots];
    if (charFilter !== "all") {
      shots = shots.filter((s) => s.characterId === charFilter);
    }
    if (search) {
      shots = shots.filter((s) => {
        const hay = [s.domain, s.pageUrl, charName(s.characterId)]
          .filter(Boolean).join(" ").toLowerCase();
        return hay.includes(search);
      });
    }
    return shots;
  }

  /* ── Sorting ── */

  function sortEvents(events) {
    const { key, asc } = currentSort;
    const dir = asc ? 1 : -1;
    return events.sort((a, b) => {
      let va = a[key] ?? "";
      let vb = b[key] ?? "";
      if (key === "_characterId") { va = charName(va); vb = charName(vb); }
      if (typeof va === "number" && typeof vb === "number") return (va - vb) * dir;
      return String(va).localeCompare(String(vb)) * dir;
    });
  }

  function onHeaderClick(key) {
    if (currentSort.key === key) {
      currentSort.asc = !currentSort.asc;
    } else {
      currentSort = { key, asc: true };
    }
    render();
  }

  /* ── Stats summary ── */

  function renderStats(events, screenshots) {
    const container = el("stats-summary");
    container.textContent = "";

    const charFilter = el("filter-character").value;
    const cards = [];

    if (charFilter === "all") {
      cards.push({ label: "Characters", value: Object.keys(allCharacters).length });
    } else {
      cards.push({ label: "Character", value: charName(charFilter), highlight: true });
    }

    cards.push({ label: "Events shown", value: events.length });

    const passive = events.filter((e) => e.collectionMode === "passive").length;
    const active = events.filter((e) => e.collectionMode === "active_extract").length;
    cards.push({ label: "Passive", value: passive });
    cards.push({ label: "Active extract", value: active });
    cards.push({ label: "Screenshots", value: screenshots.length });

    const domains = new Set(events.map((e) => e.domain).filter(Boolean));
    cards.push({ label: "Domains", value: domains.size });

    for (const c of cards) {
      const div = document.createElement("div");
      div.className = "summary-card" + (c.highlight ? " highlight" : "");
      div.innerHTML = `<div class="sc-label">${escapeHtml(c.label)}</div>
        <div class="sc-value">${escapeHtml(String(c.value))}</div>`;
      container.appendChild(div);
    }
  }

  /* ── Table rendering ── */

  const COLUMNS = [
    { key: "_characterId", label: "Character" },
    { key: "collectionMode", label: "Mode" },
    { key: "eventType", label: "Type" },
    { key: "domain", label: "Domain" },
    { key: "elementTag", label: "Element" },
    { key: "textPreview", label: "Text preview" },
    { key: "occurredAtMs", label: "Time" }
  ];

  function renderTableHead() {
    const tr = el("table-head");
    tr.textContent = "";
    for (const col of COLUMNS) {
      const th = document.createElement("th");
      th.textContent = col.label;
      if (currentSort.key === col.key) {
        const arrow = document.createElement("span");
        arrow.className = "sort-arrow";
        arrow.textContent = currentSort.asc ? "▲" : "▼";
        th.appendChild(arrow);
      }
      th.addEventListener("click", () => onHeaderClick(col.key));
      tr.appendChild(th);
    }
  }

  function renderTableBody(events) {
    const tbody = el("table-body");
    tbody.textContent = "";
    const emptyMsg = el("empty-msg");

    if (!events.length) {
      emptyMsg.style.display = "";
      emptyMsg.textContent = "No events match the current filters.";
      return;
    }
    emptyMsg.style.display = "none";

    for (const ev of events) {
      const tr = document.createElement("tr");

      for (const col of COLUMNS) {
        const td = document.createElement("td");
        const val = ev[col.key];

        if (col.key === "_characterId") {
          const badge = document.createElement("span");
          badge.className = "badge badge-char";
          badge.textContent = charName(val);
          td.appendChild(badge);
        } else if (col.key === "collectionMode") {
          const badge = document.createElement("span");
          badge.className = "badge " + (val === "passive" ? "badge-passive" : "badge-active");
          badge.textContent = val === "active_extract" ? "active" : (val || "—");
          td.appendChild(badge);
        } else if (col.key === "occurredAtMs") {
          td.textContent = fmtDate(val);
        } else if (col.key === "textPreview") {
          td.className = "text-preview";
          td.textContent = val || "—";
          td.title = val || "";
        } else {
          td.textContent = val || "—";
        }

        tr.appendChild(td);
      }

      tbody.appendChild(tr);
    }
  }

  /* ── Screenshot gallery ── */

  function renderScreenshotGallery(shots) {
    const gallery = el("screenshot-gallery");
    gallery.textContent = "";

    const typeFilter = el("filter-type").value;
    if (typeFilter !== "screenshots" && typeFilter !== "all") {
      gallery.style.display = "none";
      return;
    }
    if (!shots.length) {
      gallery.style.display = "none";
      return;
    }

    gallery.style.display = "";
    const grid = document.createElement("div");
    grid.className = "sg-grid";

    const grouped = {};
    for (const ss of shots) {
      const d = ss.takenAtMs ? new Date(ss.takenAtMs) : new Date();
      const dateKey = d.toLocaleDateString();
      const site = ss.domain || "unknown";
      const key = `${dateKey}|||${site}`;
      if (!grouped[key]) grouped[key] = { dateKey, site, items: [] };
      grouped[key].items.push(ss);
    }

    for (const group of Object.values(grouped)) {
      const header = document.createElement("div");
      header.className = "sg-group-header";
      header.textContent = `${group.dateKey} · ${group.site}`;
      grid.appendChild(header);

      for (const ss of group.items) {
        const card = document.createElement("div");
        card.className = "sg-card";

        if (ss.dataUrl) {
          const img = document.createElement("img");
          img.src = ss.dataUrl;
          img.alt = `Screenshot from ${ss.domain || "unknown"}`;
          card.appendChild(img);
        }

        const footer = document.createElement("div");
        footer.className = "sg-card-footer";
        const time = ss.takenAtMs ? new Date(ss.takenAtMs).toLocaleTimeString() : "—";
        const meta = document.createElement("span");
        meta.textContent = `${time} · ${charName(ss.characterId)} · ${ss.rect?.w ?? "?"}×${ss.rect?.h ?? "?"}`;
        footer.appendChild(meta);

        if (ss.dataUrl) {
          const dl = document.createElement("button");
          dl.textContent = "Download";
          const fname = `dataman-${ss.domain || "ss"}-${ss.id || Date.now()}.png`;
          dl.addEventListener("click", () => downloadDataUrl(ss.dataUrl, fname));
          footer.appendChild(dl);
        }

        card.appendChild(footer);
        grid.appendChild(card);
      }
    }
    gallery.appendChild(grid);
  }

  /* ── Main render ── */

  function render() {
    const typeFilter = el("filter-type").value;
    const showEvents = typeFilter === "all" || typeFilter === "events";
    const showScreenshots = typeFilter === "all" || typeFilter === "screenshots";

    const filteredEvents = showEvents ? sortEvents(getFiltered()) : [];
    const filteredScreenshots = showScreenshots ? getFilteredScreenshots() : [];

    renderStats(filteredEvents, filteredScreenshots);
    renderTableHead();
    renderTableBody(filteredEvents);
    renderScreenshotGallery(filteredScreenshots);

    const tableSection = document.querySelector(".table-wrap");
    tableSection.style.display = (typeFilter === "screenshots") ? "none" : "";

    el("result-count").textContent =
      `${filteredEvents.length} event(s), ${filteredScreenshots.length} screenshot(s)`;

    const modeSelect = el("filter-mode");
    const isNonEventType = ["eaten-letters", "word-bank", "words-created", "screenshots"].includes(typeFilter);
    modeSelect.disabled = isNonEventType;

    handleSpecialTypes(typeFilter);
  }

  /* ── Special data type views (snake word bank, eaten letters, words) ── */

  function handleSpecialTypes(typeFilter) {
    const gallery = el("screenshot-gallery");
    const tableSection = document.querySelector(".table-wrap");
    const charFilter = el("filter-character").value;

    if (typeFilter === "eaten-letters" || typeFilter === "word-bank" || typeFilter === "words-created") {
      tableSection.style.display = "none";
      gallery.style.display = "";
      gallery.textContent = "";

      const targetChar = charFilter !== "all" ? charFilter : "char-snake";
      const ch = allCharacters[targetChar];
      if (!ch) {
        gallery.innerHTML = `<div class="empty-msg">No data for ${charName(targetChar)}.</div>`;
        return;
      }

      if (typeFilter === "eaten-letters") {
        const letters = Array.isArray(ch.stats?.lettersEatenList) ? ch.stats.lettersEatenList : [];
        renderLetterDisplay(gallery, "Letters eaten", letters, `${letters.length} letter(s)`);
      } else if (typeFilter === "word-bank") {
        const bank = Array.isArray(ch.stats?.wordBank) ? ch.stats.wordBank : [];
        renderLetterDisplay(gallery, "Word bank (available)", bank, `${bank.length} letter(s) available`);
      } else if (typeFilter === "words-created") {
        const words = Array.isArray(ch.stats?.wordsList) ? ch.stats.wordsList : [];
        renderWordsDisplay(gallery, words);
      }
    }
  }

  function renderLetterDisplay(container, title, letters, subtitle) {
    const card = document.createElement("div");
    card.className = "sg-card";
    card.style.padding = "16px";
    card.innerHTML = `
      <div style="font-weight:700;font-size:0.95rem;margin-bottom:4px">${escapeHtml(title)}</div>
      <div style="font-size:0.78rem;color:#64748b;margin-bottom:10px">${escapeHtml(subtitle)}</div>
      <div style="font-family:monospace;font-size:0.88rem;word-break:break-all;line-height:1.7;max-height:400px;overflow-y:auto">${
        letters.length ? escapeHtml(letters.join("")) : "<em style='color:#94a3b8'>Empty</em>"
      }</div>
    `;
    container.appendChild(card);
  }

  function renderWordsDisplay(container, words) {
    if (!words.length) {
      container.innerHTML = `<div class="empty-msg">No words created yet.</div>`;
      return;
    }

    const card = document.createElement("div");
    card.className = "sg-card";
    card.style.padding = "16px";

    let html = `<div style="font-weight:700;font-size:0.95rem;margin-bottom:10px">${words.length} word(s) created</div>`;
    html += `<div style="display:flex;flex-wrap:wrap;gap:6px">`;
    for (const entry of [...words].reverse()) {
      const when = entry.atMs ? new Date(entry.atMs).toLocaleString() : "";
      html += `<span title="${escapeHtml(when)}" style="background:#ecfdf5;color:#059669;padding:4px 10px;border-radius:6px;font-family:monospace;font-weight:700;font-size:0.88rem">${escapeHtml(entry.word)}</span>`;
    }
    html += `</div>`;
    card.innerHTML = html;
    container.appendChild(card);
  }

  /* ── Export ── */

  function exportJson() {
    const typeFilter = el("filter-type").value;
    const charFilter = el("filter-character").value;
    const payload = {};

    if (typeFilter === "screenshots" || typeFilter === "all") {
      payload.screenshots = getFilteredScreenshots().map((s) => {
        const copy = { ...s };
        delete copy.dataUrl;
        return copy;
      });
    }

    if (typeFilter !== "screenshots") {
      payload.events = getFiltered();
    }

    if (typeFilter === "eaten-letters" || typeFilter === "word-bank" || typeFilter === "words-created" || typeFilter === "all") {
      const targetChar = charFilter !== "all" ? charFilter : null;
      payload.characterData = {};
      for (const [cid, ch] of Object.entries(allCharacters)) {
        if (targetChar && cid !== targetChar) continue;
        payload.characterData[cid] = {
          displayName: ch.displayName,
          stats: ch.stats
        };
      }
    }

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    downloadBlob(blob, `dataman-export-${Date.now()}.json`);
  }

  function exportCsv() {
    const events = sortEvents(getFiltered());
    if (!events.length) {
      alert("No events to export. Adjust filters and try again.");
      return;
    }

    const headers = ["character", "mode", "type", "domain", "element", "selector", "textPreview", "time", "pageUrl"];
    const rows = [headers.join(",")];

    for (const ev of events) {
      const row = [
        charName(ev._characterId),
        ev.collectionMode || "",
        ev.eventType || "",
        ev.domain || "",
        ev.elementTag || "",
        ev.selectorGuess || "",
        `"${(ev.textPreview || "").replace(/"/g, '""')}"`,
        ev.occurredAtMs ? new Date(ev.occurredAtMs).toISOString() : "",
        ev.pageUrl || ""
      ];
      rows.push(row.join(","));
    }

    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    downloadBlob(blob, `dataman-export-${Date.now()}.csv`);
  }

  /* ── Clear data ── */

  function openClearDialog() {
    el("clear-dialog").showModal();
  }

  function closeClearDialog() {
    el("clear-dialog").close();
  }

  async function confirmClear() {
    const scope = document.querySelector('input[name="clear-scope"]:checked')?.value || "character";
    const alsoScreenshots = el("clear-screenshots").checked;

    try {
      const res = await browser.runtime.sendMessage({
        type: "CLEAR_DATA",
        scope,
        clearScreenshots: alsoScreenshots
      });

      if (!res?.ok) {
        alert("Clear failed: " + (res?.error || "unknown"));
        return;
      }

      closeClearDialog();
      await loadAllData();
      render();
    } catch (err) {
      alert("Error: " + err.message);
    }
  }

  /* ── Init ── */

  async function init() {
    await loadAllData();
    render();

    el("btn-refresh").addEventListener("click", async () => {
      await loadAllData();
      render();
    });

    el("filter-character").addEventListener("change", render);
    el("filter-type").addEventListener("change", render);
    el("filter-mode").addEventListener("change", render);

    let searchTimer;
    el("filter-search").addEventListener("input", () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(render, 200);
    });

    el("btn-export-json").addEventListener("click", exportJson);
    el("btn-export-csv").addEventListener("click", exportCsv);
    el("btn-clear").addEventListener("click", openClearDialog);
    el("clear-cancel").addEventListener("click", closeClearDialog);
    el("clear-confirm").addEventListener("click", confirmClear);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
