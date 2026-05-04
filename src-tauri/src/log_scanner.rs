use std::fs::File;
use std::io::{Read, Seek, SeekFrom};
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::thread;
use std::time::Duration;
use tauri::{AppHandle, Manager};

static IS_SCANNING: AtomicBool = AtomicBool::new(false);

#[derive(Debug, Clone, serde::Serialize)]
pub struct RelicInfo {
    pub unique_name: String,
    pub tier: String,
    pub refinement: String,
    pub era: String,
    pub hex_id: String,
}

#[derive(Debug, Clone, serde::Serialize)]
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
    is_fissure: bool,
    wait_for_root_types: bool,
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
            is_fissure: false,
            wait_for_root_types: false,
        }
    }

    pub fn on_line(&mut self, app: &AppHandle, line: &str, _silent: bool) {
        let _ts = parse_timestamp(line);

        let s = line.trim();
        if s.is_empty() {
            return;
        }

        // === STATE MACHINE IN ORDER ===

        // --- Step 1: Fissure Mission Start ---
        if line.contains("_ActiveMission\"} with MissionInfo") {
            self.is_fissure = true;
            self.squad_size = 1;
            self.squad_relics.clear();
            self.wait_for_root_types = false;
            crate::logger::log_to_disk(app, "[LOG SCANNER] Step 1: FISSURE START");
            return;
        }

        // Skip other steps if not in fissure
        if !self.is_fissure {
            return;
        }

        // --- Step 8: Mission Exit ---
        if line.contains("ExitState: Disconnected") || line.contains("Game [Info]: Set state to Disconnected") {
            self.is_fissure = false;
            self.squad_relics.clear();
            self.wait_for_root_types = false;
            crate::logger::log_to_disk(app, "[LOG SCANNER] Step 8: MISSION EXIT");
            app.emit_all("fissure-reward-closed", ()).unwrap_or_default();
            return;
        }

        // --- Step 2: Relic Pool Detection ---
        if line.contains("Resloader") && line.contains("/Lotus/Types/Game/Projections/") && line.contains("starting") {
            if let Some(start) = line.find("(/Lotus") {
                if let Some(end) = line[start..].find(')') {
                    let path = &line[start + 1..start + end];
                    if !self.squad_relics.iter().any(|r| r.unique_name == path) {
                        crate::logger::log_to_disk(app, &format!("[LOG SCANNER] Step 2: RELIC POOL - {}", path));
                        let relic = parse_relic_path(path, "");
                        self.squad_relics.push(relic);
                    }
                }
            }
            return;
        }

        // --- Step 3: User Reward ---
        if line.contains(" gets reward ") && line.contains("/Lotus/StoreItems/") {
            if let Some(pos) = line.find(" gets reward ") {
                let path = line[pos + 13..].trim();
                self.local_reward = Some(path.to_string());
                crate::logger::log_to_disk(app, &format!("[LOG SCANNER] Step 3: USER REWARD - {}", path));
            }
            return;
        }

        // --- Step 4: Reward Screen Initialization (Slot Count) ---
        // Trigger: "ProjectionRewardChoice.lua: Got rewards" - marks start of reward screen init
        // Then wait for next ResourceLoader "(x root types)" to get actual count
        if line.contains("ProjectionRewardChoice.lua: Got rewards") {
            self.wait_for_root_types = true;
            crate::logger::log_to_disk(app, "[LOG SCANNER] Step 4: GOT REWARDS");
            return;
        }

        // Step 4 continued: Get root types count from ResourceLoader
        if self.wait_for_root_types && line.contains("root types") {
            // Pattern: "ResourceLoader 0x... (X root types) Found ..."
            if let Some(start) = line.find('(') {
                if let Some(end) = line[start..].find(" root types)") {
                    let count_str = &line[start + 1..start + end];
                    if let Ok(count) = count_str.trim().parse::<usize>() {
                        if count > 0 {
                            self.squad_size = count;
                        }
                    }
                }
            }
            self.wait_for_root_types = false;
            crate::logger::log_to_disk(app, &format!("[LOG SCANNER] Step 4: ROOT_TYPES - slots:{}", self.squad_size));
            self.trigger_overlay(app);
            return;
        }

        // --- Step 6: Reward Screen Close ---
        if line.contains("ProjectionRewardChoice.lua: Relic reward screen shut down") {
            crate::logger::log_to_disk(app, "[LOG SCANNER] Step 6: REWARD SCREEN CLOSE");
            self.wait_for_root_types = false;
            app.emit_all("fissure-reward-closed", ()).unwrap_or_default();
            return;
        }

        // --- Step 7: Endless Continue ---
        if line.contains("Created /Lotus/Interface/ThemedProjectionManager.swf") {
            self.wait_for_root_types = false;
            crate::logger::log_to_disk(app, "[LOG SCANNER] Step 7: ENDLESS CONTINUE");
            return;
        }
    }

    fn trigger_overlay(&self, app: &AppHandle) {
        let sz = self.squad_size;
        let relics = self.squad_relics.clone();

        if let Some(window) = app.get_window("overlay-relic") {
            let _ = window.show();
        }
        
        app.emit_all("scanner-relic-phase-start", serde_json::json!({ "squad_size": sz })).unwrap_or_default();
        
        app.emit_all(
            "fissure-relic-phase",
            FissureEvent {
                event_type: "relic_phase_start".to_string(),
                squad_relics: relics,
                local_reward: None,
                squad_size: sz,
                void_tier: None,
            },
        ).unwrap_or_default();
        
        crate::ocr::run_ocr_pipeline_with_size(app.clone(), sz);
    }
}

fn parse_relic_path(path: &str, hex_id: &str) -> RelicInfo {
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
        hex_id: hex_id.to_string(),
    }
}

pub struct LogScannerHandle {
    pub running: Arc<AtomicBool>,
}

pub fn stop_scanner() {
    IS_SCANNING.store(false, Ordering::SeqCst);
}

pub fn is_scanning() -> bool {
    IS_SCANNING.load(Ordering::SeqCst)
}

pub fn spawn_log_watcher(app: AppHandle, log_path: PathBuf) -> Result<LogScannerHandle, String> {
    if IS_SCANNING.load(Ordering::SeqCst) {
        return Err("Already scanning".to_string());
    }
    IS_SCANNING.store(true, Ordering::SeqCst);

    let app_inner = app.clone();

    std::thread::spawn(move || {
        let mut scanner = LogScanner::new();
        let mut pos = 0u64;

        // Backfill on start
        if let Ok(mut file) = File::open(&log_path) {
            if let Ok(metadata) = file.metadata() {
                let total_len = metadata.len();
                const BACKFILL_BYTES: u64 = 32 * 1024;
                let backfill_start = total_len.saturating_sub(BACKFILL_BYTES);

                if backfill_start < total_len {
                    let mut backfill_buf = Vec::new();
                    let _ = file.seek(SeekFrom::Start(backfill_start));
                    if file.read_to_end(&mut backfill_buf).is_ok() {
                        let backfill_text = String::from_utf8_lossy(&backfill_buf);
                        for line in backfill_text.lines() {
                            scanner.on_line(&app_inner, line, true);
                        }
                    }
                }
                pos = total_len;
            }
        }

        // Main polling loop
        loop {
            if !IS_SCANNING.load(Ordering::SeqCst) {
                break;
            }

            let file_result = File::open(&log_path);
            if let Err(e) = file_result {
                let msg = format!("[LOG SCANNER] Failed to open log: {}", e);
                eprintln!("{}", msg);
                crate::logger::log_to_disk(&app_inner, &msg);
                thread::sleep(Duration::from_secs(1));
                continue;
            }

            if let Ok(mut file) = file_result {
                if let Ok(metadata) = file.metadata() {
                    let new_len = metadata.len();

                    if new_len < pos {
                        pos = 0;
                    }

                    if new_len > pos {
                        let mut buffer = Vec::new();
                        if file.seek(SeekFrom::Start(pos)).is_ok() {
                            if file.read_to_end(&mut buffer).is_ok() && !buffer.is_empty() {
                                let text = String::from_utf8_lossy(&buffer);
                                for line in text.lines() {
                                    scanner.on_line(&app_inner, line, false);
                                }
                            }
                        }
                        pos = new_len;
                    }
                }
            }

            thread::sleep(Duration::from_millis(50));
        }
    });

    Ok(LogScannerHandle {
        running: Arc::new(AtomicBool::new(true)),
    })
}