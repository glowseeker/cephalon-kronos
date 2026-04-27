use notify::{Config, EventKind, RecursiveMode, Watcher};
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};

use serde::{Deserialize, Serialize};
use std::fs::File;
use std::io::{Read, Seek, SeekFrom};
use tauri::{AppHandle, Manager};

static IS_SCANNING: AtomicBool = AtomicBool::new(false);

use crate::overlay_utils;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct RelicInfo {
    pub unique_name: String,
    pub tier: String,
    pub refinement: String,
    pub era: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct FissureEvent {
    pub event_type: String,
    pub squad_relics: Vec<RelicInfo>,
    pub local_reward: Option<String>,
    pub squad_size: usize,
    pub void_tier: Option<String>,
}

pub struct LogScanner {
    squad_relics: Vec<RelicInfo>,
    local_reward: Option<String>,
    squad_size: usize,
    has_triggered_round: bool,
    is_fissure: bool,
    last_timestamp: f64,
}

fn parse_timestamp(line: &str) -> Option<f64> {
    if line.starts_with('[') {
        if let Some(end) = line.find(']') {
            return line[1..end].trim().parse::<f64>().ok();
        }
    }
    None
}

impl LogScanner {
    pub fn new() -> Self {
        Self {
            squad_relics: Vec::new(),
            local_reward: None,
            squad_size: 1,
            has_triggered_round: false,
            is_fissure: false,
            last_timestamp: 0.0,
        }
    }

    pub fn on_line(&mut self, app: &AppHandle, line: &str, silent: bool) {
        let ts = parse_timestamp(line);
        if let Some(t) = ts {
            self.last_timestamp = t;
        }

        let s = line.trim();
        if s.is_empty() {
            return;
        }

        // === 1. Mission Start/End Detection ===
        if line.contains("_ActiveMission\"} with MissionInfo") {
            if !silent { 
                let now = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_millis();
                println!("[{}] [LOG_SCANNER] === FISSURE MISSION DETECTED ===", now); 
            }
            self.is_fissure = true;
            self.reset_state();
            return;
        }

        // === 1.5 Squad Size Tracking ===
        if line.contains("AddSquadMember:") || line.contains("RemoveSquadMember:") {
            if let Some(pos) = line.find("squadCount=") {
                let rest = &line[pos + 11..];
                let count_str = rest.split(|c: char| !c.is_numeric()).next().unwrap_or("");
                if let Ok(count) = count_str.parse::<usize>() {
                    if count > 0 {
                        self.squad_size = count.min(4);
                        if !silent { println!("[LOG_SCANNER] Squad size updated: {}", self.squad_size); }
                    }
                }
            }
        }

        if line.contains("ExitState: Disconnected") || line.contains("Game [Info]: Set state to Disconnected") {
            if !silent && self.is_fissure {
                let now = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_millis();
                println!("[{}] [LOG_SCANNER] === MISSION END/ABORT (Disconnected) ===", now); 
            }
            self.is_fissure = false;
            self.reset_state();
            app.emit_all("fissure-reward-closed", ()).unwrap_or_default();
            return;
        }

        if self.is_fissure {
            // === 2. Relic Detection ===
            if line.contains("Resloader")
                && line.contains("/Lotus/Types/Game/Projections/")
                && line.contains("starting")
            {
                if let Some(start) = line.find("(/Lotus") {
                    if let Some(end) = line[start..].find(')') {
                        let path = &line[start + 1..start + end];
                        if !self.squad_relics.iter().any(|r| r.unique_name == path) {
                            let relic = parse_relic_path(path);
                            self.squad_relics.push(relic);
                            self.squad_size = self.squad_relics.len().min(4);
                            if !silent {
                                println!("[LOG_SCANNER] Relic detected: {} (Squad: {})", path, self.squad_size);
                            }
                        }
                    }
                }
            }

            // === 3. Local Reward Detection & Immediate Trigger ===
            if line.contains(" gets reward ") && line.contains("/Lotus/StoreItems/") {
                if let Some(pos) = line.find(" gets reward ") {
                    let path = line[pos + 13..].trim();
                    self.local_reward = Some(path.to_string());
                    if !silent { println!("[LOG_SCANNER] Local reward caught: {}", path); }
                    
                    if !silent && !self.has_triggered_round {
                        self.has_triggered_round = true;
                        let app_c = app.clone();
                        let sz = self.squad_size;
                        let relics = self.squad_relics.clone();
                        
                        std::thread::spawn(move || {
                            let now = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_millis();
                            println!("[{}] [LOG_SCANNER] === EARLY TRIGGER (Got reward line) ===", now);
                            std::thread::sleep(std::time::Duration::from_millis(300));
                            let _ = overlay_utils::show_window_internal(&app_c, "overlay-relic");
                            app_c.emit_all("scanner-show-overlay", "overlay-relic").unwrap_or_default();
                            app_c.emit_all("scanner-relic-phase-start", serde_json::json!({ "squad_size": sz })).unwrap_or_default();
                            app_c.emit_all("fissure-relic-phase", FissureEvent {
                                event_type: "relic_phase_start".to_string(),
                                squad_relics: relics,
                                local_reward: None,
                                squad_size: sz,
                                void_tier: None,
                            }).unwrap_or_default();
                            crate::ocr::run_ocr_pipeline_with_size(app_c, sz);
                        });
                    }
                }
            }

            // === 4. Backup Trigger ===
            if !self.has_triggered_round && line.contains("ProjectionRewardChoice.lua: Got rewards") {
                self.has_triggered_round = true;
                if !silent {
                    let now = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_millis();
                    println!("[{}] [LOG_SCANNER] === BACKUP TRIGGER (Got rewards line) ===", now);
                    let _ = overlay_utils::show_window_internal(app, "overlay-relic");
                    app.emit_all("scanner-show-overlay", "overlay-relic").unwrap_or_default();
                    app.emit_all("scanner-relic-phase-start", serde_json::json!({ "squad_size": self.squad_size })).unwrap_or_default();
                    let app_c = app.clone();
                    let sz = self.squad_size;
                    std::thread::spawn(move || {
                        crate::ocr::run_ocr_pipeline_with_size(app_c, sz);
                    });
                }
            }

            // === 5. Endless Mission Continue/Extract ===
            if line.contains("Sending continue dialogue to host with answer") {
                if line.contains("answer 1") {
                    if !silent { println!("[LOG_SCANNER] Endless: User chose to CONTINUE. Resetting round state."); }
                    self.reset_round();
                }
            }
        }
    }

    fn reset_round(&mut self) {
        self.squad_relics.clear();
        self.local_reward = None;
        self.has_triggered_round = false;
        // NOTE: We do NOT reset squad_size here as we might need it for the overlay trigger if detection lags.
    }

    fn reset_state(&mut self) {
        self.reset_round();
        self.squad_size = 1;
    }
}

fn parse_relic_path(path: &str) -> RelicInfo {
    let tier_code = if path.contains("T1") {
        "Lith"
    } else if path.contains("T2") {
        "Meso"
    } else if path.contains("T3") {
        "Neo"
    } else if path.contains("T4") {
        "Axi"
    } else if path.contains("T5") {
        "Requiem"
    } else {
        "Unknown"
    };

    let refinement = if path.ends_with("Bronze") {
        "Intact"
    } else if path.ends_with("Silver") {
        "Exceptional"
    } else if path.ends_with("Gold") {
        "Flawless"
    } else if path.ends_with("Platinum") {
        "Radiant"
    } else {
        "Intact"
    };

    RelicInfo {
        unique_name: path.to_string(),
        tier: tier_code.to_string(),
        refinement: refinement.to_string(),
        era: tier_code.to_string(),
    }
}

pub struct LogScannerHandle {
    pub watcher: Box<dyn Watcher + Send + Sync>,
}

pub fn spawn_log_watcher(app: AppHandle, log_path: PathBuf) -> Result<LogScannerHandle, String> {
    if IS_SCANNING.load(Ordering::SeqCst) {
        return Err("Already scanning".to_string());
    }
    IS_SCANNING.store(true, Ordering::SeqCst);

    let mut scanner = LogScanner::new();
    let app_inner = app.clone();

    let (tx, rx) = std::sync::mpsc::channel();
    let mut watcher =
        notify::RecommendedWatcher::new(tx, Config::default()).map_err(|e| e.to_string())?;
    watcher
        .watch(&log_path, RecursiveMode::NonRecursive)
        .map_err(|e| e.to_string())?;

    std::thread::spawn(move || {
        let mut file = File::open(&log_path).expect("Failed to open log");
        let total_len = file.metadata().unwrap().len();

        // ── Backfill: read the last 32 KB to catch in-progress missions ────────
        // If the scanner starts after the mission has already started (e.g. app
        // launched mid-run) we would otherwise miss all state-setting lines.
        const BACKFILL_BYTES: u64 = 32 * 1024;
        let backfill_start = total_len.saturating_sub(BACKFILL_BYTES);
        if backfill_start < total_len {
            let mut backfill_buf = Vec::new();
            let _ = file.seek(SeekFrom::Start(backfill_start));
            let _ = file.read_to_end(&mut backfill_buf);
            let backfill_text = String::from_utf8_lossy(&backfill_buf);
            eprintln!("[LOG_SCANNER] Backfilling {} bytes from EE.log", backfill_buf.len());
            for line in backfill_text.lines() {
                scanner.on_line(&app_inner, line, true);
            }
        }
        // ── End backfill ────────────────────────────────────────────────────────

        let mut pos = file.metadata().unwrap().len();
        let mut buffer = Vec::new();
        let mut f = file;

        for res in rx {
            if let Ok(event) = res {
                if let EventKind::Modify(_) = event.kind {
                    let new_len = f.metadata().unwrap().len();
                    if new_len < pos {
                        pos = 0;
                    }

                    let mut temp = Vec::new();
                    f.seek(SeekFrom::Start(pos)).unwrap_or(0);
                    if f.read_to_end(&mut temp).is_ok() && !temp.is_empty() {
                        buffer.extend(temp);
                        let mut last_nl = 0;
                        for (i, &b) in buffer.iter().enumerate() {
                            if b == b'\n' {
                                if let Ok(line) = std::str::from_utf8(&buffer[last_nl..i]) {
                                    scanner.on_line(&app_inner, line, false);
                                }
                                last_nl = i + 1;
                            }
                        }
                        buffer.drain(0..last_nl);
                        pos = f.seek(SeekFrom::Current(0)).unwrap_or(pos);
                    }
                }
            }
        }
    });

    Ok(LogScannerHandle {
        watcher: Box::new(watcher),
    })
}

pub fn stop_scanner() {
    IS_SCANNING.store(false, Ordering::SeqCst);
}
