# Issue List

## 1. Archon Shards (Research)
- Display Archon Shards equipped on Warframes
- *Note:* Not far enough in game to verify inventory.json structure yet

## 2. Focus Schools (Research)
- Show Focus schools with Tauron Strikes and loadout (not far enough yet in-game to see where the loadout data is stored)
- Mirror school skill trees with Icons (banners extracted)
- Relevant data in `inventory.json`:
  - `FocusUpgrades`
  - `FocusAbility`

## 3. "RecentVendorPurchases" (Research)
- Could be used for tracking recent buys
- *Unknown:* How long items stay, which vendors are included

## 4. Collectibles Tracking (Research)
- Currently just raw unordered (unparsed?) data clumped together
- Research and test if data in inventory.json has structure 
- Notify user when entering a node that contains an unfound Kuria (or something else) (determined how?)

## 5. Docs update (readme+wiki+architecture.md+webpage) (preferably one last time after all feature issues are done)
eyecandy for the readme such as icons and the discord link 

## 6. Incarnon display (Research)
https://wiki.warframe.com/w/Incarnon#Incarnon_Weapons
theres incarnon weapons that are outright from the get go incarnon and others that are turned into incarnon weapons through getting a genesis adapter

weapons with incarnon mode unlocked show this in inventory.json

"SkillTree": "021",
          
pretty sure this only shows how many ranks (bitwise so in this case level 3 out of 5) and per bit variant of 0 1 or 2 which upgrade
no idea where upgrades are stored and in what order or where they're localized - wiki has them but i think they're collected manually (the icons i can find with warframe-exporter)

and since i dont think we can find out whether something is an incarnon weapon per se from wfcd items or public export plus i think we need to make a list of the internal names of incarnon weapons to have a data source and then show a dim incarnon if locked and brighter (as it is) if skill tree is at least present, then on hovering incarnon it would show the breakdown of upgrades (if we do the effort of copying over the description from the wiki or we find em in the data)

we already have an incarnon detection in inventory but idk what its based on, these are the innate incarnon weapons and some of them arent shown as incarnon for me in-app
 Felarx (shown as incarnon)
 Innodem (shown as incarnon)
 Laetum (shown as incarnon)
 Onos (not shown)
 Phenmor (shown as incarnon)
 Praedos (not shown)
 Ruvox (shown as incarnon)
 Thalys (not shown)


## 7. UI component library decision (for the eventual full revamp new branch)
Question: should the planned gradual UI revamp adopt shadcn/ui (or an alternative) for consistent, themable, accessible components?

**shadcn/ui won't fix issue #20 by itself** — it's unstyled Radix primitives + Tailwind; ships accessible *behavior* (focus trapping, keyboard nav, ARIA roles, roving tabindex), not accessible colors. The behavioral argument is separate from, and the real reason for, considering it.

**Tradeoff given current hand-rolled `components/UI.jsx`** (`Card`, `Button`, `Tabs`, `Modal`, `PageLayout`):
- *For:* `Modal` (delete-confirms, config editors, Baro/Wishlist popups) and `Tabs` (roving tabindex, arrow-key nav) are exactly the components that are easy to get subtly wrong on accessibility, and Radix solves both for free.
- *Against:* shadcn is copy-in, not a dependency — every call site (`<Card>`, `<Modal>`, `<Tabs>`) needs rewriting across every screen, it's a genuine migration not a drop-in swap. Existing `kronos-*` CSS var theme layers on fine since shadcn is Tailwind-based, but the migration touches every screen file already built.

**Recommended approach:** adopt shadcn incrementally, per-component, as each screen is touched during the planned revamp — not a big-bang swap. Start with `Modal` and `Tabs` (highest a11y payoff, most reused); leave `Card`/`Button`/`PageLayout` as-is since they're presentational and lower-risk.

Accessibility — contrast + font size ([GitHub issue #4](https://github.com/glowseeker/cephalon-kronos/issues/4))
Reported: low-contrast borders/dividers and undersized text in multiple spots, hurting readability especially for users with sight issues. Requested: larger fonts and/or a UI scale option.
**This is a token/value problem, not an architecture problem — ship it now, don't wait for the UI revamp.**
- `ThemeContext.jsx` already does CSS-variable theming, so this doesn't require touching component structure.
- Audit actual contrast ratios of border/divider CSS vars — `border-white/5` / `border-white/10` (used throughout) are likely failing WCAG AA wherever they convey real structure rather than pure decoration. Bump alpha, or introduce a dedicated `--color-border-visible` var separate from purely decorative hairlines.
- Add a **UI scale slider** to Settings (root `font-size` percentage that rem-based Tailwind sizing inherits from) — but first confirm whether text sizing is actually rem-based throughout, or hardcoded as fixed-px literals (`text-[10px]` etc., seen in Dashboard.jsx) — a global scale var can't rescue fixed-px text, so that would need a separate pass.
- Half-day fix, ships in current stable build, no `components/UI.jsx` structural changes needed.




## 8. Chat with Kronos

**Concept:** Local, offline LLM chatbot embedded in the app for lore questions, build advice, and farming/drop-location tips — grounded in our own data, not a generic cloud AI wrapper.

**Status:** Ambitious, later-stage feature. Not for the stable/functionality-complete milestone. Treat as its own project phase after the UI revamp.

**Core requirements:**
- Fully local/offline inference — no internet required after setup, no cloud API calls, no data leaving the machine.
- **Opt-in only, on-demand download** — never touched during onboarding or first run. Settings toggle → explicit size warning (~2-3GB) → user confirms → download starts. Same pattern as `check_ocr_models`/`check_media_assets`, gated behind consent.
- Cross-platform (Windows/Linux/macOS), CPU-capable with optional GPU acceleration.

**Architecture sketch:**
- **Inference:** `llama.cpp` via Rust binding or bundled subprocess (mirrors `warframe-api-helper` pattern). Small quantized instruct model (~3-4B, GGUF Q4_K_M) — candidates: Qwen2.5-3B-Instruct (better multilingual) or Llama-3.2-3B-Instruct. Model choice user-configurable.
- **Grounding (RAG):** small local embedding model (MiniLM/bge-small) + a pre-built vector index shipped as a downloaded asset, built offline at release time (not indexed on-device) from `public-export-plus` exports (drop tables, relics), `wfcd-items`, and the wiki (farming locations, lore/quest text).
- User's own `inventoryData` (already in `MonitoringContext`) can be templated into prompts directly for build/mastery-aware advice — no retrieval needed for that part.
- New `src-tauri/src/llm.rs`, structurally parallel to `pricer.rs` (lazy init, `OnceLock` retry pattern, streaming responses via Tauri events like the fissure/relic event system).
- New dedicated screen/panel, not an overlay — deliberate user-initiated queries, not a real-time trigger.

**Personality:**
- Wanted: distinct character (e.g., reacts with theatrical offense to insults, softens when consoled/apologized to), not a flat Q&A bot.
- **Phase 1 (cheap, do first):** system prompt + few-shot examples defining the persona. Modern small instruct models hold personality well from prompting alone — try this exhaustively before considering fine-tuning.
- **Phase 2 (only if needed):** LoRA fine-tuning on a hand-written dataset of example exchanges (insult/console pairs, in-character lore Q&A, etc.) via `unsloth`/`axolotl`, merged back to GGUF. This is a separate multi-week side-project (dataset curation + training + eval), budget it independently.
- Multilingual support competes with personality fine-tuning quality — factor this into base model choice early (favor Qwen2.5 for multilingual strength) since it's harder to retrofit than personality is.

**Suggested rollout order:**
1. Proof of concept: local inference + one narrow pre-built index (e.g. just relic drop locations) + Phase-1 prompted personality.
2. Expand RAG corpus (full wiki + wfcd + exports) once the POC proves the grounding approach works.
3. Evaluate whether Phase-1 personality is sufficient; only pursue LoRA fine-tuning if it clearly isn't.

## 9. WFM Integration 
**Concept:** Basic Warframe.market integration for creating listings (items + rivens) and searching existing listings, directly from the app — not a trading/day-trader tool.

**Scope, deliberately narrow:**
- Create a listing for an item or riven the user owns (pulled from their existing inventory data).
- Search WFM listings for an item.
- One-directional: no inbox, no trade chat, no offer negotiation, no bulk relisting, no auto-repricing/undercut automation.
- **Explicitly not competing with Kenya-DK's Quantframe** — that's day-trader tooling (bulk management, repricing strategies, volume flows). This is for a regular player occasionally listing/checking one item. Different user, different depth, intentionally so. Worth a quick heads-up conversation with Kenya-DK before starting — not for permission, but they've likely already hit the WFM API's practical rough edges (rate limits, auth refresh quirks, flaky endpoints) and that's cheap-to-get, expensive-to-rediscover knowledge.

**Architecture:**
- New `src-tauri/src/wfm.rs`, parallel to existing subsystems (`pricer.rs`, etc.).
- WFM's API requires user login/JWT auth — this is a legitimate, sanctioned external API (unlike the Warframe session-nonce situation), so standard OAuth-style token storage, no memory-scanning needed.
- Commands: `wfm_search_item`, `wfm_create_listing`, `wfm_get_my_orders` (view/manage own active listings at minimum).
**Not now:** trade chat/inbox integration, bulk operations, auto-repricing, stock/volume dashboards — all Quantframe's territory, stays out of scope even in later iterations unless there's a clear reason to reconsider.

(think would prefer a standalone market screen with current listings etc)
(useful functions like quick sell that instantly lists with optimal price and autoadjusting prices (not day trading, just like every 12h or so - ability to depreciate price over time like reduce by 5% on every update until sold))





## 10. Random smaller ones

- ~~Show bounty levels and the main (guaranteed) rewards~~ (done in v0.8.0 - bounty cards now show level ranges and reward icons/counts)
- Nightwave: track what challenges the user has done to show Recovered
  challenges (ergo up to date, not just this week's)
  - "Any Weekly and Elite Weekly Acts that have not been completed before the
    next week's rotation will be put on reserve. Once the player has fewer
    than 3 current weekly Acts left to complete, any missed Acts from previous
    weeks will be available and marked as Recovered, three at a time. Once all
    missed Acts have been completed, they will no longer appear, and any
    further Acts can be recovered in the future week rotations." (as per wiki)
- Relic filters: multistate era (Lith/Meso/Neo/Axi/Omnia) + refinement
  filters, tristate vaulted/unvaulted/disabled
- Inventory prime sets: vaulted/unvaulted/disabled tristate filter
- Toggle whether to include vaulted relics in the relic picker
- Mark vaulted prime parts in the relic reward overlay
Issue #50 github kind of relates to those above

- issue #52 on github

## 11. SHAWZINBOT!!!!


# Changelog for v0.8.0

## Added:
- **Prime sets — sets/parts view toggle**: The prime sets category now has an Eye-icon toggle in the header row that switches between aggregated set cards and a flat list of the individual prime parts. Sort criteria are preserved across the switch where valid for the target view (name/completion/value for sets; name/quantity/value for parts). Committed as `fdc6d9b`.
- **Prime part values — Platinum + Ducat**: Set cards, part cards, and the per-part cells inside a set now show both the Ducat and Platinum value with their respective icons instead of a single `p` figure. The value sort button cycles through plat asc → plat desc → ducat asc → ducat desc, showing "Plat"/"Ducat" labels, the currency icon, and a direction arrow as it cycles; sorted state is localized across all 15 locales.
- **Market sales — already-owned marking**: Market sale items the account already owns are dimmed (`opacity-80`) with a green OWNED badge. Ownership is two O(1) sets — normalized owned names from the parsed inventory plus normalized path leaves of every `/Lotus` path in the raw inventory dump (decorations, cosmetics, emotes, song items, ship decos, ...) — so each of the ~5 sales is a single lookup. An earlier attempt resolved every raw path via `resolveItemName` and froze the dashboard by scanning the whole dict per path; committed as `f41309f`.
- **Owned marking — placed ship decorations (getShip)**: `inventory.php` omits ship decorations, so placed ones (e.g. the Nelumbo Shawzin ≡ `LisetPropLotusMandolin`) never matched as owned. `call_api_helper` now also fetches `getShip.php`, caches it to `data/user/ship.json`, and merges its `/Lotus` paths into the returned/cached inventory under a `PlacedShipDecos` key that `parseInventory` ignores. The dashboard owned-set tracks `Deco`-suffix-stripped leaves so getShip's `/Lotus/Objects/.../...Deco` object paths match the bare item paths market sales use. Committed as `defbeae`.
- **Notifications**:
  - #30 Added bounty notification trigger (Zariman/Cavia/Hex) with syndicate and mission type filters, matching the pattern of existing void fissure notifications.
- **Checklist tasks**:
  - Ergo Glast's Tenet Weapons shop refresh timer added as a checklist task (`task_glast`).
  - Eleanor's Batch A Coda Weapons shop refresh timer added as a checklist task (`task_eleanor`).
- **#36 Localization (game data)**:
  - `check_exports` now fetches `dict.{locale}.json` / `supp-dict.{locale}.json` based on the `gameLocale` setting, so item names (including prime parts, mods, avionics) render in the game's language instead of English.
  - Per-locale mod stats from the DE public manifest: `index_{locale}.txt.lzma` (LZMA1 alone-format) → contentHash → `ExportUpgrades_{locale}.json`, merged into mod `levelStats` over the English `_fixed.json`. Verified (de): 1,597 upgrades — 1,465 with literal German stat text ("+55 % Nahkampfschaden"), 132 resolving via dict keys; only 4 English-only entries stay English (StaffCmbOneMeleeTree, AvatarSlideBoostMod, AvatarPowerToHealthOnDeathMod, LocateCreatures).
  - "Blueprint" suffix localized across relic rewards, prime sets, and inventory via a new `BLUEPRINT_SUFFIX` map (15 locales — Blaupause / Plano / Plan / Progetto / 設計図 / …), threaded through `resolveName`/`resolveItemName`/`relicParser`/`worldstateParser`/both contexts.
  - Prime set components are now detected from the item path (always English) instead of the localized display name, so German builds show "Lauf / Gehäuse / Verbindung" under e.g. "AFURIS PRIME SET" instead of dropping them (272/272 prime paths matched, 0 false positives).
  - Removed the last vestigial `NAME_OVERRIDES` entries (MuseumDogTag, TestPartItem, GuildGlyphConsumable) — all resolved via the game dict; empty `nameOverrides` dropped from all 15 i18n files.
- **Startup diagnostics**: Timing instrumentation (`eprintln!` + `std::time::Instant`) added to `check_exports`, `check_media_assets`, `check_pricer_models`, and `load_all_exports_via_file` Rust commands, plus per-invoke timing wrappers in `MonitoringContext.jsx` for each of the 8 parallel IPC calls during `Promise.allSettled`. Timing visible in terminal output during `tauri dev`.

## Fixed:
- **Inventory**:
  - Fixed "NO INVENTORY DATA FOUND" crash: dangling `override` refs from the removed RESOURCE_OVERRIDES, empty-dict `{}`-truthy fallback in `parseInventory` (now only falls back when the dict has keys), and an unclosed JSDoc in `relicParser.js` that swallowed `resolveDisplayName` and crashed `getAllRelicRewards`. German and English parses both verified end-to-end (162 prime sets, Afuris Prime = Blaupause ×2 + Lauf ×4 + Gehäuse ×1 + Verbindung ×1).
  - Parts view "not owned" filter: crafted prime parts are consumed when the parent weapon is built, so `crafted` was 0 and every part of an owned/mastered weapon (e.g. Acceltra Prime barrel/receiver/stock) showed up under "not owned". A part now counts as owned if it was crafted *or* its parent weapon is owned; the not-owned filter correctly surfaces blueprint-only parts for weapons not yet built.
  - Empty-state message rendered "No items found inprime sets." — the `no_items_found` string concatenated with the tab name was missing a space.
- **Relic picker overlay — stale fissure era**: The reward-picker overlay read the fissure era from the pre-mission (orbiter) relic picker, where no era exists — the first relic in the pool was used as a fake era, and that value carried into the next run so a fresh fissure showed the previous run's "top EV" picks. The void-tier fallback detection and `relic-picker-tier` emit are now gated on the mission actually running, and the frontend skips populating the overlay unless `in_mission` is true and an era is known. Committed as `35d7881`.
- **Inventory**:
  - Removed "prime" filter from the "all" category in Inventory (only shows "owned" and "mastered" now).
- **Nightwave**:
  - Removed the mod capacity backer from mod rewards for a cleaner look.
- **Bounties**: 
  - Cetus, Deimos, and Vallis bounty titles now resolve to the official localized names from the game dict (e.g. "CULL THE ENEMY", "CORE SAMPLES", "SOFTWARE SUBTERFUGE") instead of raw internal camelCase names. Bounty notifications use the same resolution.
- **Wishlist**: 
  - Cleaned up the name resolution for wishlist items. 
- **Inventory**:
  - MuseumDogTag, albeit obsolete, now displays as "Tethra Data Fragments" with its proper description (only *en* and hardcoded).
  - Guild glyph consumables resolve to "Glyph Prism" (was raw path name).
  - Unknown "TestPartItem" no longer appears in inventory.
- **Market**: 
  - Market sale box and wishlist item names now wrap to multiple lines instead of truncating (e.g. "TEN YEAR ANNIVERSARY COMMUNITY ART PACK").
- **Dashboard bounties**: 
  - Bounty cards (holdfasts/cavia/hex) redesigned: title renders plainly (e.g. "Volatile Techrot"), the challenge lore ("She wants to teach…", "Arthur needs to study…") shows as the description, and the objective is labeled "Challenge: …" underneath (e.g. "Challenge: Destroy 3 backpacks on Scaldra units"). Removed the broken "Arthur (Exploding)" node line. `resolveChallengeDesc` now strips OPEN_COLOR marketing labels and substitutes |COUNT|/|ALLY| before `clean()` so objectives no longer start with a stray "Bounty" or drop the count. Hex bounty artwork uses object-contain (full portrait); text renders over the transparent-left zone, wider on non-image cards (Cetus/Deimos/Vallis use full width). Text size bumped across all bounty tabs.
  - Bounty reward icons: each tab shows the correct reward icon per faction - Hex/Vallis/Cetus/Cavia use DailyStanding, Holdfasts uses VoidplumeQuill, Deimos uses MotherToken. Holdfasts cards render the VoidplumeQuill icon enlarged (24px) in the bottom-right corner with a '5x' count label, matching the hex standing icon placement.
- **Wishlist/Market items**: 
  - Dante Tytonis Collection (Pagemaster Deluxe Skin Bundle) image now resolves to the authoritative content.warframe.com contentHash URL via its first component's skin icon, instead of the browse.wf URL that 404s. The EI builders (MonitoringContext + MirroredMonitoringProvider) are now contentHash-aware for all icons, falling back to component icons for bundles lacking their own contentHash.
- **Riven pricer (only relevant for local building)**: 
  - Retrain.py now finds a Python 3.11+ interpreter and keeps its venv inside the repo (tools/riven-pricer/.venv), so it survives reboots instead of relying on a wiped /tmp path. Added `npm run retrain:pricer` alias; launch it to download fresh market data, train, export ONNX into `src-tauri/data/bin/pricer-models/`, then commit + push.
- **UI chrome localization** (new `UiContext`, no i18next):
  - `uiLocale` setting (defaults to `gameLocale`); `t(key)` falls back to English, then the raw key, so a partially translated locale never shows raw keys.
  - Sidebar nav tooltips (`nav.*`), last-update label, sync state tooltips (`sync.success/cached/error/offline`), scanner state tooltips (`scanner.active/waiting/stale/idle`) — App.jsx + SidebarOverlay.
  - `MonitorState` loading screens (`loading.*`) and `PageLayout` titleKey — all 14 screens switched to `screen.*` keys ("Void Relics", "Riven Mods", "Mods Rivens", "Reliques du Néant", … verified against the FR dict).
  - Settings: Game Language label + hint, changing/reloading overlay.
- **Localized riven OCR** (game-language riven cards):
  - Stat-name matching via localized aliases: i18n `rivenStats` inverted + DE/FR game-term aliases extracted from `ExportUpgrades_{de,fr}.json` levelStats (table drifts corrected — German "Durchschlag" = Puncture, "Durchdringung" = Punch Through, "Schnitt" = Slash).
  - Locale-aware card-header garbage strip (Kapazität/Polarität/ Neuausrichtungen, Capacité/Polarité/Relances, "Riven Mod"/"Mod Rivens") and reroll-counter extraction from numbered tokens.
  - `get_localized_weapon_names` Tauri command: wfcd-combined ∩ pricer vocab (415 weapons) → ExportWeapons → `dict.{locale}.json`, Rust `LazyLock` cache; English fallback; kitgun/proper nouns stay English. OCR weapon names match localized-first ("Grakatas Jumeaux" → "Twin Grakatas"), then English. Pure logic in `src/lib/rivenOcrI18n.js`, verified by a 34-case Node repro (DE + FR full-card parses).
- Removed the inline `RIVEN_STAT_TRANSLATIONS` table from warframeUtils.js — i18n `rivenStats` is the sole runtime source (proven superset, all seed keys present); the table is kept as a generation seed in `scripts/riven-stat-translations.seed.json`.
- **i18n loader**: `loadLocale` looked up `/{locale}.json` but `import.meta.glob` emits `./i18n/{locale}.json` keys — every non-en locale returned null, so UiContext rendered raw keys and `rivenStats` never reached the inventory parser (which the RIVEN_STAT_TRANSLATIONS removal depends on). Verified in a minimal Vite build harness.
- **Riven pricing + stats** (the all-null + inflation + localization fixes):
  - `mergeWithOrig` shallow-copied export entries, so writing dict lockeys back into `exports.WI_*` poisoned `weapon_name_en` (→ all 49 rivens unknown to the price model). Now copies the entry before mutating.
  - `pricer.rs`: unknown weapon → `return None` (honest + `eprintln`), not the `<NONE>` mask (which returned population-average + `N/A` rank).
  - Stat inflation: `warframeItemsTransform` read `item.disposition` (integer tier) instead of `item.omegaAttenuation` (float), inflating buffs ~3.3× (Daikyu `+607.8%` → ~`+186%`). Faithful to upstream calamity parser.
  - `inventoryParser`: null-tolerant field fill so real `Export*` icons resolve over `icon: null` (Ack&Brunt, Adramal Alaşımı, Adramalyum — all now show).
  - `inventoryParser`: desc-locate-preference (mirrors the name logic) so flavor text localizes (Adarza Kavat → TR) instead of English literals.
  - TR: `Ammo Maximum` riven-stat label "Maks. Müzik" → "Maks. Cephane", sourced from DE `WeaponMaxAmmoModDesc` ("Maksimum Cephane"); fixed in both `src/lib/i18n/tr.json` and `scripts/riven-stat-translations.seed.json`.
  - Localization Phase 2: RU "6" Omnia era; mission-type code fallback mapping; era dict-echo → `ERA_TRANSLATIONS`; `CIRCUIT_NAME_KEYS`; `resolveMissionType` JSDoc + `*/`-terminator cleanup.
  - Verified via data probes (real `inventory.json` + full `Export*` bundle + wfcd): 46/50 rivens model-resolvable, 0 loctags, 0 stats >600%. 4 modular rivens intentionally unpriceable (not in vocab).
  - *Manual remaining*: Ack&Brunt + Adarza Kavat TR NAME localizations need hand-built TR loc tables; wfcd English literals (code uniqueNames) have no lockey to resolve. (Issue #36 data gap, not a code bug.)
  - Mod images (still missing after the icon bookkeeping above): root cause was the remote `https://wiki.warframe.com/...` wikiaThumbnail shadowing the local card path — `convertFileSrc(cardImagesPath + icon)` mangled it into `card-imageshttps://...` → 404. `mergeWithOrig` now prefers the internal `/Lotus/Interface/Cards/Images/...` icon from `ExportUpgrades` over a remote URL, and the `ModIconMap` override beats it too. Verified: 1394/1400 mods carry internal `/Lotus/` paths, 0 wiki-remote (the 6 empties are LegendaryModFuser + Peely Pix stickers, each on its own render path).
  - Riven stat names now resolve from the **game dict** instead of the hardcoded per-locale `rivenStats` tables: deleted `RIVEN_TAGS` / `RIVEN_AFFIXES` / `RIVEN_STAT_LOCKEY`; `buildRivenTagInfo()` derives per-type bases (`upgradeValues[0].value`, verified byte-identical), affix syllables (`dict[prefixTag/suffixTag]` under `/Lotus/Language/Omega/`), and the stat's `locTag` from `ExportUpgrades` `/Randomized/` entries. Display label = `dict[locTag]` cleaned (strip `%|val|`, `|STAT1|`, HTML, `sn`-glue); the English `statKey` is preserved for the price model. Fallback: dict → `i18nData.rivenStats` → English key. (f7ab38b)
- **Sidebar nav**: restored the settings update-available badge and the bottom-aligned status-dots wrapper that the UI-chrome pass had dropped.
- **Silent startup crash (WebKitGTK OOM)**: Passing 34 MB of warframe export JSON through Tauri IPC (`load_all_exports` returning `Vec<(String, String)>`) triple-serialized the data — serde_json re-encoded the strings into an 84 MB payload, WebKit's IPC transport re-encoded again — spiking the main process to 10.8 GB RSS and OOM-killing the WebKitGTK WebProcess (`NeedDebuggerBreak trap`). Added `load_all_exports_via_file`: concatenates the 26 export files into a single ~40 MB NUL-delimited temp file and returns only the file path; the frontend fetches it via `convertFileSrc` (Tauri asset protocol), bypassing IPC serialization entirely. Startup: 27.8 s → 5.4 s; main process RSS: 10.8 GB → 6.7 GB; verified stable in FR + UK over 14-day soak test.
- **Force-show UI fix**: Replaced blind 5-second `thread::sleep` force-show fallback (that fired regardless of frontend state) with an `AtomicBool ready_fired` flag — the force-show thread early-exits if `frontend-ready` already fired, preventing redundant window-show calls. Committed as `cea9918`.

- **Prime set progress display**: Prime set completion showed `partsMet/totalNeed` (sum of `ItemCount` across recipe ingredients, e.g. 6 for a 4-component set needing 1+2+2+1) instead of `partsMet/parts.length` (the number of component types, 4). This produced misleading fractions like "3/6 (50%)" for an Afuris Prime set where 3 of 4 component types were collected. Fixed: denominator is now `set.parts.length`. Also aligned the parts-grid `met` check (`(crafted ?? 0) + (quantity ?? 0) >= need`) with the `partsMet` summary calculation to eliminate inconsistent counting.
- **Sticky page headers**: The `headerPanel` (filters/categories/tabs row) in `PageLayout` scrolled away after roughly a viewport of scrolling instead of staying pinned. Root cause: the sticky header was nested inside `<div className="relative min-h-full flex flex-col">` — a flex item of the scroll container with default `flex-shrink: 1` floored at `min-height: 100%`. The browser shrank that item to viewport height and the tall content overflowed it, so the header's sticky containing block ended after one viewport and it unpinned. Fixed by hoisting `headerPanel` out of the shrinkable wrapper to be a direct child of the scroll container with `flex-shrink-0`, so it sticks against the full scrollable content again.

## Localization:
- **All 13 game languages**: UI chrome (`t()` via `UiContext`) and game-sourced terms (item names, mod stats, bounty titles, riven stat names) now resolve for all shipped locales (EN, DE, FR, IT, ES, PT, RU, TR, ZH, TC, KO, JA, PL) via `dict.{locale}.json` from the DE public manifest. Covers all 14 `screen.*`, `nav.*`, `sync.*`, `scanner.*`, and `settings.*` keys.
- **Game-sourced terms covered**: EN, FR, DE, IT, ES, PT, ZH, TC, KO, JA (10 of 13 locales); RU and PL verified for UI chrome only (game dict files confirmed present).
- **OCR model localization: untested** — only the post-capture i18n layer (`rivenOcrI18n.js`) is verified via a 34-case Node repro in DE + FR; end-to-end OCR in IT/ES/PT/RU/TR/ZH/TC/KO/PL/JA awaits hardware testing.


# Documentation for reporting my fix to still open issues: Task: write up two Tauri cross-platform workarounds

Context: Cephalon Kronos (cross-platform Tauri v2 desktop app) solved two
related-but-separate hard problems that other Tauri users are still stuck on,
per open GitHub issues. Both are working, shipped, and tested across
GNOME (untested directly by us, should behave the same), KDE, Hyprland, and
Windows. Worth documenting for the community.


## Part A: Embedding a live external webview inside the app (child webview positioning)

Cephalon Kronos embeds a live, interactive external URL (wiki.warframe.com)
inside the app via a native Tauri `add_child` child webview — not an iframe
(blocked by the site's CSP frame-ancestors) and not a separate OS window
(breaks the "embedded" feel).

On Linux/GTK, Tauri's `set_position`/`set_size` on an `add_child` webview
reliably mis-positions anything off-origin — confirmed against these open,
still-unfixed upstream issues:
- https://github.com/tauri-apps/tauri/issues/10053
- https://github.com/tauri-apps/tauri/issues/9611
- https://github.com/tauri-apps/tauri/issues/11170

Root cause and fix:
- Don't rely on Tauri's `set_position`/`set_size` for the child webview at
  all — bypass its coordinate-conversion path entirely.
- Reparent the child webview's underlying GTK widget into a `gtk::Overlay`,
  then position it via native GTK properties (`set_margin_start`,
  `set_margin_top`, `set_size_request`) instead.
- Critical detail that took multiple iterations to find: never reparent the
  HOST window's own webview widget directly — that corrupts Tauri's internal
  window registry (confirmed via `get_webview_window(label).is_some()`
  returning `false` immediately after doing so, breaking ALL future window
  lookups app-wide, not just the one window touched). Instead, wrap the host
  window's webview's *container* (its parent GtkBox) in the `GtkOverlay`,
  never the webview widget itself.
- Do this wrapping exactly ONCE, at window-creation time, for every window
  that might host a child webview — never repeatedly at reposition time.
  Repositioning afterward is just the cheap, safe `overlay.add_overlay(child)`
  + margin/size updates.

Pull the actual implementation from `src-tauri/src/main.rs`
(`ensure_gtk_overlay_wrapper`, `linux_reparent_and_position`) and
`src-tauri/src/overlay_utils.rs` (`create_overlay_window`'s call site).


## Part B: Reliable transparent/click-through/positioned overlay windows across DEs

Separately from Part A, Cephalon Kronos ships four always-on-top, transparent,
click-through overlay windows (relic reward display, riven card display, toast
notifications, plus the resizable sidebar overlay) that must stay correctly
positioned, sized, and stacked above a running fullscreen/borderless game
across GNOME, KDE, and Hyprland on Linux, and Windows — a much rougher problem
space than on X11/Windows alone, since Wayland compositors (especially tiling
ones like Hyprland) handle window positioning, always-on-top stacking, and
transparency very differently, and largely don't expose the same
absolute-positioning guarantees X11 does.

Document what was actually solved here, pulling from `src-tauri/src/
overlay_utils.rs` (`create_overlay_window`, `show_sidebar_internal`,
`get_overlay_monitor`/`get_focused_monitor`, monitor-detection fallback logic)
and `main.rs`'s window-event/backing-store-invalidation handling referenced in
the v0.7.0 changelog (raise_x11/set_always_on_top ordering vs KWin's
ConfigureNotify handling, and the grim/xcap/spectacle capture fallback chain
for Wayland vs X11). Cover:
- How always-on-top + click-through + transparency were achieved consistently
  across X11 (KDE) and Wayland (GNOME/Hyprland), noting any per-compositor
  quirks found (e.g. the KWin stacking-order bug already fixed per the
  changelog: resize-then-restack ordering mattering specifically under KWin).
- The monitor-detection fallback logic (primary/current monitor fallback when
  no game window is focused) and why it's necessary across DEs.
- Screen-capture fallback chain per backend (grim for Wayland/wlr-screencopy,
  xcap as cross-platform fallback, spectacle for KDE-specific cases, X11
  xcap/import) and the `is_valid_capture()` guard against stale/blank frames.

Write this as a GitHub Discussion post or Tauri Discord (#help/#tauri-v2)
writeup — there's no single upstream issue this maps to as cleanly as Part A
does, so frame it as "here's how we handle overlay windows reliably across
Linux DEs + Windows in a real shipped app" rather than a bug-report comment.
Cross-link Part A's issue-thread writeup from this post and vice versa, since
readers dealing with one problem often need the other too.

Keep it factual and low-key — describe what was found and what worked, not
"solved a problem Tauri couldn't." Project is open source; link the actual
source files where useful instead of inlining all the code.
