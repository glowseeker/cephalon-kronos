# Cephalon Kronos - Architecture Overview

Tauri v2 desktop app (Rust backend + React frontend). Reads Warframe inventory
via the game's mobile API and the live worldstate, then presents both in a
single UI shell. Also provides real-time overlays that read the game's EE.log
ring buffer from process memory and run PP-OCRv5 on the reward/riven screens.

---

## High-Level Architecture

```
Warframe game process
  |
  +-- memory scan (auth token) -> Rust call_api_helper -> inventory.json
  +-- memory scan (EE.log ring buffer) -> mem_reader.rs -> log_scanner
  |
  v
Rust backend (src-tauri/src/)
  main.rs           - Tauri entry point, IPC commands, app lifecycle
  log_scanner.rs    - spawns memory watcher thread, parses EE.log lines,
                       emits fissure/relic/riven events
  ocr.rs            - screen capture, slot detection, OCR pipeline
  ocr_engine.rs     - PP-OCRv5 model wrapper (ocr-rs crate)
  pricer.rs         - riven price prediction via tract-onnx
  overlay_utils.rs  - window positioning helpers for overlay windows
  logger.rs         - debug logging to data/user/overlay_debug.log
  |
  +-- downloads/caches JSON exports from GitHub          -> data/export/
  +-- downloads/caches media assets                      -> data/assets/
  +-- scans game memory for auth token, fetches inventory  -> data/user/inventory.json
  +-- reads EE.log ring buffer from game process memory   -> emits Tauri events
  +-- exposes all of the above via Tauri IPC commands
  |
  v
React frontend (src/)

  main.jsx - ReactDOM entry, imports index.css + fonts
  App.jsx  - routing: main window (sidebar nav) or overlay window (?overlay=true)
    contexts/
      MonitoringContext  - lifecycle: startup exports, inventory scan, worldstate polling
      ThemeContext        - CSS variable theming
      UpdateContext       - Tauri updater integration

    screens/ (lazy-loaded by App.jsx)
      Dashboard, Inventory, Mods, Rivens, Relics, Mastery,
      Notes, Maps, Collectibles, Checklist, Settings, About

    lib/
      inventoryParser.js  - raw JSON -> structured inventory
      worldstateParser.js - raw JSON -> dashboard data
      warframeUtils.js    - pure lookup/resolution functions
      relicParser.js      - owned relics by era/name, refinement counts
      notificationManager.js - notification queue + display
      wfmCache.js         - warframe.market cache layer
      marketEngine.js     - ducat/platinum pricing engine
      settings.js         - settings persistence and defaults

    components/
      RivenCard.jsx, ModCard.jsx, UI.jsx (shared), BackToTop.jsx,
      NotificationManager.jsx
      overlays/
        OverlayRouter.jsx    - routes overlay type to correct component
        RelicRewardOverlay.jsx - relic reward screen overlay
        RivenOverlay.jsx     - riven card overlay
        ToastOverlay.jsx     - toast notification overlay
```

---

## Subsystems

### EE.log Memory Watcher

Reads Warframe's in-process EE.log ring buffer natively in Rust by
scanning /proc/&lt;pid&gt;/maps (Linux) or VirtualQueryEx (Windows) for private
memory regions, then reading via pread / ReadProcessMemory.

**Control flow:**

```
Rust: stop_scanner()       -> sets IS_SCANNING=false, join watcher thread
Rust: spawn_memory_watcher -> spawns tokio blocking thread:
                              get_warframe_pid() -> enumerate memory regions
                              for each candidate region containing log markers:
                                score a sliding 64KB window (CHUNK - OVERLAP stride)
                                apply penalty to executable-image address ranges
                              pick best-scoring region, set stale_offset status
                              loop every 150ms:
                                pread/ReadProcessMemory the region
                                delta-diff against previous snapshot
                                extract new lines matching /^\d+\.?\d* .../
                                pass each new line to LogScanner::on_line()
                                +-- Mission Start  (_ActiveMission})
                                +-- Relic Pool     (Resloader...Projections...starting)
                                +-- Reward Screen  (Relic rewards initialized)
                                +-- Reward Close   (relic reward screen shut down)
                                +-- Endless Continue (ThemedProjectionManager.swf)
                                +-- Mission Exit   (ExitState: Disconnected)
                                +-- Riven Open     (OmegaRerollSelection.lua: Diorama setup)
                                +-- Riven Close    (DiegeticArtifactCards.lua: DBG: HudVis)
                                +-- Riven Reroll   (Dialog::SendResult(4))
                              each trigger emits a Tauri event to the frontend
                              on validation failure: reload offsets, re-discover region
```
```

### OCR Pipeline (PP-OCRv5)

Uses `ocr-rs` crate with PP-OCRv5 mobile model (detection + recognition MNN
models in `data/bin/ocr-models/`).

**Control flow:**

```
Relic rewards initialized trigger
  -> Rust sets ICON_SCAN_ACTIVE=true
  -> captures screen via xcap
  -> detects slot rectangles (template matching)
  -> for each slot:
       extract sub-image -> CatmullRom 3x upscale -> invert
       -> ocr_engine::recognize() -> RecModel inference -> text
  -> clean_ocr_output(): strip leading junk tokens (-Forma -> Forma)
  -> fuzzy-match against relic reward pool (levenshtein)
  -> emit overlay-update-ocr event to frontend
```

Models downloaded automatically from GitHub on first run.

### Warframe Overlay

Four transparent click-through Tauri windows positioned at top-left, top-center,
top-right, and bottom-center (`overlay-relic`). Toggled from the frontend
settings panel via `start_log_scanner` / `stop_log_scanner`.

**Window positions:**

| Label | Position |
|-------|----------|
| overlay-tl | top-left, 16px margin |
| overlay-tc | top-center |
| overlay-tr | top-right, 16px margin |
| overlay-relic | bottom-center, 40px from bottom |

### Riven Price Prediction

The app can estimate riven platinum prices using a tract-onnx model trained on
warframe.market auction data.

**Model architecture:**

The model is a small neural network with three inputs:
- `weapon_url_name` (string) -> Embedding(32)
- `re_rolled` (0.0 or 1.0) - has the riven been rolled at least once
- `[positive1, positive2, positive3, negative]` (4 strings) - stat url_names
  like `critical_chance`, or `<NONE>` for empty slots. Each slot goes through a
  shared Embedding(32) layer.

Embedding outputs are concatenated with re_rolled (161 features), then
Dense(128, relu) -> Dense(32, relu) -> Dense(1, linear). The output is
log1p(platinum); apply expm1() to get the actual platinum estimate.

The model does NOT use numeric roll values (e.g. 161.7% crit chance),
disposition, incarnon status, or weapon group. Those were tested and found not
to improve accuracy.

**Preprocessing:**

1. OCR output (display names like "Critical Chance") is mapped to url_names via
   `effect_to_url_name.json` (built from `attributes_data.json`'s `effect` field)
2. url_names are mapped to vocab indices via `weapon_vocab.json` /
   `attr_vocab.json`
3. `attribute_name_shortcuts.json` resolves shorthands ("cc" -> "critical_chance")
4. Integer tensors are fed into the ONNX model via `tract-onnx`

**Data files (data/bin/pricer-models/):**

| File | Purpose |
|------|---------|
| `price_model.onnx` | Trained model in ONNX format |
| `weapon_vocab.json` | Weapon url_name to vocab index |
| `attr_vocab.json` | Attribute url_name to vocab index |
| `attribute_name_shortcuts.json` | Shorthand to url_name mapping |
| `items_data.json` | Item name to url_name mapping |
| `effect_to_url_name.json` | Display name to url_name mapping |
| `weapon_ranking_information.json` | Per-weapon rank, EV, price distribution |
| `global_price_freq.json` | Global price frequency distribution |

**Key commands (main.rs):**
- `estimate_riven_price` - raw price estimate
- `estimate_riven_full` - price + grade (S/A/B/C/D/F) + CDF percentile + EV +
  reroll analysis
- `estimate_riven_full_batch` - batch variant
- `get_weapon_names` - all known weapons for UI dropdowns

**Training pipeline (tools/riven-pricer/):**
The model is trained separately in Python (not part of the Tauri build).
- `retrain.py` - orchestrates the full retrain cycle
- `setup_weapon_information_onnx.py` - post-training: runs inference on all
  weapon/stat combos, builds weapon_ranking_information.json + global pool stats
- `pipeline/` - data scraping, preprocessing, training scripts (ported from
  the original WarframeRivenPricer repo)

---

## Data Directory Layout

`src-tauri/data/` is the runtime data root. Paths are relative to the Tauri
resource directory at runtime.

```
bin/
  Warframe-Exporter-CLI_Linux.AppImage  card-image extraction tool
  ocr-models/
    PP-OCRv5_mobile_det.mnn    detection model
    PP-OCRv5_mobile_rec.mnn    recognition model
    ppocr_keys_v5.txt           character keys
  pricer-models/               riven pricing model + JSON vocabs

assets/
  audio/
    notification1.wav           overlay sound effects
    notification2.wav
  card-images/                  arcane/mod images (extracted at runtime
                                 by Warframe-Exporter-CLI)
  data/
    peely-pix-names.json        asset name fixups
    peely-pix-map.json
    mod-icon-map.json
    card-overlay-map.json
    ExportUpgrades_fixed.json   patched export files
    ExportAvionics_fixed.json
  maps/                         open-world map PNGs
  mastery-icons/                mastery rank icon PNGs (Rank00-Rank51)
  mod-frames/                   mod background rendering assets
    Amalgam/, Antivirus/, Arcanes/, Archon/, Galvanized/,
    Normal Common/, Normal Legendary/, Normal Rare/, Normal Uncommon/,
    Peculiar/, Plexus*/, Potency/, Requiem/, Riven/, Sets/,
    Tektolyst/, Tome/
  ocr/                          template images for slot detection
    rarity_common.png, rarity_rare.png, rarity_uncommon.png
    Requiem*.png (7 requiem mod icons)
  ui/                           143 UI icon PNGs (polarities, factions,
                                 resources, relics, focus schools, etc.)

export/
  Export{Arcanes,Avionics,BoosterPacks,Challenges,Customs,Flavour,Gear,
          Images,Intrinsics,Keys,Nightwave,Recipes,Regions,Relics,Resources,
          Rewards,Sentinels,Syndicates,TextIcons,Upgrades,Warframes,
          Weapons}.json         game data exports (refreshed daily)
  dict.en.json                  main localisation dictionary
  supp-dict-en.json             supplementary oracle dictionary
  arbys.txt                     arbitration data (every 6h)
  sp-incursions.txt             Steel Path incursions (every 6h)
  exampleworldstate.txt         example API response
  KWinRule.kwinrule             KDE window rule for overlays

user/
  inventory.json                latest fetched inventory
  settings.json                 persisted user preferences
  lastData.dat                  cached last-session data
  notes/                        user Markdown notes (*.md)
  overlay_debug.log             debug log (app + memory watcher + OCR)
  debug_anchor_*.png            debug screenshots
  riven_debug_*.png             debug riven card captures
```

---

## Frontend Architecture

### Entry Point

**`src/main.jsx`** - ReactDOM.createRoot entry. Imports global CSS
(`index.css`) and fonts (Outfit + JetBrains Mono via fontsource).

### App Routing

**`src/App.jsx`** detects the window mode from `?overlay=true`:
- **Main window** - renders a sidebar nav (12 items) + lazy-loaded screen
  content, wrapped in MonitoringProvider + ThemeProvider + UpdateProvider.
  Shows a one-time setup dialog (disclaimer + optional cache/log paths).
- **Overlay window** - renders only ThemeProvider + OverlayRouter (no
  monitoring context; avoids firing startup IPC commands).

### Contexts

| Context | File | Purpose |
|---------|------|---------|
| MonitoringContext | `src/contexts/MonitoringContext.jsx` | Startup: load_cached_inventory + load_all_exports. Scan: call_api_helper -> raw inventory -> parseInventory. Cycle: fetch worldstate -> parseWorldstate. Exposes inventoryData, worldstateData, lastUpdate, monitorResult. |
| ThemeContext | `src/contexts/ThemeContext.jsx` | CSS variable theming. Changes propagated via `document.documentElement.style.setProperty()`. |
| UpdateContext | `src/contexts/UpdateContext.jsx` | Tauri plugin-updater integration. Auto-checks on startup (configurable). Exposes updateState, checkForUpdates, installLatestUpdate. Status updates show a red dot on the Settings nav icon. |

### Screens

All screens are lazy-loaded. Each reads from MonitoringContext via
`useMonitoring()` unless noted.

| Screen | File | Data |
|--------|------|------|
| Dashboard | `screens/Dashboard.jsx` | Worldstate (fissures, sorties, Nightwave, Archon Hunt, events, cycles, arbitration, SP incursions) |
| Inventory | `screens/Inventory.jsx` | All items, searchable/filterable by category and ownership |
| Mods | `screens/Mods.jsx` | Mod inventory display (non-riven) |
| Rivens | `screens/Rivens.jsx` | Riven mod parsing with live stat calculation + price estimation |
| Relics | `screens/Relics.jsx` | Owned relics grouped by era/name with refinement counts |
| Mastery | `screens/Mastery.jsx` | MR progress, starchart completion, mastery XP totals |
| Notes | `screens/Notes.jsx` | Markdown notes CRUD via Tauri IPC |
| Maps | `screens/Maps.jsx` | Pannable/zoomable open-world maps |
| Collectibles | `screens/Collectibles.jsx` | Kuria, somachord, fragments, caves tracking |
| Checklist | `screens/Checklist.jsx` | Persistent to-do list (localStorage) |
| Settings | `screens/Settings.jsx` | Theme picker, sync controls, hotkeys, update trigger |
| About | `screens/About.jsx` | Credits and disclaimer |

### Lib Modules

| Module | File | Purpose |
|--------|------|---------|
| inventoryParser | `lib/inventoryParser.js` | parseInventory(raw, exports) -> structured inventory. Resolves names, images, ranks, relic rewards, rivens. |
| worldstateParser | `lib/worldstateParser.js` | parseWorldstate(raw, options) -> dashboard data. Resolves fissures, sorties, cycles, Nightwave, etc. |
| warframeUtils | `lib/warframeUtils.js` | Pure lookup tables and resolution functions. No network/disk I/O. |
| relicParser | `lib/relicParser.js` | Owned relic grouping by era/name, refinement counting, radshare selection. |
| notificationManager | `lib/notificationManager.js` | In-app notification queue, display, and dismissal. |
| wfmCache | `lib/wfmCache.js` | warframe.market API response cache layer. |
| marketEngine | `lib/marketEngine.js` | Ducat/platinum pricing calculations. |
| settings | `lib/settings.js` | Settings persistence (load/save/get/set) and defaults. |

### Components

| Component | File | Purpose |
|-----------|------|---------|
| RivenCard | `components/RivenCard.jsx` | Riven card display with stat rendering |
| ModCard | `components/ModCard.jsx` | Standard mod card display |
| UI | `components/UI.jsx` | Shared primitives (Tooltip, PageLayout, ThemeProvider export, etc.) |
| BackToTop | `components/BackToTop.jsx` | Scroll-to-top button |
| NotificationManager | `components/NotificationManager.jsx` | Renders notification toasts in-app |

### Overlay Components (separate Tauri windows)

| Component | File | Purpose |
|-----------|------|---------|
| OverlayRouter | `components/overlays/OverlayRouter.jsx` | Reads window label from Tauri, renders the correct overlay |
| RelicRewardOverlay | `components/overlays/RelicRewardOverlay.jsx` | Fissure relic reward display |
| RivenOverlay | `components/overlays/RivenOverlay.jsx` | Riven card overlay (left/right positions) |
| ToastOverlay | `components/overlays/ToastOverlay.jsx` | Temporary toast notifications |

---

## File-by-File Reference

### `src-tauri/src/main.rs`

Rust backend entry point. All `#[tauri::command]` functions callable from
frontend via `invoke()`.

| Command | Called by | Purpose |
|---------|-----------|---------|
| `check_exports` | MonitoringContext (startup) | Download/refresh JSON exports |
| `load_all_exports` | MonitoringContext (startup) | Read all exports into one object |
| `call_api_helper` | MonitoringContext (scan) | Scan memory for auth token, fetch inventory from Warframe API |
| `load_cached_inventory` | MonitoringContext (startup) | Load last saved inventory from disk |
| `check_media_assets` | MonitoringContext (startup) | Download map + rank icon images |
| `load_txt_file` | Dashboard | Read TXT data files from disk |
| `start_log_scanner` | Frontend (overlay toggle) | Start memory watcher thread |
| `stop_log_scanner` | Frontend (overlay toggle) | Stop watcher thread |
| `list_notes` / `read_note` / `save_note` / `delete_note` | Notes.jsx | CRUD for Markdown notes |
| `open_data_folder` | Settings.jsx | Open data/ in OS file browser |
| `show_notification` | Frontend | Show toast notification overlay |
| `show_relic_overlay` | Frontend | Show relic reward overlay |
| `show_overlay_window` / `hide_overlay_window` | Frontend | Overlay window visibility |
| `resize_overlay_window` | Frontend | Position and size overlay windows |
| `relay_event` | Frontend | Cache + re-emit fissure events |
| `set_notification_sound` | Settings.jsx | Persist sound preference |
| `register_hotkey` / `unregister_all_hotkeys` | Settings.jsx | Global hotkeys |
| `save_settings` / `load_settings` | Settings.jsx | Persist preferences |
| `check_ocr_models` | Startup | Download PP-OCRv5 models |
| `save_debug_screenshot` / `start_debug_ocr_session` | Debug | Capture + OCR debug |
| `get_available_monitors` / `set_target_monitor` | Settings.jsx | Multi-monitor support |
| `estimate_riven_price` | Rivens.jsx | Single riven price prediction |
| `estimate_riven_full` | Rivens.jsx | Full estimate with grade + EV |
| `estimate_riven_full_batch` | Rivens.jsx | Batch riven pricing |
| `get_weapon_names` | Rivens.jsx | Weapon dropdown for price checks |
| `get_scanner_status` | App.jsx | EE.log scanner connection state |
| `get_ui_path` | App.jsx | UI icon filesystem path |
| `read_file_bytes` | App.jsx | Read asset file bytes for in-memory icon cache |

### `src-tauri/src/log_scanner.rs`

EE.log parsing engine. Contains `LogScanner` struct with `on_line()` that
receives each log line and checks for known trigger patterns.

`spawn_memory_watcher()` - spawns a tokio blocking thread that enumerates
Warframe's memory regions, discovers the EE.log ring buffer, and polls it
every 150ms via pread/ReadProcessMemory. New lines are delta-diffed and
passed to `on_line()`.

`stop_scanner()` - sets `IS_SCANNING=false` which causes the polling loop
to exit and the blocking thread to join.

### `src-tauri/src/ocr.rs`

Screen capture and OCR pipeline. Functions: `detect_slot_count_from_icons()`,
`clean_ocr_output()`, `trigger_manual_ocr()`, `save_debug_screenshot()`.

### `src-tauri/src/ocr_engine.rs`

Thin wrapper around `ocr-rs` PP-OCRv5 model. Uses `OnceLock<Option<RecModel>>`
for lazy one-time init. `recognize()` does CatmullRom 3x upscale + invert before
inference.

### `src-tauri/src/pricer.rs`

Riven price prediction engine using a tract-onnx model. Contains `RivenInput`,
`RivenFullEstimate`, `RivenPricer` struct. Functions: `init()`, `estimate_price()`,
`estimate_full()`, `estimate_full_batch()`.

Weapon rankings loaded from `weapon_ranking_information.json` map each weapon
to a rank, expected value, and price distribution (sorted (price, frequency)
pairs). Grade thresholds: S >= 95th, A >= 80th, B >= 60th, C >= 40th,
D >= 20th, F below.

### `src-tauri/build.rs`

Compile-time asset walker. Walks `data/assets/` (excluding `card-images/`),
emits `BUNDLED_ASSET_FILES` as a Rust array literal into the build output.
This allows runtime extraction of bundled assets without a runtime directory
walk.

### Native Rust Memory Scanner (`src-tauri/src/memory_scan.rs`, `mem_reader.rs`)

The C++ helper has been fully replaced by native Rust modules:

| Module | Purpose |
|--------|---------|
| `memory_scan.rs` | Scans all private memory regions for auth tokens (`?accountId=...&nonce=...`), then fetches inventory from `mobile.warframe.com` via reqwest |
| `mem_reader.rs` | Reads the EE.log ring buffer from process memory: loads configurable VA offsets from `data/export/memory_offsets.json`, reads via `/proc/<pid>/mem` + `pread` (Linux) or `ReadProcessMemory` (Windows), delta-diffs to extract new lines |

Both use `get_warframe_pid()` to find the Warframe process, and the memory
region scanner (`memory_scan.rs`) walks `/proc/<pid>/maps` (Linux) or
`VirtualQueryEx` (Windows), filtering to `MEM_PRIVATE` regions.

---

## External Data Sources

| Source | What it provides | Refresh rate |
|--------|-----------------|--------------|
| `raw.githubusercontent.com/calamity-inc/warframe-public-export-plus` | Game data exports | Daily |
| `oracle.browse.wf/dicts/en.json` | Supplementary localisation dictionary | Daily |
| `browse.wf/arbys.txt` | Current arbitration rotation | Every 6 h |
| `browse.wf/sp-incursions.txt` | Steel Path incursions | Every 6 h |
| `oracle.browse.wf/worldState.json` | Live worldstate (cached by Oracle) | Each sync cycle |
| `browse.wf` | Item images (via icon URLs in exports) | On demand |

---

## Collectibles Data Pipeline

Collectible tracking data flows from the inventory JSON through to
Collectibles.jsx with no transformation on the intermediate fields.

**Data flow:**
```
inventory.json -> inventoryParser.js -> MonitoringContext (inventoryData) -> Collectibles.jsx
```

Three raw inventory fields used directly:
- `CollectibleSeries` -> `collectibleSeries`
- `DiscoveredMarkers` -> `discoveredMarkers`
- `LoreFragmentScans` -> `loreFragmentScans`

### Series (CollectibleSeries)

Each entry: `CollectibleType` (identifier), `Count` (bits set in Tracking
bitmask = items found), `ReqScans` (total scans needed), `Tracking` (bitmask).

| UI Label | Match | Count | Total |
|----------|-------|-------|-------|
| Kuria | `/Lotus/Objects/Orokin/Props/CollectibleSeriesOne` | `Count` | `ReqScans` (56) |
| Lost Islands of Duviri | `/Lotus/Types/Lore/Fragments/DuviriFragments/DuviriCollectibleDeco` | `Count` | `ReqScans` (90) |
| Isleweaver Fragments | `/Lotus/Types/Lore/Fragments/DuviriMITWFragments/DuviriMITWCollectibleDeco` | `Count` | `ReqScans` (15) |

### Markers (DiscoveredMarkers)

Each entry: `tag` (identifier), `discoveryState` (array of 32-bit ints).
Count = sum of popcount across all ints. Total = `length * 32`.

| UI Label | Match | Count | Total |
|----------|-------|-------|-------|
| Plains of Eidolon Caves | `EidolonPlainsDiscoverable` | 1 | 32 |
| Orb Vallis Caves | `OrbVallisCaveDiscoverable` | 10 | 32 |
| Fortuna | `FortunaMarker` | 1 | 32 |
| Necralisk | `NecraliskMarker` | 1 | 32 |

### Lore Fragments (LoreFragmentScans)

Each entry: `ItemType` (path), `Progress` (scans done, 0+), `Region`.
Entries grouped by matching `ItemType` against each category's match function.
`total` is hardcoded wiki value. `count` = entries where `Progress > 0`.

| UI Label | Match | Wiki Total |
|----------|-------|------------|
| Somachord Tunes | `type.includes('/MusicFragments/')` | 55 (scanable) |
| Frame Fighter Fragments | `type.includes('/FrameFighterFragments/')` | 42 (scanable) |
| Cephalon Fragments | starts with `/Lotus/Types/Lore/Fragments/` minus exclusions | 43 |
| Leverian Prex Cards | `type.includes('/LoreCardFragments/')` | 50 |
| Thousand-Year Fish | `type.includes('/EidolonFragments/')` | 20 |
| Glass Shard Fragments | `type.includes('/GlassFragments/')` | 5 |
| Encrypted Journal Fragments | `type.includes('/GrineerGhoulFragments/')` | 13 |
| Nakak Memory Fragments | `type.includes('/RevenantFragments/')` | 3 |
| Fortuna Fragments | `type.includes('/SolarisFragments/')` | 35 |
| Albrecht's Notes | `type.includes('/AlbrectFragments/')` | 23 |
| Partnership Fragments | `type.includes('/GasCityFragments/')` | 8 |
| The Tenets | `type.includes('/CorpusReliefFragments/')` | 11 |

Cephalon Fragment exclusions: `/Eidolon`, `/Music`, `/FrameFighter`,
`/LoreCard`, `/Solaris`, `/GrineerGhoul`, `/Albrect`, `/Revenant`,
`/CorpusRelief`, `/GasCity`, `/GlassFragments`.

**Notes:**
- `LoreFragmentScans` only includes fragment types the player has encountered.
  Unscanned types are absent entirely. This is why Solaris shows 2 in data but
  35 on wiki.
- Series `Count` is bits set in the tracking bitmask, not scans completed.

---

## Configuration & Build

### Key Config Files

| File | Purpose |
|------|---------|
| `package.json` | Node deps + scripts (dev, build, lint) |
| `vite.config.js` | Vite bundler config (React SWC plugin) |
| `tailwind.config.js` | Tailwind theme (kronos colors, fonts) |
| `postcss.config.js` | PostCSS for Tailwind |
| `pnpm-workspace.yaml` | pnpm workspace settings |
| `index.html` | HTML entry. Sets overlay transparency (`background: transparent`) synchronously before React renders to avoid Linux black flash. |
| `src-tauri/tauri.conf.json` | Tauri v2 config: windows, bundles, updater endpoint, security capabilities |
| `src-tauri/tauri.{linux,windows,darwin}.conf.json` | Platform-specific bundle resources |
| `src-tauri/capabilities/default.json` | Tauri permission capabilities (IPC, events, etc.) |
| `src-tauri/.cargo/config.toml` | Cargo linker flags |
| `.github/ISSUE_TEMPLATE/bug_report.md` | Bug report template |
| `.github/ISSUE_TEMPLATE/feature_request.md` | Feature request template |

### CI / Build

| File | Purpose |
|------|---------|
| `.github/workflows/release.yml` | GitHub Actions: build + release for Linux/Windows/macOS |
| `.github/workflows/discord_release.yml` | Post release notification to Discord |
| `src-tauri/src/mem_reader.rs` | Native EE.log ring buffer reader |
| `src-tauri/src/memory_scan.rs` | Native auth token memory scanner |

---

## Project Root Layout

```
/ (project root)
  index.html                    HTML entry point
  package.json                  Node dependencies and scripts
  vite.config.js                Vite bundler configuration
  tailwind.config.js            Tailwind CSS theme
  postcss.config.js             PostCSS config
  pnpm-lock.yaml / pnpm-workspace.yaml  pnpm settings
  .npmrc                        npm config

  src-tauri/                    Tauri app (Rust + frontend bundle)
    src/                        Rust source
    data/                       bundled assets (exports, binary, audio, images)
    build.rs                    compile-time asset walker
    tauri.conf.json             Tauri v2 config
    tauri.{linux,windows,darwin}.conf.json
    capabilities/default.json   IPC security permissions
    icons/                      app icons (PNG, ICO, ICNS)
    Cargo.toml                  Rust dependencies

  src/                          React frontend
    main.jsx                    entry point
    App.jsx                     routing (main + overlay windows)
    index.css                   global styles + Tailwind imports
    contexts/                   React context providers
    lib/                        parser + utility modules (8 files)
    screens/                    UI screens (12 files)
    components/                 shared UI components + overlays

  tools/
    riven-pricer/               Python ML training pipeline
      retrain.py                orchestrator
      setup_weapon_information_onnx.py
      pipeline/                 scraping, preprocessing, training

  helpers/                      (removed - C++ helper deleted)
    training_extractor.rs       standalone OCR training data extractor
    theme_training_extractor.rs standalone theme data extractor

  docs/                         Documentation site
    index.html, styles.css, IconKronos.png
    screenshots/ (13 screenshots)

  .github/
    workflows/release.yml       CI build + release
    workflows/discord_release.yml
    ISSUE_TEMPLATE/             bug + feature request templates

  build_int_{linux,macos,win}/  CI build intermediates
```

---

## EE.log Memory Based Triggers

Documentation of all log triggers used by the scanner.
Triggers fire from the memory-based EE.log watcher (`log_scanner.rs` ->
`mem_reader.rs` ring buffer reader).

### Fissure / Relic Workflow

The scanner starts when a player loads into a fissure mission and proceeds
through these stages:

**1. Mission Start**
Trigger: `_ActiveMission"}` with MissionInfo
Fires when a player loads into a fissure mission.

**2. Relic Pool Detection**
Trigger: `Resloader` + `/Lotus/Types/Game/Projections/` + `starting`
Example: `Sys [Info]: Resloader 0x000000002E20A710 (/Lotus/Types/Game/Projections/T3VoidProjectionZephyrPrimeABronze) starting`
The hex code is ignored. Only the relic type matters for building the pool of
relics to scan rewards from. Duplicates are irrelevant.

**3. 10 Reactant Detection**
Trigger: `new transmission: DVRCAftermathLotus`
Latest detectable point before the reward screen. The player has collected 10
reactant and the game queues a Lotus transmission. This is where the manual
"Test relic recognition" button and OCR shortcut start from.

**4. Requiem Mod Detection**
Condition: relic tier = `T5`
Requiem relics have no text labels, so the app uses NCC template matching on
pre-cropped 55x55 icon templates. OCR still runs on the text regions for
non-requiem drops (Ayatan Stars, Riven Slivers, Kuva, Exilus Adapter BP).

Requiem Mod Rects (4 slots) at 1.0 scale (1920x1080):
| Slot | (x, y, w, h) |
|------|--------------|
| 1 | (569, 315, 55, 55) |
| 2 | (811, 315, 55, 55) |
| 3 | (1053, 315, 55, 55) |
| 4 | (1295, 315, 55, 55) |

Requiem Mod Rects (3 slots) at 1.0 scale:
| Slot | (x, y, w, h) |
|------|--------------|
| 1 | (678, 302, 85, 85) |
| 2 | (918, 302, 85, 85) |
| 3 | (1163, 302, 85, 85) |

**5. Reward Screen Detection**
After step 3, the icon scan polls for the reward screen. Rarity icons (common,
uncommon, rare) are detected via template matching at 7 known positions (4-slot
and 3-slot layouts, with slot 2 overlapping). If icons cluster at 4-slot
positions, it is a 4-player squad. 3-slot positions = 3-player squad. Otherwise
falls back to 2 slots. Only confirms slot size when all slots are detected
simultaneously.

Rarity icon center positions at 1.0 scale (Y = 478):
- 4-slot: X = 595, 838, 1080, 1323
- 3-slot: X = 717, 960, 1202

OCR regions (both lines combined) at 1.0 scale:
- 4-slot: (478,412 - 714,460), (721,412 - 956,460), (965,412 - 1200,460), (1209,412 - 1444,460)
- 3-slot: (600,412 - 835,460), (842,412 - 1077,460), (1084,412 - 1319,460)

Rarity icon center positions at 0.5 scale (Y = 510):
- 4-slot: X = 777, 899, 1021, 1143
- 3-slot: X = 839, 961, 1083

OCR regions at 0.5 scale:
- 4-slot: (721,477 - 836,499), (842,477 - 957,499), (963,477 - 1080,499), (1084,477 - 1202,499)
- 3-slot: (782,477 - 897,500), (901,477 - 1018,500), (1023,477 - 1139,500)

All positions are dynamically scaled by `active_scale` (from `USER_UI_SCALE`),
screen width (`sx`), and screen height (`sy`) at scan time.

**6. Reward Screen Closure**
Trigger: `ProjectionRewardChoice.lua: Relic reward screen shut down`
Cleanup and state reset.

**7. Endless Mission Handling**
Trigger: `Created /Lotus/Interface/ThemedProjectionManager.swf`
After the reward screen closes in endless missions, the icon scan flag is reset
to allow the next cycle. Existing squad_relics are preserved until step 2
repopulates them when the player picks new relics.

**8. Mission Exit**
Trigger: `ExitState: Disconnected` or `Game [Info]: Set state to Disconnected`
Return to idle state, all state cleared.

### Riven Overlays

**Linked in Chat**

| Event | Trigger |
|-------|---------|
| Open  | `ThemedDetailedPurchaseDialog.lua: PopulateInfo->/Lotus/StoreItems/Upgrades/Mods/Randomized` |
| Close | `ThemedDetailedPurchaseDialog.lua: DBG: HudVis` |

**Reroll Menu**

| Event | Trigger | Action |
|-------|---------|--------|
| Screen Opened | `OmegaRerollSelection.lua: Diorama setup` | Show RivenCurrent (left) overlay, OCR card |
| First Dialog | `Dialog.lua: Dialog::CreateOkCancel(description=` | await confirm/cancel |
| First Confirm | `Dialog::SendResult(4)` or `SendResult_MENU_SELECT()` | Emit `riven-reroll`, wait 4s, show RivenNew (right) overlay + OCR |
| First Cancel | `Dialog::SendResult(5)` or `SendResult_MENU_CANCEL()` | Back to screen open |
| Second Dialog | `Dialog.lua: Dialog::CreateOkCancel(description=` | await confirm/cancel |
| Second Confirm | `Dialog::SendResult(4)` or `SendResult_MENU_SELECT()` | Emit `riven-reroll-confirmed`, wait 2s, refresh left overlay, close right |
| Second Cancel | `Dialog::SendResult(5)` or `SendResult_MENU_CANCEL()` | Back to screen open |
| Menu Closed | `CancelJobs batchcount 0` | Hide reroll overlay |

**Close Detection**

| Trigger | Effect |
|---------|--------|
| `AI [Info]: NpcManager::ClearAgents() ReadyToCreateAgents = false` | Closes BOTH overlays (catch-all) |
| `Sys [Info]: CancelJobs batchcount 0` | Closes only reroll overlay |
| `Script [Info]: ... DBG: HudVis` | Closes only linked-in-chat overlay |

**Riven Card OCR Coordinates**

Captures card slots from the reroll screen. Base bounds defined at 1920x1080
at 1.0 UI scale. At runtime the card is scaled from the screen center (960, 540)
using `USER_UI_SCALE`, then multiplied by the resolution ratio.

| Slot   | Bounds (x1, y1, x2, y2) | Stored as (x, y, w, h) |
|--------|-------------------------|------------------------|
| Left   | (486, 506, 711, 831)    | (486, 506, 225, 325)   |
| Middle | (815, 468, 1107, 882)   | (815, 468, 292, 414)   |
| Right  | (1210, 511, 1433, 822)  | (1210, 511, 223, 311)  |
| Linked | (840, 376, 1074, 704)   | (840, 376, 234, 328)   |

Scaling (same center-anchored approach as relic reward slots):

```
let scale = USER_UI_SCALE / 100.0
let sx = screen_w / 1920, sy = screen_h / 1080
let box_cx = x1 + w/2,  box_cy = y1 + h/2
let scaled_cx = (960 + (box_cx - 960) * scale) * sx
let scaled_cy = (540 + (box_cy - 540) * scale) * sy
let cw = w * scale * sx,  ch = h * scale * sy
let cx = scaled_cx - cw/2,  cy = scaled_cy - ch/2
```

After cropping each card region:
1. Convert to grayscale, apply contrast stretch (min->max to full 0-255)
2. Upscale 3x via CatmullRom, run full detection+recognition pipeline
3. Join recognized text regions with ` | ` separator, parse into structured stats on frontend

### Chat Incoming Messages

No trigger for the message text itself. Instead, detect when the squad channel
is ready:

```
IRC out: JOIN #<hash>           -> track squad channel, exclude from chat-incoming-message
Chat: Filters for <hash>:       -> channel ready, emit chat-incoming-message
```

Exclude: `G_EN_EU` (region), `R_EN_EU` (recruitment), `Q_EN_EU` (Q&A),
`T_EN_EU` (trade).
### Elite Alert Modifiers (Archon Hunt & Arbitration)

```
Script [Info]: Background.lua: EliteAlert: generated boosts for <player>:
  suitType=<path> wepTypes=<path1>, <path2>, <path3>
```

The _first_ occurrence in the EE.log is the weekly Archon Hunt bonus (emitted as
`archon-hunt-modifiers`, shown under the Archon Hunt card on the Dashboard).
All subsequent occurrences are Arbitration modifiers (emitted as
`arbitration-modifiers`, shown under the Arbitration card).
