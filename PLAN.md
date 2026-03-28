# DataMan — build plan (check off as you go)

Use `- [ ]` → `- [x]` when a row is done. Work in small slices; commit when **you** are ready.

---

## 0. Project & workflow

- [ ] Decide folder layout for extension source (e.g. `extension/` at repo root, or `src/` + `manifest.json` next to docs)
- [ ] Keep coursework docs here (`timeLog.md`, `initialDesgin.md`, this file) updated as required
- [ ] Optional: add `README.md` section “How to load in Firefox” pointing to the manifest path you chose

---

## 1. Extension shell (Manifest V3)

- [ ] Create `manifest.json` (MV3): name, version, description
- [ ] Declare needed **permissions** (e.g. `storage`, `tabs` if you use them)
- [ ] Declare **host permissions** for pages the content script runs on (e.g. `<all_urls>` or a tighter set)
- [ ] Wire **background** (`service_worker`)
- [ ] Wire **action** (toolbar popup): `default_popup`, `default_title`
- [ ] Wire **options_ui** (full tab for settings / character UI) if you want a separate page
- [ ] Register **content script(s)** with `matches`, `js`, `run_at`
- [ ] Add minimal stub files: `background.js`, `popup.html` + popup scripts, `src/content/*.js` bundle (see `extension/src/STRUCTURE.md`)

---

## 2. Load & reload in Firefox

- [ ] Open `about:debugging` → **This Firefox** → **Load Temporary Add-on…**
- [ ] Select your `manifest.json`; confirm toolbar icon / popup opens
- [ ] Document reload loop: after code changes → **Reload** on the extension → refresh the page
- [ ] Smoke test: open any site, confirm content script runs (e.g. `console.log` or visible marker)

---

## 3. Storage & messages (foundation)

- [x] Choose storage API (`browser.storage.local`) and keying strategy (per character, global app state)
- [x] Background: listen for `runtime.onMessage` (or ports) with a small set of message types
- [x] Content script ↔ background: send/receive one test message end-to-end
- [x] Persist and read back a test value from storage
- [x] Align persisted shape with your SQL sketch (`characters`, `data_collection_events`, `collection_mode` passive vs `active_extract`, etc.) even if stored as JSON at first

---

## 4. The DataMan character (“the guy”)

- [x] Render a simple avatar on the page (canvas or DOM overlay): position, size, color/skin placeholder
- [x] Keyboard input: move left/right, jump, drop-through if you want it
- [x] Basic gravity and collision with “ground” (start with page floor or a few rects)
- [x] Detect platforms from DOM (e.g. rects for headings, paragraphs, links, …) — start narrow, expand later
- [ ] Tune physics (gravity, jump strength, speed) with constants or per-character later
- [ ] Optional: multiple skins (square / circle / triangle) as a field on the character

---

## 5. Passive vs active data collection

- [ ] **Passive:** log events automatically (e.g. jump left element, domain visit, distance) with `collection_mode = passive` (or equivalent in JSON)
- [ ] **Active extract:** bind **collection move** key (e.g. **E**); on success log with `collection_mode = active_extract` and `event_type = extraction` (plus text preview, bbox, selector as you need)
- [ ] Every event row includes **`character_id`** of the active character
- [ ] Cap / prune log length so storage stays bounded (max events, FIFO, etc.)

---

## 6. Character profiles & selection

- [ ] Model **character** records: id, name, skin, color, physics fields
- [ ] **Active character** id in global state (who is playing right now)
- [ ] **Character selection UI** (popup and/or **Options** page): list characters, pick active, create/delete/edit
- [ ] Switching character updates active id and reloads visuals/physics from that profile
- [ ] Optional: “duplicate character”, reset stats per character

---

## 7. Stats & achievements (game layer)

- [ ] Aggregate from events or maintain counters: distance, jumps, extractions, domains visited, per-tag counts
- [ ] Achievement rules (e.g. link jumps, distance milestones, domain count) — unlock + store timestamps
- [ ] Show summary in **popup** (quick read)

---

## 8. Data viewing screen (“see what was collected”)

- [ ] Dedicated UI (Options tab, popup section, or separate page) to **browse collected rows**
- [ ] Filter by **character** (only data that character collected)
- [ ] Filter by **collection mode**: passive vs **active extract** (E move)
- [ ] Show useful columns: time, domain, event type, snippet/preview, element tag (as applicable)
- [ ] Optional: export (JSON/CSV), clear per character or global

---

## 9. UX, safety, and polish

- [ ] On-screen or docs: control legend (move, jump, extract, etc.)
- [ ] Handle bad pages: CSP, missing DOM, huge layouts — degrade gracefully
- [ ] Privacy note: local-only by default; no network unless you explicitly add it later
- [ ] Icons for toolbar/options if required for submission rubric
- [ ] README: install, features, limitations, repo link

---

## 10. Final stretch

- [ ] Full manual test pass on several site types
- [ ] Align public docs (`initialDesgin.md`, ERD/SQL image, time log) with what you built
- [ ] Final demo script (2–5 minutes)
- [ ] Tag release / final commit / push when you are satisfied

---

## Parking lot (after core is solid)

- [ ] Finer collision (e.g. line/word rects via `Range`)
- [ ] Allowlist / blocklist per domain
- [ ] “AI-driven” features (only if scope allows — define limits first)
