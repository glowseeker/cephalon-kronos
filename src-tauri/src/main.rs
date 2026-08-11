// Hide the console window on Windows release builds.
#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};
use std::fs;
use tauri::{AppHandle, Emitter, Listener, Manager};
use std::io::Cursor;
use tauri::webview::{WebviewBuilder};
use tauri::WebviewUrl;
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::{Arc, Mutex};
use serde_json::Value;
use serde::Serialize;

mod log_scanner;
mod ocr;
mod ocr_engine;
mod overlay_utils;
mod logger;
mod pricer;
mod mem_reader;

mod memory_scan;
mod weapon_i18n;

#[derive(Clone, Serialize)]
pub struct WikiTabInfo {
    pub id: String,
    pub url: String,
    pub title: String,
}

pub struct AppState {
    pub notif_sound: Arc<Mutex<String>>,
    pub log_scanner: Arc<Mutex<Option<log_scanner::LogScannerHandle>>>,
    pub active_relic_data: Arc<Mutex<Option<serde_json::Value>>>,
    pub target_monitor: Arc<Mutex<Option<usize>>>,
    pub sidebar_saved: Arc<Mutex<SidebarSavedState>>,
    pub sidebar_last_op: Arc<AtomicU64>,
    pub monitoring_active: Arc<AtomicBool>,
    pub active_wiki_tab: Arc<parking_lot::Mutex<std::collections::HashMap<String, String>>>,
    pub wiki_tabs: parking_lot::Mutex<Vec<WikiTabInfo>>,
    pub main_window_monitor: parking_lot::Mutex<Option<tauri::Monitor>>,
}

#[derive(Default, Clone)]
pub struct SidebarSavedState {
    pub active: bool,
    pub side: Option<String>,
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
    pub mon_x: i32,
    pub mon_y: i32,
    pub mon_w: u32,
    pub mon_h: u32,
}

// --- Path Resolution ---
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
/// Portable on all platforms -- data always lives next to the app.
/// - AppImage: directory containing the .AppImage file
/// - macOS .app: directory containing the .app bundle
/// - Everything else: directory containing the binary
pub fn get_data_root() -> PathBuf {
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
    app_handle.path().resolve(relative, tauri::path::BaseDirectory::Resource).ok()
}

/// Simple command to proxy frontend logs to the terminal/stdout.
#[tauri::command]
fn log_terminal(message: String) {
    eprintln!("[JS] {}", message);
}

// --- Export Management ---
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
    "ExportAvionics.json",
    "ExportArcanes.json",
    "ExportResources.json",
    "ExportRelics.json",
    "ExportRewards.json",
    "ExportChallenges.json",
    "ExportRegions.json",
    "ExportNightwave.json",
    "ExportSyndicates.json",
    "ExportBoosterPacks.json",
    "ExportBundles.json",
    "ExportRecipes.json",
    "ExportCustoms.json",
    "ExportGear.json",
    "ExportImages.json",
    "ExportTextIcons.json",
    "ExportFlavour.json",
    "dict.json",
    "supp-dict.json",
    "dict.en.json",
];

const BASE_URL: &str =
    "https://raw.githubusercontent.com/calamity-inc/warframe-public-export-plus/master";

// TXT files are optional - download failures are non-fatal.
const TXT_FILES: &[(&str, &str)] = &[
    ("arbys.txt",         "https://browse.wf/arbys.txt"),
    ("sp-incursions.txt", "https://browse.wf/sp-incursions.txt"),
];
// DE public manifest files (locale-specific ExportUpgrades/ExportAvionics)
// are fetched from content.warframe.com/PublicExport/Manifest/ via the
// index_{locale}.txt.lzma index which contains filename+contentHash pairs.
// These give us localized levelStats for mod descriptions (the GitHub mirror
// only ships English). ExportAvionics is not in the DE manifest, so it stays
// English-only (see v0.8 MOD_STAT_TRANSLATIONS plan).
const DE_MANIFEST_BASE: &str = "https://content.warframe.com/PublicExport";

/// Fetch the DE manifest index for `locale`, extract the contentHash for
/// `ExportUpgrades_{locale}.json`, and download that file to the export dir.
/// Returns true if the file was successfully written. Failures are non-fatal
/// (falls back to English _fixed.json stat descriptions).
async fn download_locale_upgrades(client: &reqwest::Client, export_dir: &std::path::Path, locale: &str) -> Result<(), String> {
    let index_url = format!("{}/index_{}.txt.lzma", DE_MANIFEST_BASE, locale);
    let index_resp = client.get(&index_url).send().await.map_err(|e| e.to_string())?;
    if !index_resp.status().is_success() {
        return Err(format!("DE manifest index for {} returned HTTP {}", locale, index_resp.status()));
    }
    let index_bytes = index_resp.bytes().await.map_err(|e| e.to_string())?;
    let index_text = decompress_lzma(&index_bytes).map_err(|e| format!("LZMA decompress index: {}", e))?;

    // Format: "ExportUpgrades_de.json!00_<contentHash>" per line
    let target_file = format!("ExportUpgrades_{}.json", locale);
    let line = index_text.lines()
        .find(|l| l.starts_with(&target_file))
        .ok_or_else(|| format!("{} not found in manifest index", target_file))?;
    let line = line.trim();

    let dest = export_dir.join(&target_file);
    let file_url = format!("{}/Manifest/{}", DE_MANIFEST_BASE, line);
    download_file(client, &file_url, &dest).await?;
    Ok(())
}

// Drop data (warframe-drop-data) is an extra JSON file from a different source.
// It's refreshed once per day like the main exports.
const DROPDATA_FILES: &[(&str, &str)] = &[
    ("DropsAll.json", "https://drops.warframestat.us/data/all.json"),
];

// --- Shared Download Helper ---

/// Download a file from `url` and write it to `dest` atomically.
/// Writes to a `.tmp` sibling first, then renames into place so concurrent
/// readers never see a torn/incomplete write (fixes a cross-window race
/// between `check_exports` writing and `sidebar_load_data` reading).
/// When the destination has a `.json` extension the content is validated
/// as valid JSON before the rename, so network-truncated garbage is never
/// atomically committed.
/// Returns `Ok(true)` on success, or an error string on failure.
async fn download_file(client: &reqwest::Client, url: &str, dest: &std::path::Path) -> Result<bool, String> {
    let resp = client.get(url).send().await.map_err(|e| e.to_string())?;
    if !resp.status().is_success() {
        return Err(format!("HTTP {} for {}", resp.status(), url));
    }
    let bytes = resp.bytes().await.map_err(|e| e.to_string())?;

    let tmp = dest.with_extension("tmp");
    fs::write(&tmp, &bytes).map_err(|e| e.to_string())?;

    // Validate JSON before committing the rename
    if dest.extension().and_then(|e| e.to_str()) == Some("json") {
        serde_json::from_slice::<serde_json::Value>(&bytes)
            .map_err(|e| format!("Invalid JSON in downloaded {}: {}", url, e))?;
    }

    fs::rename(&tmp, dest).map_err(|e| e.to_string())?;
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
/// Decompress raw LZMA-compressed bytes (the DE manifest index is .txt.lzma).
/// Returns the decompressed text.
fn decompress_lzma(bytes: &[u8]) -> Result<String, String> {
    use std::io::Read;
    let mut decoder = xz2::read::XzDecoder::new_multi_decoder(bytes);
    let mut out = Vec::new();
    decoder.read_to_end(&mut out).map_err(|e| e.to_string())?;

    String::from_utf8(out).map_err(|e| format!("manifest index not UTF-8: {}", e))
}

// --- Tauri Commands ---
//
// All functions marked `#[tauri::command]` are callable from the frontend via
// `invoke('command_name', args)`.  See MonitoringContext.jsx for the primary
// call sites.

/// Download or refresh all game data exports (JSON + TXT).
/// Called by MonitoringContext on startup and on each monitoring cycle.
/// JSON exports are refreshed every 24 h; TXT files every 6 h.
/// Pass `force: true` to skip the age check and re-download all.
#[tauri::command]
async fn check_exports(locale: String, force: Option<bool>) -> Result<String, String> {
    let force = force.unwrap_or(false);
    let export_dir = resolve_path("data/export");
    if !export_dir.exists() {
        fs::create_dir_all(&export_dir).map_err(|e| e.to_string())?;
    }

    // Clean up old locale-specific filenames if they exist
    // (dict.en.json is now a real asset — the English reference dict used to
    //  resolve English item names for image lookups — so it is kept.)
    for old in &["supp-dict-en.json"] {
        let old_path = export_dir.join(old);
        let _ = fs::remove_file(&old_path);
    }

    let client = reqwest::Client::new();
    let mut updated_count = 0u32;

    // Locale-dependent files (the game dict and locale manifest upgrades) are
    // downloaded into locale-neutral filenames (dict.json, ExportUpgrades_{locale}.json).
    // The dict.json on disk is normally overwritten with the current locale's content,
    // but the app bundle ships an English dict.json as a default. We must force a
    // re-fetch whenever the active locale changes, otherwise game-sourced strings
    // (location names, syndicate names, etc.) keep rendering in English even though
    // the UI locale is, e.g., 'de'. A tiny ".dict-locale" marker records which locale
    // the current dict.json was downloaded for.
    let marker_path = export_dir.join(".dict-locale");
    let disk_locale: Option<String> = fs::read_to_string(&marker_path).ok().map(|s| s.trim().to_string());
    let locale_changed = disk_locale.as_deref() != Some(locale.as_str());

    // JSON exports - refresh once per day
    for file_name in EXPORT_FILES {
        let path = export_dir.join(file_name);
        let is_locale_file = matches!(*file_name, "dict.json" | "supp-dict.json");
        let needs_update = force || !path.exists() || file_age_secs(&path) > 86_400 || (is_locale_file && locale_changed);

        if needs_update {
            let url = match *file_name {
                "dict.json" => format!("{}/dict.{}.json", BASE_URL, locale),
                "supp-dict.json" => format!("https://oracle.browse.wf/dicts/{}.json", locale),
                _ => format!("{}/{}", BASE_URL, file_name),
            };
            download_file(&client, &url, &path).await.map_err(|e| {
                format!("Failed to download {}: {}", file_name, e)
            })?;
            // Record which locale this locale-neutral file was fetched for, so a
            // locale switch forces a re-fetch on the next check_exports run.
            if matches!(*file_name, "dict.json" | "supp-dict.json") {
                let _ = fs::write(&marker_path, &locale);
            }
            updated_count += 1;
        }
    }

    // DE public manifest: locale-specific ExportUpgrades_{locale}.json gives us
    // localized mod descriptions (levelStats). English uses the same manifest
    // file (ExportUpgrades_en.json), which supersedes the bundled
    // ExportUpgrades_fixed.json patch (retired in v0.8).
    let locale_path = export_dir.join(format!("ExportUpgrades_{}.json", locale));
    let needs_update = force || !locale_path.exists() || file_age_secs(&locale_path) > 86_400;
    if needs_update {
        match download_locale_upgrades(&client, &export_dir, &locale).await {
            Ok(_) => updated_count += 1,
            Err(e) => eprintln!("Warning: could not download DE locale upgrades: {}", e),
        }
    }
    // TXT data files - refresh every 6 hours; failures are non-fatal
    for (file_name, url) in TXT_FILES {
        let path = export_dir.join(file_name);
        let needs_update = force || !path.exists() || file_age_secs(&path) > 21_600;

        if needs_update {
            match download_file(&client, url, &path).await {
                Ok(_) => updated_count += 1,
                Err(e) => eprintln!("Warning: could not download {}: {}", file_name, e),
            }
        }
    }

    // Drop data files (warframe-drop-data) - refresh every 24 hours; non-fatal
    for (file_name, url) in DROPDATA_FILES {
        let path = export_dir.join(file_name);
        let needs_update = force || !path.exists() || file_age_secs(&path) > 86_400;

        if needs_update {
            match download_file(&client, url, &path).await {
                Ok(_) => updated_count += 1,
                Err(e) => eprintln!("Warning: could not download {}: {}", file_name, e),
            }
        }
    }

    Ok(format!("Updated {} files", updated_count))
}

/// Download the riven pricing ONNX model and vocab files if not already cached.
/// Unlike OCR models these ship in the repo (not from a third-party), but they
/// are large enough that bundling bloats every release, so we just fetch them
/// on first run like we do for OCR.
#[tauri::command]
async fn check_pricer_models() -> Result<String, String> {
    let models_dir = crate::pricer::get_models_dir();
    if !models_dir.exists() {
        std::fs::create_dir_all(&models_dir).map_err(|e| e.to_string())?;
    }
    let base = "https://raw.githubusercontent.com/glowseeker/cephalon-kronos/master/src-tauri/data/bin/pricer-models";
    let files = &[
        "price_model.onnx",
        "weapon_vocab.json",
        "attr_vocab.json",
        "items_data.json",
        "attribute_name_shortcuts.json",
        "effect_to_url_name.json",
        "weapon_ranking_information.json",
        "global_price_freq.json",
    ];
    let client = reqwest::Client::new();
    let mut downloaded = 0u32;
    for file in files {
        let path = models_dir.join(file);
        if !path.exists() {
            let url = format!("{}/{}", base, file);
            download_file(&client, &url, &path).await.map_err(|e| {
                format!("Failed to download pricer model {}: {}", file, e)
            })?;
            downloaded += 1;
        }
    }
    Ok(format!("Downloaded {} pricer model files", downloaded))
}

/// Download PP-OCRv5 models for ocr-rs if not already cached.
#[tauri::command]
async fn check_ocr_models() -> Result<String, String> {
    let models_dir = crate::ocr_engine::models_dir();
    if !models_dir.exists() {
        std::fs::create_dir_all(&models_dir).map_err(|e| e.to_string())?;
    }
    let rec_path = models_dir.join("PP-OCRv5_mobile_rec.mnn");
    let keys_path = models_dir.join("ppocr_keys_v5.txt");
    let mut downloaded = 0u32;
    let client = reqwest::Client::new();
    let base = "https://raw.githubusercontent.com/zibo-chen/rust-paddle-ocr/main/models";
    let det_path = models_dir.join("PP-OCRv5_mobile_det.mnn");
    if !det_path.exists() {
        let url = format!("{}/PP-OCRv5_mobile_det.mnn", base);
        download_file(&client, &url, &det_path).await.map_err(|e| {
            format!("Failed to download PP-OCRv5 detection model: {}", e)
        })?;
        downloaded += 1;
    }
    if !rec_path.exists() {
        let url = format!("{}/PP-OCRv5_mobile_rec.mnn", base);
        download_file(&client, &url, &rec_path).await.map_err(|e| {
            format!("Failed to download PP-OCRv5 recognition model: {}", e)
        })?;
        downloaded += 1;
    }
    if !keys_path.exists() {
        let url = format!("{}/ppocr_keys_v5.txt", base);
        download_file(&client, &url, &keys_path).await.map_err(|e| {
            format!("Failed to download PP-OCRv5 charset: {}", e)
        })?;
        downloaded += 1;
    }
    Ok(format!("Downloaded {} OCR model files", downloaded))
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

// --- Inventory Management ---
//
// Inventory is fetched by scanning Warframe process memory for the auth token
// (memory_scan::scan_auth), then calling mobile.warframe.com via reqwest.
// The result is cached at data/user/inventory.json.

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

/// Scan Warframe process memory for the auth token, then fetch inventory from
/// mobile.warframe.com.
#[tauri::command]
async fn call_api_helper(_app_handle: tauri::AppHandle) -> Result<Value, String> {
    // Find Warframe PID on a blocking thread (reads /proc or uses Win32 API).
    let pid = tokio::task::spawn_blocking(move || {
        crate::log_scanner::get_warframe_pid()
    })
    .await
    .map_err(|e| format!("Task join error: {e}"))?
    .ok_or_else(|| "Warframe not running".to_string())?;

    // Scan process memory for auth token (blocking I/O).
    let authz = tokio::task::spawn_blocking(move || {
        crate::memory_scan::scan_auth(pid)
    })
    .await
    .map_err(|e| format!("Scan task error: {e}"))?
    .ok_or_else(|| "Could not find auth token in Warframe memory - try logging in first".to_string())?;

    eprintln!("[inventory] auth token found, fetching inventory...");

    // Fetch inventory from Warframe's mobile API.
    let url = format!("https://mobile.warframe.com/api/inventory.php{authz}");
    let client = reqwest::Client::new();
    let resp = client.get(&url).send().await.map_err(|e| e.to_string())?;
    let body = resp.bytes().await.map_err(|e| e.to_string())?;

    let value: Value = serde_json::from_slice(&body)
        .map_err(|e| format!("Invalid JSON from mobile API: {e}"))?;

    // Bare {} means the API returned nothing useful.
    if let Value::Object(ref obj) = value {
        if obj.len() < 5 {
            return Err("Empty inventory from API - not logged into Warframe?".to_string());
        }
    }

    // Save to disk for cache.
    let inv_dir = crate::resolve_path("data/user");
    if !inv_dir.exists() {
        fs::create_dir_all(&inv_dir).map_err(|e| e.to_string())?;
    }
    let inv_path = inv_dir.join("inventory.json");
    fs::write(&inv_path, &body).map_err(|e| e.to_string())?;

    Ok(value)
}

/// Load all JSON export files into a single JSON object keyed by file stem
/// (e.g. `{ "ExportWeapons": [...], "ExportWarframes": [...], ... }`).
/// Called by MonitoringContext once on startup; passed to inventoryParser.js.
#[tauri::command]
async fn load_all_exports(app_handle: tauri::AppHandle, locale: String) -> Result<Value, String> {
    let export_dir = resolve_path("data/export");

    // Pre-resolve all paths (fast metadata ops, non-blocking)
    let entries: Vec<(String, PathBuf)> = EXPORT_FILES.iter()
        .filter_map(|file_name| {
            let path = export_dir.join(file_name);
            let resolved = if path.exists() {
                path
            } else if let Some(bundled) = resolve_bundled_path(&app_handle, &format!("data/export/{}", file_name)) {
                if bundled.exists() { bundled } else { return None }
            } else {
                return None
            };
            Some((file_name.trim_end_matches(".json").to_string(), resolved))
        })
        .collect();

    // Concurrent I/O via tokio blocking thread pool
    let handles: Vec<_> = entries.into_iter().map(|(key, path)| {
        tokio::task::spawn_blocking(move || -> Result<(String, Value), String> {
            let file = fs::File::open(&path).map_err(|e| e.to_string())?;
            let json: Value = serde_json::from_reader(std::io::BufReader::new(file))
                .map_err(|e| e.to_string())?;
            Ok((key, json))
        })
    }).collect();

    let mut result = serde_json::Map::new();
    for handle in handles {
        let (key, json) = handle.await.map_err(|e| e.to_string())??;
        result.insert(key, json);
    }

    // Drop data files (warframe-drop-data) - loaded under their stem key
    let drop_entries: Vec<(String, PathBuf)> = DROPDATA_FILES.iter()
        .filter_map(|(file_name, _url)| {
            let path = export_dir.join(file_name);
            if !path.exists() { return None; }
            Some((file_name.trim_end_matches(".json").to_string(), path))
        })
        .collect();

    let drop_handles: Vec<_> = drop_entries.into_iter().map(|(key, path)| {
        tokio::task::spawn_blocking(move || -> Result<(String, Value), String> {
            let file = fs::File::open(&path).map_err(|e| e.to_string())?;
            let json: Value = serde_json::from_reader(std::io::BufReader::new(file))
                .map_err(|e| e.to_string())?;
            Ok((key, json))
        })
    }).collect();

    for handle in drop_handles {
        let (key, json) = handle.await.map_err(|e| e.to_string())??;
        result.insert(key, json);
    }

    // Locale-specific ExportUpgrades from DE public manifest (localized levelStats).
    // Keyed as "ExportUpgradesLocalized" so the frontend merges it over English.
    let locale_file = format!("ExportUpgrades_{}.json", locale);
    let locale_path = export_dir.join(&locale_file);
    if locale_path.exists() {
        let locale_handle = tokio::task::spawn_blocking(move || -> Result<(String, Value), String> {
            let file = fs::File::open(&locale_path).map_err(|e| e.to_string())?;
            let json: Value = serde_json::from_reader(std::io::BufReader::new(file))
                .map_err(|e| e.to_string())?;
            Ok(("ExportUpgradesLocalized".to_string(), json))
        });
        let (lk, lv) = locale_handle.await.map_err(|e| e.to_string())??;
        result.insert(lk, lv);
    }

    Ok(Value::Object(result))
}

// --- Notes Management ---
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

/// Opens the notes directory in the system file manager.
#[tauri::command]
async fn open_notes_folder() -> Result<(), String> {
    let path = resolve_path("data/user/notes");
    #[cfg(target_os = "windows")]
    { std::process::Command::new("explorer").arg(&path).spawn().map_err(|e| e.to_string())?; }
    #[cfg(target_os = "linux")]
    { std::process::Command::new("xdg-open").arg(&path).spawn().map_err(|e| e.to_string())?; }
    #[cfg(target_os = "macos")]
    { std::process::Command::new("open").arg(&path).spawn().map_err(|e| e.to_string())?; }
    Ok(())
}

/// Opens the map configs directory in the system file manager.
#[tauri::command]
async fn open_map_configs_folder() -> Result<(), String> {
    let path = resolve_path("data/user/map-configs");
    #[cfg(target_os = "windows")]
    { std::process::Command::new("explorer").arg(&path).spawn().map_err(|e| e.to_string())?; }
    #[cfg(target_os = "linux")]
    { std::process::Command::new("xdg-open").arg(&path).spawn().map_err(|e| e.to_string())?; }
    #[cfg(target_os = "macos")]
    { std::process::Command::new("open").arg(&path).spawn().map_err(|e| e.to_string())?; }
    Ok(())
}

/// Read a map config JSON file from the map-configs directory.
#[tauri::command]
async fn read_map_config(filename: String) -> Result<String, String> {
    let path = resolve_path("data/user/map-configs").join(&filename);
    fs::read_to_string(&path).map_err(|e| e.to_string())
}

/// Write a map config JSON file to the map-configs directory.
#[tauri::command]
async fn write_map_config(filename: String, content: String) -> Result<(), String> {
    let dir = resolve_path("data/user/map-configs");
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    fs::write(dir.join(&filename), content).map_err(|e| e.to_string())
}

/// List all `.json` files in the map-configs directory.
#[tauri::command]
async fn list_map_configs() -> Result<Vec<String>, String> {
    let dir = resolve_path("data/user/map-configs");
    if !dir.exists() { return Ok(vec![]) }
    let mut files = vec![];
    for entry in fs::read_dir(&dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let name = entry.file_name().to_string_lossy().to_string();
        if name.ends_with(".json") { files.push(name) }
    }
    Ok(files)
}

// --- Media Assets ---
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

include!(concat!(env!("OUT_DIR"), "/bundled_assets.rs"));

fn extract_bundled_assets(app_handle: &tauri::AppHandle) {
    // Copy bundled asset files from inside the AppImage to the writable
    // data root.  Runs once at startup so resolve_path finds everything.
    for rel in BUNDLED_ASSET_FILES {
        let dest = resolve_path(rel);
        if dest.exists() {
            continue;
        }
        if let Some(parent) = dest.parent() {
            let _ = fs::create_dir_all(parent);
        }
        if let Some(bundled) = resolve_bundled_path(app_handle, rel) {
            if bundled.exists() {
                let _ = fs::copy(&bundled, &dest);
            }
        }
    }
}

/// Download any map or mastery icon assets that aren't already cached.
/// Called by MonitoringContext on startup.  Failures are non-fatal per asset.
#[tauri::command]
async fn check_media_assets() -> Result<String, String> {
    let client = reqwest::Client::new();
    let mut downloaded = 0u32;
    let base_url = "https://raw.githubusercontent.com/glowseeker/cephalon-kronos/master/src-tauri/data/export";

    // Download open-world maps to assets (used by Maps screen)
    let maps_dir = resolve_path("data/assets/maps");
    if !maps_dir.exists() {
        fs::create_dir_all(&maps_dir).map_err(|e| e.to_string())?;
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

    // Download mastery rank icons to assets (used by Mastery screen)
    let icons_dir = resolve_path("data/assets/mastery-icons");
    if !icons_dir.exists() {
        fs::create_dir_all(&icons_dir).map_err(|e| e.to_string())?;
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
    resolve_path("data/assets/mastery-icons").to_string_lossy().to_string()
}

/// Return the absolute path to the maps directory.
/// Used by the Maps screen to construct file:// image URLs.
#[tauri::command]
fn get_maps_path() -> String {
    resolve_path("data/assets/maps").to_string_lossy().to_string()
}

/// Return the absolute path to the assets directory.
/// Used to display decorative images in the UI.
#[tauri::command]
fn get_assets_path() -> String {
    resolve_path("data/assets").to_string_lossy().to_string()
}

/// Return the absolute path to the mod frame images directory.
#[tauri::command]
fn get_mod_frames_path() -> String {
    resolve_path("data/assets/mod-frames").to_string_lossy().to_string()
}

/// Return the absolute path to the icons directory.
#[tauri::command]
fn get_icons_path() -> String {
    resolve_path("data/assets/ui").to_string_lossy().to_string()
}

/// Return the absolute path to the UI assets directory (faction icons, nav icons, etc.).
#[tauri::command]
fn get_ui_path() -> String {
    resolve_path("data/assets/ui").to_string_lossy().to_string()
}

/// Return the Warframe image CDN base URL for loading syndicate/focus icons.
#[tauri::command]
fn get_cdn_base_url() -> String {
    "https://browse.wf".to_string()
}

// --- Mod Images Extraction ---
//
// Mod images are extracted from the local Warframe game cache using the
// bundled Warframe-Exporter-CLI tool.  The user must have Warframe installed
// with a populated cache (i.e. they've run the game at least once).

/// Return the absolute path to the mod images directory.
#[tauri::command]
fn get_card_images_path() -> String {
    resolve_path("data/assets/card-images").to_string_lossy().to_string()
}

/// Read bytes from an absolute path. Used for importing share bundles from a
/// user-picked file (not the data root). Mirrors `write_file`.
#[tauri::command]
fn read_file(path: String) -> Result<Vec<u8>, String> {
    use std::path::Path;
    fs::read(Path::new(&path)).map_err(|e| e.to_string())
}

/// Read a file from the data root as raw bytes. Used by the frontend to
/// bypass CORS restrictions on the asset protocol when processing images via canvas.
#[tauri::command]
fn read_file_bytes(app_handle: tauri::AppHandle, relative: String) -> Result<Vec<u8>, String> {
    let path = resolve_path(&relative);
    if path.exists() {
        return fs::read(&path).map_err(|e| e.to_string());
    }
    // Fall back to bundled resources (needed for AppImage where extract_bundled_assets
    // may not have run yet when an overlay window starts before the main window).
    if let Some(bundled) = resolve_bundled_path(&app_handle, &relative) {
        if bundled.exists() {
            return fs::read(&bundled).map_err(|e| e.to_string());
        }
    }
    Err(format!("File not found: {}", relative))
}

/// Resolve the absolute path of an asset file, with fallback to bundled resources.
/// Used by the frontend with `convertFileSrc` + `fetch` to load large JSON files
/// without the 200-300% bloat of Vec<u8> JSON serialization.
#[tauri::command]
fn resolve_asset_path(app_handle: tauri::AppHandle, relative: String) -> Result<String, String> {
    let path = resolve_path(&relative);
    if path.exists() {
        return Ok(path.to_string_lossy().to_string());
    }
    if let Some(bundled) = resolve_bundled_path(&app_handle, &relative) {
        if bundled.exists() {
            return Ok(bundled.to_string_lossy().to_string());
        }
    }
    Err(format!("File not found: {}", relative))
}
/// Write bytes to an absolute path. Used for importing/exporting share bundles
/// via the user's file-picker path (not the data root).
#[tauri::command]
fn write_file(path: String, data: Vec<u8>) -> Result<(), String> {
    use std::path::Path;
    let p = Path::new(&path);
    if let Some(parent) = p.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(p, &data).map_err(|e| e.to_string())
}

/// Fetch a URL and return the response body as text.
/// Bypasses CORS and Tauri HTTP plugin permission system.
/// Rejects on non-2xx status or network error so the caller's `.catch()` fallback triggers.
#[tauri::command]
async fn fetch_url(url: String) -> Result<String, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(15))
        .build()
        .map_err(|e| format!("Client build error: {e}"))?;
    let resp = client.get(&url).send().await.map_err(|e| format!("HTTP request failed: {e}"))?;
    resp.error_for_status_ref().map_err(|e| format!("HTTP {e}"))?;
    resp.text().await.map_err(|e| format!("Failed to read response: {e}"))
}

// ─── Mod image pre-processing ───────────────────────────────────────────────

#[derive(Clone, serde::Serialize)]
struct CardProgress { phase: String, current: usize, total: usize, current_file: String }

/// Consolidated card-image pipeline: extract → fix → composite, with
/// unified progress events so the frontend only calls a single command.
#[tauri::command]
async fn ensure_card_images(
    app_handle: tauri::AppHandle,
    window: tauri::WebviewWindow,
    cache_path: String,
) -> Result<String, String> {
    let card_root = resolve_path("data/assets/card-images");
    std::fs::create_dir_all(&card_root).map_err(|e| e.to_string())?;

    // 1. Extract
    let _ = window.emit("card-progress", CardProgress {
        phase: "extracting".into(),
        current: 0, total: 1, current_file: String::new(),
    });
    extract_card_images_inner(&app_handle, &cache_path)
        .map_err(|e| format!("Extraction failed: {e}"))?;
    let _ = window.emit("card-progress", CardProgress {
        phase: "extracting".into(),
        current: 1, total: 1, current_file: String::new(),
    });

    // 2. Fix (spawn_blocking so it doesn't block the async runtime)
    let fix_root = card_root.clone();
    let fix_win = window.clone();
    tokio::task::spawn_blocking(move || {
        let manifest_path = fix_root.join(".fix-manifest.json");

        let mut processed: std::collections::HashSet<String> =
            std::fs::read_to_string(&manifest_path).ok()
                .and_then(|b| serde_json::from_str::<Vec<String>>(&b).ok())
                .map(|v| v.into_iter().collect())
                .unwrap_or_default();

        let mut pending: Vec<std::path::PathBuf> = Vec::new();
        let mut stack = vec![fix_root.to_path_buf()];
        while let Some(dir) = stack.pop() {
            let Ok(rd) = std::fs::read_dir(&dir) else { continue };
            for e in rd.flatten() {
                let p = e.path();
                if p.is_dir() { stack.push(p); }
                else if p.extension().map_or(false, |x| x.eq_ignore_ascii_case("png")) {
                    if let Ok(rel) = p.strip_prefix(&fix_root) {
                        let key = rel.to_string_lossy().replace('\\', "/");
                        if key.starts_with("Lotus/Interface/Icons/") { continue; }
                        if !processed.contains(&key) { pending.push(p); }
                    }
                }
            }
        }

        let total = pending.len();
        let _ = fix_win.emit("card-progress", CardProgress {
            phase: "fixing".into(), current: 0, total,
            current_file: String::new(),
        });

        for (i, file) in pending.iter().enumerate() {
            if i % 10 == 0 {
                let _ = fix_win.emit("card-progress", CardProgress {
                    phase: "fixing".into(), current: i, total,
                    current_file: file.file_name()
                        .map(|n| n.to_string_lossy().into_owned())
                        .unwrap_or_default(),
                });
            }
            if let Err(e) = make_fully_opaque(file) {
                eprintln!("ensure_card_images: skip corrupt {:?}: {e}", file);
            }
            if let Ok(rel) = file.strip_prefix(&fix_root) {
                processed.insert(rel.to_string_lossy().replace('\\', "/"));
            }
        }

        if !pending.is_empty() {
            let mut list: Vec<&String> = processed.iter().collect();
            list.sort();
            let _ = std::fs::write(&manifest_path, serde_json::to_string(&list).unwrap());
        }

        let _ = fix_win.emit("card-progress", CardProgress {
            phase: "fixing".into(), current: total, total,
            current_file: String::new(),
        });
    }).await.map_err(|e| format!("Fix task failed: {e}"))?;

    // 3. Composite
    composite_card_overlays_inner(&card_root);

    let _ = window.emit("card-progress", CardProgress {
        phase: "done".into(), current: 1, total: 1, current_file: String::new(),
    });

    Ok(card_root.to_string_lossy().to_string())
}

/// Fast check: returns the number of PNGs NOT yet in the manifest.
/// If 0, the frontend can skip the fix overlay entirely.
#[tauri::command]
fn count_unfixed_card_images(path: String) -> usize {
    let root = std::path::Path::new(&path);
    if !root.exists() { return 0; }

    let manifest_path = root.join(".fix-manifest.json");
    let processed: std::collections::HashSet<String> =
        std::fs::read_to_string(&manifest_path).ok()
            .and_then(|body| serde_json::from_str::<Vec<String>>(&body).ok())
            .map(|v| v.into_iter().collect())
            .unwrap_or_default();

    let mut count = 0;
    let mut stack = vec![root.to_path_buf()];
    while let Some(dir) = stack.pop() {
        let Ok(rd) = std::fs::read_dir(&dir) else { continue };
        for e in rd.flatten() {
            let p = e.path();
            if p.is_dir() { stack.push(p); }
            else if p.extension().map_or(false, |x| x.eq_ignore_ascii_case("png")) {
                if let Ok(rel) = p.strip_prefix(root) {
                    let key = rel.to_string_lossy().replace('\\', "/");
                    // Skip files under Lotus/Interface/Icons/ - these are
                    // UI icons (Antivirus, ImmortalRunes, etc.) that must
                    // keep their original transparency.
                    if key.starts_with("Lotus/Interface/Icons/") { continue; }
                    if !processed.contains(&key) { count += 1; }
                }
            }
        }
    }
    count
}



/// Set alpha=255 on every pixel of a PNG in-place.
fn make_fully_opaque(path: &std::path::Path)
    -> Result<(), Box<dyn std::error::Error + Send + Sync>>
{
    let bytes = std::fs::read(path)?;
    let img = image::load_from_memory(&bytes)?;
    let mut rgba = img.to_rgba8();

    for pixel in rgba.pixels_mut() {
        pixel[3] = 255;
    }

    let mut out = Vec::with_capacity(bytes.len());
    rgba.write_to(&mut Cursor::new(&mut out), image::ImageFormat::Png)?;
    std::fs::write(path, out)?;
    Ok(())
}

/// Composite an overlay icon onto a Mod image (in-place).
/// The overlay is scaled down and centered on the card with alpha blending.
fn composite_overlay(card_path: &std::path::Path, overlay_path: &std::path::Path)
    -> Result<(), Box<dyn std::error::Error + Send + Sync>>
{
    let card_bytes = std::fs::read(card_path)?;
    let mut card_img = image::load_from_memory(&card_bytes)?.to_rgba8();

    let ov_bytes = std::fs::read(overlay_path)?;
    let ov_img = image::load_from_memory(&ov_bytes)?.to_rgba8();

    // Scale the overlay to 80% of the card's shorter dimension
    let card_min = card_img.width().min(card_img.height());
    let ov_max = ov_img.width().max(ov_img.height());
    let scale = (card_min as f64 * 0.8 / ov_max as f64).min(1.0);
    let ov_w = (ov_img.width() as f64 * scale).round() as u32;
    let ov_h = (ov_img.height() as f64 * scale).round() as u32;
    let mut ov_scaled = image::imageops::resize(&ov_img, ov_w.max(1), ov_h.max(1),
        image::imageops::Lanczos3);

    // Reduce overlay opacity to 50% before compositing
    for pixel in ov_scaled.pixels_mut() {
        pixel[3] = pixel[3] / 2;
    }

    // Center the scaled overlay on the card
    let x = (card_img.width().saturating_sub(ov_scaled.width())) / 2;
    let y = (card_img.height().saturating_sub(ov_scaled.height())) / 2;

    image::imageops::overlay(&mut card_img, &ov_scaled, x as i64, y as i64);

    let mut out = Vec::with_capacity(card_bytes.len());
    card_img.write_to(&mut std::io::Cursor::new(&mut out), image::ImageFormat::Png)?;
    std::fs::write(card_path, out)?;
    Ok(())
}

/// Read the overlay map and composite each overlay onto its mod image.
/// Tracks already-composited cards in .overlay-manifest.json so it is
/// idempotent - subsequent calls skip cards already processed.
fn composite_card_overlays_inner(card_root: &std::path::Path) {
    let overlay_map_path = card_root.join("../data/card-overlay-map.json");
    let Ok(body) = std::fs::read_to_string(&overlay_map_path) else { return };
    let Ok(map) = serde_json::from_str::<std::collections::HashMap<String, String>>(&body) else { return };

    let manifest_path = card_root.join(".overlay-manifest.json");
    let mut done: std::collections::HashSet<String> = std::fs::read_to_string(&manifest_path).ok()
        .and_then(|b| serde_json::from_str::<Vec<String>>(&b).ok())
        .map(|v| v.into_iter().collect())
        .unwrap_or_default();

    for (card_rel, overlay_rel) in &map {
        let key = card_rel.clone();
        if done.contains(&key) { continue; }
        let card_path = card_root.join(card_rel);
        let overlay_path = card_root.join(overlay_rel);
        if card_path.exists() && overlay_path.exists() {
            if let Err(e) = composite_overlay(&card_path, &overlay_path) {
                eprintln!("composite_overlay {}: {e}", card_rel);
            }
        }
        done.insert(key);
    }

    if !map.is_empty() {
        let mut list: Vec<&String> = done.iter().collect();
        list.sort();
        let _ = std::fs::write(&manifest_path, serde_json::to_string(&list).unwrap());
    }
}

/// Auto-detect the Warframe cache directory by checking Steam registry.
/// Returns the cache path on success or an error if not found.
#[tauri::command]
fn detect_warframe_cache() -> Result<String, String> {
    detect_cache_inner().ok_or_else(|| {
        "Could not find Warframe cache. Please set the path manually in Settings.".to_string()
    })
}

fn detect_cache_inner() -> Option<String> {
    #[cfg(target_os = "windows")]
    {
        use winreg::enums::*;
        use winreg::RegKey;

        // Try Steam registry
        if let Ok(hkcu) = RegKey::predef(HKEY_CURRENT_USER)
            .open_subkey(r"Software\Valve\Steam")
        {
            if let Ok(steam_path) = hkcu.get_value::<String, _>("SteamPath") {
                // SteamPath uses forward slashes
                let steam_path = steam_path.replace('/', r"\");
                let candidate = format!(r"{}\steamapps\common\Warframe\Cache.Windows", steam_path);
                let path = Path::new(&candidate);
                if path.exists() {
                    return Some(candidate);
                }
                // Also try libraryfolders.vdf for alternate install dirs
                let library_path = format!(r"{}\steamapps\libraryfolders.vdf", steam_path);
                if let Ok(content) = std::fs::read_to_string(&library_path) {
                    for line in content.lines() {
                        if let Some(path_part) = line.split('"').nth(3) {
                            let path_part = path_part.replace(r"\\", r"\");
                            let alt = format!(r"{}\steamapps\common\Warframe\Cache.Windows", path_part.trim());
                            if Path::new(&alt).exists() {
                                return Some(alt);
                            }
                        }
                    }
                }
            }
        }

        // Fallback: try common locations
        let drives = ["C:", "D:", "E:", "F:"];
        for drive in &drives {
            let candidate = format!(r"{}\Program Files (x86)\Steam\steamapps\common\Warframe\Cache.Windows", drive);
            if Path::new(&candidate).exists() {
                return Some(candidate);
            }
        }

        // Last resort: try to find the running Warframe process path via WMIC
        if let Ok(output) = std::process::Command::new("wmic")
            .args(["process", "where", "name=\"Warframe.x64.exe\"", "get", "ExecutablePath"])
            .output()
        {
            if output.status.success() {
                let stdout = String::from_utf8_lossy(&output.stdout);
                for line in stdout.lines() {
                    let trimmed = line.trim();
                    if !trimmed.is_empty() && !trimmed.eq_ignore_ascii_case("ExecutablePath") {
                        let exe_path = Path::new(trimmed);
                        if let Some(parent) = exe_path.parent() {
                            let candidate = parent.join("Cache.Windows");
                            if candidate.exists() {
                                return Some(candidate.to_string_lossy().to_string());
                            }
                        }
                    }
                }
            }
        }
    }

    #[cfg(target_os = "linux")]
    {
        // Steam on Linux: try common install paths
        if let Ok(home) = std::env::var("HOME") {
            let candidates = [
                format!("{}/.steam/steam/steamapps/common/Warframe/Cache.Windows", home),
                format!("{}/.local/share/Steam/steamapps/common/Warframe/Cache.Windows", home),
                format!("{}/snap/steam/common/.local/share/Steam/steamapps/common/Warframe/Cache.Windows", home),
            ];
            for c in &candidates {
                if Path::new(c).exists() {
                    return Some(c.clone());
                }
            }
        }

        // Fallback: try to find the running Warframe process via /proc
        if let Ok(pids) = std::fs::read_dir("/proc") {
            for entry in pids.flatten() {
                let pid = entry.file_name();
                let pid_str = pid.to_string_lossy();
                if !pid_str.chars().all(|c| c.is_ascii_digit()) { continue; }
                let exe_path = Path::new("/proc").join(&pid).join("exe");
                if let Ok(target) = std::fs::read_link(&exe_path) {
                    let target_str = target.to_string_lossy();
                    if target_str.contains("Warframe") || target_str.contains("warframe") {
                        if let Some(parent) = target.parent() {
                            let candidate = parent.join("Cache.Windows");
                            if candidate.exists() {
                                return Some(candidate.to_string_lossy().to_string());
                            }
                        }
                    }
                }
            }
        }
    }

    #[cfg(target_os = "macos")]
    {
        // Steam on macOS via CrossOver/Whisky or native Steam
        if let Ok(home) = std::env::var("HOME") {
            let candidates = [
                // Native Steam (if Warframe were supported)
                format!("{}/Library/Application Support/Steam/steamapps/common/Warframe/Cache.Windows", home),
                // CrossOver default bottle
                format!("{}/Library/Application Support/CrossOver/Bottles/Steam/drive_c/Program Files (x86)/Steam/steamapps/common/Warframe/Cache.Windows", home),
                // Whisky bottles
                format!("{}/Library/Containers/com.isaacmarovitz.Whisky/Bottles/Steam/drive_c/Program Files (x86)/Steam/steamapps/common/Warframe/Cache.Windows", home),
            ];
            for c in &candidates {
                if Path::new(c).exists() {
                    return Some(c.clone());
                }
            }
        }

        // Fallback: try to find Warframe process via `mdfind` or `pgrep`
        if let Ok(output) = std::process::Command::new("pgrep")
            .args(["-fl", "Warframe"])
            .output()
        {
            if output.status.success() {
                let stdout = String::from_utf8_lossy(&output.stdout);
                for line in stdout.lines() {
                    if let Some(exe_path) = line.split_whitespace().nth(1) {
                        let exe_path = Path::new(exe_path);
                        if let Some(parent) = exe_path.parent() {
                            let candidate = parent.join("Cache.Windows");
                            if candidate.exists() {
                                return Some(candidate.to_string_lossy().to_string());
                            }
                        }
                    }
                }
            }
        }
    }

    None
}

/// Extract mod images from the Warframe cache using the bundled CLI.
/// Skips if already extracted (output dir has PNG files).
fn extract_card_images_inner(app_handle: &tauri::AppHandle, cache_path: &str) -> Result<u32, String> {
    let output_dir = resolve_path("data/assets/card-images");
    std::fs::create_dir_all(&output_dir).map_err(|e| e.to_string())?;

    // Locate the CLI binary
    let bin_name = format!("Warframe-Exporter-CLI{}", std::env::consts::EXE_SUFFIX);
    let relative_bin = format!("data/bin/{}", bin_name);
    let writable_bin = resolve_path(&relative_bin);
    let bundled_bin = resolve_bundled_path(app_handle, &relative_bin);

    #[cfg(target_os = "linux")]
    let (writable_bin, bundled_bin) = {
        let appimage_name = "data/bin/Warframe-Exporter-CLI_Linux.AppImage";
        let wb = if !writable_bin.exists() {
            resolve_path(appimage_name)
        } else {
            writable_bin
        };
        let bb = if bundled_bin.as_ref().map_or(true, |p| !p.exists()) {
            resolve_bundled_path(app_handle, appimage_name)
        } else {
            bundled_bin
        };
        (wb, bb)
    };

    let bin_path = if writable_bin.exists() {
        writable_bin
    } else if let Some(b) = bundled_bin.clone().filter(|p| p.exists()) {
        b
    } else {
        return Err(format!(
            "Warframe-Exporter-CLI not found. Writable: {:?}, Bundled: {:?}",
            writable_bin, bundled_bin
        ));
    };

    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        if let Ok(meta) = std::fs::metadata(&bin_path) {
            let mut perms = meta.permissions();
            perms.set_mode(0o755);
            let _ = std::fs::set_permissions(&bin_path, perms);
        }
    }

    // Only do the main Cards/Images extraction if the output directory
    // is empty (first run or after a clean).
    if walk_dir_count(&output_dir) == 0 {
        let mut cmd = std::process::Command::new(&bin_path);

        #[cfg(target_os = "linux")]
        {
            cmd.env("APPIMAGE_EXTRACT_AND_RUN", "1");
            cmd.env_remove("APPDIR");
            cmd.env_remove("APPIMAGE");
        }

        cmd.arg("--cache-dir")
           .arg(cache_path)
           .arg("--game")
           .arg("Warframe")
           .arg("--extract-textures")
           .arg("--package")
           .arg("Texture")
           .arg("--texture-format")
           .arg("PNG")
           .arg("--internal-path")
           .arg("/Lotus/Interface/Cards/Images/")
           .arg("--output-path")
           .arg(&output_dir);

        #[cfg(windows)]
        {
            use std::os::windows::process::CommandExt;
            const CREATE_NO_WINDOW: u32 = 0x08000000;
            cmd.creation_flags(CREATE_NO_WINDOW);
        }

        let output = cmd.output().map_err(|e| format!("Failed to launch Warframe-Exporter-CLI: {e}"))?;
        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("Warframe-Exporter-CLI failed: {stderr}"));
        }
    }

    let mut extracted = walk_dir_count(&output_dir);

    // Antivirus / Requiem / Tome cards: the game ships them as UI icons
    // (/Lotus/Interface/Icons/...) rather than card textures, so the
    // Card pass above produces nothing for those paths. Re-run the
    // exporter targeting the well-known UI icon subfolders and drop the
    // results into the same card-images tree so the frontend can find
    // them under its expected paths.
    //
    // Always check each UI icon path individually - they may not have
    // been extracted on a previous run (e.g. if the early-return guard
    // was in place before this restructuring).
    let ui_icon_paths = [
        "/Lotus/Interface/Icons/Antivirus/",
        "/Lotus/Interface/Icons/ImmortalRunes/",
        "/Lotus/Interface/Icons/Tomes/",
        "/Lotus/Interface/Icons/RailjackSystemMods/",
        "/Lotus/Interface/Icons/Stickers/",
        "/Lotus/Interface/Icons/CosmeticEnhancers/",
    ];
    for internal_path in ui_icon_paths.iter() {
        let ui_dir = output_dir.join(internal_path.trim_start_matches('/'));
        // If the directory exists but the files may have been alpha-fixed
        // by a previous run, wipe them so the extraction puts fresh copies.
        // We use a sentinel file (<dir>/.fresh) to know if we already did this.
        let sentinel = ui_dir.join(".fresh");
        if ui_dir.exists() && walk_dir_count(&ui_dir) > 0 && !sentinel.exists() {
            let _ = std::fs::remove_dir_all(&ui_dir);
        }
        if ui_dir.exists() && walk_dir_count(&ui_dir) > 0 {
            continue;
        }
        std::fs::create_dir_all(&ui_dir).ok();
        let _ = std::fs::write(&sentinel, b"1");
        let mut ui_cmd = std::process::Command::new(&bin_path);
        #[cfg(target_os = "linux")]
        {
            ui_cmd.env("APPIMAGE_EXTRACT_AND_RUN", "1");
            ui_cmd.env_remove("APPDIR");
            ui_cmd.env_remove("APPIMAGE");
        }
        ui_cmd.arg("--cache-dir")
              .arg(cache_path)
              .arg("--game")
              .arg("Warframe")
              .arg("--extract-textures")
              .arg("--package")
              .arg("Texture")
              .arg("--texture-format")
              .arg("PNG")
              .arg("--internal-path")
              .arg(internal_path)
              .arg("--output-path")
              .arg(&output_dir);
        #[cfg(windows)]
        {
            use std::os::windows::process::CommandExt;
            const CREATE_NO_WINDOW: u32 = 0x08000000;
            ui_cmd.creation_flags(CREATE_NO_WINDOW);
        }
        let _ = ui_cmd.output();
        extracted = walk_dir_count(&output_dir);
    }

    Ok(extracted)
}

fn walk_dir_count(dir: &Path) -> u32 {
    let mut count = 0u32;
    if let Ok(entries) = std::fs::read_dir(dir) {
        for entry in entries.flatten() {
            if entry.file_type().map(|t| t.is_dir()).unwrap_or(false) {
                count += walk_dir_count(&entry.path());
            } else if entry.file_name().to_string_lossy().ends_with(".png") {
                count += 1;
            }
        }
    }
    count
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
    let app = app_handle.clone();
    tauri::async_runtime::spawn(async move {
        let _ = play_notification_sound(app, sound).await;
    });

    let app = app_handle.clone();

    let payload = serde_json::json!({
        "rewards": rewards,
        "persistent": persistent.unwrap_or(false)
    });

    // Show and position the relic window first
    let _ = show_overlay_window(app.clone(), "overlay-relic".to_string());

    // Longer delay - window needs time to actually appear and JS to be ready
    tokio::time::sleep(std::time::Duration::from_millis(300)).await;

    app.emit("show-relic-rewards", payload)
        .map_err(|e| e.to_string())?;

    // (Rust-side timer for relics removed on Linux, now handled by start_notif_autoclose_timer from frontend)

    Ok(())
}

#[tauri::command]
fn hide_overlay_window(
    app_handle: tauri::AppHandle,
    label: String,
) -> Result<(), String> {
    overlay_utils::clear_shown_overlay(&label);
    if let Some(w) = app_handle.get_webview_window(&label) {
        let _ = w.hide();
    }
    Ok(())
}

/// Toggle the interactive in-game sidebar on/off.
/// Uses a dedicated overlay-sidebar window - main is never touched.
/// The overlay window gets OSD X11 hints on first show (via show_sidebar_internal)
/// so KWin places it above fullscreen games.
#[tauri::command]
fn toggle_sidebar(app_handle: tauri::AppHandle) -> Result<(), String> {
    if overlay_utils::SIDEBAR_TOGGLING.swap(true, Ordering::SeqCst) {
        eprintln!("[SIDEBAR-TOGGLE] SKIPPED (already toggling)");
        return Ok(());
    }

    let state = app_handle.state::<AppState>();
    let mut saved = state.sidebar_saved.lock().unwrap();

    if saved.active {
        overlay_utils::hide_sidebar_internal(&app_handle);
        saved.active = false;
        saved.side = None;
        drop(saved);
        overlay_utils::SIDEBAR_TOGGLING.store(false, Ordering::SeqCst);
        sidebar_stamp(&state);
        if let Some(main_win) = app_handle.get_webview_window("main") {
            let _ = main_win.emit("sidebar-mode-changed", serde_json::json!({ "active": false }));
        }
        let _ = app_handle.emit("sidebar-visible", serde_json::json!({ "visible": false }));
        eprintln!("[SIDEBAR-TOGGLE] EXIT done");
        Ok(())
    } else {
        sidebar_stamp(&state);

        let settings = load_settings_sync();
        let side = settings
            .get("sidebar_side")
            .and_then(|v| v.as_str())
            .unwrap_or("left")
            .to_string();
        saved.side = Some(side.clone());
        saved.active = true;
        let entry_width = settings
            .get("sidebar_width")
            .and_then(|v| v.as_u64())
            .map(|w| w as u32)
            .unwrap_or(400);

        // Cache monitor geometry for set_sidebar_width drag resizing.
        if let Ok(mon) = overlay_utils::get_overlay_monitor(&app_handle, "overlay-sidebar") {
            let pos = mon.position();
            let size = mon.size();
            saved.mon_x = pos.x;
            saved.mon_y = pos.y;
            saved.mon_w = size.width;
            saved.mon_h = size.height;
        }
        drop(saved);

        // Always reset the toggling guard, even if show_sidebar_internal errors.
        let show_result = overlay_utils::show_sidebar_internal(&app_handle, &side, entry_width);
        overlay_utils::SIDEBAR_TOGGLING.store(false, Ordering::SeqCst);
        if let Err(e) = &show_result {
            eprintln!("[SIDEBAR-TOGGLE] show_sidebar_internal FAILED: {e}");
            // Roll back saved state so a subsequent toggle doesn't try to
            // "hide" a window that was never shown.
            let mut saved = state.sidebar_saved.lock().unwrap();
            saved.active = false;
            saved.side = None;
        }
        show_result?;

        if let Some(main_win) = app_handle.get_webview_window("main") {
            let _ = main_win.emit("sidebar-mode-changed", serde_json::json!({ "active": true, "side": side }));
        }
        let _ = app_handle.emit("sidebar-visible", serde_json::json!({ "visible": true }));
        eprintln!("[SIDEBAR-TOGGLE] ENTER done side={}", side);
        Ok(())
    }
}

fn sidebar_stamp(state: &AppState) {
    let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_millis() as u64;
    state.sidebar_last_op.store(now, std::sync::atomic::Ordering::SeqCst);
}

/// Load settings synchronously from disk.
pub(crate) fn load_settings_sync() -> serde_json::Value {
    let path = resolve_path("data/user/settings.json");
    if path.exists() {
        std::fs::read_to_string(&path)
            .ok()
            .and_then(|s| serde_json::from_str(&s).ok())
            .unwrap_or_default()
    } else {
        serde_json::json!({})
    }
}

#[tauri::command]
async fn sidebar_load_data(app_handle: tauri::AppHandle) -> Result<serde_json::Value, String> {
    // Load whatever exports are already on disk — don't block on check_exports.
    // The main window's MonitoringProvider runs check_exports in parallel;
    // if it hasn't finished yet, we just use stale/cached data.
    let exports = load_all_exports_inner(&app_handle).unwrap_or_default();
    let (inventory, timestamp) = load_cached_inventory_inner()
        .ok()
        .flatten()
        .map(|(inv, ts)| (Some(inv), ts))
        .unwrap_or((None, 0));

    Ok(serde_json::json!({
        "exports": exports,
        "inventory": inventory,
        "inventoryTimestamp": timestamp,
    }))
}

/// Lightweight version - only loads inventory (no exports).
/// Used by the sidebar overlay on data-update events to avoid
/// re-reading all ~30 export JSON files every monitoring cycle.
#[tauri::command]
async fn sidebar_load_inventory() -> Result<serde_json::Value, String> {
    let (inventory, timestamp) = load_cached_inventory_inner()
        .ok()
        .flatten()
        .map(|(inv, ts)| (Some(inv), ts))
        .unwrap_or((None, 0));

    Ok(serde_json::json!({
        "inventory": inventory,
        "inventoryTimestamp": timestamp,
    }))
}

fn load_all_exports_inner(app_handle: &tauri::AppHandle) -> Option<serde_json::Value> {
    let export_dir = resolve_path("data/export");
    let mut result = serde_json::Map::new();

    for file_name in crate::EXPORT_FILES {
        let path = export_dir.join(file_name);
        let path = if path.exists() {
            path
        } else if let Some(bundled) = resolve_bundled_path(app_handle, &format!("data/export/{}", file_name)) {
            if bundled.exists() { bundled } else { continue }
        } else {
            continue;
        };

        let key = file_name.trim_end_matches(".json");
        match std::fs::File::open(&path) {
            Ok(file) => match serde_json::from_reader(std::io::BufReader::new(file)) {
                Ok(json) => { result.insert(key.to_string(), json); }
                Err(e) => eprintln!("[load_all_exports_inner] failed to parse {} ({}b): {}", key, path.metadata().map(|m| m.len()).unwrap_or(0), e),
            },
            Err(e) => eprintln!("[load_all_exports_inner] failed to open {}: {}", key, e),
        }
    }

    // Drop data files (warframe-drop-data) - same as load_all_exports
    for (file_name, _url) in crate::DROPDATA_FILES {
        let path = export_dir.join(file_name);
        if !path.exists() { continue; }
        let key = file_name.trim_end_matches(".json");
        match std::fs::File::open(&path) {
            Ok(file) => match serde_json::from_reader(std::io::BufReader::new(file)) {
                Ok(json) => { result.insert(key.to_string(), json); }
                Err(e) => eprintln!("[load_all_exports_inner] failed to parse {} ({}b): {}", key, path.metadata().map(|m| m.len()).unwrap_or(0), e),
            },
            Err(e) => eprintln!("[load_all_exports_inner] failed to open {}: {}", key, e),
        }
    }

    // Load locale-specific ExportUpgrades from DE public manifest if available.
    // Read locale from settings file (same source as sidebar_load_data caller).
    let settings = std::fs::read_to_string(resolve_path("data/user/settings.json")).ok()
        .and_then(|s| serde_json::from_str::<serde_json::Value>(&s).ok())
        .unwrap_or_default();
    let locale = settings.get("gameLocale").and_then(|v| v.as_str()).unwrap_or("en");
    if locale != "en" {
        let locale_file = format!("ExportUpgrades_{}.json", locale);
        let locale_path = export_dir.join(&locale_file);
        if locale_path.exists() {
            match std::fs::File::open(&locale_path) {
                Ok(file) => match serde_json::from_reader(std::io::BufReader::new(file)) {
                    Ok(json) => { result.insert("ExportUpgradesLocalized".to_string(), json); }
                    Err(e) => eprintln!("[load_all_exports_inner] failed to parse {}: {}", locale_file, e),
                },
                Err(e) => eprintln!("[load_all_exports_inner] failed to open {}: {}", locale_file, e),
            }
        }
    }

    Some(serde_json::Value::Object(result))
}

fn load_cached_inventory_inner() -> Result<Option<(serde_json::Value, u64)>, String> {
    let path = resolve_path("data/user/inventory.json");
    if !path.exists() {
        return Ok(None);
    }
    let timestamp = std::fs::metadata(&path)
        .ok()
        .and_then(|m| m.modified().ok())
        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|d| d.as_millis() as u64)
        .unwrap_or_else(|| {
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis() as u64
        });
    let content = std::fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read inventory.json: {e}"))?;
    let json: serde_json::Value = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse inventory.json: {e}"))?;
    Ok(Some((json, timestamp)))
}

#[tauri::command]
fn relay_event(
    app_handle: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    event: String,
    payload: Value,
) -> Result<(), String> {
    // 1. Log the action
    logger::log_to_disk(&app_handle, &format!("[RELAY EVENT] Event: {}, Payload: {}", event, payload));

    // 2. Cache if it's a relic/reward update
    if event == "overlay-update-relics" || event == "overlay-update-reward" {
        let mut cached = state.active_relic_data.lock().unwrap();
        *cached = Some(payload.clone());
    }

    // 3. Reset cache if session closed
    if event == "fissure-reward-closed" {
         let mut cached = state.active_relic_data.lock().unwrap();
         *cached = None;
    }

    app_handle.emit(&event, payload).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_active_relic_session(state: tauri::State<'_, AppState>) -> Option<Value> {
    let cached = state.active_relic_data.lock().unwrap();
    cached.clone()
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
    overlay_utils::resize_overlay_window(&app_handle, &label, width as f64, height as f64)
}

#[tauri::command]
fn raise_overlay(window: tauri::WebviewWindow) -> Result<(), String> {
    let _ = window.set_always_on_top(true);
    let _ = window.show();
    let _ = window.set_focus();
    Ok(())
}

#[tauri::command]
fn set_ignore_cursor_events(
    app_handle: tauri::AppHandle,
    label: String,
    ignore: bool,
) -> Result<(), String> {
    let window = app_handle
        .get_webview_window(&label)
        .ok_or_else(|| format!("window '{}' not found", label))?;
    window.set_ignore_cursor_events(ignore).map_err(|e| e.to_string())
}

#[tauri::command]
async fn play_notification_sound(app_handle: tauri::AppHandle, sound: String) -> Result<(), String> {
    if sound == "none" {
        return Ok(());
    }

    // Resolve from bundled resources (works in both dev and production)
    let sound_path = app_handle.path().resolve(format!("data/assets/audio/{}", sound), tauri::path::BaseDirectory::Resource).ok();
    
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
                .spawn();
        }
        
        #[cfg(target_os = "linux")]
        {
            eprintln!("[Audio] Playing via native player: {}", path_str);
            let played = std::process::Command::new("pw-play")
                .arg(&path_str)
                .stdout(std::process::Stdio::null())
                .stderr(std::process::Stdio::null())
                .status()
                .map(|s| s.success())
                .unwrap_or(false);
            if !played {
                let played2 = std::process::Command::new("paplay")
                    .arg(&path_str)
                    .stdout(std::process::Stdio::null())
                    .stderr(std::process::Stdio::null())
                    .status()
                    .map(|s| s.success())
                    .unwrap_or(false);
                if !played2 {
                    let _ = std::process::Command::new("aplay")
                        .arg(&path_str)
                        .stdout(std::process::Stdio::null())
                        .stderr(std::process::Stdio::null())
                        .spawn();
                }
            }
        }
    }).await.ok();
    
    Ok(())
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
    silent: Option<bool>,
    no_focus: Option<bool>,
) -> Result<(), String> {
    let pos       = position.unwrap_or_else(|| "top-right".to_string());
    let img       = image.unwrap_or_default();
    let persist   = persistent.unwrap_or(false);
    let silent    = silent.unwrap_or(false);
    let no_focus  = no_focus.unwrap_or(false);
    let notif_id  = id.unwrap_or_else(|| format!("notif-{}",
        SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_millis()
    ));

    // Determine which window label handles this position
    let label = match pos.as_str() {
        "top-left"   => "overlay-tl",
        "top-center" => "overlay-tc",
        _            => "overlay-tr",
    };

    // Show/reposition the overlay window (unless no_focus is set).
    // Note: get_webview_window is NOT used as a guard here - windows are created
    // dynamically by show_window_internal so they may not exist yet on first call.
    if !no_focus {
        if let Some(w) = app_handle.get_webview_window(label) {
            let was_hidden = !w.is_visible().unwrap_or(true);
            if was_hidden {
                let _ = w.emit("wipe-state", pos.clone());
            }
        }
        // Always call - creates the window if it doesn't exist yet
        let _ = show_overlay_window(app_handle.clone(), label.to_string());
    }

    // Play sound (unless silent)
    if !silent {
        let sound = state.notif_sound.lock().unwrap().clone();
        let app = app_handle.clone();
        tauri::async_runtime::spawn(async move {
            let _ = play_notification_sound(app, sound).await;
        });
    }

    // Emit the notification -- the matching overlay window renders it
    // Small delay lets the webview finish mounting before receiving the event
    tokio::time::sleep(std::time::Duration::from_millis(150)).await;

    app_handle.emit("new-notification", NotificationPayload {
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
fn get_platform_info() -> serde_json::Value {
    serde_json::json!({
        "is_appimage": std::env::var("APPIMAGE").is_ok(),
        "os": std::env::consts::OS,
        "arch": std::env::consts::ARCH,
    })
}

#[tauri::command]
async fn download_appimage_update(url: String) -> Result<String, String> {
    let appimage_path =
        std::env::var("APPIMAGE").map_err(|_| "Not running from AppImage".to_string())?;
    let parent = std::path::Path::new(&appimage_path)
        .parent()
        .ok_or("Cannot determine AppImage directory")?;
    let filename = url.split('/').last().ok_or("Invalid URL")?;
    let dest_path = parent.join(filename);
    let temp_path = parent.join(format!(".{}.partial", filename));

    let client = reqwest::Client::builder()
        .user_agent("Cephalon-Kronos-Updater")
        .build()
        .map_err(|e| e.to_string())?;
    let response = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("Download failed: {}", e))?;
    let bytes = response
        .bytes()
        .await
        .map_err(|e| format!("Read failed: {}", e))?;

    std::fs::write(&temp_path, &bytes).map_err(|e| format!("Write failed: {}", e))?;

    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        std::fs::set_permissions(&temp_path, std::fs::Permissions::from_mode(0o755))
            .map_err(|e| format!("Chmod failed: {}", e))?;
    }

    std::fs::rename(&temp_path, &dest_path).map_err(|e| format!("Rename failed: {}", e))?;

    let _ = std::process::Command::new(&dest_path).spawn();

    Ok(dest_path.to_string_lossy().to_string())
}

#[tauri::command]
async fn open_url(_app_handle: tauri::AppHandle, url: String) -> Result<(), String> {
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
    tauri_plugin_opener::open_url(url, None::<&str>)
        .map_err(|e| e.to_string())
}

// --- Log Scanner Commands ---

#[tauri::command]
async fn start_log_scanner(app: tauri::AppHandle, state: tauri::State<'_, AppState>) -> Result<(), String> {
    if state.log_scanner.lock().unwrap().is_some() {
        return Ok(());
    }
    
    let handle = match log_scanner::spawn_memory_watcher(app.clone()) {
        Ok(h) => h,
        Err(e) => {
            crate::log_scanner::stop_scanner(&app);
            return Err(e);
        }
    };
    *state.log_scanner.lock().unwrap() = Some(handle);
    
    Ok(())
}

#[tauri::command]
async fn stop_log_scanner(app: tauri::AppHandle, state: tauri::State<'_, AppState>) -> Result<(), String> {
    let mut scanner_lock = state.log_scanner.lock().unwrap();
    *scanner_lock = None;
    crate::log_scanner::stop_scanner(&app);
    Ok(())
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
    app.emit("fissure-relic-phase", FissureEvent {
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
    app.emit("fissure-reward-phase", FissureEvent {
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
        let _ = app_handle.emit("expire-notification", id_str);
    });
}

#[derive(serde::Deserialize)]
struct HotkeyDef {
    shortcut: String,
    action: String,
}

#[tauri::command]
async fn set_hotkeys(app: AppHandle, hotkeys: Vec<HotkeyDef>) -> Result<(), String> {
    // Fallback: register individually via plugin
    use tauri_plugin_global_shortcut::GlobalShortcutExt;
    let _ = app.global_shortcut().unregister_all();
    for hk in &hotkeys {
        if hk.shortcut.is_empty() || hk.action.is_empty() {
            continue;
        }
        register_one_via_plugin(&app, &hk.shortcut, &hk.action).await?;
    }
    Ok(())
}

async fn register_one_via_plugin(app: &AppHandle, shortcut: &str, action: &str) -> Result<(), String> {
    use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};
    let shortcut_owned = shortcut.to_string();
    let action_owned = action.to_string();

    let _ = app.global_shortcut().unregister(shortcut);

    let shortcut_for_err = shortcut.to_string();
    app.global_shortcut()
        .on_shortcut(shortcut, move |app_c, _sc, event| {
            if event.state() != ShortcutState::Pressed {
                return;
            }
            eprintln!("[Hotkeys] Triggered: {} -> {}", shortcut_owned, action_owned);
            let app_c = app_c.clone();
            let action_c = action_owned.clone();
            tauri::async_runtime::spawn(async move {
                dispatch_hotkey_action(app_c, &action_c).await;
            });
        })
        .map_err(|e| format!("Failed to register hotkey {}: {:?}", shortcut_for_err, e))?;

    Ok(())
}

async fn dispatch_hotkey_action(app: AppHandle, action: &str) {
    let state = app.state::<AppState>();
    let now = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_millis() as u64;
    let last = state.sidebar_last_op.swap(now, Ordering::Relaxed);
    if now.saturating_sub(last) < 100 {
        eprintln!("[Hotkeys] Ignoring duplicate trigger for: {}", action);
        return;
    }

    eprintln!("[Hotkeys] Triggered: {}", action);
    match action {
        "manual_ocr" => {
            let _ = crate::ocr::trigger_manual_ocr(app, None).await;
        }
        pos @ ("ocr_riven_left" | "ocr_riven_middle" | "ocr_riven_right" | "ocr_riven_linked") => {
            let position = match pos {
                "ocr_riven_left"   => crate::ocr::RivenCardPosition::Left,
                "ocr_riven_middle" => crate::ocr::RivenCardPosition::Middle,
                "ocr_riven_right"  => crate::ocr::RivenCardPosition::Right,
                _                  => crate::ocr::RivenCardPosition::Linked,
            };
            let pos_name = format!("{:?}", position);
            match crate::ocr::ocr_riven_card(app.clone(), position) {
                Ok(result) => {
                    let debug_path = format!("data/user/riven_ocr_{}.png", pos_name);
                    let msg = if result.text.is_empty() {
                        format!("[{}] No text found -- check {} for what was captured", pos_name, debug_path)
                    } else {
                        format!("[{}] {}", pos_name, result.text)
                    };
                    let _ = app.emit("riven-ocr-result", &msg);
                }
                Err(e) => {
                    let _ = app.emit("riven-ocr-result", &format!("[{}] Error: {}", pos_name, e));
                }
            }
        }
        "toggle_sidebar" => {
            let _ = toggle_sidebar(app);
        }
        _ => {
            eprintln!("[Hotkeys] Unknown action: {}", action);
        }
    }
}

#[tauri::command]
fn log_timing(label: String) {
    eprintln!("[TIMING FRONTEND] {}", label);
}

/// Save a JSON settings object to data/user/settings.json.
#[tauri::command]
async fn save_settings(app_handle: tauri::AppHandle, settings: Value) -> Result<(), String> {
    let settings_dir = resolve_path("data/user");
    if !settings_dir.exists() {
        fs::create_dir_all(&settings_dir).map_err(|e| e.to_string())?;
    }
    let content = serde_json::to_string_pretty(&settings).map_err(|e| e.to_string())?;
    fs::write(settings_dir.join("settings.json"), content).map_err(|e| e.to_string())?;
    app_handle.emit("settings-changed", ()).map_err(|e| e.to_string())
}

/// Set the shared monitoring active flag and notify all windows.
#[tauri::command]
fn set_monitoring_active(app_handle: tauri::AppHandle, active: bool, result: Option<String>, status_text: Option<String>) -> Result<(), String> {
    let state = app_handle.state::<AppState>();
    state.monitoring_active.store(active, Ordering::SeqCst);
    app_handle.emit("monitoring-active-changed", serde_json::json!({
        "active": active,
        "result": result,
        "statusText": status_text,
    })).map_err(|e| e.to_string())
}

/// Get the current shared monitoring active state.
#[tauri::command]
fn get_monitoring_active(app_handle: tauri::AppHandle) -> bool {
    let state = app_handle.state::<AppState>();
    state.monitoring_active.load(Ordering::SeqCst)
}

#[tauri::command]
fn set_sidebar_width(app_handle: tauri::AppHandle, width: f64, side: String, persist: bool) -> Result<(), String> {
    eprintln!("[set_sidebar_width] called width={}, side={}, persist={}", width, side, persist);
    if persist {
        let settings_dir = resolve_path("data/user");
        let path = settings_dir.join("settings.json");
        let mut settings: serde_json::Value = if path.exists() {
            std::fs::read_to_string(&path)
                .ok()
                .and_then(|s| serde_json::from_str(&s).ok())
                .unwrap_or_default()
        } else {
            serde_json::json!({})
        };
        if let Some(obj) = settings.as_object_mut() {
            obj.insert("sidebar_width".to_string(), serde_json::json!(width));
            obj.insert("sidebar_side".to_string(), serde_json::json!(side.clone()));
        }
        if !settings_dir.exists() {
            std::fs::create_dir_all(&settings_dir).map_err(|e| e.to_string())?;
        }
        let content = serde_json::to_string_pretty(&settings).map_err(|e| e.to_string())?;
        let _ = std::fs::write(path, content);
    }

    let state = app_handle.state::<AppState>();
    let saved_active;
    let mon_x;
    let mon_y;
    let mon_w;
    let mon_h;
    {
        let mut saved = state.sidebar_saved.lock().unwrap();
        saved_active = saved.active;
        if saved_active {
            saved.side = Some(side.clone());
            mon_x = saved.mon_x;
            mon_y = saved.mon_y;
            mon_w = saved.mon_w;
            mon_h = saved.mon_h;
        } else {
            mon_x = 0; mon_y = 0; mon_w = 0; mon_h = 0;
        }
    }
    if saved_active {
        if let Some(window) = app_handle.get_webview_window("overlay-sidebar") {
            let phys_w = (width as u32).max(200).min((mon_w as f64 * 0.9) as u32);
            let target_x = match side.as_str() {
                "right" => mon_x + mon_w as i32 - phys_w as i32,
                _       => mon_x,
            };
            eprintln!("[set_sidebar_width] computed: phys_w={}, target_x={}, mon_y={}, mon_h={}, mon_x={}, mon_w={}", phys_w, target_x, mon_y, mon_h, mon_x, mon_w);
            let _ = window.set_size(tauri::Size::Physical(tauri::PhysicalSize { width: phys_w, height: mon_h }));
            let _ = window.set_position(tauri::Position::Physical(tauri::PhysicalPosition { x: target_x, y: mon_y }));
        }
        // Notify the overlay sidebar so it can flip nav layout
        let _ = app_handle.emit("sidebar-side-changed", serde_json::json!({"side": side}));
    }
    
    Ok(())
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

#[derive(serde::Serialize)]
struct MonitorInfo {
    index: usize,
    name: String,
    width: u32,
    height: u32,
    is_primary: bool,
}

#[derive(serde::Serialize)]
struct WarframeWindowRect {
    x: i32,
    y: i32,
    width: u32,
    height: u32,
}

/// Find the Warframe window rect using native APIs (no helper binary).
#[tauri::command]
async fn get_warframe_window_rect() -> Result<Option<WarframeWindowRect>, String> {
    let result = tokio::task::spawn_blocking(|| {
        crate::overlay_utils::fetch_warframe_rect_sync()
    })
    .await
    .map_err(|e| e.to_string())?;

    Ok(result.map(|(x, y, w, h)| WarframeWindowRect { x, y, width: w, height: h }))
}

/// Auto-detect which monitor Warframe is on and set target_monitor to it.
#[tauri::command]
async fn auto_detect_warframe_monitor(state: tauri::State<'_, AppState>) -> Result<Option<usize>, String> {
    let rect = match get_warframe_window_rect().await? {
        Some(r) => r,
        None => return Ok(None),
    };

    let cx = rect.x + rect.width as i32 / 2;
    let cy = rect.y + rect.height as i32 / 2;

    let monitors = xcap::Monitor::all().map_err(|e| e.to_string())?;
    for (idx, m) in monitors.iter().enumerate() {
        let mx = m.x().unwrap_or(0) as i32;
        let my = m.y().unwrap_or(0) as i32;
        let mw = m.width().unwrap_or(1920) as i32;
        let mh = m.height().unwrap_or(1080) as i32;
        if cx >= mx && cx < mx + mw && cy >= my && cy < my + mh {
            // Persist to state and settings
            *state.target_monitor.lock().unwrap() = Some(idx);
            let settings_path = crate::resolve_path("data/user/settings.json");
            let mut settings: serde_json::Value = if settings_path.exists() {
                std::fs::read_to_string(&settings_path)
                    .ok()
                    .and_then(|s| serde_json::from_str(&s).ok())
                    .unwrap_or_default()
            } else {
                serde_json::json!({})
            };
            settings["fissure_target_monitor"] = serde_json::json!(idx);
            if let Some(parent) = settings_path.parent() {
                std::fs::create_dir_all(parent).ok();
            }
            let _ = std::fs::write(&settings_path, serde_json::to_string_pretty(&settings).unwrap());
            return Ok(Some(idx));
        }
    }

    Ok(None)
}

#[tauri::command]
async fn get_available_monitors() -> Result<Vec<MonitorInfo>, String> {
    let monitors = xcap::Monitor::all().map_err(|e| e.to_string())?;
    let list = monitors.into_iter().enumerate().map(|(idx, m)| {
        let name = m.name().map(|n| n.to_string()).unwrap_or_else(|_| format!("Monitor {}", idx + 1));
        let width = m.width().unwrap_or(1920);
        let height = m.height().unwrap_or(1080);
        let is_primary = m.is_primary().unwrap_or(false);
        MonitorInfo {
            index: idx,
            name,
            width,
            height,
            is_primary,
        }
    }).collect();
    Ok(list)
}

#[tauri::command]
fn set_target_monitor(state: tauri::State<'_, AppState>, monitor: Value) -> Result<(), String> {
    let mut current = state.target_monitor.lock().unwrap();
    let new_val = match &monitor {
        Value::Number(n) => n.as_u64().map(|v| v as usize),
        Value::String(s) => {
            if s == "auto" { None } else { s.parse::<usize>().ok() }
        }
        _ => None,
    };
    *current = new_val;
    
    // Also persist to settings file
    let settings_path = resolve_path("data/user/settings.json");
    let mut settings: Value = if settings_path.exists() {
        let content = std::fs::read_to_string(&settings_path).map_err(|e| e.to_string())?;
        serde_json::from_str(&content).unwrap_or_default()
    } else {
        serde_json::json!({})
    };
    settings["fissure_target_monitor"] = monitor;
    let content = serde_json::to_string_pretty(&settings).map_err(|e| e.to_string())?;
    
    if let Some(parent) = settings_path.parent() {
        std::fs::create_dir_all(parent).ok();
    }
    std::fs::write(&settings_path, content).map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
fn set_sidebar_hide_on_focus_loss(hide: bool) -> Result<(), String> {
    crate::overlay_utils::SIDEBAR_HIDE_ON_FOCUS_LOSS.store(hide, std::sync::atomic::Ordering::SeqCst);
    Ok(())
}

#[tauri::command]
fn is_warframe_focused() -> bool {
    if let Ok(window) = active_win_pos_rs::get_active_window() {
        let name = window.app_name.to_lowercase();
        let title = window.title.to_lowercase();
        return name.contains("warframe") || title.contains("warframe");
    }
    false
}

/// Estimate the platinum price of a riven using the pricing model.
/// Returns None if the model isn't loaded (e.g. no pricer-models present).
#[tauri::command]
fn estimate_riven_price(input: pricer::RivenInput) -> Option<f32> {
    pricer::estimate_price(&input)
}

/// Full estimate: price + grade + reroll expected value.
#[tauri::command]
fn estimate_riven_full(input: pricer::RivenInput) -> Option<pricer::RivenFullEstimate> {
    pricer::estimate_full(&input)
}

/// Batch estimate: price every riven in one call.
#[tauri::command]
fn estimate_riven_full_batch(inputs: Vec<pricer::RivenInput>) -> Vec<Option<pricer::RivenFullEstimate>> {
    eprintln!("[PRICER CMD] called with {} inputs", inputs.len());
    let result = pricer::estimate_full_batch(&inputs);
    eprintln!("[PRICER CMD] done, {} results", result.len());
    result
}

#[tauri::command]
async fn get_known_weapon_names() -> Vec<String> {
    tauri::async_runtime::spawn_blocking(|| crate::pricer::get_weapon_names())
        .await
        .unwrap_or_default()
}

#[tauri::command]
async fn get_localized_weapon_names(app: tauri::AppHandle, locale: String) -> Vec<weapon_i18n::WeaponNamePair> {
    tauri::async_runtime::spawn_blocking(move || weapon_i18n::localized_weapon_names(&app, &locale))
        .await
        .unwrap_or_default()
}

#[cfg(target_os = "linux")]
pub(crate) fn ensure_gtk_overlay_wrapper(window: &tauri::WebviewWindow) -> Result<(), String> {
    use gtk::prelude::*;
    let label = window.label().to_string();
    window.with_webview(move |pwv| {
        let widget: gtk::Widget = pwv.inner().upcast();
        let box_widget = match widget.parent() {
            Some(p) => p,
            None => { eprintln!("[GTK-WRAP] {label}: webview has no parent yet"); return; }
        };
        let window_container = match box_widget.parent() {
            Some(p) => p,
            None => { eprintln!("[GTK-WRAP] {label}: GtkBox has no parent yet"); return; }
        };
        if window_container.type_().name() == "GtkOverlay" {
            eprintln!("[GTK-WRAP] {label}: already wrapped"); return;
        }
        let vbox = match box_widget.dynamic_cast::<gtk::Box>() {
            Ok(b) => b,
            Err(_) => { eprintln!("[GTK-WRAP] {label}: parent is not GtkBox"); return; }
        };
        let win_container = match window_container.dynamic_cast::<gtk::Container>() {
            Ok(c) => c,
            Err(_) => { eprintln!("[GTK-WRAP] {label}: grandparent is not Container"); return; }
        };
        let overlay = gtk::Overlay::new();
        overlay.set_hexpand(true);
        overlay.set_vexpand(true);
        win_container.remove(&vbox);
        win_container.add(&overlay);
        overlay.add(&vbox);
        overlay.show();
        eprintln!("[GTK-WRAP] {label}: wrapped successfully");
    }).map_err(|e| e.to_string())
}

// ── Wiki (embedded child webview via GTK overlay on Linux) ──────────────
// Tauri's set_position/set_size is broken on the GTK backend (child
// webviews off-origin get mis-positioned by webkit2gtk).  The fix: use
// the raw GTK widget tree directly — reparent both the main and child
// webview into a GtkOverlay, then position the child via
// set_margin_start/set_margin_top/set_size_request, bypassing Tauri's
// buggy coordinate-conversion path entirely.

#[cfg(target_os = "linux")]
fn linux_reparent_and_position(
    main_webview: &tauri::Webview,
    child_webview: &tauri::Webview,
    x: f64, y: f64, width: f64, height: f64,
) -> Result<(), String> {
    use gtk::prelude::*;
    use send_wrapper::SendWrapper;

    // with_webview needs Send + 'static, but GTK widgets aren't Send.
    // SendWrapper<gtk::Widget> IS Send (it panics if dropped off-thread).
    let child_cell: Arc<Mutex<Option<SendWrapper<gtk::Widget>>>> = Arc::default();
    let cc = child_cell.clone();
    child_webview.with_webview(move |pwv| {
        *cc.lock().unwrap() = Some(SendWrapper::new(pwv.inner().upcast::<gtk::Widget>()));
    }).map_err(|e| e.to_string())?;

    let child_wv = child_cell.lock().unwrap().take()
        .ok_or("failed to get child webview widget")?;

    let error: Arc<Mutex<Option<String>>> = Arc::default();
    let err = error.clone();

    main_webview.with_webview(move |pwv| {
        let main_widget: gtk::Widget = pwv.inner().upcast::<gtk::Widget>();

        // Walk up: webview → GtkBox → window container (must be GtkOverlay).
        let parent = match main_widget.parent() {
            Some(p) => p,
            None => { *err.lock().unwrap() = Some("main webview has no parent".into()); return; }
        };
        let window_widget = match parent.parent() {
            Some(p) => p,
            None => { *err.lock().unwrap() = Some("GtkBox has no parent".into()); return; }
        };
        let overlay = match window_widget.dynamic_cast::<gtk::Overlay>() {
            Ok(o) => o,
            Err(_) => { *err.lock().unwrap() = Some("window not pre-wrapped in GtkOverlay (ensure_gtk_overlay_wrapper was not called)".into()); return; }
        };

        // Idempotent: only add_overlay on first call.
        let already_in_overlay = child_wv.parent()
            .map(|p| p.type_().name() == "GtkOverlay")
            .unwrap_or(false);

        if !already_in_overlay {
            if let Some(child_parent) = child_wv.parent() {
                if let Some(container) = child_parent.dynamic_cast::<gtk::Container>().ok() {
                    container.remove(&*child_wv);
                }
            }
            overlay.add_overlay(&*child_wv);
            child_wv.show();
        }

        child_wv.set_halign(gtk::Align::Start);
        child_wv.set_valign(gtk::Align::Start);
        child_wv.set_margin_start(x as i32);
        child_wv.set_margin_top(y as i32);
        child_wv.set_size_request(width as i32, height as i32);

        // Force GTK to re-layout so margin/size changes take effect.
        child_wv.queue_resize();
        if let Some(overlay_widget) = child_wv.parent() {
            overlay_widget.queue_resize();
        }
    }).map_err(|e| e.to_string())?;

    Arc::try_unwrap(error).unwrap().into_inner().unwrap().map_or(Ok(()), Err)
}

/// Ensure a child webview is in the GtkOverlay without changing its position/size.
/// Unlike `linux_reparent_and_position`, this does NOT reset margins or size_request —
/// GTK widget attributes persist across hide/show, so the old correct position is preserved.
#[cfg(target_os = "linux")]
fn linux_ensure_overlay(main_webview: &tauri::Webview, child_webview: &tauri::Webview) -> Result<(), String> {
    use gtk::prelude::*;
    use send_wrapper::SendWrapper;

    let child_cell: Arc<Mutex<Option<SendWrapper<gtk::Widget>>>> = Arc::default();
    let cc = child_cell.clone();
    child_webview.with_webview(move |pwv| {
        *cc.lock().unwrap() = Some(SendWrapper::new(pwv.inner().upcast::<gtk::Widget>()));
    }).map_err(|e| e.to_string())?;

    let child_wv = child_cell.lock().unwrap().take()
        .ok_or("failed to get child webview widget")?;

    let error: Arc<Mutex<Option<String>>> = Arc::default();
    let err = error.clone();

    main_webview.with_webview(move |pwv| {
        let main_widget: gtk::Widget = pwv.inner().upcast::<gtk::Widget>();
        let parent = match main_widget.parent() {
            Some(p) => p,
            None => { *err.lock().unwrap() = Some("main webview has no parent".into()); return; }
        };
        let window_widget = match parent.parent() {
            Some(p) => p,
            None => { *err.lock().unwrap() = Some("GtkBox has no parent".into()); return; }
        };
        let overlay = match window_widget.dynamic_cast::<gtk::Overlay>() {
            Ok(o) => o,
            Err(_) => { *err.lock().unwrap() = Some("not wrapped in GtkOverlay".into()); return; }
        };

        let already_in_overlay = child_wv.parent()
            .map(|p| p.type_().name() == "GtkOverlay")
            .unwrap_or(false);

        if !already_in_overlay {
            if let Some(child_parent) = child_wv.parent() {
                if let Some(container) = child_parent.dynamic_cast::<gtk::Container>().ok() {
                    container.remove(&*child_wv);
                }
            }
            overlay.add_overlay(&*child_wv);
            child_wv.set_halign(gtk::Align::Start);
            child_wv.set_valign(gtk::Align::Start);
            child_wv.show();
        }

        child_wv.queue_resize();
        if let Some(overlay_widget) = child_wv.parent() {
            overlay_widget.queue_resize();
        }
    }).map_err(|e| e.to_string())?;

    Arc::try_unwrap(error).unwrap().into_inner().unwrap().map_or(Ok(()), Err)
}
/// Resolve the actual webview label for a wiki tab.
/// If the label is already namespaced for this window, use as-is;
/// otherwise prefix with the window label so each window has independent tabs.
fn wiki_actual(window_label: &str, label: &str) -> String {
    let prefix = format!("{}-", window_label);
    if label.starts_with(&prefix) {
        label.to_string()
    } else {
        format!("{}{}", prefix, label)
    }
}

#[tauri::command]
fn show_wiki_tab(webview: tauri::Webview, label: String, url: Option<String>) -> Result<String, String> {
    let app = webview.app_handle();
    let window = webview.window();
    let window_label = window.label().to_string();
    let actual = wiki_actual(&window_label, &label);
    let canonical_id = label.clone();

    // Track active wiki tab per-window — hide previous if different.
    if let Some(state) = app.try_state::<AppState>() {
        let mut active = state.active_wiki_tab.lock();
        if let Some(prev) = active.get(&window_label) {
            if prev != &actual {
                if let Some(w) = app.get_webview(prev) {
                    let _ = w.hide();
                }
            }
        }
        active.insert(window_label.clone(), actual.clone());
    }

    if let Some(existing) = app.get_webview(&actual) {
        existing.show().map_err(|e| e.to_string())?;
        // If a URL is provided, navigate the existing webview to it.
        if let Some(nav_url) = &url {
            if let Ok(parsed) = nav_url.parse::<url::Url>() {
                let _ = existing.navigate(parsed);
            }
        }
        // Re-ensure overlay membership without resetting margins/size.
        #[cfg(target_os = "linux")]
        {
            if let Some(parent_wv) = app.get_webview(webview.label()) {
                let _ = linux_ensure_overlay(&parent_wv, &existing);
            }
        }
        return Ok(actual);
    }

    let target = url.unwrap_or_else(|| "https://wiki.warframe.com".to_string());
    let ah = app.clone();
    let ah_for_title = ah.clone();
    let ah_for_nav = ah.clone();
    let win_label = window_label.clone();
    let win_label_for_title = win_label.clone();
    let canonical_id2 = canonical_id.clone();
    let target_for_insert = target.clone();
    let builder = WebviewBuilder::new(&actual, WebviewUrl::External(
        target.parse().map_err(|e: url::ParseError| e.to_string())?
    ))
    .on_new_window(move |new_url, _features| {
        let ts = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH).unwrap().as_nanos();
        // Emit canonical (non-window-prefixed) label so any window can open it.
        let new_label = format!("wiki-{}", ts);
        let _ = ah.emit("wiki-tab-opened", serde_json::json!({
            "label": new_label, "url": new_url.to_string(), "opener": canonical_id2,
            "source_window": win_label,
        }));
        tauri::webview::NewWindowResponse::Deny
    })
    .on_document_title_changed({
        let child_id = canonical_id.clone();
        let ah_title = ah_for_title;
        let win_label_title = win_label_for_title;
        move |_child_window, title| {
            // Emit title event app-wide so the host React listener receives it.
            let _ = ah_title.emit("wiki-tab-title", serde_json::json!({
                "title": title, "source_window": win_label_title, "label": child_id,
            }));
            // Update shared tab list and broadcast.
            if let Some(state) = ah_title.try_state::<AppState>() {
                let mut tabs = state.wiki_tabs.lock();
                if let Some(tab) = tabs.iter_mut().find(|t| t.id == *child_id) {
                    tab.title = title.to_string();
                }
                let _ = ah_title.emit("wiki-tabs-changed", &*tabs);
            }
        }})
    .on_navigation({
        let nav_id = canonical_id.clone();
        let ah_nav = ah_for_nav;
        move |url| {
            if let Some(state) = ah_nav.try_state::<AppState>() {
                let mut tabs = state.wiki_tabs.lock();
                if let Some(tab) = tabs.iter_mut().find(|t| t.id == *nav_id) {
                    tab.url = url.to_string();
                }
                let snapshot = tabs.clone();
                drop(tabs);
                let _ = ah_nav.emit("wiki-tabs-changed", snapshot);
            }
            true // allow navigation
        }
    })

    .initialization_script(r#"
document.addEventListener('auxclick', (e) => {
    if (e.button === 1) {
        const link = e.target.closest('a[href]');
        if (link && !link.target) {
            e.preventDefault();
            window.open(link.href, '_blank');
        }
    }
});
"#);

    #[cfg(target_os = "linux")]
    {
        if let Some(ww) = app.get_webview_window(window.label()) {
            let _ = ensure_gtk_overlay_wrapper(&ww);
        }
    }

    window.add_child(builder,
        tauri::PhysicalPosition::new(0, 0),
        tauri::PhysicalSize::new(100, 100),
    ).map_err(|e| e.to_string())?;

    #[cfg(target_os = "linux")]
    {
        let parent_wv = app.get_webview(webview.label()).ok_or("invoking webview not found")?;
        let child_wv = app.get_webview(&actual).ok_or("child webview not found after add_child")?;
        linux_reparent_and_position(&parent_wv, &child_wv, 0.0, 0.0, 100.0, 100.0)?;
    }

    // Insert into shared tab list and broadcast.
    if let Some(state) = app.try_state::<AppState>() {
        let mut tabs = state.wiki_tabs.lock();
        if !tabs.iter().any(|t| t.id == canonical_id) {
            tabs.push(WikiTabInfo {
                id: canonical_id,
                url: target_for_insert,
                title: "New tab".to_string(),
            });
        }
        let _ = app.emit("wiki-tabs-changed", &*tabs);
    }

    Ok(actual)
}

#[tauri::command]
fn hide_wiki_tab(webview: tauri::Webview, label: String) -> Result<(), String> {
    let actual = wiki_actual(&webview.window().label(), &label);
    if let Some(w) = webview.app_handle().get_webview(&actual) {
        w.hide().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn list_wiki_tabs(app: tauri::AppHandle) -> Vec<WikiTabInfo> {
    if let Some(state) = app.try_state::<AppState>() {
        state.wiki_tabs.lock().clone()
    } else {
        Vec::new()
    }
}

#[tauri::command]
fn close_wiki_tab(webview: tauri::Webview, label: String) -> Result<(), String> {
    let app = webview.app_handle();
    let window_label = webview.window().label().to_string();
    let actual = wiki_actual(&window_label, &label);
    if let Some(w) = app.get_webview(&actual) { w.hide().map_err(|e| e.to_string())?; }

    // Remove from shared tab list and broadcast.
    if let Some(state) = app.try_state::<AppState>() {
        let mut tabs = state.wiki_tabs.lock();
        tabs.retain(|t| t.id != label);
        let _ = app.emit("wiki-tabs-changed", &*tabs);
    }

    Ok(())
}

#[tauri::command]
fn refresh_wiki_tab(webview: tauri::Webview, label: String) -> Result<(), String> {
    let actual = wiki_actual(&webview.window().label(), &label);
    if let Some(w) = webview.app_handle().get_webview(&actual) {
        w.reload().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn sync_wiki_tab(webview: tauri::Webview, label: String, url: String) -> Result<(), String> {
    let actual = wiki_actual(&webview.window().label(), &label);
    if let Some(w) = webview.app_handle().get_webview(&actual) {
        let parsed = url.parse().map_err(|e: url::ParseError| e.to_string())?;
        w.navigate(parsed).map_err(|e| e.to_string())?;
    }
    // No-op if webview doesn't exist (lazy creation preserved).
    Ok(())
}

#[tauri::command]
fn reflow_wiki_tab(webview: tauri::Webview, label: String, x: f64, y: f64, width: f64, height: f64) -> Result<(), String> {
    let actual = wiki_actual(&webview.window().label(), &label);
    #[cfg(target_os = "linux")]
    {
        let app = webview.app_handle();
        if let Some(ww) = app.get_webview_window(webview.window().label()) {
            let _ = ensure_gtk_overlay_wrapper(&ww);
        }
        let parent_wv = app.get_webview(webview.label()).ok_or("invoking webview not found")?;
        let child_wv = app.get_webview(&actual).ok_or("child webview not found")?;
        linux_reparent_and_position(&parent_wv, &child_wv, x, y, width, height)?;
    }

    #[cfg(not(target_os = "linux"))]
    {
        let app = webview.app_handle();
        if let Some(w) = app.get_webview(&actual) {
            w.set_position(tauri::LogicalPosition::new(x, y)).map_err(|e| e.to_string())?;
            w.set_size(tauri::LogicalSize::new(width, height)).map_err(|e| e.to_string())?;
        }
    }

    Ok(())
}
// --- Entry Point ---

 fn main() {
    #[cfg(target_os = "linux")]
    {
        // The default 1024 isn't enough; give ourselves plenty of headroom.
        unsafe {
            let mut lim: libc::rlimit = std::mem::zeroed();
            if libc::getrlimit(libc::RLIMIT_NOFILE, &mut lim) == 0 {
                lim.rlim_cur = 65536u64.min(lim.rlim_max);
                libc::setrlimit(libc::RLIMIT_NOFILE, &lim);
            }
        }

        webkit2gtk_nvidia_quirk::apply_workaround_with_options(Default::default());
        // The quirk crate may not detect the Nvidia driver inside AppImage
        // environments. Set DMABUF disable as a hard fallback.
        if std::env::var("WEBKIT_DISABLE_DMABUF_RENDERER").is_err() {
            std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1");
        }
        // Only disable WebKit EGL compositing on Nvidia hardware. The
        // proprietary Nvidia driver on XWayland produces broken EGL contexts
        // causing white/grey overlay windows. AMD/Intel GPUs handle EGL
        // correctly through Mesa and keep hardware acceleration for better perf.
        let has_nvidia = std::path::Path::new("/proc/driver/nvidia/version").exists()
            || std::process::Command::new("nvidia-smi")
                .stdout(std::process::Stdio::null())
                .stderr(std::process::Stdio::null())
                .status()
                .map(|s| s.success())
                .unwrap_or(false);
        if has_nvidia && std::env::var("WEBKIT_DISABLE_COMPOSITING_MODE").is_err() {
            std::env::set_var("WEBKIT_DISABLE_COMPOSITING_MODE", "1");
        }
        // Force X11 backend unconditionally - X11 is required for:
        //   1. Raw XMoveWindow to position transparent (ARGB visual) windows
        //   2. _NET_WM_STATE_ABOVE for reliable always-on-top
        // Both break under the Wayland backend (compositor controls placement).
        // KDE always provides XWayland, so this is safe.
        std::env::set_var("GDK_BACKEND", "x11");

        // Suppress WebKitGTK's GStreamer "appsink not found" warning.
        // WebKit uses GStreamer internally for HTML5 media, but the app has no
        // media playback dependency - this warning is cosmetic.  GST_DEBUG=*:0
        // silences all GStreamer diagnostic output.  Users can override via
        // their own GST_DEBUG if they want troubleshooting.
        if std::env::var("GST_DEBUG").is_err() {
            std::env::set_var("GST_DEBUG", "*:0");
        }
    }
    // Clear old debug log on startup so it doesn't grow infinitely
    let log_path = resolve_path("data/user/overlay_debug.log");
    let _ = std::fs::write(&log_path, "");

    // Load settings at startup to get saved notif_sound and notif_position
    let saved_settings = std::fs::read_to_string(resolve_path("data/user/settings.json"))
        .ok()
        .and_then(|s| serde_json::from_str::<Value>(&s).ok())
        .unwrap_or_default();
    
    let saved_sound = saved_settings.get("notif_sound")
        .and_then(|v| v.as_str())
        .unwrap_or("notification1.wav");

    let target_monitor_val = saved_settings.get("fissure_target_monitor");
    let target_monitor_idx = match target_monitor_val {
        Some(Value::Number(n)) => n.as_u64().map(|v| v as usize),
        Some(Value::String(s)) => {
            if s == "auto" { None } else { s.parse::<usize>().ok() }
        }
        _ => None,
    };

    // Sync sidebar hide-on-focus-loss to static so focus watcher uses it immediately
    let sidebar_hide = saved_settings
        .get("sidebar_hide_on_focus_loss")
        .and_then(|v| v.as_bool())
        .unwrap_or(true);
    overlay_utils::SIDEBAR_HIDE_ON_FOCUS_LOSS.store(sidebar_hide, std::sync::atomic::Ordering::SeqCst);

    // Fix xcap screen capture on Linux inside AppImage:
    // When run from an AppImage, the usual env-var workarounds for WebKit / Mesa
    // are not set automatically.  Set them here so xcap always gets a working
    // software-renderer path and GDK_BACKEND is forced to X11.
    // Linux env vars set above at process start

    let app = tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .manage(AppState {
            notif_sound: Arc::new(Mutex::new(saved_sound.to_string())),
            log_scanner: Arc::new(Mutex::new(None)),
            active_relic_data: Arc::new(Mutex::new(None)),
            target_monitor: Arc::new(Mutex::new(target_monitor_idx)),
            sidebar_saved: Arc::new(Mutex::new(SidebarSavedState::default())),
            sidebar_last_op: Arc::new(AtomicU64::new(0)),
            monitoring_active: Arc::new(AtomicBool::new(false)),
            main_window_monitor: parking_lot::Mutex::new(None),
            active_wiki_tab: Arc::new(parking_lot::Mutex::new(std::collections::HashMap::new())),
            wiki_tabs: parking_lot::Mutex::new(Vec::new()),
        })
        .on_window_event(|window, event| match event {
            tauri::WindowEvent::CloseRequested { api, .. } => {
                if window.label() == "main" {
                    crate::log_scanner::stop_scanner(&window.app_handle());
                    crate::log_scanner::log_app_stop(&window.app_handle());
                    std::process::exit(0);
                } else {
                    let _ = window.hide();
                    api.prevent_close();
                }
            }
            _ => {}
        })
        .setup(|app| {
            crate::log_scanner::log_app_start(&app.handle());
            let ah = app.handle().clone();
            // Register the frontend-ready listener BEFORE the blocking
            // extract_bundled_assets call, so we never miss the event if
            // the webview loads fast and JS emits while Rust is busy.
            if let Some(main_win) = app.get_webview_window("main") {
                let win = main_win.clone();
                main_win.once("frontend-ready", move |_| {
                    let _ = win.show();
                    let _ = win.set_focus();
                    #[cfg(target_os = "linux")]
                    { let _ = ensure_gtk_overlay_wrapper(&win); }
                    // Cache main window's monitor once, before any wiki interaction
                    // can corrupt Tauri's window registry.
                    if let Ok(Some(monitor)) = win.current_monitor() {
                        let ah = win.app_handle();
                        if let Some(state) = ah.try_state::<crate::AppState>() {
                            *state.main_window_monitor.lock() = Some(monitor.clone());
                            let pos = monitor.position();
                            let size = monitor.size();
                            eprintln!("[MONITOR-CACHE] main window monitor cached: {}x{}+{}+{}",
                                size.width, size.height, pos.x, pos.y);
                        }
                    }
                });
            }
            // Extract bundled assets before the window is shown, so the
            // blocking I/O (first-launch copy) doesn't freeze a visible window.
            extract_bundled_assets(&ah);
            // Fallback: if the frontend never fires frontend-ready (e.g.
            // WebView2 navigation failure or a very slow disk), force-show
            // the window after 5s so the user can see what happened.
            let ah3 = ah.clone();
            std::thread::spawn(move || {
                std::thread::sleep(std::time::Duration::from_secs(5));
                if let Some(main_win) = ah3.get_webview_window("main") {
                    if !main_win.is_visible().unwrap_or(false) {
                        let _ = main_win.show();
                        let _ = main_win.set_focus();
                        #[cfg(target_os = "linux")]
                        { let _ = crate::ensure_gtk_overlay_wrapper(&main_win); }
                        // Also cache in the fallback path (frontend-ready never fired)
                        if let Ok(Some(monitor)) = main_win.current_monitor() {
                            if let Some(state) = ah3.try_state::<crate::AppState>() {
                                *state.main_window_monitor.lock() = Some(monitor);
                            }
                        }
                        #[cfg(any(debug_assertions, feature = "devtools"))]
                        let _ = main_win.open_devtools();
                        eprintln!("[DEBUG] Force-showed main window after 5s (frontend-ready not received)");
                    }
                }
            });
            // Download PP-OCRv5 models in background (needed by ocr_engine)
            tauri::async_runtime::spawn(async move {
                match check_ocr_models().await {
                    Ok(msg) => eprintln!("[OCR MODELS] {}", msg),
                    Err(e) => eprintln!("[OCR MODELS] Download failed: {}", e),
                }
            });
            // Download riven pricing model in background (needed by pricer)
            tauri::async_runtime::spawn(async move {
                match check_pricer_models().await {
                    Ok(msg) => eprintln!("[PRICER MODELS] {}", msg),
                    Err(e) => eprintln!("[PRICER MODELS] Download failed: {}", e),
                }
                // Eager-init the pricer so it's ready when the user first
                // navigates to the Rivens tab or opens a riven overlay.
                std::thread::sleep(std::time::Duration::from_millis(200));
                crate::pricer::ensure_loaded();
            });
            // Extract card images in the background (was synchronous before
            // app.run(), which froze the window during startup).
            let ah4 = ah.clone();
            std::thread::spawn(move || {
                std::thread::sleep(std::time::Duration::from_millis(500));
                if let Some(cache_path) = detect_cache_inner() {
                    match extract_card_images_inner(&ah4, &cache_path) {
                        Ok(count) => eprintln!("[MOD IMAGES] {} card images available", count),
                        Err(e) => eprintln!("[MOD IMAGES] Extraction failed: {}", e),
                    }
                }
            });

            // Pricer is NOT eagerly loaded here - it lazy-inits on first use
            // (estimate_riven_*, get_weapon_names from the Rivens tab).
            // Eager ONNX model load at boot caused allocator contention that
            // stalled the winit event loop → native title-bar drag freezing.
            // Overlay windows are created on-demand by show_window_internal
            // (not eagerly in tauri.conf.json) so WebView2 processes only
            // spin up when an overlay is actually needed.  show() makes them
            // visible after the webview has loaded, avoiding the first-frame
            // black flash on Linux.

            #[cfg(target_os = "linux")]
            {
                // Pre-probe screenshot permission every launch until the user
                // grants it.  Once granted the portal remembers and subsequent
                // probes succeed silently, so we persist the flag in settings.
                let settings = load_settings_sync();
                if settings.get("screenshot_probe_granted") != Some(&serde_json::json!(true)) {
                    let ah = app.handle().clone();
                    tauri::async_runtime::spawn(async move {
                        let status = (|| -> Result<(), String> {
                            let mon = crate::ocr::get_target_monitor(&ah).ok_or("no monitor")?;
                             crate::ocr::capture_monitor_image(&ah, &mon).map(|_| ())
                        })();
                        if status.is_ok() {
                            let path = resolve_path("data/user/settings.json");
                            let mut s = load_settings_sync();
                            if let Some(obj) = s.as_object_mut() {
                                obj.insert("screenshot_probe_granted".into(), serde_json::json!(true));
                                let _ = std::fs::write(&path, serde_json::to_string_pretty(&s).unwrap());
                            }
                        }
                        eprintln!("[OCR] Screenshot probe: {}", if status.is_ok() { "granted" } else { "denied" });
                    });
                }
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // --- data ---
            load_cached_inventory,
            call_api_helper,
            check_exports,
            check_ocr_models,
            check_pricer_models,
            check_media_assets,
            load_all_exports,
            load_txt_file,
            // --- notes ---
            list_notes,
            read_note,
            save_note,
            delete_note,
            // --- misc ---
            open_notes_folder,
            open_map_configs_folder,
            read_map_config,
            write_map_config,
            list_map_configs,
            open_data_folder,
            get_mastery_icons_path,
            get_maps_path,
            get_assets_path,
            get_cdn_base_url,
            get_mod_frames_path,
            get_icons_path,
            get_ui_path,
            // --- mod images ---
            get_card_images_path,
            read_file,
            write_file,
            read_file_bytes,
            resolve_asset_path,
            count_unfixed_card_images,
            ensure_card_images,
            detect_warframe_cache,
            // --- log scanner ---
            crate::log_scanner::get_scanner_status,
            start_log_scanner,
            stop_log_scanner,
            is_scanning,
            simulate_fissure_event,
            crate::ocr::save_debug_screenshot,
            crate::ocr::start_debug_ocr_session,
            crate::ocr::trigger_manual_ocr,
            // --- overlay ---
            show_notification,
            show_relic_overlay,
            show_overlay_window,
            hide_overlay_window,
            resize_overlay_window,
            raise_overlay,
            set_ignore_cursor_events,
            toggle_sidebar,
            sidebar_load_data,
            sidebar_load_inventory,
            set_sidebar_width,
            set_monitoring_active,
            get_monitoring_active,
            log_timing,
            play_notification_sound,
            set_notification_sound,
            start_notif_autoclose_timer,
            relay_event,
            get_active_relic_session,
            open_url,
            download_appimage_update,
            get_platform_info,
            save_settings,
            load_settings,
            log_terminal,
            set_hotkeys,
            crate::ocr::set_fissure_ui_scale,
            crate::ocr::ocr_riven_card,
            crate::ocr::ocr_riven_card_from_file,
            estimate_riven_price,
            estimate_riven_full,
            estimate_riven_full_batch,
            get_known_weapon_names,
            get_localized_weapon_names,
            get_available_monitors,
            set_target_monitor,
            get_warframe_window_rect,
            auto_detect_warframe_monitor,
            is_warframe_focused,
            set_sidebar_hide_on_focus_loss,
            // --- wiki ---
            list_wiki_tabs,
            show_wiki_tab,
            hide_wiki_tab,
            close_wiki_tab,
            reflow_wiki_tab,
            refresh_wiki_tab,
            sync_wiki_tab,
            fetch_url,
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    app.run(|_app_handle, _event| {});
}