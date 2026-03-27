#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};
use serde_json::Value;
use tauri::Manager;
use std::fs;

// ─── Path Resolution ──────────────────────────────────────────────────────────

fn get_app_root() -> PathBuf {
    if cfg!(debug_assertions) {
        PathBuf::from(env!("CARGO_MANIFEST_DIR"))
    } else {
        std::env::current_exe()
            .map(|p| p.parent().unwrap_or(Path::new(".")).to_path_buf())
            .unwrap_or_else(|_| PathBuf::from("."))
    }
}

fn resolve_path(relative: &str) -> PathBuf {
    get_app_root().join(relative)
}

// ─── Export Management ────────────────────────────────────────────────────────

const EXPORT_FILES: &[&str] = &[
    "ExportWarframes.json",
    "ExportWeapons.json",
    "ExportSentinels.json",
    "ExportUpgrades.json",
    "ExportArcanes.json",
    "ExportResources.json",
    "ExportRelics.json",
    "ExportRewards.json",
    "ExportChallenges.json",
    "ExportRegions.json",
    "ExportNightwave.json",
    "ExportSyndicates.json",
    "ExportBoosterPacks.json",
    "dict.en.json",
    "supp-dict-en.json",
];

const BASE_URL: &str = "https://raw.githubusercontent.com/calamity-inc/warframe-public-export-plus/master";

// TXT data files from browse.wf - cached locally, refreshed every 6 hours
const TXT_FILES: &[(&str, &str)] = &[
    ("arbys.txt",          "https://browse.wf/arbys.txt"),
    ("sp-incursions.txt",  "https://browse.wf/sp-incursions.txt"),
];

#[tauri::command]
async fn check_exports() -> Result<String, String> {
    let export_dir = resolve_path("data/export");
    if !export_dir.exists() {
        fs::create_dir_all(&export_dir).map_err(|e| e.to_string())?;
    }

    let client = reqwest::Client::new();
    let mut updated_count = 0u32;

    // ── JSON exports (refresh every 24 h) ────────────────────────────────────
    for file_name in EXPORT_FILES {
        let path = export_dir.join(file_name);
        let needs_update = if !path.exists() {
            true
        } else {
            let meta = fs::metadata(&path).map_err(|e| e.to_string())?;
            let age = SystemTime::now()
                .duration_since(meta.modified().map_err(|e| e.to_string())?)
                .unwrap_or_default();
            age.as_secs() > 86_400
        };

        if needs_update {
            let url = if *file_name == "supp-dict-en.json" {
                "https://oracle.browse.wf/dicts/en.json".to_string()
            } else {
                format!("{}/{}", BASE_URL, file_name)
            };
            
            println!("Downloading {}…", url);
            let resp = client.get(&url).send().await.map_err(|e| e.to_string())?;
            if !resp.status().is_success() {
                return Err(format!("Failed to download {}: status {}", file_name, resp.status()));
            }
            fs::write(&path, resp.bytes().await.map_err(|e| e.to_string())?)
                .map_err(|e| e.to_string())?;
            updated_count += 1;
        }
    }

    // ── TXT data files (refresh every 6 h) ───────────────────────────────────
    for (file_name, url) in TXT_FILES {
        let path = export_dir.join(file_name);
        let needs_update = if !path.exists() {
            true
        } else {
            let meta = fs::metadata(&path).map_err(|e| e.to_string())?;
            let age = SystemTime::now()
                .duration_since(meta.modified().map_err(|e| e.to_string())?)
                .unwrap_or_default();
            age.as_secs() > 21_600  // 6 hours
        };

        if needs_update {
            println!("Downloading {}…", url);
            let resp = client.get(*url).send().await.map_err(|e| e.to_string())?;
            if resp.status().is_success() {
                fs::write(&path, resp.bytes().await.map_err(|e| e.to_string())?)
                    .map_err(|e| e.to_string())?;
                updated_count += 1;
            } else {
                // Non-fatal: txt files are optional enhancements
                eprintln!("Warning: could not download {}: status {}", file_name, resp.status());
            }
        }
    }

    Ok(format!("Updated {} files", updated_count))
}

/// Load a cached txt file from data/export/ and return its contents.
#[tauri::command]
async fn load_txt_file(name: String) -> Result<String, String> {
    let path = resolve_path("data/export").join(&name);
    if path.exists() {
        fs::read_to_string(&path).map_err(|e| e.to_string())
    } else {
        Ok(String::new())
    }
}

// ─── Inventory Management ─────────────────────────────────────────────────────

#[tauri::command]
async fn load_cached_inventory() -> Result<Option<(Value, u64)>, String> {
    let path = resolve_path("data/user/inventory.json");
    if !path.exists() {
        return Ok(None);
    }
    let timestamp = fs::metadata(&path)
        .ok()
        .and_then(|m| m.modified().ok())
        .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
        .map(|d| d.as_millis() as u64)
        .unwrap_or_else(|| {
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis() as u64
        });
    let content = fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read inventory.json: {e}"))?;
    let json: Value = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse inventory.json: {e}"))?;
    Ok(Some((json, timestamp)))
}

#[tauri::command]
async fn call_api_helper() -> Result<Value, String> {
    let bin_path = resolve_path("data/bin/warframe-api-helper");
    let inv_dir = resolve_path("data/user");
    let inv_path = inv_dir.join("inventory.json");

    if !inv_dir.exists() {
        fs::create_dir_all(&inv_dir).map_err(|e| e.to_string())?;
    }

    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        if let Ok(meta) = fs::metadata(&bin_path) {
            let mut perms = meta.permissions();
            perms.set_mode(0o755);
            let _ = fs::set_permissions(&bin_path, perms);
        }
    }

    let output = std::process::Command::new(&bin_path)
        .arg(format!("--output={}", inv_path.to_string_lossy()))
        .current_dir(&inv_dir) // All helper files (JSON and .dat) will land here
        .output()
        .map_err(|e| format!("Failed to launch warframe-api-helper: {e}"))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("warframe-api-helper failed: {stderr}"));
    }

    let content = fs::read_to_string(&inv_path)
        .map_err(|e| format!("Failed to read inventory.json after update: {e}"))?;
    serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse updated inventory.json: {e}"))
}

#[tauri::command]
async fn load_all_exports() -> Result<Value, String> {
    let export_dir = resolve_path("data/export");
    let mut result = serde_json::Map::new();

    for file_name in EXPORT_FILES {
        let path = export_dir.join(file_name);
        if path.exists() {
            let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
            let json: Value = serde_json::from_str(&content).map_err(|e| e.to_string())?;
            let key = file_name.trim_end_matches(".json");
            result.insert(key.to_string(), json);
        }
    }
    Ok(Value::Object(result))
}

// ─── Notes Management ─────────────────────────────────────────────────────────

#[tauri::command]
async fn list_notes() -> Result<Vec<String>, String> {
    let notes_dir = resolve_path("data/user/notes");
    if !notes_dir.exists() {
        fs::create_dir_all(&notes_dir).map_err(|e| e.to_string())?;
    }
    let mut notes = Vec::new();
    for entry in fs::read_dir(notes_dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        if let Some(name) = entry.file_name().to_str() {
            if name.ends_with(".md") {
                notes.push(name.to_string());
            }
        }
    }
    notes.sort();
    Ok(notes)
}

#[tauri::command]
async fn read_note(filename: String) -> Result<String, String> {
    let path = resolve_path("data/user/notes").join(filename);
    if path.exists() {
        fs::read_to_string(path).map_err(|e| e.to_string())
    } else {
        Ok(String::new())
    }
}

#[tauri::command]
async fn save_note(filename: String, content: String) -> Result<(), String> {
    let notes_dir = resolve_path("data/user/notes");
    if !notes_dir.exists() {
        fs::create_dir_all(&notes_dir).map_err(|e| e.to_string())?;
    }
    fs::write(notes_dir.join(filename), content).map_err(|e| e.to_string())
}

#[tauri::command]
async fn delete_note(filename: String) -> Result<(), String> {
    let path = resolve_path("data/user/notes").join(filename);
    if path.exists() {
        fs::remove_file(path).map_err(|e| e.to_string())
    } else {
        Ok(())
    }
}

#[tauri::command]
async fn open_data_folder() -> Result<(), String> {
    let path = resolve_path("data");
    #[cfg(target_os = "windows")]
    { std::process::Command::new("explorer").arg(path).spawn().map_err(|e| e.to_string())?; }
    #[cfg(target_os = "linux")]
    { std::process::Command::new("xdg-open").arg(path).spawn().map_err(|e| e.to_string())?; }
    #[cfg(target_os = "macos")]
    { std::process::Command::new("open").arg(path).spawn().map_err(|e| e.to_string())?; }
    Ok(())
}

// ─── Media Management ─────────────────────────────────────────────────────────

const MAP_FILES: &[&str] = &[
    "PlainsofEidolon_4k_Map.png",
    "OrbVallis4kMap-min.png",
    "CambianDrift4kMap.png",
    "Duviri_map_with_caves.png",
];

const RANK_NAMES: &[&str] = &[
    "Unranked", "Initiate", "SilverInitiate", "GoldInitiate",
    "Novice", "SilverNovice", "GoldNovice",
    "Disciple", "SilverDisciple", "GoldDisciple",
    "Seeker", "SilverSeeker", "GoldSeeker",
    "Hunter", "SilverHunter", "GoldHunter",
    "Eagle", "SilverEagle", "GoldEagle",
    "Tiger", "SilverTiger", "GoldTiger",
    "Dragon", "SilverDragon", "GoldDragon",
    "Sage", "SilverSage", "GoldSage",
    "Master", "MiddleMaster", "GrandMaster"
];

#[tauri::command]
async fn check_media_assets() -> Result<String, String> {
    let client = reqwest::Client::new();
    let mut downloaded = 0u32;
    let base_url = "https://raw.githubusercontent.com/glowseeker/cephalon-kronos/main/src-tauri/data/export/master";

    // Maps
    let maps_dir = resolve_path("data/export/maps");
    if !maps_dir.exists() { fs::create_dir_all(&maps_dir).map_err(|e| e.to_string())?; }
    for map in MAP_FILES {
        let path = maps_dir.join(map);
        if !path.exists() {
            let url = format!("{}/maps/{}", base_url, map);
            let resp = client.get(&url).send().await.map_err(|e| e.to_string())?;
            if resp.status().is_success() {
                fs::write(&path, resp.bytes().await.map_err(|e| e.to_string())?).map_err(|e| e.to_string())?;
                downloaded += 1;
            }
        }
    }

    // Mastery Icons
    let icons_dir = resolve_path("data/export/masteryicons");
    if !icons_dir.exists() { fs::create_dir_all(&icons_dir).map_err(|e| e.to_string())?; }
    for rank in 0..=40 {
        let filename = if rank <= 30 {
            format!("Rank{:02}{}.png", rank, RANK_NAMES[rank])
        } else {
            format!("Rank{}.png", rank)
        };
        let path = icons_dir.join(&filename);
        if !path.exists() {
            let url = format!("{}/masteryicons/{}", base_url, filename);
            let resp = client.get(&url).send().await.map_err(|e| e.to_string())?;
            if resp.status().is_success() {
                fs::write(&path, resp.bytes().await.map_err(|e| e.to_string())?).map_err(|e| e.to_string())?;
                downloaded += 1;
            }
        }
    }

    Ok(format!("Downloaded {} media assets", downloaded))
}

#[tauri::command]
fn get_mastery_icons_path() -> String {
    resolve_path("data/export/masteryicons").to_string_lossy().to_string()
}

#[tauri::command]
fn get_maps_path() -> String {
    resolve_path("data/export/maps").to_string_lossy().to_string()
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            load_cached_inventory,
            call_api_helper,
            check_exports,
            check_media_assets,
            load_all_exports,
            load_txt_file,
            list_notes,
            read_note,
            save_note,
            delete_note,
            open_data_folder,
            get_mastery_icons_path,
            get_maps_path,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}