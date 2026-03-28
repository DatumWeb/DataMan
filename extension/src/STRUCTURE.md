# DataMan extension layout

## Content scripts (run in each web page)

Loaded **in order** (see `manifest.json`). All attach to `globalThis.DataMan`.

| File | Role |
| --- | --- |
| `content/namespace.js` | Root object `DataMan` |
| `content/config.js` | Constants + small helpers (`util.clamp`, `bestSelectorForElement`) |
| `content/gameState.js` | Mutable `DataMan.state`, `DataMan.runtime` (canvas handles) |
| `content/platforms.js` | `DataMan.platforms.refresh` — DOM rects + floor |
| `content/physics.js` | `DataMan.physics.*` — movement, jump, collision, spawn |
| `content/input.js` | `DataMan.input.wire` — keyboard |
| `content/overlay.js` | `DataMan.overlay.install` — canvas layer |
| `content/render.js` | `DataMan.render` — draw + game loop |
| `content/bridge.js` | `DataMan.bridge` — messages to **background** (storage lives there) |
| `content/bootstrap.js` | Entry: `DataMan.bootstrap()` |

**Note:** Extension storage is only in the background script. The page uses `bridge` to sync character look/physics.

## Popup (`src/popup/`)

Toolbar UI; `popupMain.js` is the current logic. Add more files here as the popup grows.

## Options (`src/options/`)

Full-tab settings. `characterSelection.js` is a stub for future profile UI; `optionsMain.js` is the entry.

## Background

`background.js` — single event page; owns `browser.storage.local` and message routing.
