// Hide the console window on Windows release builds.
#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};
use serde_json::Value;
use std::fs;
use tauri::Manager;
use tauri::api::shell;
use std::io::BufReader;
use std::sync::{Arc, Mutex};
use rodio::{Decoder, OutputStream, Sink};

pub struct AppState {
    pub notif_sound: Arc<Mutex<String>>,
}

// ─── Path Resolution ──────────────────────────────────────────────────────────
//
// In dev builds, paths are resolved relative to the Cargo manifest directory so
// that assets sit alongside the source tree.  In release builds they're resolved
// relative to the executable so the installed app is self-contained.
// When running from an AppImage, the mounted FS is read-only, but the APPIMAGE
// env var points to the real file — we use its parent dir for writable data so
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
    let _ = play_notification_sound(app_handle.clone(), sound);

    let payload = serde_json::json!({
        "rewards": rewards,
        "persistent": persistent.unwrap_or(false)
    });

    // Show and position the relic window
    let _ = show_overlay_window(app_handle.clone(), "overlay-relic".to_string());

    app_handle.emit_all("show-relic-rewards", payload)
        .map_err(|e| e.to_string())?;

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
fn set_notification_sound(state: tauri::State<'_, AppState>, sound: String) -> Result<(), String> {
    let mut current = state.notif_sound.lock().unwrap();
    *current = sound;
    Ok(())
}

#[tauri::command]
fn show_overlay_window(
    app_handle: tauri::AppHandle,
    label: String,
) -> Result<(), String> {
    let window = app_handle
        .get_window(&label)
        .ok_or_else(|| format!("window '{}' not found", label))?;

    let monitor = window.primary_monitor()
        .map_err(|e| e.to_string())?
        .ok_or("no primary monitor")?;

    let screen_w = monitor.size().width;
    let screen_h = monitor.size().height;
    let scale    = monitor.scale_factor();
    let margin   = (16.0 * scale) as i32;

    // Fixed widths for standard overlays (centered internally in JS)
    let log_w = match label.as_str() {
        "overlay-relic" => 640u32,
        _ => 440u32,
    };
    
    let phys_w = (log_w as f64 * scale) as u32;
    let phys_h = screen_h; 

    let phys_margin = margin;

    let (x, y) = match label.as_str() {
        "overlay-tl"    => (phys_margin, phys_margin),
        "overlay-tc"    => (((screen_w as i32 - phys_w as i32) / 2), phys_margin),
        "overlay-relic" => {
            let relic_w = (640.0 * scale) as u32;
            let relic_h = (260.0 * scale) as u32;
            let rx = (screen_w as i32 - relic_w as i32) / 2;
            let ry = screen_h as i32 - relic_h as i32 - phys_margin;
            let _ = window.set_size(tauri::Size::Physical(tauri::PhysicalSize {
                width: relic_w, height: relic_h,
            }));
            let _ = window.set_position(tauri::Position::Physical(
                tauri::PhysicalPosition { x: rx, y: ry }
            ));
            let _ = window.show();
            let _ = window.set_always_on_top(true);
            let _ = window.set_ignore_cursor_events(true);

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

            let wr = window.clone();
            tauri::async_runtime::spawn(async move {
                // High-frequency re-assertion for the first 500ms
                for ms in [20u64, 40, 60, 80, 100, 120, 140, 160, 180, 200, 250, 300, 350, 400, 450, 500] {
                    tokio::time::sleep(tokio::time::Duration::from_millis(ms)).await;
                    let _ = wr.set_always_on_top(true);
                }
                // Periodic re-assertion for the remaining duration
                for _ in 0..15 {
                    tokio::time::sleep(tokio::time::Duration::from_millis(1000)).await;
                    let _ = wr.set_always_on_top(true);
                }
            });
            return Ok(());
        }
        _ => (screen_w as i32 - phys_w as i32 - phys_margin, phys_margin), // overlay-tr
    };

    let _ = window.set_size(tauri::Size::Physical(tauri::PhysicalSize {
        width: phys_w, height: phys_h,
    }));

    let _ = window.set_position(tauri::Position::Physical(
        tauri::PhysicalPosition { x, y }
    ));

    let _ = window.show();
    let _ = window.set_always_on_top(true);
    let _ = window.set_ignore_cursor_events(true);
    let _ = window.set_skip_taskbar(true);

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

    Ok(())
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
    let screen_h = monitor.size().height;
    let scale    = monitor.scale_factor();
    let margin   = (16.0 * scale) as i32;

    let phys_w = (width as f64 * scale) as u32;
    let phys_h = (height as f64 * scale) as u32;
    let phys_margin = margin;

    let (x, y) = match label.as_str() {
        "overlay-tl"    => (phys_margin, phys_margin),
        "overlay-tc"    => (((screen_w as i32 - phys_w as i32) / 2), phys_margin),
        "overlay-relic" => {
            let rx = (screen_w as i32 - phys_w as i32) / 2;
            let ry = screen_h as i32 - phys_h as i32 - phys_margin;
            (rx, ry)
        }
        _ => (screen_w as i32 - phys_w as i32 - phys_margin, phys_margin),
    };

    let _ = window.set_size(tauri::Size::Physical(tauri::PhysicalSize {
        width: phys_w, height: phys_h,
    }));

    let _ = window.set_position(tauri::Position::Physical(
        tauri::PhysicalPosition { x, y }
    ));

    if height > 0 {
        let _ = window.show();
        let _ = window.set_always_on_top(true);

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
fn play_notification_sound(app_handle: tauri::AppHandle, sound: String) -> Result<(), String> {
    if sound == "none" {
        return Ok(());
    }

    let resource_path = app_handle.path_resolver()
        .resolve_resource(format!("audio/{}", sound))
        .ok_or_else(|| format!("Could not find sound file: {}", sound))?;

    std::thread::spawn(move || {
        match OutputStream::try_default() {
            Ok((_stream, stream_handle)) => {
                match Sink::try_new(&stream_handle) {
                    Ok(sink) => {
                        match fs::File::open(&resource_path) {
                            Ok(file) => {
                                match Decoder::new(BufReader::new(file)) {
                                    Ok(source) => {
                                        sink.append(source);
                                        sink.sleep_until_end();
                                    }
                                    Err(e) => eprintln!("Audio decoder error: {}", e),
                                }
                            }
                            Err(e) => eprintln!("Audio file error: {}", e),
                        }
                    }
                    Err(e) => eprintln!("Audio sink error: {}", e),
                }
            }
            Err(e) => eprintln!("Audio output error: {}", e),
        }
    });

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
        // Always re-show and position — window may have moved between calls
        let _ = show_overlay_window(app_handle.clone(), label.to_string());
    }

    // Play sound
    let sound = state.notif_sound.lock().unwrap().clone();
    let _ = play_notification_sound(app_handle.clone(), sound);

    // Emit the notification — the matching overlay window renders it
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

// ─── Entry Point ──────────────────────────────────────────────────────────────

fn main() {
    tauri::Builder::default()
        .manage(AppState {
            notif_sound: Arc::new(Mutex::new("notification1.ogg".to_string())),
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
            // Get the main window
            let main_window = app.get_window("main").unwrap();

            // Set up on_navigation for the main window's webview
            main_window.on_navigation(|url| {
                let url_str = url.as_str();
                let is_internal_tauri = url_str.starts_with("tauri://");
                let is_internal_localhost_http = url_str.starts_with("http://localhost");
                let is_internal_localhost_https = url_str.starts_with("https://localhost");

                if !is_internal_tauri && !is_internal_localhost_http && !is_internal_localhost_https {
                    // It's an external URL, open in default browser
                    if let Err(e) = shell::open(&main_window.shell_scope(), url_str, None) {
                        eprintln!("Failed to open external URL {}: {}", url_str, e);
                    }
                    // Prevent navigation in webview
                    false
                } else {
                    // Allow navigation for internal Tauri URLs or localhost (dev server) URLs
                    true
                }
            });
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
            // --- overlay ---
            show_notification,
            show_relic_overlay,
            show_overlay_window,
            hide_overlay_window,
            resize_overlay_window,
            set_ignore_cursor_events,
            play_notification_sound,
            set_notification_sound,
            // --- calibration ---
            toggle_calibration,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}