use std::fs::File;
use std::io::{Read, Seek, SeekFrom};
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::thread;
use std::time::Duration;
use tauri::{AppHandle, Manager};

static IS_SCANNING: AtomicBool = AtomicBool::new(false);

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

pub struct LogScanner {
    squad_relics: Vec<RelicInfo>,
    squad_size: usize,
    is_fissure: bool,
    in_mission: bool,
}

fn parse_timestamp(line: &str) -> Option<f64> {
    // Format: "5687.320 Sys" from EE.log
    if let Some(space_idx) = line.find(' ') {
        let prefix = &line[..space_idx];
        if prefix.contains('.') {
            return prefix.parse::<f64>().ok();
        }
    }
    // Format: "[SystemTime: 1777981758260ms]" from overlay_debug
    if let Some(ms_pos) = line.find("SystemTime: ") {
        let start = ms_pos + 12;
        if let Some(ms_end) = line[start..].find("ms") {
            return line[start..start + ms_end].parse::<f64>().ok();
        }
    }
    None
}

impl LogScanner {
    pub fn new() -> Self {
        Self {
            squad_relics: Vec::new(),
            squad_size: 1,
            is_fissure: false,
            in_mission: false,
        }
    }

    pub fn on_line(&mut self, app: &AppHandle, line: &str) {
        let ts = parse_timestamp(line).unwrap_or(0.0);
        let s = line.trim();
        if s.is_empty() {
            return;
        }

        // === 1. Mission Start/End Detection ===
        if s.contains("_ActiveMission\"} with MissionInfo") {
            self.is_fissure = true;
            self.in_mission = true;
            self.squad_size = 1;
            self.squad_relics.clear();
            crate::ocr::ICON_SCAN_ACTIVE.store(false, Ordering::SeqCst);
            crate::logger::log_to_disk(app, &format!("[LOG SCANNER] Step 1: FISSURE START (LogTS: {}s)", ts));
            return;
        }

        // --- Step 7: Mission Exit ---
        if s.contains("ExitState: Disconnected") || s.contains("Game [Info]: Set state to Disconnected") {
            self.is_fissure = false;
            self.in_mission = false;
            self.squad_relics.clear();
            crate::ocr::ICON_SCAN_ACTIVE.store(false, Ordering::SeqCst);
            crate::logger::log_to_disk(app, &format!("[LOG SCANNER] Step 7: MISSION EXIT (LogTS: {}s)", ts));
            app.emit_all("fissure-reward-closed", ()).unwrap_or_default();
            return;
        }

        // --- Step 2: Relic Pool Detection ---
        if s.contains("Resloader") && s.contains("/Lotus/Types/Game/Projections/") && s.contains("starting") {
            if let Some(start) = s.find("(/Lotus") {
                if let Some(end) = s[start..].find(')') {
                    let path = &s[start + 1..start + end];
                    crate::logger::log_to_disk(app, &format!("[LOG SCANNER] Step 2: RELIC POOL - {} (LogTS: {}s)", path, ts));
                    let relic = parse_relic_path(path);
                    self.squad_relics.push(relic);
                    self.is_fissure = true;

                    // Sync discovered relics to AppState for the OCR thread
                    let state = app.state::<crate::AppState>();
                    if let Ok(mut cached) = state.active_relic_data.lock() {
                        *cached = Some(serde_json::json!({
                            "squad_relics": self.squad_relics,
                            "squad_size": self.squad_size,
                        }));
                    };
                }
            }
            return;
        }

        // --- Step 4: 10 Reactant Trigger ---
        if s.contains("DVRCAftermathLotus") {
            if crate::ocr::ICON_SCAN_ACTIVE.load(Ordering::SeqCst) {
                return;
            }
            crate::ocr::ICON_SCAN_ACTIVE.store(true, Ordering::SeqCst);
            let app_clone = app.clone();
            crate::logger::log_to_disk(app, &format!("[LOG SCANNER] Step 4: 10 REACTANT DETECTED (Starting icon scan) (LogTS: {}s)", ts));
            std::thread::spawn(move || {
                crate::ocr::detect_slot_count_from_icons(app_clone, false);
            });
            return;
        }

        // --- Step 5: Reward Screen Closure ---
        if s.contains("ProjectionRewardChoice.lua: Relic reward screen shut down") {
            crate::ocr::ICON_SCAN_ACTIVE.store(false, Ordering::SeqCst);
            crate::logger::log_to_disk(app, &format!("[LOG SCANNER] Step 5: REWARD SCREEN CLOSE (LogTS: {}s)", ts));
            app.emit_all("fissure-reward-closed", ()).unwrap_or_default();
            return;
        }

        // --- Step 6: Endless Mission Handling ---
        if s.contains("Created /Lotus/Interface/ThemedProjectionManager.swf") {
            if !self.in_mission {
                return;
            }
            crate::ocr::ICON_SCAN_ACTIVE.store(false, Ordering::SeqCst);
            crate::logger::log_to_disk(app, &format!("[LOG SCANNER] Step 6: ENDLESS CONTINUE (LogTS: {}s)", ts));
            return;
        }
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
    pub running: Arc<AtomicBool>,
}

pub fn stop_scanner() {
    IS_SCANNING.store(false, Ordering::SeqCst);
    // Also stop any in-flight icon scan
    crate::ocr::ICON_SCAN_ACTIVE.store(false, Ordering::SeqCst);
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
        crate::logger::log_to_disk(&app_inner, &format!("[LOG SCANNER] Thread started for: {:?}", log_path));
        let mut scanner = LogScanner::new();
        let mut pos = std::fs::metadata(&log_path).map(|m| m.len()).unwrap_or(0);
        
        let mut file = match File::open(&log_path) {
            Ok(f) => f,
            Err(e) => {
                let msg = format!("[LOG SCANNER] Failed to open log: {}", e);
                eprintln!("{}", msg);
                crate::logger::log_to_disk(&app_inner, &msg);
                IS_SCANNING.store(false, Ordering::SeqCst);
                return;
            }
        };

        let mut buffer = Vec::new();

        loop {
            if !IS_SCANNING.load(Ordering::SeqCst) {
                break;
            }

            if let Ok(metadata) = file.metadata() {
                let new_len = metadata.len();

                if new_len < pos {
                    pos = 0;
                    let _ = file.seek(SeekFrom::Start(0));
                }

                if new_len > pos {
                    if let Ok(_) = file.seek(SeekFrom::Start(pos)) {
                        buffer.clear();
                        if let Ok(bytes_read) = file.read_to_end(&mut buffer) {
                            if bytes_read > 0 {
                                let text = String::from_utf8_lossy(&buffer);
                                for line in text.lines() {
                                    scanner.on_line(&app_inner, line);
                                }
                                pos += bytes_read as u64;
                            }
                        }
                    }
                }
            } else {
                // File might have been moved/deleted, try to reopen
                if let Ok(f) = File::open(&log_path) {
                    file = f;
                }
            }

            thread::sleep(Duration::from_millis(100));
        }
    });

    Ok(LogScannerHandle {
        running: Arc::new(AtomicBool::new(true)),
    })
}