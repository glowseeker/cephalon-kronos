use std::collections::HashSet;
use std::sync::atomic::{AtomicBool, AtomicU32, Ordering};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter, Manager};

pub static IS_SCANNING: AtomicBool = AtomicBool::new(false);
// 0 = idle, 1 = waiting for process, 2 = hooked/active
pub static SCANNER_STATUS: std::sync::atomic::AtomicU8 = std::sync::atomic::AtomicU8::new(0);
/// Incremented on each stop_scanner call so stale watcher threads can detect
/// they were orphaned by a restart and exit instead of continuing to run.
static SCANNER_GENERATION: std::sync::atomic::AtomicU64 = std::sync::atomic::AtomicU64::new(0);
/// Poll interval (ms) for the helper process.  Tight during fissure reward
/// windows (150ms), relaxed otherwise (400ms) to reduce CPU/IO overhead.
/// 50 ms default: the old 150 ms figure was calibrated for the C++ helper's
/// 4 MB external-read + memcpy cycle.  With direct pread on a 128 KB buffer
/// the read+diff cost is single-digit microseconds - we can poll tighter
/// with negligible CPU overhead and cut worst-case trigger latency by 3×.
pub static POLL_INTERVAL_MS: AtomicU32 = AtomicU32::new(50);

pub fn set_poll_interval(ms: u32) {
    let clamped = ms.clamp(50, 2000);
    POLL_INTERVAL_MS.store(clamped, Ordering::Relaxed);
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct RelicInfo {
    pub unique_name: String,
    pub tier: String,
    pub refinement: String,
    pub era: String,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct FissureEvent {
    pub event_type: String,
    pub squad_relics: Vec<RelicInfo>,
    pub local_reward: Option<String>,
    pub squad_size: usize,
    pub void_tier: Option<String>,
}

#[derive(PartialEq)]
enum RivenState {
    Idle,
    ScreenOpen,
    AwaitingConfirm1,
    Wait4s,
    AwaitingConfirm2,
}

pub struct LogScanner {
    squad_relics: Vec<RelicInfo>,
    squad_size: usize,
    is_fissure: bool,
    in_mission: bool,
    relic_picker_open: bool,
    relic_picker_opened_at: f64,
    void_tier: Option<String>,
    riven_state: RivenState,
    squad_channels: HashSet<String>,
    expecting_elite_alert_boosts: bool,
    is_archon_elite_alert: bool,
    min_ts: f64,
}

fn parse_timestamp(line: &str) -> Option<f64> {
    if let Some(space_idx) = line.find(' ') {
        let prefix = &line[..space_idx];
        if prefix.contains('.') {
            return prefix.parse::<f64>().ok();
        }
    }
    if let Some(ms_pos) = line.find("SystemTime: ") {
        let start = ms_pos + 12;
        if let Some(ms_end) = line[start..].find("ms") {
            return line[start..start + ms_end].parse::<f64>().ok();
        }
    }
    None
}

/// Check if a line matches one of the riven menu close patterns (numeric values ignored).
impl LogScanner {
    pub fn new() -> Self {
        Self {
            squad_relics: Vec::new(),
            squad_size: 1,
            is_fissure: false,
            in_mission: false,
            relic_picker_open: false,
            relic_picker_opened_at: 0.0,
            void_tier: None,
            riven_state: RivenState::Idle,
            squad_channels: HashSet::new(),
            expecting_elite_alert_boosts: false,
            is_archon_elite_alert: false,
            min_ts: f64::MAX,
        }
    }

    pub fn on_line(&mut self, app: &AppHandle, line: &str) {
        let ts = parse_timestamp(line).unwrap_or(0.0);
        if ts < self.min_ts {
            self.min_ts = ts;
        }
        let s = line.trim();
        if s.is_empty() {
            return;
        }

        // === 1. Mission Start ===
        if s.contains("_ActiveMission\"} with MissionInfo") {
            self.is_fissure = true;
            self.in_mission = true;
            self.squad_size = 1;
            self.squad_relics.clear();
            self.void_tier = parse_mission_void_tier(s);
            crate::logger::log_to_disk(app, &format!("[LOG SCANNER] Step 1: FISSURE START void_tier={:?} (LogTS: {}s)", self.void_tier, ts));
            if self.relic_picker_open {
                self.relic_picker_open = false;
                app.emit("relic-picker-closed", ()).unwrap_or_default();
            }
            crate::ocr::ICON_SCAN_ACTIVE.store(false, Ordering::SeqCst);
            set_poll_interval(150);
            return;
        }

        // === 7. Mission Exit ===
        if s.contains("ExitState: Disconnected") || s.contains("Game [Info]: Set state to Disconnected") {
            self.is_fissure = false;
            self.in_mission = false;
            self.relic_picker_open = false;
            self.void_tier = None;
            self.squad_relics.clear();
            crate::ocr::ICON_SCAN_ACTIVE.store(false, Ordering::SeqCst);
            set_poll_interval(150);
            crate::logger::log_to_disk(app, &format!("[LOG SCANNER] Step 7: MISSION EXIT (LogTS: {}s)", ts));
            let state = app.state::<crate::AppState>();
            if let Ok(mut cached) = state.active_relic_data.lock() {
                *cached = None;
            }
            app.emit("fissure-reward-closed", ()).unwrap_or_default();
            return;
        }

        // === 2. Relic Pool Detection ===
        if s.contains("Resloader") && s.contains("/Lotus/Types/Game/Projections/") && s.contains("starting") {
            if let Some(start) = s.find("(/Lotus") {
                if let Some(end) = s[start..].find(')') {
                    let path = &s[start + 1..start + end];
                    crate::logger::log_to_disk(app, &format!("[LOG SCANNER] Step 2: RELIC POOL - {} (LogTS: {}s)", path, ts));
                    let relic = parse_relic_path(path);
                    let is_first = self.squad_relics.is_empty();
                    self.squad_relics.push(relic);
                    self.is_fissure = true;
                    set_poll_interval(150);

                    // Detect void tier from the first relic (only if not already set from mission JSON,
                    // and only once the mission is actually running - pre-mission pool loads (e.g. the
                    // orbiter relic picker) have no fissure era to infer, and reading one from there
                    // leaks the previous run's era into the reward picker overlay).
                    if is_first && self.void_tier.is_none() && self.in_mission {
                        self.void_tier = Some(detect_void_tier(path));
                    }
                    if is_first && self.relic_picker_open && self.in_mission {
                        app.emit("relic-picker-tier",
                            serde_json::json!({ "tier": self.void_tier })
                        ).unwrap_or_default();
                    }

                    let state = app.state::<crate::AppState>();
                    if let Ok(mut cached) = state.active_relic_data.lock() {
                        *cached = Some(serde_json::json!({
                            "squad_relics": self.squad_relics,
                            "squad_size": self.squad_size,
                            "void_tier": self.void_tier,
                        }));
                    };
                }
            }
            return;
        }

        // === 4. Reward Screen Trigger ===
        if s.contains("Relic rewards initialized") || s.contains("ProjectionRewardChoice.lua: Got rewards") {
            if !self.is_fissure {
                self.is_fissure = true;
                self.in_mission = true;
            }
            set_poll_interval(150);
            if crate::ocr::ICON_SCAN_ACTIVE.load(Ordering::SeqCst) {
                return;
            }
            crate::ocr::ICON_SCAN_ACTIVE.store(true, Ordering::SeqCst);
            let app_clone = app.clone();
            crate::logger::log_to_disk(app, &format!("[LOG SCANNER] Step 4: REWARD SCREEN DETECTED (Starting icon scan) (LogTS: {}s)", ts));
            std::thread::spawn(move || {
                crate::ocr::detect_slot_count_from_icons(app_clone, false);
            });
            return;
        }

        // === 5. Reward Screen Closure ===
        if s.contains("ProjectionRewardChoice.lua: Relic reward screen shut down") {
            crate::ocr::ICON_SCAN_ACTIVE.store(false, Ordering::SeqCst);
            set_poll_interval(150);
            crate::logger::log_to_disk(app, &format!("[LOG SCANNER] Step 5: REWARD SCREEN CLOSE (LogTS: {}s)", ts));
            // Clear cached relic data so the next round starts fresh
            let state = app.state::<crate::AppState>();
            if let Ok(mut cached) = state.active_relic_data.lock() {
                *cached = None;
            }
            app.emit("fissure-reward-closed", ()).unwrap_or_default();
            return;
        }

        // === 6. Relic Picker / Endless Mission Handling ===
        if s.contains("Created /Lotus/Interface/ThemedProjectionManager.swf") {
            // Omnia fallback: if squad relics span multiple tiers, it's Omnia
            if self.void_tier.as_deref() != Some("Omnia") {
                if let Some(omnia) = detect_omnia_from_squad(&self.squad_relics) {
                    crate::logger::log_to_disk(app, &format!("[LOG SCANNER] Omnia detected from multi-tier squad relics"));
                    self.void_tier = Some(omnia);
                }
            }
            if !self.in_mission {
                self.relic_picker_open = true;
                self.relic_picker_opened_at = ts;
                crate::logger::log_to_disk(app, &format!("[LOG SCANNER] RELIC PICKER OPENED (pre-mission) void_tier={:?} (LogTS: {}s)", self.void_tier, ts));
                app.emit("relic-picker-opened", serde_json::json!({ "void_tier": None::<String>, "in_mission": false })).unwrap_or_default();
                return;
            }
            self.relic_picker_open = true;
            self.relic_picker_opened_at = ts;
            crate::logger::log_to_disk(app, &format!("[LOG SCANNER] RELIC PICKER OPENED (endless) void_tier={:?} (LogTS: {}s)", self.void_tier, ts));
            app.emit("relic-picker-opened", serde_json::json!({ "void_tier": self.void_tier, "in_mission": true })).unwrap_or_default();
            return;
        }

        // === Relic Picker Close (MapRedux re-subscription  -  in-mission) ===
        if self.relic_picker_open && s.contains("Subscribing for /Lotus/Interface/MapRedux.swf") {
            self.relic_picker_open = false;
            crate::logger::log_to_disk(app, &format!("[LOG SCANNER] RELIC PICKER CLOSED (MapRedux) (LogTS: {}s)", ts));
            app.emit("relic-picker-closed", ()).unwrap_or_default();
            return;
        }

        // === Relic Picker Close (TennoShipInputFilter  -  orbiter relic menu) ===
        // TennoShipInputFilter fires both when the picker opens (during init)
        // and when it closes, so debounce against the open timestamp.
        const RELIC_PICKER_DEBOUNCE_S: f64 = 0.5;
        if self.relic_picker_open
            && s.contains("TennoShipInputFilter")
            && ts - self.relic_picker_opened_at > RELIC_PICKER_DEBOUNCE_S
        {
            self.relic_picker_open = false;
            crate::logger::log_to_disk(app, &format!("[LOG SCANNER] RELIC PICKER CLOSED (TennoShipInputFilter) (LogTS: {}s)", ts));
            app.emit("relic-picker-closed", ()).unwrap_or_default();
            return;
        }

        // ─── Riven linked in chat ───────────────────────────────────────────
        if s.contains("ThemedDetailedPurchaseDialog.lua: PopulateInfo->")
            && s.contains("/Lotus/StoreItems/Upgrades/Mods/Randomized")
        {
            crate::logger::log_to_disk(app, &format!("[LOG SCANNER] Riven linked in chat opened (LogTS: {}s)", ts));
            app.emit("riven-linked-open", ()).unwrap_or_default();
            return;
        }
        if s.contains("ThemedDetailedPurchaseDialog.lua: DBG: HudVis") {
            app.emit("riven-linked-closed", ()).unwrap_or_default();
            return;
        }

        // ─── Riven reroll menu state machine ───────────────────────────────
        if s.contains("OmegaRerollSelection.lua: Diorama setup") {
            self.riven_state = RivenState::ScreenOpen;
            crate::logger::log_to_disk(app, &format!("[LOG SCANNER] Riven reroll screen opened (LogTS: {}s)", ts));
            app.emit("riven-screen-open", ()).unwrap_or_default();
            return;
        }

        // Track dialog lifecycle
        if s.contains("Dialog.lua: Dialog::CreateOkCancel(description=") {
            match self.riven_state {
                RivenState::ScreenOpen => {
                    self.riven_state = RivenState::AwaitingConfirm1;
                }
                RivenState::Wait4s => {
                    self.riven_state = RivenState::AwaitingConfirm2;
                }
                _ => {}
            }
            return;
        }

        if s.contains("Dialog.lua: SendResult_MENU_CANCEL()") || s.contains("Dialog.lua: Dialog::SendResult(5)") {
            // Dialog cancelled - go back to previous state
            match self.riven_state {
                RivenState::AwaitingConfirm1 => {
                    self.riven_state = RivenState::ScreenOpen;
                }
                RivenState::AwaitingConfirm2 => {
                    // If second dialog cancelled, the whole menu might be closing
                    self.riven_state = RivenState::ScreenOpen;
                }
                _ => {}
            }
            return;
        }

        if s.contains("Dialog.lua: SendResult_MENU_SELECT()") || s.contains("Dialog.lua: Dialog::SendResult(4)") {
            match self.riven_state {
                RivenState::AwaitingConfirm1 => {
                    self.riven_state = RivenState::Wait4s;
                    crate::logger::log_to_disk(app, &format!("[LOG SCANNER] Riven reroll confirmed, waiting for second dialog (LogTS: {}s)", ts));
                    app.emit("riven-reroll", ()).unwrap_or_default();
                }
                RivenState::AwaitingConfirm2 => {
                    self.riven_state = RivenState::ScreenOpen;
                    crate::logger::log_to_disk(app, &format!("[LOG SCANNER] Riven new selection confirmed (LogTS: {}s)", ts));
                    app.emit("riven-reroll-confirmed", ()).unwrap_or_default();
                }
                _ => {}
            }
            return;
        }

        // ─── Riven close detection ────────────────────────────────────────
        // These triggers (CancelJobs, ClearAgents) fire for many unrelated game events,
        // so only act on them when the riven reroll screen is actually open.
        if self.riven_state != RivenState::Idle {
            if s.contains("CancelJobs batchcount 0") {
                self.riven_state = RivenState::Idle;
                crate::logger::log_to_disk(app, &format!("[LOG SCANNER] Riven reroll menu closed (CancelJobs) (LogTS: {}s)", ts));
                app.emit("riven-screen-closed", ()).unwrap_or_default();
                return;
            }
            if s.contains("NpcManager::ClearAgents() ReadyToCreateAgents = false") {
                self.riven_state = RivenState::Idle;
                crate::logger::log_to_disk(app, &format!("[LOG SCANNER] Riven overlays closed (ClearAgents) (LogTS: {}s)", ts));
                app.emit("riven-screen-closed", ()).unwrap_or_default();
                app.emit("riven-linked-closed", ()).unwrap_or_default();
                return;
            }
        }

        // -- Elite Alert modifiers: first = Archon Hunt, subsequent = Arbitration --
        if self.expecting_elite_alert_boosts && (s.contains("suitType=") || s.contains("wepTypes=")) {
            self.expecting_elite_alert_boosts = false;
            let mut suit_type = String::new();
            let mut wep_types: Vec<String> = Vec::new();
            if let Some(suit_start) = s.find("suitType=") {
                let after = &s[suit_start + 9..];
                if let Some(end) = after.find(' ') {
                    suit_type = after[..end].to_string();
                } else {
                    suit_type = after.to_string();
                }
            }
            if let Some(wep_start) = s.find("wepTypes=") {
                let after = &s[wep_start + 9..];
                for path in after.split(',') {
                    let p = path.trim().trim_end_matches(',');
                    if !p.is_empty() && p != "," {
                        wep_types.push(p.to_string());
                    }
                }
            }
            let event_name = if self.is_archon_elite_alert { "archon-hunt-modifiers" } else { "arbitration-modifiers" };
            app.emit(event_name, serde_json::json!({
                "suitType": suit_type,
                "wepTypes": wep_types,
            })).unwrap_or_default();
            return;
        }

        if s.contains("Background.lua: EliteAlert: generated boosts for") {
            let is_archon = ts - self.min_ts < 180.0;

            if is_archon {
                crate::logger::log_to_disk(app, &format!("[LOG SCANNER] Archon Hunt elite alert modifiers detected (LogTS: {}s)", ts));
            } else {
                crate::logger::log_to_disk(app, &format!("[LOG SCANNER] Arbitration elite alert modifiers detected (LogTS: {}s)", ts));
            }

            // Check if modifiers are on the same line
            if s.contains("suitType=") {
                let mut suit_type = String::new();
                let mut wep_types: Vec<String> = Vec::new();
                if let Some(suit_start) = s.find("suitType=") {
                    let after = &s[suit_start + 9..];
                    if let Some(end) = after.find(' ') {
                        suit_type = after[..end].to_string();
                    } else {
                        suit_type = after.to_string();
                    }
                }
                if let Some(wep_start) = s.find("wepTypes=") {
                    let after = &s[wep_start + 9..];
                    for path in after.split(',') {
                        let p = path.trim().trim_end_matches(',');
                        if !p.is_empty() && p != "," {
                            wep_types.push(p.to_string());
                        }
                    }
                }
                let event_name = if is_archon { "archon-hunt-modifiers" } else { "arbitration-modifiers" };
                app.emit(event_name, serde_json::json!({
                    "suitType": suit_type,
                    "wepTypes": wep_types,
                })).unwrap_or_default();
            } else {
                self.expecting_elite_alert_boosts = true;
                self.is_archon_elite_alert = is_archon;
            }
            return;
        }

        // ─── Chat squad channel tracking ───────────────────────────────────
        if let Some(hash_start) = s.find("IRC out: JOIN #") {
            let hash = &s[hash_start + 14..]; // skip "IRC out: JOIN #"
            let hash = hash.trim();
            self.squad_channels.insert(hash.to_string());
            crate::logger::log_to_disk(app, &format!("[LOG SCANNER] Squad channel joined: #{} (LogTS: {}s)", hash, ts));
            return;
        }

        if s.contains("ChatRedux.lua: Chat: Filters for") && s.contains(":") {
            // Extract channel name
            if let Some(filters_start) = s.find("Filters for") {
                let after = &s[filters_start + 11..];
                if let Some(colon) = after.find(':') {
                    let channel = after[..colon].trim();
                    // Skip public channels
                    let is_public = channel.contains("G_EN_") || channel.contains("R_EN_")
                        || channel.contains("Q_EN_") || channel.contains("T_EN_");
                    if !is_public && self.squad_channels.contains(channel) {
                        crate::logger::log_to_disk(app, &format!("[LOG SCANNER] Chat incoming message (squad channel: {}) (LogTS: {}s)", channel, ts));
                        app.emit("chat-incoming-message", serde_json::json!({
                            "channel": channel,
                        })).unwrap_or_default();
                        return;
                    }
                }
            }
        }
    }
}

fn parse_relic_path(path: &str) -> RelicInfo {
    let tier_code = if path.contains("T1") { "Lith" }
        else if path.contains("T2") { "Meso" }
        else if path.contains("T3") { "Neo"  }
        else if path.contains("T4") { "Axi"  }
        else if path.contains("T5") { "Requiem" }
        else { "Unknown" };

    let refinement = if path.ends_with("Bronze")   { "Intact"      }
        else if path.ends_with("Silver")            { "Exceptional" }
        else if path.ends_with("Gold")              { "Flawless"    }
        else if path.ends_with("Platinum")          { "Radiant"     }
        else                                        { "Intact"      };

    RelicInfo {
        unique_name: path.to_string(),
        tier: tier_code.to_string(),
        refinement: refinement.to_string(),
        era: tier_code.to_string(),
    }
}

fn detect_void_tier(path: &str) -> String {
    if path.contains("T1") { "Lith".to_string() }
    else if path.contains("T2") { "Meso".to_string() }
    else if path.contains("T3") { "Neo".to_string() }
    else if path.contains("T4") { "Axi".to_string() }
    else if path.contains("T5") { "Requiem".to_string() }
    else { "Unknown".to_string() }
}

/// Parse `voidTier` from the Host loading JSON on the mission start line.
fn parse_mission_void_tier(line: &str) -> Option<String> {
    let start = line.find("Host loading ")?;
    let after = &line[start + "Host loading ".len()..];
    let json_end = after.find(" with MissionInfo")?;
    let json_str = &after[..json_end];
    let v: serde_json::Value = serde_json::from_str(json_str).ok()?;
    let vt = v.get("voidTier")?.as_str()?;
    match vt {
        "VoidT1" => Some("Lith".to_string()),
        "VoidT2" => Some("Meso".to_string()),
        "VoidT3" => Some("Neo".to_string()),
        "VoidT4" => Some("Axi".to_string()),
        "VoidT5" => Some("Requiem".to_string()),
        "VoidT6" => Some("Omnia".to_string()),
        _ => None,
    }
}

/// If squad relics span multiple tiers, it's likely an Omnia fissure.
fn detect_omnia_from_squad(squad_relics: &[RelicInfo]) -> Option<String> {
    if squad_relics.len() < 2 {
        return None;
    }
    let first_tier = &squad_relics[0].tier;
    if squad_relics.iter().any(|r| &r.tier != first_tier) {
        Some("Omnia".to_string())
    } else {
        None
    }
}

pub struct LogScannerHandle {
    pub running: Arc<AtomicBool>,
}

// ─── Lifecycle helpers - call from main.rs ─────────────────────────────────────

pub fn log_app_start(app: &AppHandle) {
    crate::logger::log_to_disk(app, "");
    crate::logger::log_to_disk(app, "══════════════════════════════════════════");
    crate::logger::log_to_disk(app, "[KRONOS] Application started");
    crate::logger::log_to_disk(app, "══════════════════════════════════════════");
}

pub fn log_app_stop(app: &AppHandle) {
    crate::logger::log_to_disk(app, "[KRONOS] Application shutting down");
    crate::logger::log_to_disk(app, "══════════════════════════════════════════");
    crate::logger::log_to_disk(app, "");
}

// ──────────────────────────────────────────────────────────────────────────────

fn clear_pid_cache() {
    if let Some(cache) = CACHED_WARFRAME_PID.get() {
        if let Ok(mut c) = cache.lock() {
            *c = None;
        }
    }
}

pub fn stop_scanner(app: &AppHandle) {
    crate::logger::log_to_disk(app, "[LOG SCANNER] stop_scanner called - stopping watcher thread");
    SCANNER_GENERATION.fetch_add(1, Ordering::SeqCst);
    IS_SCANNING.store(false, Ordering::SeqCst);
    SCANNER_STATUS.store(0, Ordering::SeqCst);
    crate::ocr::ICON_SCAN_ACTIVE.store(false, Ordering::SeqCst);
    crate::overlay_utils::stop_focus_watcher();
    clear_pid_cache();
}

pub fn is_scanning() -> bool {
    IS_SCANNING.load(Ordering::SeqCst)
}

#[tauri::command]
pub fn get_scanner_status() -> String {
    match SCANNER_STATUS.load(Ordering::SeqCst) {
        1 => "waiting".to_string(),
        2 => "active".to_string(),
        3 => "stale_offset".to_string(),
        _ => "idle".to_string(),
    }
}

// ─── Memory watcher ────────────────────────────────────────────────────────────

fn line_hash(s: &str) -> u64 {
    let mut hash: u64 = 0xcbf29ce484222325;
    for &b in s.as_bytes() {
        hash ^= b as u64;
        hash = hash.wrapping_mul(0x100000001b3);
    }
    hash
}

/// Cached PID of a previously-discovered Warframe process.
/// On subsequent calls we verify the cache via a cheap existence check
/// instead of re-scanning the entire process table.  When no PID is
/// cached (or the cached PID is dead), we always do a full scan  - 
/// `/proc` readdir + comm/cmdline reads is microseconds of work and
/// happens at most every 2 s (the wait-loop sleep), so there is no
/// meaningful CPU cost to skip the cache on a cache-miss.
static CACHED_WARFRAME_PID: std::sync::OnceLock<Mutex<Option<u32>>> =
    std::sync::OnceLock::new();

fn with_cache(f: impl FnOnce() -> Option<u32>) -> Option<u32> {
    let lock = CACHED_WARFRAME_PID
        .get_or_init(|| Mutex::new(None));
    let mut cache = lock.lock().unwrap();

    // Fast path: cached PID still alive (avoids full /proc scan on every
    // 50 ms poll tick while hooked).
    if let Some(pid) = *cache {
        if pid_is_alive(pid) {
            return Some(pid);
        }
    }

    // Slow path: full scan
    let found = f();
    *cache = found;
    found
}

#[cfg(target_os = "linux")]
fn pid_is_alive(pid: u32) -> bool {
    std::path::Path::new("/proc").join(pid.to_string()).join("status").exists()
}

#[cfg(target_os = "windows")]
fn pid_is_alive(pid: u32) -> bool {
    type HANDLE = *mut std::ffi::c_void;
    type DWORD = u32;
    type BOOL = i32;
    const PROCESS_QUERY_INFORMATION: DWORD = 0x0400;
    extern "system" {
        fn OpenProcess(dwDesiredAccess: DWORD, bInheritHandle: BOOL, dwProcessId: DWORD) -> HANDLE;
        fn CloseHandle(hObject: HANDLE) -> BOOL;
    }
    let h = unsafe { OpenProcess(PROCESS_QUERY_INFORMATION, 0, pid) };
    if h.is_null() { return false; }
    unsafe { CloseHandle(h); }
    true
}

#[cfg(target_os = "macos")]
fn pid_is_alive(pid: u32) -> bool {
    std::process::Command::new("kill")
        .args(["-0", &pid.to_string()])
        .status()
        .map(|s| s.success())
        .unwrap_or(false)
}

/// On Linux, checks whether the process at `pid` looks like the actual game
/// binary (Warframe.x64.exe) rather than the launcher.
#[cfg(target_os = "linux")]
fn is_game_process(pid: u32) -> bool {
    let comm_path = std::path::Path::new("/proc").join(pid.to_string()).join("comm");
    if let Ok(comm) = std::fs::read_to_string(&comm_path) {
        if comm.contains(".x64") || comm.contains("x64") {
            return true;
        }
    }
    let cmd_path = std::path::Path::new("/proc").join(pid.to_string()).join("cmdline");
    if let Ok(cmd) = std::fs::read_to_string(&cmd_path) {
        if cmd.contains(".x64") || cmd.contains("x64") {
            return true;
        }
    }
    false
}

/// Returns the PID of the first Warframe process found, if any.
/// Uses a cached PID to avoid scanning /proc on every call.
pub fn get_warframe_pid() -> Option<u32> {
    with_cache(|| {
        #[cfg(target_os = "windows")]
        {
            type HANDLE = *mut std::ffi::c_void;
            type DWORD = u32;
            type BOOL = i32;
            type WCHAR = u16;

            const TH32CS_SNAPPROCESS: DWORD = 0x00000002;

            #[repr(C)]
            #[allow(non_snake_case)]
            struct PROCESSENTRY32W {
                dwSize: DWORD,
                cntUsage: DWORD,
                th32ProcessID: DWORD,
                th32DefaultHeapID: *mut std::ffi::c_void,
                th32ModuleID: DWORD,
                cntThreads: DWORD,
                th32ParentProcessID: DWORD,
                pcPriClassBase: i32,
                dwFlags: DWORD,
                szExeFile: [WCHAR; 260],
            }

            extern "system" {
                fn CreateToolhelp32Snapshot(dwFlags: DWORD, th32ProcessID: DWORD) -> HANDLE;
                fn Process32FirstW(hSnapshot: HANDLE, lppe: *mut PROCESSENTRY32W) -> BOOL;
                fn Process32NextW(hSnapshot: HANDLE, lppe: *mut PROCESSENTRY32W) -> BOOL;
                fn CloseHandle(hObject: HANDLE) -> BOOL;
            }

            let snapshot = unsafe { CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0) };
            if snapshot.is_null() || snapshot as isize == -1 {
                return None;
            }

            let mut entry: PROCESSENTRY32W = unsafe { std::mem::zeroed() };
            entry.dwSize = std::mem::size_of::<PROCESSENTRY32W>() as DWORD;

            if unsafe { Process32FirstW(snapshot, &mut entry) } == 0 {
                unsafe { CloseHandle(snapshot); }
                return None;
            }

            let mut candidates: Vec<(u32, bool)> = Vec::new();
            loop {
                // Convert wide szExeFile to a Rust string for matching
                let mut name_utf16: Vec<u16> = Vec::new();
                for &c in entry.szExeFile.iter() {
                    if c == 0 { break; }
                    name_utf16.push(c);
                }
                let name = String::from_utf16_lossy(&name_utf16);
                let lower = name.to_lowercase();

                if lower.contains("warframe") {
                    let is_game = lower.contains("x64");
                    candidates.push((entry.th32ProcessID, is_game));
                }

                if unsafe { Process32NextW(snapshot, &mut entry) } == 0 {
                    break;
                }
            }
            unsafe { CloseHandle(snapshot); }

            // Prefer the actual game binary (Warframe.x64.exe) over the launcher
            let has_game = candidates.iter().any(|(_, is_game)| *is_game);
            if has_game {
                candidates.into_iter().find(|(_, is_game)| *is_game).map(|(pid, _)| pid)
            } else {
                candidates.into_iter().next().map(|(pid, _)| pid)
            }
        }
        #[cfg(target_os = "linux")]
        {
            // Collect all matching PIDs, preferring the game binary over the
            // launcher (the launcher won't have the EE.log ring buffer, but
            // both contain "Warframe" in the name).  The game process
            // (Proton/Wine) typically shows "Warframe.x64.exe" in its comm or
            // cmdline, so we pick that one when it exists.
            let mut candidates: Vec<(u32, bool)> = Vec::new();
            if let Ok(pids) = std::fs::read_dir("/proc") {
                for entry in pids.flatten() {
                    let pid = entry.file_name();
                    let pid_str = pid.to_string_lossy();
                    if !pid_str.chars().all(|c| c.is_ascii_digit()) { continue; }
                    let pid_num = match pid_str.parse::<u32>() { Ok(n) => n, Err(_) => continue };
                    let comm_path = std::path::Path::new("/proc").join(&pid).join("comm");
                    if let Ok(comm) = std::fs::read_to_string(&comm_path) {
                        if comm.contains("Warframe") || comm.contains("warframe") {
                            candidates.push((pid_num, true));
                            continue;
                        }
                    }
                    let cmd_path = std::path::Path::new("/proc").join(&pid).join("cmdline");
                    if let Ok(cmd) = std::fs::read_to_string(&cmd_path) {
                        if cmd.contains("Warframe") || cmd.contains("warframe") {
                            candidates.push((pid_num, false));
                        }
                    }
                }
            }
            // Among candidates: prefer one with ".x64" in its name (the game),
            // then one with only comm matching (more likely the game), then
            // any other match.
            candidates.sort_by(|a, b| {
                let a_game = is_game_process(a.0);
                let b_game = is_game_process(b.0);
                b_game.cmp(&a_game).then(a.1.cmp(&b.1))
            });
            candidates.into_iter().next().map(|(pid, _)| pid)
        }
        #[cfg(target_os = "macos")]
        {
            if let Ok(output) = std::process::Command::new("pgrep")
                .arg("-f")
                .arg("Warframe")
                .output()
            {
                if output.status.success() {
                    let stdout = String::from_utf8_lossy(&output.stdout);
                    if let Some(pid_str) = stdout.lines().next() {
                        if let Ok(pid) = pid_str.trim().parse::<u32>() {
                            return Some(pid);
                        }
                    }
                }
            }
            None
        }
    })
}

pub fn spawn_memory_watcher(app: AppHandle) -> Result<LogScannerHandle, String> {
    if IS_SCANNING.load(Ordering::SeqCst) {
        return Err("Already scanning".to_string());
    }

    IS_SCANNING.store(true, Ordering::SeqCst);
    // Show "waiting" immediately so the UI responds right away;
    // the watcher thread will refine this to "active" or "stale_offset".
    SCANNER_STATUS.store(1, Ordering::SeqCst);

    let app_inner = app.clone();

    std::thread::spawn(move || {
        let my_gen = SCANNER_GENERATION.load(Ordering::SeqCst);
        let mut scanner = LogScanner::new();
        let mut logged_waiting = false;
        let mut ever_hooked = false;
        let mut validated = false;
        let mut had_pid = false;
        let mut discovery_attempts = 0u32;
        let mut last_pid_for_discovery: u32 = 0;

        // Try local cache first (fast - avoids full anonymous region walk).
        let mut offsets = match crate::mem_reader::load_offset_cache() {
            Some(c) => {
                crate::logger::log_to_disk(&app_inner, &format!(
                    "[MEMORY WATCHER] Using cached VA {:#x}", c.buffer_va));
                c
            }
            None => {
                crate::logger::log_to_disk(&app_inner,
                    "[MEMORY WATCHER] No cached VA found, will discover");
                crate::mem_reader::MemOffsets { buffer_va: 0, buffer_size: 0x20000 }
            }
        };

        // Scratch buffers reused across cycles (no per-cycle allocs)
        let mut raw = Vec::new();
        let mut prev = vec![0u8; 0];
        let mut seen_set: std::collections::HashSet<u64> = std::collections::HashSet::new();
        let mut seen_count: usize = 0;
        const SEEN_RESET_THRESHOLD: usize = 16_384;

        loop {
            if !IS_SCANNING.load(Ordering::SeqCst) || SCANNER_GENERATION.load(Ordering::SeqCst) != my_gen {
                break;
            }

            let pid = match get_warframe_pid() {
                Some(p) => p,
                None => {
                    if had_pid {
                        // Warframe closed mid-session - reset state so the
                        // next cycle re-validates the VA and re-emits events
                        // cleanly, avoiding edge cases from stale prev data.
                        validated = false;
                        ever_hooked = false;
                        prev.clear();
                        had_pid = false;
                        seen_set.clear();
                        seen_count = 0;
                    }
                    if !logged_waiting {
                        crate::logger::log_to_disk(&app_inner, "[MEMORY WATCHER] Waiting for Warframe process...");
                        logged_waiting = true;
                        SCANNER_STATUS.store(1, Ordering::SeqCst);
                    }
                    std::thread::sleep(std::time::Duration::from_secs(2));
                    continue;
                }
            };
            had_pid = true;

            // If the PID changed (e.g. we found the game process instead of
            // the launcher), reset discovery so we can discover the right VA
            // for the new process.
            if pid != last_pid_for_discovery {
                last_pid_for_discovery = pid;
                discovery_attempts = 0;
            }

            if !validated {
                let mut need_discovery = true;

                // Try cached VA first (fast path).
                if offsets.buffer_va != 0 {
                    raw.reserve(offsets.buffer_size.saturating_sub(raw.len()));
                    match crate::mem_reader::read_ring_buffer(pid, &offsets, &mut raw) {
                        Ok(()) => {
                            if crate::mem_reader::validate_buffer(&raw).is_ok() {
                                validated = true;
                                need_discovery = false;
                            }
                        }
                        Err(_) => {
                            clear_pid_cache();
                        }
                    }
                }

                if need_discovery {
                    if discovery_attempts < 5 {
                        discovery_attempts += 1;
                        crate::logger::log_to_disk(&app_inner, &format!(
                            "[MEMORY WATCHER] Discovery attempt {}/5...", discovery_attempts));
                        if let Some((found_va, found_size)) =
                            crate::memory_scan::discover_ring_buffer(pid)
                        {
                            offsets = crate::mem_reader::MemOffsets {
                                buffer_va: found_va,
                                buffer_size: found_size,
                            };
                            raw.reserve(offsets.buffer_size.saturating_sub(raw.len()));
                            match crate::mem_reader::read_ring_buffer(pid, &offsets, &mut raw) {
                                Ok(()) => {
                                    if crate::mem_reader::validate_buffer(&raw).is_ok() {
                                        validated = true;
                                        crate::mem_reader::save_offset_cache(&offsets);
                                    } else {
                                        crate::logger::log_to_disk(&app_inner, &format!(
                                            "[MEMORY WATCHER] Discovery attempt {}/5 buffer validation failed",
                                            discovery_attempts));
                                        std::thread::sleep(std::time::Duration::from_secs(3));
                                        continue;
                                    }
                                }
                                Err(e) => {
                                    clear_pid_cache();
                                    crate::logger::log_to_disk(&app_inner, &format!(
                                        "[MEMORY WATCHER] Discovery attempt {}/5 read failed: {e:?}",
                                        discovery_attempts));
                                    std::thread::sleep(std::time::Duration::from_secs(3));
                                    continue;
                                }
                            }
                        } else {
                            crate::logger::log_to_disk(&app_inner, &format!(
                                "[MEMORY WATCHER] Discovery attempt {}/5 returned no candidate",
                                discovery_attempts));
                            std::thread::sleep(std::time::Duration::from_secs(3));
                            continue;
                        }
                    } else {
                        if !logged_waiting {
                            logged_waiting = true;
                            SCANNER_STATUS.store(1, Ordering::SeqCst);
                        }
                        crate::logger::log_to_disk(&app_inner,
                            "[MEMORY WATCHER] All discovery attempts exhausted, retrying...");
                        std::thread::sleep(std::time::Duration::from_secs(2));
                        continue;
                    }
                }
            }

            // ── Steady state: read, delta-diff, parse ──────────────────────
            if let Err(e) = crate::mem_reader::read_ring_buffer(pid, &offsets, &mut raw) {
                if ever_hooked {
                    SCANNER_STATUS.store(3, Ordering::SeqCst);
                }
                crate::logger::log_to_disk(&app_inner, &format!(
                    "[MEMORY WATCHER] Read error ({:?}), retrying...", e
                ));
                // If the process memory is inaccessible, the PID is stale
                // (e.g. the game restarted under a new PID).  Reset so the
                // next iteration re-scans /proc and re-discovers the buffer.
                // also reset ever_hooked so the status goes back to "active"
                // (green) once re-validation succeeds.
                if e == "open_mem_failed" {
                    validated = false;
                    ever_hooked = false;
                    crate::overlay_utils::stop_focus_watcher();
                    clear_pid_cache();
                }
                std::thread::sleep(std::time::Duration::from_millis(500));
                continue;
            }

            // ── Parse lines with hash dedup ────────────────────────────────
            // The ring buffer is circular: new lines overwrite old content at
            // a different position than where they're written.  Byte-level
            // delta-diff (extract_new) alone is unreliable for this  -  the
            // divergence point may be at the overwritten region, not the new
            // content.  Instead, re-parse lines and skip by hash.
            let text = String::from_utf8_lossy(&raw);
            for line in text.split('\n') {
                let line = line.trim_matches(|c: char| c.is_whitespace() || c == '\0');
                if line.is_empty() { continue; }
                if !line.starts_with(|c: char| c.is_ascii_digit()) { continue; }
                let hash = line_hash(line);
                if !seen_set.insert(hash) {
                    continue;
                }
                seen_count += 1;
                if seen_count >= SEEN_RESET_THRESHOLD {
                    seen_set.clear();
                    seen_count = 0;
                }

                // On the first cycle only (prev empty), skip stateful
                // triggers to avoid stale-event noise from the initial
                // buffer dump.  After that, every new line is real.
                if prev.len() != raw.len()
                    && (line.contains("OmegaRerollSelection.lua: Diorama setup")
                        || line.contains("ThemedDetailedPurchaseDialog.lua: PopulateInfo->")
                        || line.contains("ThemedDetailedPurchaseDialog.lua: DBG: HudVis")
                        || line.contains("Dialog.lua:")
                        || line.contains("CancelJobs batchcount 0")
                        || line.contains("NpcManager::ClearAgents()")
                        || line.contains("ChatRedux.lua: Chat: Filters for")
                        || line.contains("ProjectionRewardChoice.lua: Relic reward screen shut down")
                        || line.contains("Created /Lotus/Interface/ThemedProjectionManager.swf")
                        || line.contains("Subscribing for /Lotus/Interface/MapRedux.swf"))
                {
                    continue;
                }

                scanner.on_line(&app_inner, line);
            }

            if prev.len() != raw.len() {
                // First cycle done  -  mark hooked and save baseline.
                if !ever_hooked {
                    ever_hooked = true;
                    SCANNER_STATUS.store(2, Ordering::SeqCst);
                    logged_waiting = false;
                    app_inner.emit("scanner-hooked", ()).unwrap_or_default();
                    crate::overlay_utils::spawn_focus_watcher(&app_inner);
                }
                prev = raw.clone();
                let poll_ms = POLL_INTERVAL_MS.load(Ordering::Relaxed);
                std::thread::sleep(std::time::Duration::from_millis(poll_ms as u64));
                continue;
            }

            if !ever_hooked {
                ever_hooked = true;
                SCANNER_STATUS.store(2, Ordering::SeqCst);
                logged_waiting = false;
                app_inner.emit("scanner-hooked", ()).unwrap_or_default();
                crate::overlay_utils::spawn_focus_watcher(&app_inner);
            }

            std::mem::swap(&mut prev, &mut raw);

            let poll_ms = POLL_INTERVAL_MS.load(Ordering::Relaxed);
            std::thread::sleep(std::time::Duration::from_millis(poll_ms as u64));
        }

        // Only clear IS_SCANNING if we're still the current generation.
        // If a newer thread was spawned (generation was bumped), it manages
        // the flag  -  clearing it here would orphan the new thread.
        if SCANNER_GENERATION.load(Ordering::SeqCst) == my_gen {
            IS_SCANNING.store(false, Ordering::SeqCst);
        }
    });

    Ok(LogScannerHandle {
        running: Arc::new(AtomicBool::new(true)),
    })
}