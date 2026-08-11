use xcap::Monitor;
use image::DynamicImage;
use tauri::{AppHandle, Emitter, Manager};
use serde::Serialize;
use std::sync::atomic::{AtomicBool, Ordering};
#[cfg(target_os = "linux")]
use std::process::Command;
#[cfg(target_os = "linux")]
use std::time::Duration;

/// Set to true by log_scanner when 10-reactant fires, false when reward screen
/// closes or mission exits. The icon poll loop checks this each iteration.
pub static ICON_SCAN_ACTIVE: AtomicBool = AtomicBool::new(false);

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub enum RivenCardPosition {
    Left,
    Middle,
    Right,
    Linked,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct RivenOcrResult {
    pub text: String,
}

/// Card bounds at 1920×1080: (x1, y1, x2, y2) → stored as (x1, y1, w, h)
const RIVEN_CARD_BOUNDS: [(f64, f64, f64, f64); 4] = [
    (486.0, 506.0, 225.0, 325.0),  // Left   (486,506 → 711,831)
    (815.0, 468.0, 292.0, 414.0),  // Middle (815,468 → 1107,882)
    (1210.0, 511.0, 223.0, 311.0), // Right  (1210,511 → 1433,822)
    (840.0, 376.0, 234.0, 328.0),  // Linked (840,376 → 1074,704)
];

impl RivenCardPosition {
    fn bounds_1080p(&self) -> (f64, f64, f64, f64) {
        match self {
            RivenCardPosition::Left   => RIVEN_CARD_BOUNDS[0],
            RivenCardPosition::Middle => RIVEN_CARD_BOUNDS[1],
            RivenCardPosition::Right  => RIVEN_CARD_BOUNDS[2],
            RivenCardPosition::Linked => RIVEN_CARD_BOUNDS[3],
        }
    }
}

fn ocr_card_image(app: &AppHandle, full: DynamicImage, position: RivenCardPosition, save_crop: bool) -> Result<RivenOcrResult, String> {
    let sw = full.width() as f64;
    let sh = full.height() as f64;
    let sx = sw / 1920.0;
    let sy = sh / 1080.0;
    let scale = USER_UI_SCALE.load(Ordering::SeqCst) as f64 / 100.0;

    let (bx, by, bw, bh) = position.bounds_1080p();
    let box_cx = bx + bw / 2.0;
    let box_cy = by + bh / 2.0;
    let scaled_cx = (960.0 + (box_cx - 960.0) * scale) * sx;
    let scaled_cy = (540.0 + (box_cy - 540.0) * scale) * sy;
    let scaled_w = bw * scale * sx;
    let scaled_h = bh * scale * sy;
    let cx = (scaled_cx - scaled_w / 2.0).round() as u32;
    let cy = (scaled_cy - scaled_h / 2.0).round() as u32;
    let cw = scaled_w.round() as u32;
    let ch = scaled_h.round() as u32;

    if cx + cw > full.width() || cy + ch > full.height() {
        return Err("Card bounds out of screen".to_string());
    }

    let crop = full.crop_imm(cx, cy, cw, ch);

    if save_crop {
        let pos_name = format!("{:?}", position).to_lowercase();
        let mut p = crate::get_data_root();
        p.push("data/user");
        if let Err(e) = std::fs::create_dir_all(&p) {
            crate::logger::log_to_disk(app, &format!("[RIVEN OCR] Failed to create dir {:?}: {}", p, e));
        }
        let debug_path = p.join(format!("riven_debug_{}.png", pos_name));
        crate::logger::log_to_disk(app, &format!("[RIVEN OCR] Saving debug crop to {:?}", debug_path));
        match crop.save(&debug_path) {
            Ok(_) => crate::logger::log_to_disk(app, "[RIVEN OCR] Debug crop saved"),
            Err(e) => crate::logger::log_to_disk(app, &format!("[RIVEN OCR] Failed to save debug crop: {}", e)),
        }
    }

    let rgba = crop.to_rgba8();
    let (w, h) = rgba.dimensions();
    let mut binary = image::GrayImage::new(w, h);
    for y in 0..h {
        for x in 0..w {
            let p = rgba.get_pixel(x, y);
            let lum = p[0] as u16 + p[1] as u16 + p[2] as u16;
            binary.put_pixel(x, y, image::Luma([if lum > 180 { 0 } else { 255 }]));
        }
    }

    {
        let pos_name = format!("{:?}", position).to_lowercase();
        let mut p = crate::get_data_root();
        p.push("data/user");
        let _ = std::fs::create_dir_all(&p);
        let debug_path = p.join(format!("riven_preprocess_{}.png", pos_name));
        let _ = binary.save(&debug_path);
        crate::logger::log_to_disk(app, &format!("[RIVEN OCR] Saved preprocessed image to {:?}", debug_path));
    }

    let mut text_start = 0u32;
    for y in (0..h).rev() {
        let all_white = (0..w).all(|x| binary.get_pixel(x, y)[0] == 255);
        if all_white {
            text_start = y;
            break;
        }
    }
    crate::logger::log_to_disk(app, &format!("[RIVEN OCR] Text region starts at y={}", text_start));

    let text_region = DynamicImage::ImageLuma8(binary)
        .crop_imm(0, text_start, w, h - text_start);

    let results = crate::ocr_engine::recognize_riven(&text_region);
    crate::logger::log_to_disk(app, &format!("[RIVEN OCR] Raw lines: {:?}", results));

    let mut merged: Vec<String> = Vec::new();
    for text in results {
        if let Some(prev) = merged.last_mut() {
            if prev.ends_with('-') {
                prev.push_str(&text);
                continue;
            }
        }
        merged.push(text);
    }

    let combined = merged.join(" | ");
    crate::logger::log_to_disk(app, &format!("[RIVEN OCR] Card {:?}: {:?}", position, combined));

    Ok(RivenOcrResult { text: combined })
}

#[tauri::command]
pub fn ocr_riven_card(app: AppHandle, position: RivenCardPosition) -> Result<RivenOcrResult, String> {
    let Some(monitor) = get_target_monitor(&app) else {
        return Err("No target monitor".to_string());
    };
    let image = capture_monitor_image(&app, &monitor)?;
    ocr_card_image(&app, DynamicImage::ImageRgba8(image), position, false)
}

#[tauri::command]
pub fn ocr_riven_card_from_file(app: AppHandle, path: String, position: RivenCardPosition, save_crop: Option<bool>) -> Result<RivenOcrResult, String> {
    let img = image::open(&path).map_err(|e| format!("Failed to load image: {}", e))?;
    ocr_card_image(&app, img, position, save_crop.unwrap_or(false))
}

/// Stores the user's custom UI Scale percentage (e.g. 100 for 1.0, 80 for 0.8)
pub static USER_UI_SCALE: std::sync::atomic::AtomicU32 = std::sync::atomic::AtomicU32::new(100);

#[tauri::command]
pub fn set_fissure_ui_scale(scale: u32) {
    USER_UI_SCALE.store(scale, Ordering::SeqCst);
}

fn is_valid_capture(img: &image::RgbaImage) -> bool {
    let (w, h) = img.dimensions();
    if w == 0 || h == 0 {
        return false;
    }
    // reject all-black/all-transparent buffers (stale compositor frame)
    img.pixels().step_by(997).any(|p| p[0] != 0 || p[1] != 0 || p[2] != 0)
}

#[cfg(target_os = "linux")]
fn try_grim(app: &AppHandle, monitor: &Monitor) -> Option<image::RgbaImage> {
    let m_x = monitor.x().ok()?;
    let m_y = monitor.y().ok()?;
    let m_w = monitor.width().ok()?;
    let m_h = monitor.height().ok()?;

    let tmp = std::env::temp_dir().join("kronos_grim_capture.png");
    let path = tmp.to_string_lossy().to_string();
    let geom = format!("{}x{}+{}+{}", m_w, m_h, m_x, m_y);
    let ok = Command::new("grim")
        .args(["-g", &geom, &path])
        .status()
        .ok()
        .map(|s| s.success())
        .unwrap_or(false);

    if !ok {
        eprintln!("[OCR] grim fallback failed (not installed or wlr-screencopy unavailable)");
        return None;
    }
    std::thread::sleep(Duration::from_millis(200));
    let result = match image::open(&path) {
        Ok(img) => {
            crate::logger::log_to_disk(app, "[OCR] Capture via grim fallback");
            Some(img.to_rgba8())
        }
        Err(e) => {
            eprintln!("[OCR] grim capture load failed: {}", e);
            crate::logger::log_to_disk(app, &format!("[OCR] grim capture load failed: {}", e));
            None
        }
    };
    let _ = std::fs::remove_file(&path);
    result
}

#[cfg(target_os = "linux")]
fn try_spectacle(app: &AppHandle, monitor: &Monitor) -> Option<image::RgbaImage> {
    let mon_x = monitor.x().ok()? as u32;
    let mon_y = monitor.y().ok()? as u32;
    let mon_w = monitor.width().ok()?;
    let mon_h = monitor.height().ok()?;

    let tmp = std::env::temp_dir().join("kronos_screenshot.png");
    let path = tmp.to_string_lossy().to_string();

    let ok = Command::new("spectacle")
        .args(["-b", "-n", "-f", "-o", &path])
        .status()
        .ok()
        .map(|s| s.success())
        .unwrap_or(false);

    if !ok {
        return None;
    }
    std::thread::sleep(Duration::from_millis(300));
    let result = match image::open(&path) {
        Ok(mut full) => {
            let cropped = full.crop(mon_x, mon_y, mon_w, mon_h);
            crate::logger::log_to_disk(app, "[OCR] Capture via spectacle fallback");
            Some(cropped.to_rgba8())
        }
        Err(e) => {
            eprintln!("[OCR] spectacle capture load failed: {}", e);
            crate::logger::log_to_disk(app, &format!("[OCR] spectacle capture load failed: {}", e));
            None
        }
    };
    let _ = std::fs::remove_file(&path);
    result
}

#[cfg(target_os = "linux")]
fn try_import(app: &AppHandle, monitor: &Monitor) -> Option<image::RgbaImage> {
    let mon_x = monitor.x().ok()? as u32;
    let mon_y = monitor.y().ok()? as u32;
    let mon_w = monitor.width().ok()?;
    let mon_h = monitor.height().ok()?;

    let tmp = std::env::temp_dir().join("kronos_screenshot.png");
    let path = tmp.to_string_lossy().to_string();

    let ok = Command::new("import")
        .args(["-window", "root", &path])
        .status()
        .ok()
        .map(|s| s.success())
        .unwrap_or(false);

    if !ok {
        return None;
    }
    std::thread::sleep(Duration::from_millis(300));
    let result = match image::open(&path) {
        Ok(mut full) => {
            let cropped = full.crop(mon_x, mon_y, mon_w, mon_h);
            crate::logger::log_to_disk(app, "[OCR] Capture via import fallback");
            Some(cropped.to_rgba8())
        }
        Err(e) => {
            eprintln!("[OCR] import capture load failed: {}", e);
            crate::logger::log_to_disk(app, &format!("[OCR] import capture load failed: {}", e));
            None
        }
    };
    let _ = std::fs::remove_file(&path);
    result
}

#[cfg(target_os = "linux")]
fn is_kde_kwin() -> bool {
    std::env::var("XDG_CURRENT_DESKTOP")
        .map(|v| v.to_lowercase().contains("kde"))
        .unwrap_or(false)
}

pub(crate) fn capture_monitor_image(app: &AppHandle, monitor: &Monitor) -> Result<image::RgbaImage, String> {
    #[cfg(target_os = "linux")]
    {
        let is_wayland = std::env::var("XDG_SESSION_TYPE")
            .map(|v| v == "wayland")
            .unwrap_or(false);

        if is_wayland {
            if let Some(img) = try_grim(app, monitor) {
                if is_valid_capture(&img) {
                    return Ok(img);
                }
                eprintln!("[OCR] grim returned invalid/blank buffer, discarding");
            }
        }

        if let Ok(img) = monitor.capture_image() {
            if is_valid_capture(&img) {
                crate::logger::log_to_disk(app, "[OCR] Capture via xcap Monitor");
                return Ok(img);
            }
            crate::logger::log_to_disk(app, "[OCR] xcap returned invalid/blank buffer, discarding");
        } else {
            crate::logger::log_to_disk(app, "[OCR] xcap Monitor::capture_image failed");
        }

        // Fallback: capture the Warframe XWayland window directly via XCB
        if let Ok(windows) = xcap::Window::all() {
            let warframe = windows.iter().find(|w| {
                w.title().as_deref().unwrap_or("").contains("Warframe")
            }).cloned();
            if let Some(w) = warframe {
                if let Ok(img) = w.capture_image() {
                    if is_valid_capture(&img) {
                        crate::logger::log_to_disk(app, "[OCR] Capture via xcap Window (Warframe XWayland)");
                        return Ok(img);
                    }
                    crate::logger::log_to_disk(app, "[OCR] xcap Window returned invalid/blank buffer, discarding");
                }
            }
        }

        if is_wayland {
            if is_kde_kwin() {
                if let Some(img) = try_spectacle(app, monitor) {
                    if is_valid_capture(&img) {
                        return Ok(img);
                    }
                }
            }
        } else {
            if let Some(img) = try_import(app, monitor) {
                if is_valid_capture(&img) {
                    return Ok(img);
                }
            }
        }

        crate::logger::log_to_disk(app, "[OCR] Capture failed (all methods exhausted or returned invalid data)");
        return Err("capture failed (all methods exhausted or returned invalid data)".to_string());
    }

    #[cfg(not(target_os = "linux"))]
    {
        if let Ok(img) = monitor.capture_image() {
            return Ok(img);
        }
        Err("capture failed (xcap returned error)".to_string())
    }
}

pub fn get_target_monitor(app: &AppHandle) -> Option<Monitor> {
    let monitors = Monitor::all().unwrap_or_default();
    if monitors.is_empty() {
        return None;
    }

    // Prefer the monitor that contains Warframe's window centre  -  the
    // xcap-index-crossover bug means a stored index from Tauri's enumeration
    // may point to the wrong display when used with xcap's ordering.
    if let Some(wf_rect) = warframe_window_rect_sync() {
        let wf_cx = wf_rect.0 + wf_rect.2 as i32 / 2;
        let wf_cy = wf_rect.1 + wf_rect.3 as i32 / 2;
        for m in &monitors {
            if let (Ok(x), Ok(y), Ok(w_), Ok(h_)) = (m.x(), m.y(), m.width(), m.height()) {
                let right = x as i32 + w_ as i32;
                let bottom = y as i32 + h_ as i32;
                if wf_cx >= x as i32 && wf_cx < right
                    && wf_cy >= y as i32 && wf_cy < bottom
                {
                    return Some(m.clone());
                }
            }
        }
    }

    // Fallback: user's stored preference, then primary.
    let state = app.state::<crate::AppState>();
    let target_idx = *state.target_monitor.lock().unwrap();
    if let Some(idx) = target_idx {
        if idx < monitors.len() {
            return Some(monitors[idx].clone());
        }
    }
    let primary = monitors.iter()
        .find(|m| m.is_primary().unwrap_or(false))
        .cloned();
    primary.or_else(|| monitors.first().cloned())
}

/// Retrieve Warframe's window geometry via the shared focus-watcher cache
/// or by enumerating xcap windows.
fn warframe_window_rect_sync() -> Option<(i32, i32, u32, u32)> {
    // Try the focus-watcher's WARFRAME_CACHE first (updated every 500 ms).
    #[cfg(any(target_os = "linux", target_os = "windows"))]
    {
        if let Ok(cache) = crate::overlay_utils::WARFRAME_CACHE.lock() {
            if let Some(rect) = *cache {
                return Some((rect.x, rect.y, rect.w, rect.h));
            }
        }
    }
    // Fallback: enumerate xcap windows directly.
    if let Ok(windows) = xcap::Window::all() {
        if let Some(w) = windows.iter().find(|w| {
            w.title().as_deref().unwrap_or("").contains("Warframe")
        }) {
            if let (Ok(x), Ok(y), Ok(w_), Ok(h_)) = (w.x(), w.y(), w.width(), w.height()) {
                return Some((x, y, w_, h_));
            }
        }
    }
    None
}

struct RequiemTemplate {
    name: &'static str,
    image: image::RgbaImage,
}

static REQUIEM_TEMPLATES: std::sync::OnceLock<Vec<RequiemTemplate>> = std::sync::OnceLock::new();

fn get_requiem_templates() -> &'static Vec<RequiemTemplate> {
    REQUIEM_TEMPLATES.get_or_init(|| {
        let raw: &[(&str, &[u8])] = &[
            ("Fass", include_bytes!("../data/assets/ocr/RequiemFass.png")),
            ("Jahu", include_bytes!("../data/assets/ocr/RequiemJahu.png")),
            ("Khra", include_bytes!("../data/assets/ocr/RequiemKhra.png")),
            ("Lohk", include_bytes!("../data/assets/ocr/RequiemLohk.png")),
            ("Netra", include_bytes!("../data/assets/ocr/RequiemNetra.png")),
            ("Ris", include_bytes!("../data/assets/ocr/RequiemRis.png")),
            ("Vome", include_bytes!("../data/assets/ocr/RequiemVome.png")),
            ("Xata", include_bytes!("../data/assets/ocr/RequiemXata.png")),
        ];
        raw.iter()
            .filter_map(|(name, bytes)| {
                image::load_from_memory(bytes).ok().map(|img| {
                    RequiemTemplate {
                        name,
                        image: img.to_rgba8(),
                    }
                })
            })
            .collect()
    })
}

macro_rules! ocr_log {
    ($app:expr, $($arg:tt)*) => {{
        let msg = format!($($arg)*);
        eprintln!("{}", msg);
        crate::logger::log_to_disk($app, &msg);
    }};
}

#[derive(Clone, Serialize, Debug)]
pub struct OcrSlotResult {
    pub slot: usize,
    pub text: String,
}

#[derive(Clone, Serialize, Debug)]
pub struct OcrBandResult {
    pub text: String,
    pub slot_results: Vec<OcrSlotResult>,
    pub is_debug: bool,
}

// User-provided coordinates for 1920x1080
// Rewards are centered - adjust positions accordingly
// Return pixel regions for a given squad size and current UI scale
fn get_slot_rects(squad_size: usize, active_scale: f64) -> Vec<(u32, u32, u32, u32)> {
    // Base 1.0 coordinates at 1920x1080 resolution (with corrected first slot typo: 418 -> 478)
    let base_rects = match squad_size {
        4 => vec![
            (478, 412, 235, 48),
            (721, 412, 235, 48),
            (965, 412, 235, 48),
            (1209, 412, 235, 48),
        ],
        3 => vec![
            (600, 412, 235, 48),
            (842, 412, 235, 48),
            (1084, 412, 235, 48),
        ],
        2 => vec![
            (721, 412, 235, 48),
            (965, 412, 235, 48),
        ],
        _ => return vec![],
    };

    // Screen reference anchors for centered UI scaling (1920x1080 reference)
    let cx = 960.0;
    let cy = 540.0;

    base_rects
        .into_iter()
        .map(|(x, y, w, h)| {
            // 1. Calculate the center of the reference box
            let box_cx = x as f64 + w as f64 / 2.0;
            let box_cy = y as f64 + h as f64 / 2.0;

            // 2. Scale the center point towards the screen center (960, 540)
            let scaled_box_cx = cx + (box_cx - cx) * active_scale;
            let scaled_box_cy = cy + (box_cy - cy) * active_scale;

            // 3. Scale the dimensions
            let scaled_w = w as f64 * active_scale;
            let scaled_h = h as f64 * active_scale;

            // 4. Reconstruct top-left coordinates
            let scaled_x = scaled_box_cx - scaled_w / 2.0;
            let scaled_y = scaled_box_cy - scaled_h / 2.0;

            (
                scaled_x.round() as u32,
                scaled_y.round() as u32,
                scaled_w.round() as u32,
                scaled_h.round() as u32,
            )
        })
        .collect()
}

fn identify_requiem_mod(_app: &AppHandle, slot_crop: &DynamicImage, slot_idx: usize) -> Option<String> {
    let templates = get_requiem_templates();
    if templates.is_empty() {
        return None;
    }

    let (cw, ch) = (slot_crop.width(), slot_crop.height());
    if cw < 4 || ch < 4 {
        return None;
    }

    // Use raw red channel - no contrast stretch, mean-subtracted NCC handles it
    let crop_rgb = slot_crop.to_rgb8();
    let crop_red = red_channel(&crop_rgb);
    let crop_resized = image::imageops::resize(&crop_red, cw, ch, image::imageops::FilterType::Lanczos3);
    let crop_raw = crop_resized.as_raw();

    let mut results: Vec<(&'static str, f32)> = Vec::new();

    for t in templates {
        // Raw red channel, no stretch
        let tpl_rgb = DynamicImage::ImageRgba8(t.image.clone()).to_rgb8();
        let tpl_red = red_channel(&tpl_rgb);
        let tpl_resized = image::imageops::resize(&tpl_red, cw, ch, image::imageops::FilterType::Lanczos3);
        let tpl_raw = tpl_resized.as_raw();

        // Mean-subtracted (Pearson) NCC - single pass, no sliding window
        let n = (cw * ch) as f64;
        let t_mean: f64 = tpl_raw.iter().map(|&v| v as f64).sum::<f64>() / n;
        let p_mean: f64 = crop_raw.iter().map(|&v| v as f64).sum::<f64>() / n;

        let mut dot = 0.0f64;
        let mut t_sq = 0.0f64;
        let mut p_sq = 0.0f64;
        for (tv, pv) in tpl_raw.iter().zip(crop_raw.iter()) {
            let tc = *tv as f64 - t_mean;
            let pc = *pv as f64 - p_mean;
            dot += tc * pc;
            t_sq += tc * tc;
            p_sq += pc * pc;
        }
        let ncc = (dot / (t_sq.sqrt() * p_sq.sqrt()).max(1e-8)) as f32;

        eprintln!("[OCR] Slot {} Requiem '{}' pearson: {:.3}", slot_idx, t.name, ncc);
        results.push((t.name, ncc));
    }

    results.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
    let (best_name, best_score) = results.first().copied().unwrap_or(("none", -1.0));
    let margin = if results.len() > 1 { best_score - results[1].1 } else { 1.0 };

    eprintln!("[OCR] Slot {} requiem best: {} at pearson {:.3}, margin: {:.3}",
        slot_idx, best_name, best_score, margin);

    if best_score > 0.40 && margin >= 0.010 {
        Some(best_name.to_string())
    } else {
        None
    }
}

/// Extract the red channel as a GrayImage (single-channel, 0-255)
fn red_channel(rgb: &image::RgbImage) -> image::GrayImage {
    let (w, h) = rgb.dimensions();
    image::GrayImage::from_fn(w, h, |x, y| {
        image::Luma([rgb.get_pixel(x, y).0[0]])
    })
}

/// Linear contrast stretch: map min→0, max→255
// Requiem icon positions at 1.0 scale (1920x1080)
fn get_requiem_rects(squad_size: usize) -> Vec<(u32, u32, u32, u32)> {
    match squad_size {
        4 => vec![
            (569, 315, 55, 55),  // slot 0
            (811, 315, 55, 55),  // slot 1
            (1053, 315, 55, 55), // slot 2
            (1295, 315, 55, 55), // slot 3
        ],
        3 => vec![
            (678, 302, 85, 85),  // slot 0
            (918, 302, 85, 85),  // slot 1
            (1163, 302, 85, 85), // slot 2
        ],
        _ => vec![],
    }
}

/// Returns the requiem icon rect for slot index at given scale.
fn get_requiem_rect(slot_idx: usize, squad_size: usize, active_scale: f64) -> (u32, u32, u32, u32) {
    let base_rects = get_requiem_rects(squad_size);
    if slot_idx >= base_rects.len() {
        return (0, 0, 0, 0);
    }
    let (x, y, w, h) = base_rects[slot_idx];

    let cx = 960.0;
    let cy = 540.0;
    let box_cx = x as f64 + w as f64 / 2.0;
    let box_cy = y as f64 + h as f64 / 2.0;

    let scaled_box_cx = cx + (box_cx - cx) * active_scale;
    let scaled_box_cy = cy + (box_cy - cy) * active_scale;
    let scaled_w = w as f64 * active_scale;
    let scaled_h = h as f64 * active_scale;

    (
        (scaled_box_cx - scaled_w / 2.0) as u32,
        (scaled_box_cy - scaled_h / 2.0) as u32,
        scaled_w as u32,
        scaled_h as u32,
    )
}


pub fn run_ocr_pipeline_with_size(app: AppHandle, squad_size: usize, is_debug: bool) {
    run_ocr_internal(app, squad_size, is_debug, None);
}

// ─── Template-based rarity icon detection ─────────────────────────────────────
//
// Templates are 40×30px crops of each rarity icon at 1920×1080, embedded at
// compile time. They are decoded once on first use via OnceLock and reused
// for the lifetime of the process.

static RARITY_TEMPLATES: std::sync::OnceLock<Vec<image::RgbImage>> =
    std::sync::OnceLock::new();

fn get_templates() -> &'static Vec<image::RgbImage> {
    RARITY_TEMPLATES.get_or_init(|| {
        let raw: &[&[u8]] = &[
            include_bytes!("../data/assets/ocr/rarity_rare.png"),
            include_bytes!("../data/assets/ocr/rarity_uncommon.png"),
            include_bytes!("../data/assets/ocr/rarity_common.png"),
        ];
        raw.iter()
            .filter_map(|bytes| image::load_from_memory(bytes).ok().map(|i| i.to_rgb8()))
            .collect()
    })
}

// ─── Position-anchored NCC detection ──────────────────────────────────────────
//
// The reward detection pipeline uses a position-anchored approach to maximize
// reliability and minimize CPU usage.
//
// 1. ANCHORED SEARCH:
//    Because Warframe's reward UI is standardized, relic icons can only appear
//    at specific horizontal coordinates. Instead of a sliding-window search
//    across the entire screen, we only evaluate the Normalized Cross-Correlation
//    (NCC) at 7 known 'anchor' points. This eliminates false positives from 
//    dynamic gameplay backgrounds.
//
// 2. COLOR DISCRIMINATION:
//    Detection is performed using all 3 RGB color channels. This allows the
//    scanner to easily distinguish between Silver and Gold icons which share
//    the same shape but different color profiles.
//
// 3. CONFIGURATION SCORING:
//    The system evaluates the scores of all anchor points against valid squad
//    configurations (2, 3, or 4 slots). It picks the configuration that best
//    explains the detected icons.
//
// 4. PERFORMANCE:
//    Template data is pre-computed (zero-meaned and normalized) once per 
//    attempt to keep the inner detection loop extremely fast.

/// X-centres of all 7 possible rarity-icon positions at 1920×1080.
/// Index layout:
///   0=595  1=717  2=838  3=960  4=1080  5=1202  6=1323
const CENTERS_1080P: [i32; 7] = [595, 717, 838, 960, 1080, 1202, 1323];

/// Which of the 7 indices each squad size occupies:
///   4-slot → 0,2,4,6  (595, 838, 1080, 1323)
///   3-slot → 1,3,5    (717, 960, 1202)
///   2-slot → 2,4      (838, 1080)
const CONFIG_4: &[usize] = &[0, 2, 4, 6];
const CONFIG_3: &[usize] = &[1, 3, 5];
const CONFIG_2: &[usize] = &[2, 4];

// ── Pre-computed template cache ────────────────────────────────────────────────

/// Template data pre-computed once per scan attempt (after resolution scaling).
/// Avoids repeating O(template_pixels) arithmetic inside the hot NCC loop.
struct TemplateData {
    centered: Vec<f32>,   // Interleaved RGB values minus their mean (foreground only)
    fg_indices: Vec<usize>, // Byte offsets into the raw RGB buffer for foreground pixels
    norm: f32,            // sqrt( sum of squared centered values )
    w: u32,
    h: u32,
}

fn precompute_template(img: &image::RgbImage) -> Option<TemplateData> {
    let raw = img.as_raw();
    if raw.is_empty() { return None; }

    // 1. Identify foreground pixels.
    // We treat any pixel with significant brightness as part of the "jagged icon" shape.
    // Background pixels (dark) are ignored to prevent them from diluting the score.
    let mut fg_indices = Vec::new();
    for i in (0..raw.len()).step_by(3) {
        let brightness = raw[i] as f32 * 0.299 + raw[i+1] as f32 * 0.587 + raw[i+2] as f32 * 0.114;
        if brightness > 15.0 {
            fg_indices.push(i);
        }
    }
    if fg_indices.is_empty() { return None; }

    // 2. Compute mean of foreground pixels only
    let mut sum = 0.0f32;
    for &idx in &fg_indices {
        sum += raw[idx] as f32 + raw[idx+1] as f32 + raw[idx+2] as f32;
    }
    let mean = sum / (fg_indices.len() * 3) as f32;

    // 3. Center and compute norm
    let mut centered = vec![0.0f32; raw.len()];
    let mut sum_sq = 0.0f32;
    for &idx in &fg_indices {
        let r = raw[idx] as f32 - mean;
        let g = raw[idx+1] as f32 - mean;
        let b = raw[idx+2] as f32 - mean;
        centered[idx] = r;
        centered[idx+1] = g;
        centered[idx+2] = b;
        sum_sq += r*r + g*g + b*b;
    }
    let norm = sum_sq.sqrt();
    if norm < 1e-6 { return None; }

    Some(TemplateData { centered, fg_indices, norm, w: img.width(), h: img.height() })
}

// ── Single-position NCC ────────────────────────────────────────────────────────

/// Evaluate RGB NCC of `tmpl` against `strip` with the template centred on
/// (`cx`, `cy`) in strip-local pixel coordinates.
/// 
/// This version is "Shape-Aware": it only correlates pixels identified as 
/// foreground in the template, making it immune to background noise.
fn ncc_at(strip: &image::RgbImage, tmpl: &TemplateData, cx: i32, cy: i32) -> f32 {
    let x0 = cx - tmpl.w as i32 / 2;
    let y0 = cy - tmpl.h as i32 / 2;
    if x0 < 0 || y0 < 0 { return 0.0; }
    let x0 = x0 as u32;
    let y0 = y0 as u32;
    if x0 + tmpl.w > strip.width() || y0 + tmpl.h > strip.height() { return 0.0; }

    let sw = strip.width() as usize;
    let raw = strip.as_raw();

    // 1. Calculate mean of the source patch (at foreground locations only)
    let mut p_sum = 0.0f32;
    for &t_idx in &tmpl.fg_indices {
        let dx = (t_idx / 3) as u32 % tmpl.w;
        let dy = (t_idx / 3) as u32 / tmpl.w;
        let p_idx = ((y0 + dy) as usize * sw + (x0 + dx) as usize) * 3;
        
        p_sum += raw[p_idx] as f32 + raw[p_idx + 1] as f32 + raw[p_idx + 2] as f32;
    }
    let p_mean = p_sum / (tmpl.fg_indices.len() * 3) as f32;

    // 2. Calculate Dot Product and Source Norm
    let mut dot = 0.0f32;
    let mut p_sq = 0.0f32;
    for &t_idx in &tmpl.fg_indices {
        let dx = (t_idx / 3) as u32 % tmpl.w;
        let dy = (t_idx / 3) as u32 / tmpl.w;
        let p_idx = ((y0 + dy) as usize * sw + (x0 + dx) as usize) * 3;

        let r = raw[p_idx] as f32 - p_mean;
        let g = raw[p_idx + 1] as f32 - p_mean;
        let b = raw[p_idx + 2] as f32 - p_mean;

        dot += r * tmpl.centered[t_idx] + g * tmpl.centered[t_idx + 1] + b * tmpl.centered[t_idx + 2];
        p_sq += r * r + g * g + b * b;
    }

    let p_norm = p_sq.sqrt();
    if p_norm < 1e-6 { 0.0 } else { (dot / (tmpl.norm * p_norm)).clamp(-1.0, 1.0) }
}

// ── Configuration scorer ───────────────────────────────────────────────────────

/// Returns (mean_ncc_across_slots, n_slots_that_beat_min_score).
fn score_config(slot_scores: &[f32; 7], indices: &[usize], min_score: f32) -> (f32, usize) {
    let above = indices.iter().filter(|&&i| slot_scores[i] >= min_score).count();
    let mean  = indices.iter().map(|&i| slot_scores[i]).sum::<f32>() / indices.len() as f32;
    (mean, above)
}

// ── Main detection function ────────────────────────────────────────────────────

/// Polls the screen after the 10-reactant trigger until rarity icons are found,
/// then fires the OCR pipeline with the correct slot count.
/// If `manual` is true, stops after 5 seconds (for manual trigger buttons).
/// If `manual` is false, loops until icons found or ICON_SCAN_ACTIVE is cleared.
pub fn detect_slot_count_from_icons(app: AppHandle, manual: bool) {
    std::thread::spawn(move || {
        std::thread::sleep(std::time::Duration::from_millis(500));
        let templates = get_templates();
        if templates.is_empty() {
            ocr_log!(&app, "[OCR] WARN: no rarity templates loaded, aborting icon scan");
            return;
        }

        let mut attempt = 0u32;
        let start_time = std::time::Instant::now();
        const MANUAL_TIMEOUT_SECS: u64 = 5;
        // Give the OCR at least 4 attempts (~1.6s) before honouring an
        // ICON_SCAN_ACTIVE clear - the reward screen can close very quickly
        // for round 2+ in endless missions (Step 5 races against Step 4),
        // and we want to guarantee at least a few detection passes.
        const MIN_ATTEMPTS_BEFORE_YIELD: u32 = 4;

        let mut cached_scale = 0.0f64;
        let mut cached_sx = 0.0f64;
        let mut cached_sy = 0.0f64;
        let mut scaled_templates: Vec<TemplateData> = Vec::new();

        loop {
            if manual && start_time.elapsed().as_secs() >= MANUAL_TIMEOUT_SECS {
                ocr_log!(&app, "[OCR] Icon scan timed out after {} attempts", attempt);
                ICON_SCAN_ACTIVE.store(false, Ordering::SeqCst);
                if let Some(window) = app.get_webview_window("overlay-relic") { let _ = window.hide(); }
                app.emit("fissure-reward-closed", ()).unwrap_or_default();
                return;
            }

            attempt += 1;
            if attempt > 1 {
                std::thread::sleep(std::time::Duration::from_millis(400));
            }

            if attempt >= MIN_ATTEMPTS_BEFORE_YIELD && !ICON_SCAN_ACTIVE.load(Ordering::SeqCst) {
                ocr_log!(&app, "[OCR] Icon scan: flag cleared, stopping (attempt {})", attempt);
                return;
            }

            // ── Screen capture ─────────────────────────────────────────────────
            let Some(monitor) = get_target_monitor(&app) else { continue; };

            let screen = match capture_monitor_image(&app, &monitor) {
                Ok(s) => s,
                Err(e) => {
                    ocr_log!(&app, "[OCR] Capture failed (attempt {}): {}", attempt, e);
                    continue;
                }
            };

            let sw = screen.width()  as f64;
            let sh = screen.height() as f64;
            let sx = sw / 1920.0;
            let sy = sh / 1080.0;
            let active_scale = USER_UI_SCALE.load(Ordering::SeqCst) as f64 / 100.0;

            // ── Strip crop (adjusted for resolution and active UI scale using centered scaling) ─────
            let base_strip_cx = 960.0;
            let base_strip_cy = 478.0;

            let scaled_strip_cx = base_strip_cx;
            let scaled_strip_cy = 540.0 + (base_strip_cy - 540.0) * active_scale;

            let scaled_strip_w = 810.0 * active_scale;
            let scaled_strip_h = 100.0 * active_scale;

            let scaled_strip_x = scaled_strip_cx - scaled_strip_w / 2.0;
            let scaled_strip_y = scaled_strip_cy - scaled_strip_h / 2.0;

            let strip_x = (scaled_strip_x * sx) as u32;
            let strip_y = (scaled_strip_y * sy) as u32;
            let strip_w = (scaled_strip_w * sx).max(1.0) as u32;
            let strip_h = (scaled_strip_h * sy).max(1.0) as u32;

            let rgb_full = DynamicImage::ImageRgba8(screen).to_rgb8();
            if strip_x + strip_w > rgb_full.width() || strip_y + strip_h > rgb_full.height() {
                continue;
            }
            let strip = image::imageops::crop_imm(
                &rgb_full, strip_x, strip_y, strip_w, strip_h
            ).to_image();

            // ── Scale templates to current resolution + UI scale (cached) ─────
            let scale_changed = (active_scale - cached_scale).abs() > f64::EPSILON
                || (sx - cached_sx).abs() > f64::EPSILON
                || (sy - cached_sy).abs() > f64::EPSILON;
            if scale_changed {
                cached_scale = active_scale;
                cached_sx = sx;
                cached_sy = sy;
                scaled_templates = templates.iter().filter_map(|tmpl| {
                    let tw = ((tmpl.width()  as f64 * sx * active_scale).round() as u32).max(1);
                    let th = ((tmpl.height() as f64 * sy * active_scale).round() as u32).max(1);
                    if tw > strip_w || th > strip_h { return None; }
                    let scaled = image::imageops::resize(
                        tmpl, tw, th, image::imageops::FilterType::Lanczos3
                    );
                    precompute_template(&scaled)
                }).collect();
            }

            if scaled_templates.is_empty() { continue; }

            // ── Evaluate NCC at each of the 7 canonical positions ─────────────
            // 
            // We use a ±5px "micro-scan" around each anchor to account for slight
            // alignment drifts caused by UI scale or anti-aliasing.
            let strip_cy = (strip_h / 2) as i32;
            let mut slot_scores = [0.0f32; 7];

            for (i, &cx_1080p) in CENTERS_1080P.iter().enumerate() {
                // Scale the horizontal center towards screen center (960) by active_scale
                let scaled_cx = 960.0 + (cx_1080p as f64 - 960.0) * active_scale;
                let abs_x = (scaled_cx * sx).round() as i32;
                let strip_cx = abs_x - strip_x as i32;

                // Save individual debug crops for manual scans
                if manual {
                    if let Some(t) = scaled_templates.first() {
                        let x0 = (strip_cx - t.w as i32 / 2).max(0) as u32;
                        let y0 = (strip_cy - t.h as i32 / 2).max(0) as u32;
                        if x0 + t.w <= strip.width() && y0 + t.h <= strip.height() {
                            let anchor_crop = image::imageops::crop_imm(&strip, x0, y0, t.w, t.h).to_image();
                            let debug_path = crate::get_data_root().join(format!("data/user/debug_anchor_{}.png", cx_1080p));
                            let _ = anchor_crop.save(debug_path);
                        }
                    }
                }

                let mut best_slot_score = 0.0f32;
                // Probing ±5px horizontally and ±2px vertically for the best match
                for dy in -2..=2 {
                    for dx in -5..=5 {
                        for t in scaled_templates.iter() {
                            let score = ncc_at(&strip, t, strip_cx + dx, strip_cy + dy);
                            if score > best_slot_score {
                                best_slot_score = score;
                            }
                        }
                    }
                }
                slot_scores[i] = best_slot_score;
            }

            ocr_log!(&app,
                "[OCR] Attempt {:>3}: NCC @ [595={:.3} 717={:.3} 838={:.3} 960={:.3} 1080={:.3} 1202={:.3} 1323={:.3}] scale={:.2}",
                attempt,
                slot_scores[0], slot_scores[1], slot_scores[2], slot_scores[3],
                slot_scores[4], slot_scores[5], slot_scores[6],
                active_scale,
            );

            // ── Score each squad-size configuration ────────────────────────────
            //
            // Each configuration (2, 3, or 4 slots) is scored based on the 
            // detected icons at its respective anchor points.
            //
            // ELIGIBILITY RULES (Strict):
            // - 4-slot: All 4 anchors must match.
            // - 3-slot: All 3 anchors must match.
            // - 2-slot: Both anchors must match.
            let min_score = if active_scale <= 0.65 {
                0.65
            } else if active_scale <= 0.85 {
                0.72
            } else {
                0.80
            };

            let (_score4, valid4) = score_config(&slot_scores, CONFIG_4, min_score);
            let (_score3, valid3) = score_config(&slot_scores, CONFIG_3, min_score);
            let (_score2, valid2) = score_config(&slot_scores, CONFIG_2, min_score);

            let ok4 = valid4 == 4;
            let ok3 = valid3 == 3;
            let ok2 = valid2 == 2;

            // Priority-based deduction:
            // Larger squad sizes are checked first. If 4 valid icons are found, 
            // it is a 4-slot layout, regardless of what sub-configurations match.
            let deduced_size = if ok4 {
                4
            } else if ok3 {
                3
            } else if ok2 {
                2
            } else {
                // No configuration matched well enough - keep polling
                continue;
            };

            // ── Matched - fire the OCR pipeline ───────────────────────────────
            ocr_log!(&app,
                "[OCR] Icon scan SUCCESS: {} slots detected (attempt {}, scale={:.2})",
                deduced_size, attempt, active_scale,
            );

            ICON_SCAN_ACTIVE.store(false, Ordering::SeqCst);
            // show_window_internal is called by the frontend on scanner-relic-phase-start,
            // so we don't show() here - avoids flash at (0,0) before positioning.

            let state = app.state::<crate::AppState>();
            let relics: Vec<crate::log_scanner::RelicInfo> =
                if let Ok(cached) = state.active_relic_data.lock() {
                    if let Some(ref val) = *cached {
                        val.get("squad_relics")
                            .and_then(|v| serde_json::from_value(v.clone()).ok())
                            .unwrap_or_default()
                    } else { Vec::new() }
                } else { Vec::new() };

            let event_payload = crate::log_scanner::FissureEvent {
                event_type: "relic_phase_start".to_string(),
                squad_relics: relics,
                local_reward: None,
                squad_size: deduced_size,
                void_tier: None,
            };
            app.emit("scanner-relic-phase-start",
                serde_json::json!({ "squad_size": deduced_size })
            ).unwrap_or_default();
            app.emit("fissure-relic-phase", &event_payload).unwrap_or_default();

            run_ocr_pipeline_with_size(app, deduced_size, manual);
            return;
        }
    });
}

fn run_ocr_internal(app: AppHandle, squad_size: usize, is_debug: bool, captured_image: Option<DynamicImage>) {
    run_ocr_with_retry(app, squad_size, is_debug, captured_image, 0);
}

/// Advanced preprocessing using contrast normalization + edge enhancement.
/// This gives the OCR engine more usable input than pure edge detection.
fn apply_ocr_preprocessing(slot_crop: &DynamicImage, _debug_slot: Option<usize>) -> image::GrayImage {
    let (fw, fh) = (slot_crop.width(), slot_crop.height());
    let upscaled = slot_crop.resize(fw * 2, fh * 2, image::imageops::FilterType::Lanczos3);
    let gray = upscaled.to_luma8();
    let (w, h) = gray.dimensions();

    // 1. Compute per-scanline background mean (cheap replacement for gaussian_blur)
    let mut scanline_means = vec![0.0f32; h as usize];
    for y in 0..h {
        let mut sum = 0.0f32;
        for x in 0..w {
            sum += gray.get_pixel(x, y)[0] as f32;
        }
        scanline_means[y as usize] = sum / w as f32;
    }
    let bg_mean: f32 = scanline_means.iter().sum::<f32>() / h as f32;

    // 2. Create contrast-enhanced image
    let mut enhanced = image::GrayImage::new(w, h);
    for y in 0..h {
        let row_mean = scanline_means[y as usize];
        for x in 0..w {
            let orig = gray.get_pixel(x, y)[0] as f32;
            let diff = orig - row_mean;
            let normalized = (bg_mean + diff * 3.0).clamp(0.0, 255.0) as u8;
            enhanced.put_pixel(x, y, image::Luma([normalized]));
        }
    }

    // 3. Dynamic Otsu Threshold on enhanced image
    let mut hist = [0u32; 256];
    for p in enhanced.pixels() { hist[p[0] as usize] += 1; }
    let total = (w * h) as f64;
    let (mut sum, mut sum_b, mut q1, mut max_var) = (0.0f64, 0.0f64, 0.0f64, 0.0f64);
    for i in 0..256 { sum += i as f64 * hist[i] as f64; }
    let mut otsu_thresh = 128u8;
    for i in 0..256 {
        q1 += hist[i] as f64;
        if q1 == 0.0 { continue; }
        let q2 = total - q1;
        if q2 == 0.0 { break; }
        sum_b += i as f64 * hist[i] as f64;
        let m1 = sum_b / q1;
        let m2 = (sum - sum_b) / q2;
        let var = q1 * q2 * (m1 - m2).powi(2);
        if var > max_var { max_var = var; otsu_thresh = i as u8; }
    }

    let mut binary = image::GrayImage::new(w, h);
    for y in 0..h {
        for x in 0..w {
            let val = enhanced.get_pixel(x, y)[0];
            binary.put_pixel(x, y, image::Luma([if val < otsu_thresh { 0 } else { 255 }]));
        }
    }

    // Normalise polarity: OCR expects dark text on light background.
    // Use edge-based detection: borders are almost always background.
    let mut edge_black = 0;
    let mut edge_white = 0;
    for x in 0..w {
        if binary.get_pixel(x, 0)[0] == 0 { edge_black += 1; } else { edge_white += 1; }
        if binary.get_pixel(x, h - 1)[0] == 0 { edge_black += 1; } else { edge_white += 1; }
    }
    for y in 0..h {
        if binary.get_pixel(0, y)[0] == 0 { edge_black += 1; } else { edge_white += 1; }
        if binary.get_pixel(w - 1, y)[0] == 0 { edge_black += 1; } else { edge_white += 1; }
    }
    if edge_black > edge_white {
        for p in binary.pixels_mut() { p[0] = 255 - p[0]; }
    }

    binary
}

fn run_ocr_with_retry(app: AppHandle, squad_size: usize, is_debug: bool, captured_image: Option<DynamicImage>, attempt: u8) {
    let app_c = app.clone();
    std::thread::spawn(move || {
        let start_time = std::time::Instant::now();
        let dynamic_image = if let Some(img) = captured_image.clone() { img } else {
            let Some(monitor) = get_target_monitor(&app_c) else { return; };
            let Ok(image) = capture_monitor_image(&app_c, &monitor) else { return; };
            DynamicImage::ImageRgba8(image)
        };
        
        ocr_log!(&app_c, "[OCR] Starting contrast normalization...");

        let active_scale = USER_UI_SCALE.load(Ordering::SeqCst) as f64 / 100.0;

        let state = app_c.state::<crate::AppState>();
        let relics: Vec<crate::log_scanner::RelicInfo> = if let Ok(cached) = state.active_relic_data.lock() {
            if let Some(ref val) = *cached {
                val.get("squad_relics")
                    .and_then(|v| serde_json::from_value(v.clone()).ok())
                    .unwrap_or_default()
            } else { Vec::new() }
        } else { Vec::new() };

        let is_requiem = relics.iter().any(|r| r.tier == "Requiem") || is_debug;
        ocr_log!(&app_c, "[OCR] Squad size: {}, Requiem check: {}", squad_size, is_requiem);

        let mut raw_coords = get_slot_rects(squad_size, active_scale);

        if is_requiem {
            for slot_idx in 0..squad_size {
                let req_rect = get_requiem_rect(slot_idx, squad_size, active_scale);
                ocr_log!(&app_c, "[OCR] Adding Requiem rect for slot {}: {:?}", slot_idx, req_rect);
                raw_coords.push(req_rect);
            }
        }
        
        ocr_log!(&app_c, "[OCR] Total regions to scan: {}", raw_coords.len());
        
        let sw = dynamic_image.width() as f64;
        let sh = dynamic_image.height() as f64;
        let sx = sw / 1920.0;
        let sy = sh / 1080.0;
        
        let mut coords = Vec::new();
        for (fx, fy, fw, fh) in raw_coords {
            let s_fx = (fx as f64 * sx).round() as u32;
            let s_fy = (fy as f64 * sy).round() as u32;
            let s_fw = (fw as f64 * sx).round() as u32;
            let s_fh = (fh as f64 * sy).round() as u32;
            coords.push((s_fx, s_fy, s_fw, s_fh));
        }
        let mut handles = Vec::new();

        for (i, (fx, fy, fw, fh)) in coords.iter().enumerate() {
            if *fx + *fw > dynamic_image.width() || *fy + *fh > dynamic_image.height() { continue; }
            let slot_crop = dynamic_image.crop_imm(*fx, *fy, *fw, *fh);
            
            let app_for_thread = app_c.clone();
            let slot_idx = i;

            handles.push(std::thread::spawn(move || {
                // Requiem image slots are appended after the regular OCR text slots.
                if is_requiem && slot_idx >= squad_size {
                    let req_slot = slot_idx - squad_size;
                    ocr_log!(&app_for_thread, "[OCR] Requiem image scan for slot {}", req_slot);
                    if let Some(mod_name) = identify_requiem_mod(&app_for_thread, &slot_crop, req_slot) {
                        ocr_log!(&app_for_thread, "[OCR] Requiem mod identified for slot {}: {}", req_slot, mod_name);
                        return Some((req_slot + 1, format!("Requiem {}", mod_name)));
                    }
                    ocr_log!(&app_for_thread, "[OCR] No Requiem mod matched for slot {}", req_slot);
                    return None;
                }

                // ── Regular text OCR ──────────────────────────────────────────────
                let binary = apply_ocr_preprocessing(&slot_crop, Some(slot_idx));
                let (uw, uh) = binary.dimensions();

                let midpoint = uh / 2;
                let overlap = (uh as f32 * 0.05) as u32;
                let dyn_binary = image::DynamicImage::ImageLuma8(binary);
                let line1 = dyn_binary.crop_imm(0, 0, uw, (midpoint + overlap).min(uh)).to_luma8();
                let line2 = dyn_binary.crop_imm(0, (midpoint - overlap).max(0), uw, uh - ((midpoint - overlap).max(0))).to_luma8();

                let mut combined_lines = Vec::new();
                for (_l_idx, line_img) in [(0usize, line1), (1usize, line2)] {
                    let text = crate::ocr_engine::recognize(&line_img);
                    if !text.is_empty() {
                        combined_lines.push(text);
                    }
                }
                
/// Strip leading non-alphanumeric junk from a token (e.g. "-Forma" → "Forma").
fn strip_prefix_junk(s: &str) -> &str {
    let mut start = 0;
    for (i, c) in s.char_indices() {
        if c.is_alphanumeric() {
            start = i;
            break;
        }
    }
    &s[start..]
}

fn clean_ocr_output(raw: &str) -> String {
    let tokens: Vec<&str> = raw.split_whitespace().collect();
    if tokens.is_empty() { return String::new(); }

    for i in 0..tokens.len() {
        let t = strip_prefix_junk(tokens[i]);
        if t.len() < 2 { continue; }
        if t.chars().any(|c| c.is_ascii_digit()) { continue; }
        if !t.chars().next().map(|c| c.is_uppercase()).unwrap_or(false) { continue; }

        // Accept if this is the last token, or the next token also looks valid.
        let accept = if i + 1 < tokens.len() {
            let next = strip_prefix_junk(tokens[i + 1]);
            next.len() >= 2
                && !next.chars().any(|c| c.is_ascii_digit())
                && next.chars().next().map(|c| c.is_uppercase()).unwrap_or(false)
        } else {
            true
        };

        if accept {
            // Reconstruct with original tokens (some may have junk prefixes to preserve)
            let mut result = String::new();
            for j in i..tokens.len() {
                if j > i { result.push(' '); }
                result.push_str(strip_prefix_junk(tokens[j]));
            }
            return result;
        }
    }

    raw.to_string()
}

// ... existing run_ocr_with_retry ...
                if !combined_lines.is_empty() {
                    let raw = combined_lines.join(" ");
                    let cleaned = clean_ocr_output(&raw);
                    if raw != cleaned {
                        ocr_log!(&app_for_thread, "[OCR] Slot {} cleaned: {:?} → {:?}", slot_idx + 1, raw, cleaned);
                    } else {
                        ocr_log!(&app_for_thread, "[OCR] Slot {}: {:?}", slot_idx + 1, cleaned);
                    }
                    Some((slot_idx + 1, cleaned))
                } else { None }
            }));
        }

        let mut slot_results = Vec::new();
        let mut found_loading = false;
        for (_i, h) in handles.into_iter().enumerate() {
            if let Ok(Some((slot, text))) = h.join() {
                if text.contains("LOADING") { found_loading = true; }
                slot_results.push(OcrSlotResult { slot, text });
            }
        }

        if found_loading && attempt < 1 {
            ocr_log!(&app_c, "[OCR] [Attempt {}] LOADING detected, retrying in 500ms...", attempt + 1);
            std::thread::sleep(std::time::Duration::from_millis(500));
            run_ocr_with_retry(app_c, squad_size, is_debug, captured_image, attempt + 1);
            return;
        }

        let combined_text = slot_results.iter().map(|r| r.text.clone()).collect::<Vec<_>>().join(" | ");
        ocr_log!(&app_c, "[OCR] [Attempt {}] Total pipeline time: {}ms", attempt + 1, start_time.elapsed().as_millis());
        app_c.emit("fissure-ocr-band", OcrBandResult { text: combined_text, slot_results, is_debug }).unwrap_or_default();
    });
}

#[tauri::command]
pub async fn save_debug_screenshot(app: AppHandle) -> Result<String, String> {
    tokio::time::sleep(std::time::Duration::from_secs(5)).await;
    let Some(monitor) = get_target_monitor(&app) else { return Err("No target monitor resolved".to_string()); };
    let image = capture_monitor_image(&app, &monitor)?;
    let dynamic_image = DynamicImage::ImageRgba8(image);

    let active_scale = USER_UI_SCALE.load(Ordering::SeqCst) as f64 / 100.0;

    // Determine regions
    let state = app.state::<crate::AppState>();
    let _relics: Vec<crate::log_scanner::RelicInfo> = if let Ok(cached) = state.active_relic_data.lock() {
        if let Some(ref val) = *cached {
            let rs: Vec<crate::log_scanner::RelicInfo> = val.get("squad_relics")
                .and_then(|v| serde_json::from_value(v.clone()).ok())
                .unwrap_or_default();
            ocr_log!(&app, "[DEBUG] Found {} relics in cache", rs.len());
            rs
        } else { ocr_log!(&app, "[DEBUG] No relics in cache"); Vec::new() }
    } else { ocr_log!(&app, "[DEBUG] Could not lock relic data"); Vec::new() };

    let mut rects = get_slot_rects(4, active_scale);
    ocr_log!(&app, "[DEBUG] Adding Requiem regions for debug scan");
    for slot_idx in 0..4 {
        rects.push(get_requiem_rect(slot_idx, 4, active_scale));
    }
    
    ocr_log!(&app, "[DEBUG] Scanning {} regions", rects.len());

    if rects.is_empty() { return Err("Could not determine OCR regions".to_string()); }

    let mut saved_paths = Vec::new();
    let sw = dynamic_image.width() as f64;
    let sh = dynamic_image.height() as f64;
    let sx = sw / 1920.0;
    let sy = sh / 1080.0;

    for (i, &(bx, by, bw, bh)) in rects.iter().enumerate() {
        let s_bx = (bx as f64 * sx).round() as u32;
        let s_by = (by as f64 * sy).round() as u32;
        let s_bw = (bw as f64 * sx).round() as u32;
        let s_bh = (bh as f64 * sy).round() as u32;

        let crop = dynamic_image.crop_imm(s_bx, s_by, s_bw, s_bh);
        let processed = apply_ocr_preprocessing(&crop, None);

        let pad = 30u32;
        let (uw, uh) = processed.dimensions();
        let mut padded = image::GrayImage::new(uw + pad * 2, uh + pad * 2);
        padded.fill(255);
        image::imageops::overlay(&mut padded, &processed, pad as i64, pad as i64);

        let dest_path = crate::get_data_root().join(format!("data/user/debug_crop_{}.png", i));
        if let Some(parent) = dest_path.parent() { std::fs::create_dir_all(parent).map_err(|e| e.to_string())?; }
        padded.save(&dest_path).map_err(|e| e.to_string())?;
        saved_paths.push(dest_path.to_string_lossy().to_string());
    }

    Ok(saved_paths.join(", "))
}
#[tauri::command]
pub async fn trigger_manual_ocr(app: AppHandle, _squad_size: Option<usize>) -> Result<(), String> {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(0);
    let msg = format!("[SHORTCUT] trigger_manual_ocr called at {}", now);
    eprintln!("{}", msg);
    crate::logger::log_to_disk(&app, &msg);
    ICON_SCAN_ACTIVE.store(true, Ordering::SeqCst);
    detect_slot_count_from_icons(app, true);
    Ok(())
}

#[tauri::command]
pub async fn start_debug_ocr_session(app: AppHandle) -> Result<(), String> {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(0);
    let msg = format!("[DEBUG] start_debug_ocr_session called at {}", now);
    eprintln!("{}", msg);
    crate::logger::log_to_disk(&app, &msg);
    ICON_SCAN_ACTIVE.store(true, Ordering::SeqCst);
    std::thread::sleep(std::time::Duration::from_secs(5));
    detect_slot_count_from_icons(app, true);
    Ok(())
}