/* DataMan — background (event page). Storage + message protocol. */

const STORAGE_KEY = "datamanState";
const SCHEMA_VERSION = 1;
const MAX_EVENTS_PER_CHARACTER = 800;

const DEFAULT_CHARACTER_ID = "char-default";

/**
 * Mirrors dataman_storage_schema.sql (JSON, not SQLite).
 * - characters[id] = profile + stats + achievements[] + events[]
 * - each event: collectionMode passive | active_extract, eventType, etc.
 */
function defaultCharacter(id) {
  const now = Date.now();
  return {
    id,
    displayName: "Default",
    skin: "square",
    colorHex: "#4ade80",
    gravity: 0.65,
    jumpStrength: 11.5,
    moveSpeed: 4.2,
    createdAtMs: now,
    stats: {
      distancePx: 0,
      totalJumps: 0,
      totalExtractions: 0,
      domainsVisitedCount: 0,
      jumpsFromTag: {},
      visitedDomains: [],
      updatedAtMs: now
    },
    achievements: [],
    events: []
  };
}

function defaultState() {
  const id = DEFAULT_CHARACTER_ID;
  return {
    schemaVersion: SCHEMA_VERSION,
    activeCharacterId: id,
    characters: {
      [id]: defaultCharacter(id)
    },
    meta: {
      storageSelfTestAtMs: null
    }
  };
}

function ensureCharacterShape(c) {
  const base = defaultCharacter(c?.id || DEFAULT_CHARACTER_ID);
  const mergedStats = { ...base.stats, ...(c?.stats || {}) };
  mergedStats.jumpsFromTag = {
    ...(base.stats.jumpsFromTag || {}),
    ...(c?.stats?.jumpsFromTag || {})
  };
  mergedStats.visitedDomains = Array.isArray(c?.stats?.visitedDomains)
    ? c.stats.visitedDomains
    : base.stats.visitedDomains || [];
  return {
    ...base,
    ...c,
    stats: mergedStats,
    achievements: Array.isArray(c?.achievements) ? c.achievements : [],
    events: Array.isArray(c?.events) ? c.events : []
  };
}

function ensureStateShape(raw) {
  const base = defaultState();
  if (!raw || typeof raw !== "object") return base;

  const characters = {};
  const rawChars = raw.characters && typeof raw.characters === "object" ? raw.characters : {};
  for (const [id, ch] of Object.entries(rawChars)) {
    characters[id] = ensureCharacterShape({ ...ch, id });
  }
  if (!Object.keys(characters).length) {
    characters[DEFAULT_CHARACTER_ID] = defaultCharacter(DEFAULT_CHARACTER_ID);
  }

  let activeCharacterId = raw.activeCharacterId;
  if (!activeCharacterId || !characters[activeCharacterId]) {
    activeCharacterId = Object.keys(characters)[0];
  }

  return {
    schemaVersion: typeof raw.schemaVersion === "number" ? raw.schemaVersion : SCHEMA_VERSION,
    activeCharacterId,
    characters,
    meta: {
      storageSelfTestAtMs:
        typeof raw.meta?.storageSelfTestAtMs === "number" ? raw.meta.storageSelfTestAtMs : null
    }
  };
}

async function loadState() {
  const got = await browser.storage.local.get(STORAGE_KEY);
  let state = got[STORAGE_KEY];
  state = ensureStateShape(state);

  if (!got[STORAGE_KEY]) {
    state.meta.storageSelfTestAtMs = Date.now();
    await browser.storage.local.set({ [STORAGE_KEY]: state });
  } else if (state.meta.storageSelfTestAtMs == null) {
    state.meta.storageSelfTestAtMs = Date.now();
    await browser.storage.local.set({ [STORAGE_KEY]: state });
  }

  const verify = await browser.storage.local.get(STORAGE_KEY);
  const roundTrip = verify[STORAGE_KEY];
  if (!roundTrip?.meta?.storageSelfTestAtMs) {
    console.warn("[DataMan] storage read-after-write check unexpected");
  }

  return ensureStateShape(roundTrip || state);
}

async function saveState(state) {
  const next = ensureStateShape(state);
  await browser.storage.local.set({ [STORAGE_KEY]: next });
  return next;
}

function makeEventId() {
  return `evt-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function applyPassiveEventEffects(ch, row) {
  if (row.collectionMode !== "passive") return;
  const t = row.eventType;
  if (t === "jump") {
    ch.stats.totalJumps = (ch.stats.totalJumps || 0) + 1;
    const tag = row.elementTag || "UNKNOWN";
    ch.stats.jumpsFromTag = ch.stats.jumpsFromTag || {};
    ch.stats.jumpsFromTag[tag] = (ch.stats.jumpsFromTag[tag] || 0) + 1;
  } else if (t === "distance") {
    const d = Number(row.extra?.deltaPx ?? 0);
    if (!Number.isNaN(d) && d > 0) {
      ch.stats.distancePx = (ch.stats.distancePx || 0) + d;
    }
  } else if (t === "domain_visit") {
    const host = row.domain || "";
    ch.stats.visitedDomains = Array.isArray(ch.stats.visitedDomains) ? ch.stats.visitedDomains : [];
    if (host && !ch.stats.visitedDomains.includes(host)) {
      ch.stats.visitedDomains.push(host);
      ch.stats.domainsVisitedCount = ch.stats.visitedDomains.length;
    }
  }
}

/** Appends a row matching data_collection_events; trims FIFO past cap. */
function appendEvent(state, fields) {
  const cid = fields.characterId || state.activeCharacterId;
  const ch = state.characters[cid];
  if (!ch) return state;

  const collectionMode = fields.collectionMode;
  if (collectionMode !== "passive" && collectionMode !== "active_extract") {
    console.warn("[DataMan] invalid collectionMode", collectionMode);
    return state;
  }

  const row = {
    id: makeEventId(),
    characterId: cid,
    collectionMode,
    eventType: fields.eventType,
    occurredAtMs: Date.now(),
    domain: fields.domain || "",
    pageUrl: fields.pageUrl != null ? fields.pageUrl : null,
    elementTag: fields.elementTag != null ? fields.elementTag : null,
    selectorGuess: fields.selectorGuess != null ? fields.selectorGuess : null,
    bbox: fields.bbox != null ? fields.bbox : null,
    textPreview: fields.textPreview != null ? fields.textPreview : null,
    extra: fields.extra != null ? fields.extra : null
  };

  applyPassiveEventEffects(ch, row);

  ch.events.push(row);
  while (ch.events.length > MAX_EVENTS_PER_CHARACTER) {
    ch.events.shift();
  }
  ch.stats.updatedAtMs = Date.now();
  return state;
}

/** Increments `distancePx` only — no row in `events` (avoids log spam). */
function bumpDistancePx(state, deltaPx, characterId) {
  const cid = characterId || state.activeCharacterId;
  const ch = state.characters[cid];
  if (!ch) return state;
  const d = Number(deltaPx);
  if (!Number.isFinite(d) || d <= 0) return state;
  ch.stats.distancePx = (ch.stats.distancePx || 0) + d;
  ch.stats.updatedAtMs = Date.now();
  return state;
}

function stateSummary(state) {
  const ids = Object.keys(state.characters);
  let eventCount = 0;
  for (const id of ids) {
    eventCount += state.characters[id].events.length;
  }
  return {
    schemaVersion: state.schemaVersion,
    activeCharacterId: state.activeCharacterId,
    characterCount: ids.length,
    eventCount,
    storageSelfTestAtMs: state.meta.storageSelfTestAtMs,
    readable: buildReadableSummary(state)
  };
}

/** Human-oriented stats for the active character (popup / debug). */
function buildReadableSummary(state) {
  const id = state.activeCharacterId;
  const ch = state.characters[id];
  if (!ch) {
    return {
      characterId: id,
      displayName: "—",
      error: "Active character missing from storage."
    };
  }

  const stats = ch.stats || {};
  const events = Array.isArray(ch.events) ? ch.events : [];

  let lastJump = null;
  for (let i = events.length - 1; i >= 0; i--) {
    if (events[i].eventType === "jump") {
      lastJump = events[i];
      break;
    }
  }

  let topJumpTag = null;
  let topJumpCount = 0;
  const jft = stats.jumpsFromTag && typeof stats.jumpsFromTag === "object" ? stats.jumpsFromTag : {};
  for (const [tag, n] of Object.entries(jft)) {
    const num = Number(n) || 0;
    if (num > topJumpCount) {
      topJumpCount = num;
      topJumpTag = tag;
    }
  }

  const legacyDistanceEventCount = events.filter((e) => e.eventType === "distance").length;
  const passiveEvents = events.filter(
    (e) => e.collectionMode === "passive" && e.eventType !== "distance"
  ).length;
  const activeEvents = events.filter((e) => e.collectionMode === "active_extract").length;

  const visited = Array.isArray(stats.visitedDomains) ? stats.visitedDomains : [];
  const lastJumpTime =
    lastJump?.occurredAtMs != null
      ? new Date(lastJump.occurredAtMs).toLocaleString()
      : "—";

  return {
    characterId: ch.id || id,
    displayName: ch.displayName || id,
    totalJumps: stats.totalJumps ?? 0,
    distancePx: stats.distancePx ?? 0,
    totalExtractions: stats.totalExtractions ?? 0,
    domainsVisitedCount: stats.domainsVisitedCount ?? visited.length,
    visitedDomainsPreview: visited.slice(0, 6).join(", ") || "—",
    topJumpSourceTag: topJumpTag || "—",
    topJumpSourceCount: topJumpCount,
    lastJumpedOffElementTag: lastJump?.elementTag ?? "—",
    lastJumpedOffSelector: lastJump?.selectorGuess ?? "—",
    lastJumpDomain: lastJump?.domain ?? "—",
    lastJumpTime,
    storedEventsForCharacter: events.length,
    passiveEventsLogged: passiveEvents,
    activeExtractEventsLogged: activeEvents,
    legacyDistanceEventCount
  };
}

browser.runtime.onInstalled.addListener(() => {
  console.log("[DataMan] extension installed or updated");
});

browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const run = async () => {
    const type = message?.type;

    if (type === "PING") {
      return { ok: true, from: "background" };
    }

    if (type === "GET_STATE") {
      const state = await loadState();
      return { ok: true, state };
    }

    if (type === "GET_STATE_SUMMARY") {
      const state = await loadState();
      return { ok: true, summary: stateSummary(state) };
    }

    if (type === "CS_HELLO") {
      const state = await loadState();
      return {
        ok: true,
        activeCharacterId: state.activeCharacterId,
        storageSelfTestAtMs: state.meta.storageSelfTestAtMs
      };
    }

    if (type === "APPEND_SAMPLE_EVENT") {
      const mode =
        message.collectionMode === "active_extract" ? "active_extract" : "passive";
      const eventType =
        mode === "active_extract" ? "extraction" : "manual_test_passive";
      let state = await loadState();
      state = appendEvent(state, {
        collectionMode: mode,
        eventType,
        domain: "popup",
        pageUrl: null,
        characterId: state.activeCharacterId
      });
      await saveState(state);
      return { ok: true, summary: stateSummary(state) };
    }

    if (type === "ADD_DISTANCE_PX") {
      let state = await loadState();
      state = bumpDistancePx(state, message.deltaPx, message.characterId);
      await saveState(state);
      return { ok: true };
    }

    if (type === "LOG_PASSIVE_EVENT") {
      let state = await loadState();
      state = appendEvent(state, {
        collectionMode: "passive",
        eventType: message.eventType,
        domain: message.domain,
        pageUrl: message.pageUrl,
        elementTag: message.elementTag,
        selectorGuess: message.selectorGuess,
        bbox: message.bbox,
        textPreview: message.textPreview,
        extra: message.extra,
        characterId: message.characterId
      });
      await saveState(state);
      return { ok: true };
    }

    if (type === "GET_ACTIVE_CHARACTER_EVENTS") {
      const state = await loadState();
      const id = state.activeCharacterId;
      const ch = state.characters[id];
      if (!ch) {
        return { ok: false, error: "no_active_character" };
      }
      const raw = Array.isArray(ch.events) ? ch.events : [];
      const events = [...raw].reverse();
      return {
        ok: true,
        characterId: id,
        displayName: ch.displayName || id,
        events
      };
    }

    return { ok: false, error: "unknown_message_type", type };
  };

  run()
    .then(sendResponse)
    .catch((err) => {
      console.error("[DataMan] message error", err);
      sendResponse({ ok: false, error: String(err?.message || err) });
    });

  return true;
});
