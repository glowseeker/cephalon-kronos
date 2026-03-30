# Cephalon Kronos - Architecture Overview

Cephalon Kronos is a Tauri desktop app (Rust backend + React frontend) that reads
your Warframe inventory and the live game worldstate, then presents both in a
single UI shell.

---

## High-Level Architecture

```
Warframe game process
        │
        ▼
 warframe-api-helper  (bundled binary, reads game memory for auth tokens)
        │  writes  inventory.json
        ▼
Rust backend  (src-tauri/src/main.rs)
  ├── downloads / caches JSON export files from GitHub   → data/export/
  ├── downloads / caches media assets (maps, rank icons) → data/export/maps|masteryicons/
  ├── runs warframe-api-helper                           → data/user/inventory.json
  └── exposes all of the above to the frontend via Tauri IPC commands
        │
        │  invoke('call_api_helper') / invoke('load_all_exports') / ...
        ▼
MonitoringContext.jsx  (src/contexts/MonitoringContext.jsx)
  ├── on startup: load_cached_inventory + load_all_exports
  ├── on scan: call_api_helper → fresh inventory
  ├── on each cycle: fetch worldstate from content.warframe.com
  ├── passes raw inventory + exports → parseInventory()
  └── passes raw worldstate → parseWorldstate()
        │
        ▼
┌──────────────────────────────────────────────────────────────┐
│                         src/lib/                             │
│                                                              │
│  inventoryParser.js                                          │
│    parseInventory(raw, exports) → structured inventory       │
│    Resolves: names, images, ranks, relic rewards, rivens     │
│    Helpers imported from: warframeUtils.js                   │
│                                                              │
│  worldstateParser.js                                         │
│    parseWorldstate(raw, options) → dashboard data object     │
│    Resolves: fissures, sorties, cycles, Nightwave, etc.      │
│    Helpers imported from: warframeUtils.js                   │
│                                                              │
│  warframeUtils.js                                            │
│    Shared lookup tables and pure resolution functions.       │
│    No network calls or disk I/O.                             │
└──────────────────────────────────────────────────────────────┘
        │
        ▼
React screens  (src/screens/*.jsx) - read from MonitoringContext via useMonitoring()

  Dashboard.jsx    ← worldstate data (fissures, sorties, cycles, events, …)
  Inventory.jsx    ← all items, searchable/filterable by category and ownership
  Mastery.jsx      ← mastery rank progress, starchart completion, mastery XP totals
  Relics.jsx       ← owned relics grouped by era/name with refinement counts
  Rivens.jsx       ← mod parsing with live stat calculation
  Notes.jsx        ← Markdown notes saved to data/user/notes/ via Tauri IPC
  Checklist.jsx    ← persistent to-do list (localStorage)
  Maps.jsx         ← pannable/zoomable open-world maps from data/export/maps/
  Settings.jsx     ← theme picker + monitoring controls
  About.jsx        ← credits and disclaimer
```

---

## File-by-File Reference

### `src-tauri/src/main.rs`
Rust backend.  All public functions tagged `#[tauri::command]` are callable from
the frontend via `invoke()`.

| Command | Called by | Purpose |
|---------|-----------|---------|
| `check_exports` | MonitoringContext (startup) | Download/refresh JSON exports |
| `load_all_exports` | MonitoringContext (startup) | Read all exports into one object |
| `call_api_helper` | MonitoringContext (scan) | Run the API helper binary, get fresh inventory |
| `load_cached_inventory` | MonitoringContext (startup) | Load last saved inventory from disk |
| `check_media_assets` | MonitoringContext (startup) | Download map + rank icon images |
| `load_txt_file` | Dashboard (arbitration data) | Read TXT data files from disk |
| `list_notes` / `read_note` / `save_note` / `delete_note` | Notes.jsx | CRUD for Markdown notes |
| `open_data_folder` | Settings.jsx | Open data/ in the OS file browser |
| `get_mastery_icons_path` | Mastery.jsx | Return absolute path to rank icon directory |
| `get_maps_path` | Maps.jsx | Return absolute path to maps directory |

---

### `src/lib/inventoryParser.js`

**Entry point:** `parseInventory(raw, exports)`

Takes:
- `raw` - the raw JSON from `warframe-api-helper` (`data/user/inventory.json`)
- `exports` - the merged export bundle from `load_all_exports`

Returns a single structured object with:
- `account` - mastery rank, credits, platinum, forma counts, etc.
- `warframes`, `primary`, `secondary`, `melee`, `kitguns`, `zaws`,
  `sentinels`, `moas`, `hounds`, `beasts`, `amps`, `archwings`,
  `kdrives`, `archweapons`, `necramechs`, `plexus` - item arrays per category
- `mods`, `arcanes`, `relics`, `resources`, `rivens`, `prime_parts`,
  `intrinsics`, `starchart` - other collection data
- `foundry`, `globalBoosters` - Foundry queue and active boosters
- `all` - flat array of all mastery-relevant items (used by Mastery.jsx)

Internal resolution chain (for each item):
1. Look up `uniqueName` in export tables → get localised `name` and `icon`
2. Fall back to dictionary lookup
3. Fall back to `nameFromPath()` (PascalCase splitting + folder overrides)

---

### `src/lib/worldstateParser.js`

**Entry point:** `parseWorldstate(raw, options)`

Takes the live worldstate JSON from `https://content.warframe.com/dynamic/worldState.php`
and returns a flat object with:

- `news`, `invasions`, `fissures`, `voidStorms`, `fissures`
- `sortie`, `archonHunt`, `nightwave`, `archimedeas`, `circuit`
- `dailyDeals`, `alerts`, `events`, `globalBoosters`, `voidTrader`
- `cetusCycle`, `vallisCycle`, `cambionCycle`, `earthCycle`,
  `zarimanCycle`, `duviriCycle`
- `calendar1999`, `descendia`

Environmental cycles are computed locally from `Date.now()` using
wiki-sourced epoch timestamps - no extra network request needed.

---

### `src/lib/warframeUtils.js`

Shared utility module imported by both parsers.  Contains:

- **`GeneralOverrides`** - internal key → display string for factions, bosses, modifiers
- **`MAPPING_TYPES`** - mission type codes → display names
- **`resolveNode()`** - general purpose key resolver (node tags, faction codes, etc.)
- **`resolveMissionType()`** - wraps resolveNode for mission types
- **`resolveChallenge()` / `resolveChallengeDesc()`** - Nightwave challenge text
- **`resolveRewardText()`** - reward object → human-readable string
- **`resolveItemName()`** - item path → display name
- **`resolveAnyImage()`** - item/reward → image URL
- **`timeRemaining()` / `timeSince()` / `formatLastUpdate()`** - time formatting

---

### `src/contexts/MonitoringContext.jsx`

The data hub.  Wraps the entire app and provides `useMonitoring()`.

On startup:
1. `check_exports` → ensure export files are fresh
2. `check_media_assets` → ensure map/icon images are present
3. `load_all_exports` → read all JSON exports into memory
4. `load_cached_inventory` → load the last saved inventory (shows data immediately)
5. Fetch worldstate from Warframe's API

On each monitoring cycle (configurable interval):
1. `call_api_helper` → fresh inventory from game
2. Re-fetch worldstate

Parses both with the lib/ parsers and exposes the results via context.

---

### `src/contexts/ThemeContext.jsx`

Manages the selected colour theme.  Applies a `data-theme` attribute to the
document root which triggers CSS variable overrides defined in `index.css`.
Persisted to `localStorage`.

---

### `src/App.jsx`

Root component.  Wraps `ThemeProvider` and `MonitoringProvider`, renders the
sidebar navigation and a `<Suspense>` boundary for lazy-loaded screens.

No client-side router - navigation is a single `currentScreen` state string
that selects from a SCREENS map.

---

## Data Directory Layout

```
src-tauri/data/
  bin/
    warframe-api-helper          ← bundled helper binary
  export/
    ExportWarframes.json         ← game data (refreshed daily)
    ExportWeapons.json
    … (all ExportXxx.json files)
    dict.en.json                 ← main localisation dictionary
    supp-dict-en.json            ← supplementary oracle dictionary
    arbys.txt                    ← arbitration data (refreshed every 6h)
    sp-incursions.txt            ← Steel Path incursion data (refreshed every 6h)
    maps/                        ← open-world map PNGs
    masteryicons/                ← mastery rank icon PNGs
  user/
    inventory.json               ← latest fetched inventory
    notes/                       ← user Markdown notes (*.md)
```

---

## External Data Sources

| Source | What it provides | Refresh rate |
|--------|-----------------|--------------|
| `raw.githubusercontent.com/calamity-inc/warframe-public-export-plus` | Game data exports (items, weapons, relics, etc.) | Daily |
| `oracle.browse.wf/dicts/en.json` | Supplementary localisation dictionary | Daily |
| `browse.wf/arbys.txt` | Current arbitration rotation | Every 6 h |
| `browse.wf/sp-incursions.txt` | Steel Path incursions | Every 6 h |
| `content.warframe.com/dynamic/worldState.php` | Live worldstate (fissures, sorties, events, cycles) | Each monitoring cycle |
| `browse.wf` | Item images (via icon URLs embedded in exports) | On demand |
