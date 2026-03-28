-- DataMan — storage sketch for ERD / diagram tools
-- Passive = logged automatically as you play (jumps, domains, etc.)
-- active_extract = user pressed the collection move (E) on an element

CREATE TABLE characters (
  id              TEXT PRIMARY KEY,
  display_name    TEXT NOT NULL,
  skin            TEXT NOT NULL DEFAULT 'square',
  color_hex       TEXT NOT NULL DEFAULT '#4ade80',
  gravity         REAL NOT NULL DEFAULT 0.65,
  jump_strength   REAL NOT NULL DEFAULT 11.5,
  move_speed      REAL NOT NULL DEFAULT 4.2,
  created_at_ms   INTEGER NOT NULL,
  is_active       INTEGER NOT NULL DEFAULT 0 CHECK (is_active IN (0, 1))
);

-- Every row is one piece of collected data, always tied to exactly one character.
-- collection_mode tells you passive vs explicit extract.
CREATE TABLE data_collection_events (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  character_id      TEXT NOT NULL REFERENCES characters (id) ON DELETE CASCADE,
  collection_mode   TEXT NOT NULL CHECK (collection_mode IN ('passive', 'active_extract')),
  -- What happened: jump | domain_visit | extraction | ... (extraction should use active_extract)
  event_type        TEXT NOT NULL,
  occurred_at_ms    INTEGER NOT NULL,
  domain            TEXT NOT NULL DEFAULT '',
  page_url          TEXT,
  element_tag       TEXT,
  selector_guess    TEXT,
  bbox_x            INTEGER,
  bbox_y            INTEGER,
  bbox_w            INTEGER,
  bbox_h            INTEGER,
  text_preview      TEXT,
  extra_json        TEXT
);

CREATE INDEX idx_events_character ON data_collection_events (character_id);
CREATE INDEX idx_events_character_mode ON data_collection_events (character_id, collection_mode);
CREATE INDEX idx_events_character_time ON data_collection_events (character_id, occurred_at_ms DESC);

-- Example: “everything Squaredude collected via the E move”
-- SELECT * FROM data_collection_events
-- WHERE character_id = '...' AND collection_mode = 'active_extract';

-- Example: “passive trail only (jumps, domains, …)”
-- SELECT * FROM data_collection_events
-- WHERE character_id = '...' AND collection_mode = 'passive';

-- Rollups per character (optional cache; could be derived from events instead)
CREATE TABLE character_stats (
  character_id           TEXT PRIMARY KEY REFERENCES characters (id) ON DELETE CASCADE,
  distance_px            INTEGER NOT NULL DEFAULT 0,
  total_jumps            INTEGER NOT NULL DEFAULT 0,
  total_extractions      INTEGER NOT NULL DEFAULT 0,
  domains_visited_count  INTEGER NOT NULL DEFAULT 0,
  updated_at_ms        INTEGER NOT NULL
);

CREATE TABLE character_achievements (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  character_id    TEXT NOT NULL REFERENCES characters (id) ON DELETE CASCADE,
  achievement_key TEXT NOT NULL,
  unlocked_at_ms  INTEGER NOT NULL,
  UNIQUE (character_id, achievement_key)
);
