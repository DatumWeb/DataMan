/* Toolbar popup — stats + smoke tests */

function show(el, text) {
  el.textContent = text;
}

function renderReadableStats(readable) {
  const root = document.getElementById("summary-out");
  root.textContent = "";

  function section(title) {
    const s = document.createElement("div");
    s.className = "stat-section";
    s.textContent = title;
    root.appendChild(s);
  }

  function row(label, value) {
    const r = document.createElement("div");
    r.className = "stat-row";
    const l = document.createElement("span");
    l.className = "stat-label";
    l.textContent = label;
    const v = document.createElement("span");
    v.className = "stat-value";
    v.title = String(value ?? "");
    v.textContent = value === undefined || value === null || value === "" ? "—" : String(value);
    r.appendChild(l);
    r.appendChild(v);
    root.appendChild(r);
  }

  if (!readable) {
    root.textContent = "No stats returned.";
    return;
  }

  if (readable.error) {
    section("Error");
    row("Message", readable.error);
    return;
  }

  section("Character");
  row("Name", readable.displayName);
  row("Id", readable.characterId);

  section("Totals");
  row("Total jumps", readable.totalJumps);
  row("Distance (px)", readable.distancePx);
  row("Total extractions", readable.totalExtractions);
  row("Domains visited (count)", readable.domainsVisitedCount);
  row("Domains (sample)", readable.visitedDomainsPreview);

  section("Jumps");
  row("Top jump source (tag)", readable.topJumpSourceTag);
  row("Jumps from that tag", readable.topJumpSourceCount);
  row("Last jumped off (element)", readable.lastJumpedOffElementTag);
  row("Last jump (selector hint)", readable.lastJumpedOffSelector);
  row("Last jump (page domain)", readable.lastJumpDomain);
  row("Last jump (time)", readable.lastJumpTime);

  section("Stored events (this character)");
  row("All rows in log (includes legacy)", readable.storedEventsForCharacter);
  row("Passive event rows (excl. distance)", readable.passiveEventsLogged);
  row("Active extract events", readable.activeExtractEventsLogged);
  if (readable.legacyDistanceEventCount > 0) {
    row("Legacy distance rows (old format)", readable.legacyDistanceEventCount);
  }
}

document.getElementById("ping").addEventListener("click", async () => {
  const el = document.getElementById("ping-result");
  el.textContent = "…";
  try {
    const res = await browser.runtime.sendMessage({ type: "PING" });
    show(el, res?.ok ? "Background replied OK." : String(res));
  } catch (e) {
    show(el, e?.message || String(e));
  }
});

document.getElementById("summary").addEventListener("click", async () => {
  const el = document.getElementById("summary-out");
  el.textContent = "Loading…";
  try {
    const res = await browser.runtime.sendMessage({ type: "GET_STATE_SUMMARY" });
    if (res?.ok && res.summary?.readable) {
      renderReadableStats(res.summary.readable);
    } else if (res?.ok && res.summary) {
      el.textContent = JSON.stringify(res.summary, null, 2);
    } else {
      el.textContent = JSON.stringify(res, null, 2);
    }
  } catch (e) {
    el.textContent = e?.message || String(e);
  }
});

async function appendSample(collectionMode) {
  const el = document.getElementById("sample-result");
  el.textContent = "…";
  try {
    const res = await browser.runtime.sendMessage({
      type: "APPEND_SAMPLE_EVENT",
      collectionMode
    });
    if (res?.ok && res.summary?.readable) {
      const r = res.summary.readable;
      el.textContent = `OK — stored events: ${r.storedEventsForCharacter}, jumps: ${r.totalJumps}`;
    } else if (res?.ok && res.summary) {
      el.textContent = `OK — events now: ${res.summary.eventCount}`;
    } else {
      el.textContent = JSON.stringify(res);
    }
  } catch (e) {
    el.textContent = e?.message || String(e);
  }
}

document.getElementById("sample-passive").addEventListener("click", () => {
  appendSample("passive");
});

document.getElementById("sample-active").addEventListener("click", () => {
  appendSample("active_extract");
});

function formatEventExtra(extra) {
  if (extra == null) return "—";
  try {
    const s = JSON.stringify(extra);
    return s.length > 120 ? `${s.slice(0, 117)}…` : s;
  } catch {
    return String(extra);
  }
}

function renderEventsList(events, meta) {
  const out = document.getElementById("events-out");
  const status = document.getElementById("events-status");
  out.textContent = "";

  if (!events || events.length === 0) {
    status.textContent = `No events stored for ${meta.displayName} (${meta.characterId}).`;
    return;
  }

  const legacyDistance = events.filter((e) => e.eventType === "distance");
  const visible = events.filter((e) => e.eventType !== "distance");

  let statusText = `${visible.length} event(s) shown — ${meta.displayName} (${meta.characterId}) — newest first. Distance is stored in stats only (not as rows).`;
  if (legacyDistance.length > 0) {
    statusText += ` ${legacyDistance.length} older “distance” row(s) hidden.`;
  }
  status.textContent = statusText;

  if (visible.length === 0) {
    const p = document.createElement("p");
    p.className = "muted";
    p.style.margin = "8px 10px";
    p.textContent =
      legacyDistance.length > 0
        ? "Only legacy distance rows exist; use Refresh stats for Distance (px)."
        : "No events to show.";
    out.appendChild(p);
    return;
  }

  for (const ev of visible) {
    const card = document.createElement("div");
    card.className = "event-card";

    const when =
      ev.occurredAtMs != null
        ? new Date(ev.occurredAtMs).toLocaleString()
        : "—";
    const t = document.createElement("time");
    t.textContent = when;
    card.appendChild(t);

    function line(label, value) {
      const span = document.createElement("span");
      span.className = "event-line";
      const strong = document.createElement("strong");
      strong.textContent = `${label}: `;
      span.appendChild(strong);
      span.appendChild(document.createTextNode(value ?? "—"));
      card.appendChild(span);
    }

    line("Mode", ev.collectionMode);
    line("Type", ev.eventType);
    line("Domain", ev.domain);
    if (ev.pageUrl) line("Page", ev.pageUrl);
    if (ev.elementTag) line("Element", ev.elementTag);
    if (ev.selectorGuess) line("Selector", ev.selectorGuess);
    if (ev.bbox) line("BBox", JSON.stringify(ev.bbox));
    if (ev.textPreview) line("Text preview", ev.textPreview);
    line("Extra", formatEventExtra(ev.extra));
    if (ev.id) line("Id", ev.id);

    out.appendChild(card);
  }
}

document.getElementById("load-events").addEventListener("click", async () => {
  const out = document.getElementById("events-out");
  const status = document.getElementById("events-status");
  out.textContent = "";
  status.textContent = "Loading…";
  try {
    const res = await browser.runtime.sendMessage({ type: "GET_ACTIVE_CHARACTER_EVENTS" });
    if (!res?.ok) {
      status.textContent = res?.error || "Could not load events.";
      return;
    }
    renderEventsList(res.events, {
      characterId: res.characterId,
      displayName: res.displayName
    });
  } catch (e) {
    status.textContent = e?.message || String(e);
  }
});
