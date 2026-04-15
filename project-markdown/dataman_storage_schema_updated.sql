-- DataMan — SQL sketch of what is actually stored (browser.storage.local)
-- Source: extension/src/background.js
--
-- Keys:
--   datamanState       — main app state (JSON)
--   datamanScreenshots — screenshot list (JSON array), separate from datamanState
--
-- Not persisted: physics (characters.js); achievements array exists in JS but is never written — omitted here.

PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------------------
-- Singleton row equivalent to the root of `datamanState`
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS extension_state (
  id                         INTEGER PRIMARY KEY CHECK (id = 1),
  schema_version             INTEGER NOT NULL,              -- SCHEMA_VERSION (1)
  active_character_id        TEXT NOT NULL,
  storage_self_test_at_ms    INTEGER                          -- meta.storageSelfTestAtMs
);

-- ---------------------------------------------------------------------------
-- One row per character in `state.characters` (keys: char-default, char-stickman, char-snake, char-astroman)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS characters (
  id              TEXT PRIMARY KEY,
  display_name    TEXT NOT NULL,
  skin            TEXT NOT NULL,
  color_hex       TEXT NOT NULL,
  created_at_ms   INTEGER NOT NULL
);

-- ---------------------------------------------------------------------------
-- `character.stats` — single object per character (freshStats + updates)
-- Complex fields are JSON text (objects / arrays) as stored in JS.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS character_stats (
  character_id               TEXT PRIMARY KEY REFERENCES characters (id) ON DELETE CASCADE,
  distance_px                INTEGER NOT NULL DEFAULT 0,
  total_jumps                INTEGER NOT NULL DEFAULT 0,
  total_extractions          INTEGER NOT NULL DEFAULT 0,
  letters_eaten              INTEGER NOT NULL DEFAULT 0,
  words_created              INTEGER NOT NULL DEFAULT 0,
  domains_visited_count      INTEGER NOT NULL DEFAULT 0,
  max_velocity_px_per_sec    INTEGER NOT NULL DEFAULT 0,
  updated_at_ms              INTEGER NOT NULL,
  jumps_from_tag_json        TEXT,    -- object: tag -> count
  extraction_by_tag_json     TEXT,    -- object: tag -> count
  visited_domains_json       TEXT,    -- array of hostname strings
  letters_eaten_list_json    TEXT,    -- array of single-char strings; capped ~1000 in code
  word_bank_json             TEXT,    -- array of letters available for word spit
  words_list_json            TEXT     -- array of { word, atMs }; capped ~500 in code
);

-- ---------------------------------------------------------------------------
-- `character.events` — appendEvent rows; FIFO trim keeps last 800 per character
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS character_events (
  id                 TEXT PRIMARY KEY,
  character_id       TEXT NOT NULL REFERENCES characters (id) ON DELETE CASCADE,
  collection_mode    TEXT NOT NULL CHECK (collection_mode IN ('passive', 'active_extract')),
  event_type         TEXT NOT NULL,
  occurred_at_ms     INTEGER NOT NULL,
  domain             TEXT NOT NULL DEFAULT '',
  page_url           TEXT,
  element_tag        TEXT,
  selector_guess     TEXT,
  bbox_json          TEXT,            -- null or { x, y, w, h } (numbers)
  text_preview       TEXT,
  extra_json         TEXT             -- null or arbitrary JSON from `extra`
);

CREATE INDEX IF NOT EXISTS idx_character_events_character_time ON character_events (character_id, occurred_at_ms DESC);

-- ---------------------------------------------------------------------------
-- `datamanScreenshots` — global array; FIFO trim keeps last 30 total
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS screenshots (
  id             TEXT PRIMARY KEY,
  character_id   TEXT NOT NULL REFERENCES characters (id) ON DELETE CASCADE,
  domain         TEXT NOT NULL DEFAULT '',
  page_url       TEXT NOT NULL DEFAULT '',
  rect_json      TEXT NOT NULL,       -- { x, y, w, h }
  taken_at_ms    INTEGER NOT NULL,
  data_url       TEXT NOT NULL         -- PNG data URL (large)
);

CREATE INDEX IF NOT EXISTS idx_screenshots_taken ON screenshots (taken_at_ms DESC);

-- ---------------------------------------------------------------------------
-- Caps (enforced in JS, not SQL)
-- ---------------------------------------------------------------------------
-- character_events: max 800 per character
-- screenshots: max 30 globally
-- letters_eaten_list: max 1000 entries
-- words_list: max 500 entries
