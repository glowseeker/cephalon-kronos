// Hide the console window on Windows release builds.
#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};
use std::fs;
use tauri::Manager;
use std::sync::{Arc, Mutex};
use serde_json::Value;

mod log_scanner;
mod ocr;
mod overlay_utils;

pub struct AppState {
    pub notif_sound: Arc<Mutex<String>>,
    pub log_scanner: Arc<Mutex<Option<log_scanner::LogScannerHandle>>>,
    pub log_scanner_path: Arc<Mutex<Option<String>>>,
    /// Path to the eng.user-words file written for the current session.
    /// Written by `write_ocr_wordlist`, consumed by the OCR pipeline.
    pub ocr_wordlist_path: Arc<Mutex<Option<std::path::PathBuf>>>,
}

// ─── Path Resolution ──────────────────────────────────────────────────────────
//
// In dev builds, paths are resolved relative to the Cargo manifest directory so
// that assets sit alongside the source tree.  In release builds they're resolved
// relative to the executable so the installed app is self-contained.
// When running from an AppImage, the mounted FS is read-only, but the APPIMAGE
// relative to the real file -- we use its parent dir for writable data so
// everything stays in one portable folder.

fn get_app_root() -> PathBuf {
    if cfg!(debug_assertions) {
        PathBuf::from(env!("CARGO_MANIFEST_DIR"))
    } else if let Ok(appimage_path) = std::env::var("APPIMAGE") {
        let path = PathBuf::from(appimage_path);
        path.parent().map(|p| p.to_path_buf()).unwrap_or(PathBuf::from("."))
    } else {
        std::env::current_exe()
            .map(|p| p.parent().unwrap_or(Path::new(".")).to_path_buf())
            .unwrap_or_else(|_| PathBuf::from("."))
    }
}

/// Returns the writable data root.
/// Portable on all platforms — data always lives next to the app.
/// - AppImage: directory containing the .AppImage file
/// - macOS .app: directory containing the .app bundle
/// - Everything else: directory containing the binary
fn get_data_root() -> PathBuf {
    if let Ok(appimage_path) = std::env::var("APPIMAGE") {
        return PathBuf::from(appimage_path)
            .parent()
            .unwrap_or(Path::new("."))
            .to_path_buf();
    }

    #[cfg(target_os = "macos")]
    {
        if let Ok(exe) = std::env::current_exe() {
            let path_str = exe.to_string_lossy();
            if let Some(app_pos) = path_str.find(".app/") {
                let app_path = PathBuf::from(&path_str[..app_pos + 4]);
                if let Some(parent) = app_path.parent() {
                    return parent.to_path_buf();
                }
            }
        }
    }

    get_app_root()
}

/// Build an absolute path from a path relative to the writable data root.
fn resolve_path(relative: &str) -> PathBuf {
    get_data_root().join(relative)
}

/// Build an absolute path from a path relative to the bundled app root.
/// Used as fallback when writable data root doesn't have the file yet (e.g. AppImage first run).
fn resolve_bundled_path(app_handle: &tauri::AppHandle, relative: &str) -> Option<PathBuf> {
    app_handle.path_resolver().resolve_resource(relative)
}

/// Simple command to proxy frontend logs to the terminal/stdout.
#[tauri::command]
fn log_terminal(message: String) {
    eprintln!("[JS] {}", message);
}

// ─── Export Management ────────────────────────────────────────────────────────
//
// JSON exports come from the warframe-public-export-plus mirror on GitHub and
// are cached in data/export/.  They're refreshed every 24 hours.
//
// Supplementary dictionary fields come from oracle.browse.wf (used for item
// name look-ups that aren't covered by the standard export files).
//
// TXT data files (arbitration/Steel Path data) come from browse.wf and are
// cached for 6 hours because they change more often.

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
    "ExportRecipes.json",
    "ExportCustoms.json",
    "ExportGear.json",
    "ExportImages.json",
    "ExportTextIcons.json",
    "dict.en.json",
    "supp-dict-en.json",
];

const BASE_URL: &str =
    "https://raw.githubusercontent.com/calamity-inc/warframe-public-export-plus/master";

// TXT files are optional - download failures are non-fatal.
const TXT_FILES: &[(&str, &str)] = &[
    ("arbys.txt",         "https://browse.wf/arbys.txt"),
    ("sp-incursions.txt", "https://browse.wf/sp-incursions.txt"),
];

// ─── Shared Download Helper ───────────────────────────────────────────────────

/// Download a file from `url` and write it to `dest`.
/// Returns `Ok(true)` on success, or an error string on failure.
async fn download_file(client: &reqwest::Client, url: &str, dest: &std::path::Path) -> Result<bool, String> {
    let resp = client.get(url).send().await.map_err(|e| e.to_string())?;
    if !resp.status().is_success() {
        return Err(format!("HTTP {} for {}", resp.status(), url));
    }
    let bytes = resp.bytes().await.map_err(|e| e.to_string())?;
    fs::write(dest, bytes).map_err(|e| e.to_string())?;
    Ok(true)
}

/// Return the age in seconds of a file on disk, or `u64::MAX` if the metadata
/// can't be read (treats unreadable files as needing a refresh).
fn file_age_secs(path: &std::path::Path) -> u64 {
    fs::metadata(path)
        .ok()
        .and_then(|m| m.modified().ok())
        .and_then(|t| SystemTime::now().duration_since(t).ok())
        .map(|d| d.as_secs())
        .unwrap_or(u64::MAX)
}

// ─── Tauri Commands ───────────────────────────────────────────────────────────
//
// All functions marked `#[tauri::command]` are callable from the frontend via
// `invoke('command_name', args)`.  See MonitoringContext.jsx for the primary
// call sites.

/// Download or refresh all game data exports (JSON + TXT).
/// Called by MonitoringContext on startup and on each monitoring cycle.
/// JSON exports are refreshed every 24 h; TXT files every 6 h.
#[tauri::command]
async fn check_exports() -> Result<String, String> {
    let export_dir = resolve_path("data/export");
    if !export_dir.exists() {
        fs::create_dir_all(&export_dir).map_err(|e| e.to_string())?;
    }

    let client = reqwest::Client::new();
    let mut updated_count = 0u32;

    // JSON exports - refresh once per day
    for file_name in EXPORT_FILES {
        let path = export_dir.join(file_name);
        let needs_update = !path.exists() || file_age_secs(&path) > 86_400;

        if needs_update {
            let url = if *file_name == "supp-dict-en.json" {
                "https://oracle.browse.wf/dicts/en.json".to_string()
            } else {
                format!("{}/{}", BASE_URL, file_name)
            };
            download_file(&client, &url, &path).await.map_err(|e| {
                format!("Failed to download {}: {}", file_name, e)
            })?;
            updated_count += 1;
        }
    }

    // TXT data files - refresh every 6 hours; failures are non-fatal
    for (file_name, url) in TXT_FILES {
        let path = export_dir.join(file_name);
        let needs_update = !path.exists() || file_age_secs(&path) > 21_600;

        if needs_update {
            match download_file(&client, url, &path).await {
                Ok(_) => updated_count += 1,
                Err(e) => eprintln!("Warning: could not download {}: {}", file_name, e),
            }
        }
    }

    Ok(format!("Updated {} files", updated_count))
}

/// Read a cached TXT file from data/export/ and return its contents as a string.
/// Returns an empty string if the file doesn't exist (e.g. first run offline).
/// Called by the Dashboard to load arbitration/Steel Path data.
#[tauri::command]
async fn load_txt_file(app_handle: tauri::AppHandle, name: String) -> Result<String, String> {
    // Try writable location first, fall back to bundled
    let path = resolve_path("data/export").join(&name);
    if path.exists() {
        return fs::read_to_string(&path).map_err(|e| e.to_string());
    }
    
    if let Some(bundled) = resolve_bundled_path(&app_handle, &format!("data/export/{}", name)) {
        if bundled.exists() {
            return fs::read_to_string(&bundled).map_err(|e| e.to_string());
        }
    }
    
    Ok(String::new())
}

// ─── Inventory Management ─────────────────────────────────────────────────────
//
// Inventory data is obtained by running the bundled warframe-api-helper binary,
// which authenticates with Warframe's servers using the local game session.
// The result is stored as data/user/inventory.json.

/// Load the previously saved inventory JSON and its file modification timestamp.
/// Returns `None` if no inventory has been fetched yet (fresh install).
/// Called by MonitoringContext on startup to restore the last known state.
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

/// Run the warframe-api-helper binary to fetch a fresh inventory from the game
/// servers, save it to data/user/inventory.json, and return the parsed JSON.
/// Called by MonitoringContext on manual scan and on each monitoring tick.
#[tauri::command]
async fn call_api_helper(app_handle: tauri::AppHandle) -> Result<Value, String> {
    // Binary is always bundled - check writable location first, fall back to bundled
    let bin_name = format!("warframe-api-helper{}", std::env::consts::EXE_SUFFIX);
    let relative_bin = format!("data/bin/{}", bin_name);
    let writable_bin = resolve_path(&relative_bin);
    let bundled_bin = resolve_bundled_path(&app_handle, &relative_bin);
    let bin_path = if writable_bin.exists() {
        writable_bin
    } else if let Some(b) = bundled_bin.clone().filter(|p| p.exists()) {
        b
    } else {
        return Err(format!(
            "warframe-api-helper not found. Writable: {:?}, Bundled: {:?}",
            writable_bin, bundled_bin
        ));
    };
    
    let inv_dir = resolve_path("data/user");
    let inv_path = inv_dir.join("inventory.json");

    if !inv_dir.exists() {
        fs::create_dir_all(&inv_dir).map_err(|e| e.to_string())?;
    }

    // Make the binary executable on Unix platforms.
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        if let Ok(meta) = fs::metadata(&bin_path) {
            let mut perms = meta.permissions();
            perms.set_mode(0o755);
            let _ = fs::set_permissions(&bin_path, perms);
        }
    }

    let mut cmd = std::process::Command::new(&bin_path);
    cmd.arg(format!("--output={}", inv_path.to_string_lossy()))
       .current_dir(&inv_dir);

    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }

    let output = cmd.output()
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

/// Load all JSON export files into a single JSON object keyed by file stem
/// (e.g. `{ "ExportWeapons": [...], "ExportWarframes": [...], ... }`).
/// Called by MonitoringContext once on startup; passed to inventoryParser.js.
#[tauri::command]
async fn load_all_exports(app_handle: tauri::AppHandle) -> Result<Value, String> {
    let export_dir = resolve_path("data/export");
    let mut result = serde_json::Map::new();

    for file_name in EXPORT_FILES {
        // Try writable location first, fall back to bundled
        let path = export_dir.join(file_name);
        
        let path = if path.exists() {
            path
        } else if let Some(bundled) = resolve_bundled_path(&app_handle, &format!("data/export/{}", file_name)) {
            if bundled.exists() { bundled } else { continue }
        } else {
            continue
        };
        
        let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
        let json: Value = serde_json::from_str(&content).map_err(|e| e.to_string())?;
        let key = file_name.trim_end_matches(".json");
        result.insert(key.to_string(), json);
    }
    Ok(Value::Object(result))
}

// ─── Notes Management ─────────────────────────────────────────────────────────
//
// Notes are stored as individual Markdown files under data/user/notes/.
// The Notes screen calls these commands directly via Tauri invoke.

/// Return a sorted list of all note filenames (*.md) in data/user/notes/.
#[tauri::command]
async fn list_notes(app_handle: tauri::AppHandle) -> Result<Vec<String>, String> {
    let notes_dir = resolve_path("data/user/notes");
    
    // Ensure writable directory exists
    if !notes_dir.exists() {
        fs::create_dir_all(&notes_dir).map_err(|e| e.to_string())?;
    }
    
    let mut notes = Vec::new();
    
    // Read from writable location first
    if let Ok(entries) = fs::read_dir(&notes_dir) {
        for entry in entries.flatten() {
            if let Some(name) = entry.file_name().to_str() {
                if name.ends_with(".md") {
                    notes.push(name.to_string());
                }
            }
        }
    }

    // If no notes exist, create the Welcome note
    if notes.is_empty() {
        let welcome_name = "Welcome.md".to_string();
        let welcome_content = r#"# Welcome to Cephalon Kronos

This is a showcase of the **Notes** feature. You can use this space to either write your own notes or import guides from elsewhere.

Basic text formatting like **bold**, *italic*, <u>underscore</u>

* Bulletpoint lists

1. Numbered lists

* [ ] Checkmarks

`inline code`

***

| Support for tables |   |   |
| ------------------ | - | - |
|                    |   |   |
|                    |   |   |
"#;
        let welcome_path = notes_dir.join(&welcome_name);
        let _ = fs::write(welcome_path, welcome_content);
        notes.push(welcome_name);
    }
    
    // Also check bundled location for notes that haven't been copied yet
    // Skip this in debug builds to avoid issues with source/data being the same
    if !cfg!(debug_assertions) {
        if let Some(bundled_dir) = resolve_bundled_path(&app_handle, "data/user/notes") {
            if bundled_dir.exists() && bundled_dir != notes_dir {
                if let Ok(entries) = fs::read_dir(&bundled_dir) {
                    for entry in entries.flatten() {
                        if let Some(name) = entry.file_name().to_str() {
                            if name.ends_with(".md") && !notes.contains(&name.to_string()) {
                                // Copy to writable location first
                                let dest = notes_dir.join(name);
                                if !dest.exists() {
                                    let _ = fs::copy(entry.path(), &dest);
                                }
                                notes.push(name.to_string());
                            }
                        }
                    }
                }
            }
        }
    }
    
    notes.sort();
    Ok(notes)
}

/// Read the contents of a single note file.
/// Returns an empty string if the file doesn't exist.
#[tauri::command]
async fn read_note(filename: String) -> Result<String, String> {
    let path = resolve_path("data/user/notes").join(filename);
    if path.exists() {
        fs::read_to_string(path).map_err(|e| e.to_string())
    } else {
        Ok(String::new())
    }
}

/// Write content to a note file, creating it if it doesn't exist.
#[tauri::command]
async fn save_note(filename: String, content: String) -> Result<(), String> {
    let notes_dir = resolve_path("data/user/notes");
    if !notes_dir.exists() {
        fs::create_dir_all(&notes_dir).map_err(|e| e.to_string())?;
    }
    fs::write(notes_dir.join(filename), content).map_err(|e| e.to_string())
}

/// Delete a note file.  No-op if it doesn't exist.
#[tauri::command]
async fn delete_note(app_handle: tauri::AppHandle, filename: String) -> Result<(), String> {
    let path = resolve_path("data/user/notes").join(&filename);
    if path.exists() {
        fs::remove_file(path).map_err(|e| e.to_string())
    } else {
        if let Some(bundled) = resolve_bundled_path(&app_handle, &format!("data/user/notes/{}", filename)) {
            if bundled.exists() {
                fs::remove_file(bundled).map_err(|e| e.to_string())
            } else {
                Ok(())
            }
        } else {
            Ok(())
        }
    }
}

/// Open the data/ directory in the OS file browser.
/// Called from the Settings screen.
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

// ─── Media Assets ─────────────────────────────────────────────────────────────
//
// Map images and mastery rank icons are downloaded on demand from the GitHub
// repo and cached permanently (no re-download once present).

const MAP_FILES: &[&str] = &[
    "PlainsofEidolon_4k_Map.png",
    "OrbVallis4kMap-min.png",
    "CambianDrift4kMap.png",
    "Duviri_map_with_caves.png",
];

// Rank names up to 30 are suffixed in filenames (e.g. Rank01Initiate.png).
// Ranks 31+ use a plain numeric filename (e.g. Rank31.png).
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

/// Download any map or mastery icon assets that aren't already cached.
/// Called by MonitoringContext on startup.  Failures are non-fatal per asset.
#[tauri::command]
async fn check_media_assets(app_handle: tauri::AppHandle) -> Result<String, String> {
    let client = reqwest::Client::new();
    let mut downloaded = 0u32;
    // Updated to point to glowseeker GitHub namespace:
    let base_url = "https://raw.githubusercontent.com/glowseeker/cephalon-kronos/main/src-tauri/data/export";

    // Download open-world maps
    let maps_dir = resolve_path("data/export/maps");
    if !maps_dir.exists() {
        fs::create_dir_all(&maps_dir).map_err(|e| e.to_string())?;
    }
    // Copy from bundled if not in writable location
    if let Some(bundled_maps) = resolve_bundled_path(&app_handle, "data/export/maps") {
        if bundled_maps.exists() {
            if let Ok(entries) = fs::read_dir(&bundled_maps) {
                for entry in entries.flatten() {
                    let file_name = entry.file_name();
                    let dest = maps_dir.join(&file_name);
                    if !dest.exists() {
                        let _ = fs::copy(entry.path(), &dest);
                    }
                }
            }
        }
    }
    
    for map in MAP_FILES {
        let path = maps_dir.join(map);
        if !path.exists() {
            let url = format!("{}/maps/{}", base_url, map);
            if download_file(&client, &url, &path).await.is_ok() {
                downloaded += 1;
            }
        }
    }

    // Download mastery rank icons (ranks 0-40)
    let icons_dir = resolve_path("data/export/masteryicons");
    if !icons_dir.exists() {
        fs::create_dir_all(&icons_dir).map_err(|e| e.to_string())?;
    }
    
    // Copy from bundled if not in writable location
    if let Some(bundled_icons) = resolve_bundled_path(&app_handle, "data/export/masteryicons") {
        if bundled_icons.exists() {
            if let Ok(entries) = fs::read_dir(&bundled_icons) {
                for entry in entries.flatten() {
                    let file_name = entry.file_name();
                    let dest = icons_dir.join(&file_name);
                    if !dest.exists() {
                        let _ = fs::copy(entry.path(), &dest);
                    }
                }
            }
        }
    }
    
    for rank in 0..=40 {
        let filename = if rank <= 30 {
            format!("Rank{:02}{}.png", rank, RANK_NAMES[rank])
        } else {
            format!("Rank{}.png", rank)
        };
        let path = icons_dir.join(&filename);
        if !path.exists() {
            let url = format!("{}/masteryicons/{}", base_url, filename);
            if download_file(&client, &url, &path).await.is_ok() {
                downloaded += 1;
            }
        }
    }

    Ok(format!("Downloaded {} media assets", downloaded))
}

/// Return the absolute path to the mastery icons directory.
/// Used by the Mastery screen to construct file:// image URLs.
#[tauri::command]
fn get_mastery_icons_path() -> String {
    resolve_path("data/export/masteryicons").to_string_lossy().to_string()
}

/// Return the absolute path to the maps directory.
/// Used by the Maps screen to construct file:// image URLs.
#[tauri::command]
fn get_maps_path() -> String {
    resolve_path("data/export/maps").to_string_lossy().to_string()
}

/// Return the absolute path to the assets directory.
/// Used to display decorative images in the UI.
#[tauri::command]
fn get_assets_path() -> String {
    resolve_path("data/export/assets").to_string_lossy().to_string()
}

/// Return the Warframe image CDN base URL for loading syndicate/focus icons.
#[tauri::command]
fn get_cdn_base_url() -> String {
    "https://browse.wf".to_string()
}

#[derive(Clone, serde::Serialize)]
struct NotificationPayload {
    id: String,
    title: String,
    message: String,
    image: String,
    position: String,
    persistent: bool,
}

#[tauri::command]
async fn show_relic_overlay(
    app_handle: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    rewards: Value,
    persistent: Option<bool>,
) -> Result<(), String> {
    // Play sound
    let sound = state.notif_sound.lock().unwrap().clone();
    let _ = play_notification_sound(app_handle.clone(), sound).await;

    let app = app_handle.clone();

    let payload = serde_json::json!({
        "rewards": rewards,
        "persistent": persistent.unwrap_or(false)
    });

    // Show and position the relic window first
    let _ = show_overlay_window(app.clone(), "overlay-relic".to_string());

    // Longer delay - window needs time to actually appear and JS to be ready
    tokio::time::sleep(std::time::Duration::from_millis(300)).await;

    app.emit_all("show-relic-rewards", payload)
        .map_err(|e| e.to_string())?;

    // (Rust-side timer for relics removed on Linux, now handled by start_notif_autoclose_timer from frontend)

    Ok(())
}

#[tauri::command]
fn hide_overlay_window(
    app_handle: tauri::AppHandle,
    label: String,
) -> Result<(), String> {
    if let Some(w) = app_handle.get_window(&label) {
        let _ = w.hide();
    }
    Ok(())
}

#[tauri::command]
fn relay_event(app_handle: tauri::AppHandle, event: String, payload: Value) -> Result<(), String> {
    app_handle.emit_all(&event, payload).map_err(|e| e.to_string())
}

#[tauri::command]
fn set_notification_sound(state: tauri::State<'_, AppState>, sound: String) -> Result<(), String> {
    // Update in-memory state
    let mut current = state.notif_sound.lock().unwrap();
    *current = sound.clone();
    
    // Also persist to settings file
    let settings_path = resolve_path("data/user/settings.json");
    let mut settings: Value = if settings_path.exists() {
        let content = std::fs::read_to_string(&settings_path).map_err(|e| e.to_string())?;
        serde_json::from_str(&content).unwrap_or_default()
    } else {
        serde_json::json!({})
    };
    settings["notif_sound"] = serde_json::json!(sound);
    let content = serde_json::to_string_pretty(&settings).map_err(|e| e.to_string())?;
    
    // Ensure directory exists
    if let Some(parent) = settings_path.parent() {
        std::fs::create_dir_all(parent).ok();
    }
    std::fs::write(&settings_path, content).map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
fn show_overlay_window(
    app_handle: tauri::AppHandle,
    label: String,
) -> Result<(), String> {
    overlay_utils::show_window_internal(&app_handle, &label)
}

#[tauri::command]
fn resize_overlay_window(
    app_handle: tauri::AppHandle,
    label: String,
    width: u32,
    height: u32,
) -> Result<(), String> {
    let window = app_handle
        .get_window(&label)
        .ok_or_else(|| format!("window '{}' not found", label))?;

    let monitor = window.primary_monitor()
        .map_err(|e| e.to_string())?
        .ok_or("no primary monitor")?;

    let screen_w = monitor.size().width;
    let _screen_h = monitor.size().height;
    let scale    = monitor.scale_factor();
    let margin   = (16.0 * scale) as i32;

    let phys_w = (width as f64 * scale) as u32;
    let phys_h = (height as f64 * scale) as u32;
    let phys_margin = margin;

    let (x, y) = match label.as_str() {
        "overlay-tl"    => (phys_margin, phys_margin),
        "overlay-tc"    => (((screen_w as i32 - phys_w as i32) / 2), phys_margin),
        "overlay-relic" => {
            let relic_w_f = width as f64 * scale;
            let relic_h_f = height as f64 * scale;
            let margin_f  = 40.0 * scale;

            // Use the monitor the window is currently on
            let mon_size = monitor.size();
            let mon_w = mon_size.width as f64;
            let mon_h = mon_size.height as f64;

            let rx = ((mon_w - relic_w_f) / 2.0).round() as i32;
            let ry = (mon_h - relic_h_f - margin_f).round() as i32;
            eprintln!(
                "[Relic Overlay] Positioning at bottom of monitor: w={}, h={}, x={}, y={}",
                mon_w, mon_h, rx, ry
            );
            (rx, ry)
        }
        _ => (screen_w as i32 - phys_w as i32 - phys_margin, phys_margin),
    };

    if height > 0 {
        let _ = window.set_size(tauri::Size::Physical(tauri::PhysicalSize {
            width: phys_w, height: phys_h,
        }));

        let _ = window.set_position(tauri::Position::Physical(
            tauri::PhysicalPosition { x, y }
        ));

        let _ = window.show();
        let _ = window.set_always_on_top(true);
        // ... rest of the logic ...

        // Platform Specific Fixes
        #[cfg(target_os = "macos")]
        {
            use cocoa::appkit::{NSWindow, NSWindowCollectionBehavior};
            if let Ok(ns_window) = window.ns_window() {
                let id = ns_window as cocoa::base::id;
                unsafe {
                    id.setLevel_(8);
                    id.setCollectionBehavior_(
                        NSWindowCollectionBehavior::NSWindowCollectionBehaviorCanJoinAllSpaces |
                        NSWindowCollectionBehavior::NSWindowCollectionBehaviorFullScreenAuxiliary
                    );
                }
            }
        }
        #[cfg(target_os = "windows")]
        {
        }

        let w = window.clone();
        let is_relic = label.as_str() == "overlay-relic";
        tauri::async_runtime::spawn(async move {
            let ticks = if is_relic { 15 } else { 5 };
            for ms in [20u64, 40, 60, 80, 100, 120, 140, 160, 180, 200, 250, 300, 350, 400, 450, 500] {
                tokio::time::sleep(tokio::time::Duration::from_millis(ms)).await;
                let _ = w.set_always_on_top(true);
            }
            for _ in 0..ticks {
                tokio::time::sleep(tokio::time::Duration::from_millis(1000)).await;
                let _ = w.set_always_on_top(true);
            }
        });
    } else {
        let _ = window.hide();
    }

    Ok(())
}

#[tauri::command]
fn set_ignore_cursor_events(
    app_handle: tauri::AppHandle,
    label: String,
    ignore: bool,
) -> Result<(), String> {
    let window = app_handle
        .get_window(&label)
        .ok_or_else(|| format!("window '{}' not found", label))?;
    window.set_ignore_cursor_events(ignore).map_err(|e| e.to_string())
}

#[tauri::command]
async fn play_notification_sound(app_handle: tauri::AppHandle, sound: String) -> Result<(), String> {
    if sound == "none" {
        return Ok(());
    }

    // Resolve from bundled resources (works in both dev and production)
    let sound_path = app_handle.path_resolver().resolve_resource(&format!("audio/{}", sound));
    
    let path = if let Some(p) = sound_path.filter(|p| p.exists()) {
        p
    } else {
        return Err(format!("Sound file not found: {}", sound));
    };
    
    let path_str = path.to_string_lossy().to_string();
    
    // Play using platform-native audio commands
    tokio::task::spawn_blocking(move || {
        #[cfg(target_os = "windows")]
        {
            use std::os::windows::ffi::OsStrExt;
            
            // Remove \\?\ prefix if present (PlaySound doesn't like it)
            let clean_path = path_str.replace("\\\\?\\", "");
            let wide_path: Vec<u16> = std::ffi::OsStr::new(&clean_path)
                .encode_wide()
                .chain(std::iter::once(0))
                .collect();

            unsafe {
                #[link(name = "winmm")]
                extern "system" {
                    fn PlaySoundW(pszSound: *const u16, hmod: *mut std::ffi::c_void, fdwSound: u32) -> i32;
                }
                const SND_FILENAME: u32 = 0x00020000;
                const SND_ASYNC: u32 = 0x00000001;
                const SND_NODEFAULT: u32 = 0x00000002;
                
                eprintln!("[Audio] Playing via PlaySoundW: {}", clean_path);
                PlaySoundW(wide_path.as_ptr(), std::ptr::null_mut(), SND_FILENAME | SND_ASYNC | SND_NODEFAULT);
            }
        }
        
        #[cfg(target_os = "macos")]
        {
            eprintln!("[Audio] Playing via afplay: {}", path_str);
            let _ = std::process::Command::new("afplay")
                .arg(&path_str)
                .output();
        }
        
        #[cfg(target_os = "linux")]
        {
            eprintln!("[Audio] Playing via native player: {}", path_str);
            let status = std::process::Command::new("paplay")
                .arg(&path_str)
                .status();
            
            if status.is_err() || !status.as_ref().map(|s| s.success()).unwrap_or(false) {
                let _ = std::process::Command::new("aplay")
                    .arg(&path_str)
                    .output();
            }
        }
    }).await.ok();
    
    Ok(())
}

#[tauri::command]
async fn toggle_calibration(app_handle: tauri::AppHandle) -> Result<bool, String> {
    let w = app_handle.get_window("calibration").ok_or("not found")?;
    let visible = w.is_visible().map_err(|e| e.to_string())?;
    if visible { w.hide().map_err(|e| e.to_string())?; }
    else        { w.show().map_err(|e| e.to_string())?; }
    Ok(!visible)
}


/// Show a notification toast. Routes to the correct overlay window by position.
/// Emits 'new-notification' globally; the matching window picks it up.
/// Plays the configured notification sound.
#[tauri::command]
async fn show_notification(
    app_handle: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    id: Option<String>,
    title: String,
    message: String,
    image: Option<String>,
    position: Option<String>,
    persistent: Option<bool>,
) -> Result<(), String> {
    let pos     = position.unwrap_or_else(|| "top-right".to_string());
    let img     = image.unwrap_or_default();
    let persist = persistent.unwrap_or(false);
    let notif_id = id.unwrap_or_else(|| format!("notif-{}", 
        SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_millis()
    ));

    // Determine which window label handles this position
    let label = match pos.as_str() {
        "top-left"   => "overlay-tl",
        "top-center" => "overlay-tc",
        _            => "overlay-tr",
    };

    // If the window was previously hidden, wipe any stale JS state first,
    // then re-show and position it before emitting the event.
    if let Some(w) = app_handle.get_window(label) {
        let was_hidden = !w.is_visible().unwrap_or(true);
        if was_hidden {
            // Wipe stale toasts for this specific position (not all windows)
            let _ = w.emit("wipe-state", pos.clone());
        }
        // Always re-show and position -- window may have moved between calls
        let _ = show_overlay_window(app_handle.clone(), label.to_string());
    }

    // Play sound
    let sound = state.notif_sound.lock().unwrap().clone();
    let _ = play_notification_sound(app_handle.clone(), sound).await;

    // Emit the notification -- the matching overlay window renders it
    app_handle.emit_all("new-notification", NotificationPayload {
        id: notif_id,
        title,
        message,
        image: img,
        position: pos,
        persistent: persist,
    }).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
async fn open_url(app_handle: tauri::AppHandle, url: String) -> Result<(), String> {
    #[cfg(target_os = "linux")]
    {
        use std::process::Command;

        // 1. Sanitize PATH to remove AppImage internal folders.
        let path = std::env::var("PATH").unwrap_or_default();
        let clean_path = path.split(':')
            .filter(|p| !p.contains(".mount_"))
            .collect::<Vec<_>>()
            .join(":");

        let toxic_vars = [
            "APPDIR", "APPIMAGE", "LD_LIBRARY_PATH", "LD_PRELOAD",
            "PYTHONPATH", "QT_PLUGIN_PATH", "GDK_BACKEND",
        ];

        let try_cmd = |cmd: &str, args: &[&str]| -> bool {
            let mut command = Command::new(cmd);
            command.args(args);
            command.env("PATH", &clean_path);
            for var in toxic_vars { command.env_remove(var); }
            matches!(command.status(), Ok(s) if s.success())
        };

        // Method A: Python webbrowser
        if try_cmd("python3", &["-c", "import webbrowser, sys; webbrowser.open(sys.argv[1])", &url]) { return Ok(()); }
        
        // Method B: gio open
        if try_cmd("gio", &["open", &url]) { return Ok(()); }

        // Method C: xdg-open
        if try_cmd("xdg-open", &[&url]) { return Ok(()); }

        // Method D: Portal
        if try_cmd("busctl", &[
            "--user", "call",
            "org.freedesktop.portal.Desktop",
            "/org/freedesktop/portal/desktop",
            "org.freedesktop.portal.OpenURI",
            "OpenURI", "ss", "", &url, "0"
        ]) { return Ok(()); }
    }

    // Fallback
    tauri::api::shell::open(&app_handle.shell_scope(), url, None)
        .map_err(|e| e.to_string())
}

// ─── Log Scanner Commands ───────────────────────────────────────────────────

#[tauri::command]
async fn start_log_scanner(app: tauri::AppHandle, state: tauri::State<'_, AppState>, path: String) -> Result<(), String> {
    use std::path::PathBuf;
    let path_buf = PathBuf::from(&path);
    if !path_buf.exists() {
        return Err("Log file does not exist".to_string());
    }
    
    let mut scanner_lock = state.log_scanner.lock().unwrap();
    let mut path_lock = state.log_scanner_path.lock().unwrap();
    
    let existing = path_lock.as_ref().map(|s| s.as_str()).unwrap_or("");
    let is_same = scanner_lock.is_some() && existing == path;
    eprintln!("[LOG_SCANNER] start called path={}, existing={}, is_same={}", path, existing, is_same);
    
    if is_same {
        return Ok(());
    }
    
    *scanner_lock = None;
    *path_lock = Some(path.clone());
    drop(path_lock);
    drop(scanner_lock);
    
    let handle = match log_scanner::spawn_log_watcher(app, path_buf) {
        Ok(h) => h,
        Err(e) => {
            crate::log_scanner::stop_scanner();
            return Err(e);
        }
    };
    let mut scanner_lock = state.log_scanner.lock().unwrap();
    *scanner_lock = Some(handle);
    
    Ok(())
}

#[tauri::command]
async fn stop_log_scanner(state: tauri::State<'_, AppState>) -> Result<(), String> {
    let mut scanner_lock = state.log_scanner.lock().unwrap();
    *scanner_lock = None;
    crate::log_scanner::stop_scanner();
    Ok(())
}

#[tauri::command]
async fn validate_log_path(path: String) -> Result<serde_json::Value, String> {
    use std::io::Read;
    use std::path::PathBuf;
    
    let path_buf = PathBuf::from(path);
    if !path_buf.exists() {
        return Ok(serde_json::json!({ "valid": false, "reason": "File not found" }));
    }
    
    let mut file = std::fs::File::open(&path_buf).map_err(|e| e.to_string())?;
    let mut head = [0u8; 1024];
    let _ = file.read(&mut head);
    let s = String::from_utf8_lossy(&head);
    
    if s.contains("Sys [Info]:") || s.contains("Game [Info]:") {
        Ok(serde_json::json!({ "valid": true }))
    } else {
        Ok(serde_json::json!({ "valid": false, "reason": "Invalid log format" }))
    }
}

#[tauri::command]
fn is_scanning() -> bool {
    crate::log_scanner::is_scanning()
}

#[tauri::command]
async fn simulate_fissure_event(app: tauri::AppHandle) -> Result<(), String> {
    use crate::log_scanner::{FissureEvent, RelicInfo};
    use tokio::time::{sleep, Duration};

    // 1. Relic Phase
    app.emit_all("fissure-relic-phase", FissureEvent {
        event_type: "relic_phase_start".to_string(),
        squad_relics: vec![
            RelicInfo { unique_name: "/Lotus/Types/Game/Projections/T1VoidProjectionGaussPrimeBBronze".to_string(), tier: "Lith".to_string(), refinement: "Intact".to_string(), era: "Lith".to_string() },
            RelicInfo { unique_name: "/Lotus/Types/Game/Projections/T2VoidProjectionSevagothPrimeCBronze".to_string(), tier: "Meso".to_string(), refinement: "Intact".to_string(), era: "Meso".to_string() },
            RelicInfo { unique_name: "/Lotus/Types/Game/Projections/T3VoidProjectionHarrowPrimePBronze".to_string(), tier: "Neo".to_string(), refinement: "Intact".to_string(), era: "Neo".to_string() },
            RelicInfo { unique_name: "/Lotus/Types/Game/Projections/T4VoidProjectionKhoraPrimeBBronze".to_string(), tier: "Axi".to_string(), refinement: "Intact".to_string(), era: "Axi".to_string() },
        ],
        local_reward: None,
        squad_size: 4,
        void_tier: Some("VoidT3".to_string()),
    }).unwrap_or_default();

    sleep(Duration::from_millis(500)).await;

    // 2. Reward Phase
    app.emit_all("fissure-reward-phase", FissureEvent {
        event_type: "reward_phase".to_string(),
        squad_relics: vec![],
        local_reward: Some("/Lotus/StoreItems/Types/Recipes/Weapons/BroncoPrimeBlueprint".to_string()),
        squad_size: 4,
        void_tier: Some("VoidT3".to_string()),
    }).unwrap_or_default();

    Ok(())
}

#[tauri::command]
fn start_notif_autoclose_timer(app_handle: tauri::AppHandle, id: serde_json::Value, seconds: u64) {
    let id_str = match id {
        serde_json::Value::String(s) => s,
        serde_json::Value::Number(n) => n.to_string(),
        _ => return,
    };
    std::thread::spawn(move || {
        std::thread::sleep(std::time::Duration::from_secs(seconds));
        let _ = app_handle.emit_all("expire-notification", id_str);
    });
}

/// Save a JSON settings object to data/user/settings.json.
#[tauri::command]
async fn save_settings(settings: Value) -> Result<(), String> {
    let settings_dir = resolve_path("data/user");
    if !settings_dir.exists() {
        fs::create_dir_all(&settings_dir).map_err(|e| e.to_string())?;
    }
    let content = serde_json::to_string_pretty(&settings).map_err(|e| e.to_string())?;
    fs::write(settings_dir.join("settings.json"), content).map_err(|e| e.to_string())
}

/// Load the JSON settings object from data/user/settings.json.
/// Returns an empty object if the file doesn't exist.
#[tauri::command]
async fn load_settings() -> Result<Value, String> {
    let path = resolve_path("data/user/settings.json");
    if !path.exists() {
        return Ok(serde_json::json!({}));
    }
    let content = fs::read_to_string(path).map_err(|e| e.to_string())?;
    serde_json::from_str(&content).map_err(|e| e.to_string())
}

// ─── Entry Point ──────────────────────────────────────────────────────────────

fn main() {
    // Load settings at startup to get saved notif_sound and notif_position
    let saved_settings = std::fs::read_to_string(resolve_path("data/user/settings.json"))
        .ok()
        .and_then(|s| serde_json::from_str::<Value>(&s).ok())
        .unwrap_or_default();
    
    let saved_sound = saved_settings.get("notif_sound")
        .and_then(|v| v.as_str())
        .unwrap_or("notification1.wav");
    
    // Fix xcap screen capture on Linux inside AppImage:
    // When run from an AppImage, the usual env-var workarounds for WebKit / Mesa
    // are not set automatically.  Set them here so xcap always gets a working
    // software-renderer path and GDK_BACKEND is forced to X11.
    #[cfg(target_os = "linux")]
    {
        std::env::set_var("LIBGL_ALWAYS_SOFTWARE", "1");
        std::env::set_var("WEBKIT_DISABLE_COMPOSITING_MODE", "1");
        // Only set GDK_BACKEND if not already overridden by the user
        if std::env::var("GDK_BACKEND").is_err() {
            std::env::set_var("GDK_BACKEND", "x11");
        }
    }
    tauri::Builder::default()
        .manage(AppState {
            notif_sound: Arc::new(Mutex::new(saved_sound.to_string())),
            log_scanner: Arc::new(Mutex::new(None)),
            log_scanner_path: Arc::new(Mutex::new(None)),
            ocr_wordlist_path: Arc::new(Mutex::new(None)),
        })
        .on_window_event(|event| match event.event() {
            tauri::WindowEvent::CloseRequested { api, .. } => {
                if event.window().label() == "main" {
                    std::process::exit(0);
                } else {
                    let _ = event.window().hide();
                    api.prevent_close();
                }
            }
            _ => {}
        })
        .setup(|app| {
            let _ = app.get_window("main").unwrap();
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // --- data ---
            load_cached_inventory,
            call_api_helper,
            check_exports,
            check_media_assets,
            load_all_exports,
            load_txt_file,
            // --- notes ---
            list_notes,
            read_note,
            save_note,
            delete_note,
            // --- misc ---
            open_data_folder,
            get_mastery_icons_path,
            get_maps_path,
            get_assets_path,
            get_cdn_base_url,
            // --- log scanner ---
            start_log_scanner,
            stop_log_scanner,
            validate_log_path,
            is_scanning,
            simulate_fissure_event,
            crate::ocr::save_debug_screenshot,
            crate::ocr::start_debug_ocr_session,
            crate::ocr::write_ocr_wordlist,
            // --- overlay ---
            show_notification,
            show_relic_overlay,
            show_overlay_window,
            hide_overlay_window,
            resize_overlay_window,
            set_ignore_cursor_events,
            play_notification_sound,
            set_notification_sound,
            start_notif_autoclose_timer,
            relay_event,
            open_url,
            save_settings,
            load_settings,
            log_terminal,
            // --- calibration ---
            toggle_calibration,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}