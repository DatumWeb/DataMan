/* DataMan — background (event page). Storage + message protocol. */

const STORAGE_KEY = "datamanState";
const SCHEMA_VERSION = 1;

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
  return {
    ...base,
    ...c,
    stats: { ...base.stats, ...(c?.stats || {}) },
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

/** Optional: append a row matching SQL data_collection_events semantics */
function appendEvent(state, { collectionMode, eventType, domain, pageUrl, characterId }) {
  const cid = characterId || state.activeCharacterId;
  const ch = state.characters[cid];
  if (!ch) return state;

  const row = {
    id: makeEventId(),
    characterId: cid,
    collectionMode,
    eventType,
    occurredAtMs: Date.now(),
    domain: domain || "",
    pageUrl: pageUrl || null,
    elementTag: null,
    selectorGuess: null,
    bbox: null,
    textPreview: null,
    extra: null
  };

  if (collectionMode !== "passive" && collectionMode !== "active_extract") {
    console.warn("[DataMan] invalid collectionMode", collectionMode);
    return state;
  }

  ch.events.push(row);
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
    storageSelfTestAtMs: state.meta.storageSelfTestAtMs
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
