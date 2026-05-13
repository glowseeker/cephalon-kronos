use xcap::Monitor;
use image::DynamicImage;
use tauri::{AppHandle, Manager};
use serde::Serialize;
use std::process::{Command, Stdio};
use std::io::Write;
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};

/// Set to true by log_scanner when 10-reactant fires, false when reward screen
/// closes or mission exits. The icon poll loop checks this each iteration.
pub static ICON_SCAN_ACTIVE: AtomicBool = AtomicBool::new(false);

/// Stores the user's custom UI Scale percentage (e.g. 100 for 1.0, 80 for 0.8)
pub static USER_UI_SCALE: std::sync::atomic::AtomicU32 = std::sync::atomic::AtomicU32::new(100);

/// Logs to stderr (dev) and disk (prod). Requires an `AppHandle` reference named `app_c` in scope.
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
fn get_base_region(squad_size: usize) -> (f64, f64, f64, f64) {
    match squad_size {
        2 => (719.0 / 1920.0, 409.0 / 1080.0, 481.0 / 1920.0, 51.0 / 1080.0),
        3 => (600.0 / 1920.0, 409.0 / 1080.0, 720.0 / 1920.0, 51.0 / 1080.0),
        4 => (478.0 / 1920.0, 409.0 / 1080.0, 965.0 / 1920.0, 51.0 / 1080.0),
        _ => (839.0 / 1920.0, 409.0 / 1080.0, 241.0 / 1920.0, 51.0 / 1080.0),
    }
}

fn get_slot_coords(squad_size: usize) -> Vec<(f64, f64, f64, f64)> {
    let (bx, by, bw, bh) = get_base_region(squad_size);
    let slot_w = bw / squad_size as f64;
    (0..squad_size).map(|i| {
        (bx + (i as f64 * slot_w), by, slot_w, bh)
    }).collect()
}

pub fn run_ocr_pipeline_with_size(app: AppHandle, squad_size: usize) {
    run_ocr_internal(app, squad_size, false, None);
}

// ─── Template-based rarity icon detection ─────────────────────────────────────
//
// Templates are 40×30px crops of each rarity icon at 1920×1080, embedded at
// compile time. They are decoded once on first use via OnceLock and reused
// for the lifetime of the process.

static RARITY_TEMPLATES: std::sync::OnceLock<Vec<image::GrayImage>> =
    std::sync::OnceLock::new();

fn get_templates() -> &'static Vec<image::GrayImage> {
    RARITY_TEMPLATES.get_or_init(|| {
        let raw: &[&[u8]] = &[
            include_bytes!("../data/bin/rarity_rare.png"),
            include_bytes!("../data/bin/rarity_uncommon.png"),
            include_bytes!("../data/bin/rarity_common.png"),
        ];
        raw.iter()
            .filter_map(|bytes| image::load_from_memory(bytes).ok().map(|i| i.to_luma8()))
            .collect()
    })
}

/// Polls the screen after the 10-reactant trigger until rarity icons are found,
/// then fires the OCR pipeline with the correct slot count.
/// If `manual` is true, stops after 5 seconds (for manual trigger buttons).
/// If `manual` is false, loops forever until icons found or flag cleared.
pub fn detect_slot_count_from_icons(app: AppHandle, manual: bool) {
    std::thread::spawn(move || {
        let templates = get_templates();
        if templates.is_empty() {
            ocr_log!(&app, "[OCR] WARN: no rarity templates loaded, aborting icon scan");
            return;
        }

        let mut attempt = 0u32;
        let start_time = std::time::Instant::now();
        const MAX_SCAN_DURATION_SECS: u64 = 5;

        loop {
            if manual && start_time.elapsed().as_secs() >= MAX_SCAN_DURATION_SECS {
                ocr_log!(&app, "[OCR] Icon scan timed out after {} attempts", attempt);
                return;
            }

            attempt += 1;
            std::thread::sleep(std::time::Duration::from_millis(400));

            if !ICON_SCAN_ACTIVE.load(Ordering::SeqCst) {
                ocr_log!(&app, "[OCR] Icon scan: flag cleared, stopping (attempt {})", attempt);
                return;
            }

            let monitors = Monitor::all().unwrap_or_default();
            if monitors.is_empty() { continue; }
            let monitor = monitors.iter().find(|m| m.is_primary().unwrap_or(false)).unwrap_or(&monitors[0]);

            let screen = match monitor.capture_image() {
                Ok(s) => s,
                Err(e) => {
                    ocr_log!(&app, "[OCR] Icon scan attempt {}: capture failed: {}", attempt, e);
                    continue;
                }
            };

            let sw = screen.width()  as f64;
            let sh = screen.height() as f64;
            let sx = sw / 1920.0;
            let sy = sh / 1080.0;

            let strip_y = ((430.0 / 1080.0) * sh) as u32;
            let strip_h = ((100.0  / 1080.0) * sh).max(1.0) as u32;
            let strip_x = ((555.0 / 1920.0) * sw) as u32;
            let strip_w = ((810.0 / 1920.0) * sw).max(1.0) as u32;

            let gray_full = DynamicImage::ImageRgba8(screen).to_luma8();
            if strip_x + strip_w > gray_full.width() || strip_y + strip_h > gray_full.height() { continue; }

            let strip = image::imageops::crop_imm(&gray_full, strip_x, strip_y, strip_w, strip_h).to_image();
            let min_dist_px = ((90.0 * sx) as i32).max(30);
            let active_scale = USER_UI_SCALE.load(Ordering::SeqCst) as f64 / 100.0;
            
            let mut peaks: Vec<u32> = Vec::new();

            for tidx in 0..templates.len() {
                let tmpl = &templates[tidx];
                let tw = ((tmpl.width()  as f64) * sx * active_scale).round() as u32;
                let th = ((tmpl.height() as f64) * sy * active_scale).round() as u32;
                if tw == 0 || th == 0 || tw > strip_w || th > strip_h { continue; }

                let scaled = image::imageops::resize(tmpl, tw, th, image::imageops::FilterType::Lanczos3);
                let matches = ncc_scan(&strip, &scaled, 0.85, 1);

                for (x, _y, _score) in matches {
                    let abs_x = strip_x + x + (tw / 2);
                    if !peaks.iter().any(|&px| (px as i32 - abs_x as i32).abs() < min_dist_px) {
                        peaks.push(abs_x);
                    }
                }
            }

            peaks.sort_unstable();
            
            // FILTER: Real icons are ~240px apart. Reject peaks that are too close (noise).
            let mut valid_peaks = Vec::new();
            for &p in &peaks {
                if valid_peaks.iter().all(|&vp: &u32| (vp as i32 - p as i32).abs() > (200.0 * sx) as i32) {
                    valid_peaks.push(p);
                }
            }

            let mut has_center = false;   // 3-slot center (~960)
            let mut has_4_outer = false;  // 4-slot outer (595, 1323)
            let mut has_inner = false;    // 2/4-slot inner (838, 1080)
            let mut has_3_outer = false;  // 3-slot outer (717, 1202)

            for &p in &valid_peaks {
                let norm_x = (p as f64 / sx).round() as i32;
                if (norm_x - 960).abs() < 40 { has_center = true; }
                if (norm_x - 595).abs() < 40 || (norm_x - 1323).abs() < 40 { has_4_outer = true; }
                if (norm_x - 838).abs() < 40 || (norm_x - 1080).abs() < 40 { has_inner = true; }
                if (norm_x - 717).abs() < 40 || (norm_x - 1202).abs() < 40 { has_3_outer = true; }
            }

            // Priority-based deduction:
            let deduced_size = if has_center || has_3_outer { 3 }
                else if has_4_outer { 4 }
                else if has_inner { if valid_peaks.len() >= 3 { 4 } else { 2 } }
                else { valid_peaks.len().clamp(2, 4) as usize };

            ocr_log!(&app, "[OCR] Icon scan attempt {}: {} peaks (filtered) at x={:?}, deduced size={} (scale={})", 
                attempt, valid_peaks.len(), valid_peaks, deduced_size, active_scale);

            if !has_center && !has_4_outer && !has_inner && !has_3_outer {
                continue;
            }

            if valid_peaks.len() >= 2 {
                ICON_SCAN_ACTIVE.store(false, Ordering::SeqCst);
                if let Some(window) = app.get_window("overlay-relic") { let _ = window.show(); }
                
                let state = app.state::<crate::AppState>();
                let relics: Vec<crate::log_scanner::RelicInfo> = if let Ok(cached) = state.active_relic_data.lock() {
                    if let Some(ref val) = *cached {
                        val.get("squad_relics").and_then(|v| serde_json::from_value(v.clone()).ok()).unwrap_or_default()
                    } else { Vec::new() }
                } else { Vec::new() };
                
                let event_payload = crate::log_scanner::FissureEvent {
                    event_type: "relic_phase_start".to_string(),
                    squad_relics: relics,
                    local_reward: None,
                    squad_size: deduced_size,
                    void_tier: None,
                };
                app.emit_all("scanner-relic-phase-start", serde_json::json!({ "squad_size": deduced_size })).unwrap_or_default();
                app.emit_all("fissure-relic-phase", &event_payload).unwrap_or_default();
                
                run_ocr_pipeline_with_size(app, deduced_size);
                return;
            }
        }
    });
}

fn ncc_scan(strip: &image::GrayImage, template: &image::GrayImage, threshold: f32, step: u32) -> Vec<(u32, u32, f32)> {
    let (sw, sh) = strip.dimensions();
    let (tw, th) = template.dimensions();
    if tw > sw || th > sh { return vec![]; }

    let t_pixels: Vec<f32> = template.pixels().map(|p| p[0] as f32).collect();
    let t_mean = t_pixels.iter().sum::<f32>() / t_pixels.len() as f32;
    let t_centered: Vec<f32> = t_pixels.iter().map(|&v| v - t_mean).collect();
    let t_norm = t_centered.iter().map(|v| v * v).sum::<f32>().sqrt();
    if t_norm < 1e-6 { return vec![]; }

    let s_pixels = strip.as_raw(); // &[u8]
    let x_count = sw - tw + 1;
    let y_count = sh - th + 1;
    let mut peaks = Vec::new();

    let tw_usize = tw as usize;
    let th_usize = th as usize;
    let sw_usize = sw as usize;

    for y in (0..y_count as usize).step_by(step as usize) {
        for x in (0..x_count as usize).step_by(step as usize) {
            let mut p_sum = 0.0f32;
            for dy in 0..th_usize {
                let row_offset = (y + dy) * sw_usize;
                for dx in 0..tw_usize {
                    p_sum += s_pixels[row_offset + x + dx] as f32;
                }
            }
            let p_mean = p_sum / (tw * th) as f32;

            let mut dot = 0.0f32;
            let mut p_sq = 0.0f32;
            for dy in 0..th_usize {
                let row_offset = (y + dy) * sw_usize;
                let t_row_offset = dy * tw_usize;
                for dx in 0..tw_usize {
                    let pc = s_pixels[row_offset + x + dx] as f32 - p_mean;
                    dot += pc * t_centered[t_row_offset + dx];
                    p_sq += pc * pc;
                }
            }
            let p_norm = p_sq.sqrt();
            if p_norm > 1e-6 {
                let score = dot / (t_norm * p_norm);
                if score >= threshold {
                    peaks.push((x as u32, y as u32, score));
                }
            }
        }
    }
    peaks
}

fn run_ocr_internal(app: AppHandle, squad_size: usize, is_debug: bool, captured_image: Option<DynamicImage>) {
    run_ocr_with_retry(app, squad_size, is_debug, captured_image, 0);
}

fn run_ocr_with_retry(app: AppHandle, squad_size: usize, is_debug: bool, captured_image: Option<DynamicImage>, attempt: u8) {
    let app_c = app.clone();
    std::thread::spawn(move || {
        let start_time = std::time::Instant::now();
        let dynamic_image = if let Some(img) = captured_image.clone() { img } else {
            let monitors = Monitor::all().unwrap_or_default();
            if monitors.is_empty() { return; }
            let Ok(image) = monitors[0].capture_image() else { return; };
            DynamicImage::ImageRgba8(image)
        };
        
        let coords = get_slot_coords(squad_size);
        let (bin_path, tessdata_path) = get_tesseract_config(&app_c);
        let bin_path_arc = std::sync::Arc::new(bin_path);
        let tessdata_path_arc = std::sync::Arc::new(tessdata_path);

        let wordlist_path: Option<std::path::PathBuf> = {
            let state = app_c.state::<crate::AppState>();
            let path = state.ocr_wordlist_path.lock().unwrap().clone();
            path
        };
        let wordlist_path_arc = std::sync::Arc::new(wordlist_path);

        let mut handles = Vec::new();

        for (i, (x_off, y_off, w, h)) in coords.iter().enumerate() {
            let sw = dynamic_image.width() as f64;
            let sh = dynamic_image.height() as f64;
            let fx = (*x_off * sw) as u32;
            let fy = (*y_off * sh) as u32;
            let fw = (*w * sw) as u32;
            let fh = (*h * sh) as u32;

            if fx + fw > dynamic_image.width() || fy + fh > dynamic_image.height() { continue; }
            let slot_crop = dynamic_image.crop_imm(fx, fy, fw, fh);
            
            let bin_path_c = std::sync::Arc::clone(&bin_path_arc);
            let tessdata_path_c = std::sync::Arc::clone(&tessdata_path_arc);
            let wordlist_path_c = std::sync::Arc::clone(&wordlist_path_arc);
            let app_for_thread = app_c.clone();
            let slot_idx = i;

            handles.push(std::thread::spawn(move || {
                let binary = apply_ocr_preprocessing(&slot_crop);
                let (uw, uh) = binary.dimensions();
                let midpoint = uh / 2;
                let overlap = (uh as f32 * 0.05) as u32;
                let dyn_binary = image::DynamicImage::ImageLuma8(binary);
                let line1 = dyn_binary.crop_imm(0, 0, uw, (midpoint + overlap).min(uh)).to_luma8();
                let line2 = dyn_binary.crop_imm(0, (midpoint - overlap).max(0), uw, uh - ((midpoint - overlap).max(0))).to_luma8();

                let mut combined_lines = Vec::new();
                for (_l_idx, line_img) in [(0usize, line1), (1usize, line2)] {
                    let pad = 30u32;
                    let (lw, lh) = (line_img.width(), line_img.height());
                    let mut padded = image::GrayImage::new(lw + pad * 2, lh + pad * 2);
                    padded.fill(255);
                    image::imageops::overlay(&mut padded, &line_img, pad as i64, pad as i64);



                    let mut buffer = Vec::new();
                    let _ = padded.write_to(&mut std::io::Cursor::new(&mut buffer), image::ImageFormat::Pnm);

                    let mut cmd = Command::new(bin_path_c.to_string_lossy().replace("\\\\?\\", ""));
                    cmd.args(["-", "stdout", "--oem", "1", "--psm", "7", "-l", "warframe"]);
                    cmd.args(["-c", "load_system_dawg=0", "-c", "load_freq_dawg=0", "-c", "tessedit_write_images=false"]);

                    if let Some(ref wl) = *wordlist_path_c { if wl.exists() { cmd.args(["--user-words", &wl.to_string_lossy()]); } }
                    if let Some(ref tp) = *tessdata_path_c { cmd.env("TESSDATA_PREFIX", tp.to_string_lossy().replace("\\\\?\\", "")); }

                    #[cfg(windows)] { use std::os::windows::process::CommandExt; cmd.creation_flags(0x08000000); }

                    if let Ok(mut child) = cmd.stdin(Stdio::piped()).stdout(Stdio::piped()).stderr(Stdio::piped()).spawn() {
                        if let Some(mut stdin) = child.stdin.take() { let _ = stdin.write_all(&buffer); }
                        if let Ok(output) = child.wait_with_output() {
                            if output.status.success() {
                                let text = String::from_utf8_lossy(&output.stdout).trim().to_uppercase();
                                combined_lines.push(text);
                            }
                        }
                    }
                }
                
                if !combined_lines.is_empty() {
                    let full_text = combined_lines.join(" ");
                    ocr_log!(&app_for_thread, "[OCR] Slot {}: \"{}\"", slot_idx + 1, full_text);
                    Some(full_text)
                } else { None }
            }));
        }

        let mut slot_results = Vec::new();
        let mut found_loading = false;
        for (i, h) in handles.into_iter().enumerate() {
            if let Ok(Some(text)) = h.join() {
                if text.contains("LOADING") { found_loading = true; }
                slot_results.push(OcrSlotResult { slot: i + 1, text });
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
        let _ = app_c.emit_all("overlay-debug-text", serde_json::json!({ "text": combined_text }));
        app_c.emit_all("fissure-ocr-band", OcrBandResult { text: combined_text, slot_results, is_debug }).unwrap_or_default();
    });
}

/// Core preprocessing logic used by both live OCR and debug screenshots.
fn apply_ocr_preprocessing(slot_crop: &DynamicImage) -> image::GrayImage {
    let (fw, fh) = (slot_crop.width(), slot_crop.height());
    // Upscale 3x is a good balance for Tesseract
    let upscaled = slot_crop.resize(fw * 3, fh * 3, image::imageops::FilterType::CatmullRom);
    let mut gray = upscaled.to_luma8();
    for p in gray.pixels_mut() { p[0] = 255 - p[0]; }
    let blurred = image::imageops::blur(&gray, 0.5);

    let mut hist = [0u32; 256];
    for p in blurred.pixels() { hist[p[0] as usize] += 1; }
    let total = (blurred.width() * blurred.height()) as f64;
    let (mut sum, mut sum_b, mut q1, mut max_var) = (0.0f64, 0.0f64, 0.0f64, 0.0f64);
    for i in 0..256usize { sum += i as f64 * hist[i] as f64; }
    let mut threshold = 128u8;
    for i in 0..256usize {
        q1 += hist[i] as f64;
        if q1 == 0.0 { continue; }
        let q2 = total - q1;
        if q2 == 0.0 { break; }
        sum_b += i as f64 * hist[i] as f64;
        let m1 = sum_b / q1;
        let m2 = (sum - sum_b) / q2;
        let var_between = q1 * q2 * (m1 - m2).powi(2);
        if var_between > max_var { max_var = var_between; threshold = i as u8; }
    }
    let mut binary = blurred.clone();
    for p in binary.pixels_mut() { p[0] = if p[0] <= threshold { 0 } else { 255 }; }
    binary
}

fn preprocess_for_ocr(image: DynamicImage) -> image::GrayImage {
    let binary = apply_ocr_preprocessing(&image);
    let pad = 30u32;
    let (uw, uh) = binary.dimensions();
    let mut padded = image::GrayImage::new(uw + pad * 2, uh + pad * 2);
    padded.fill(255);
    image::imageops::overlay(&mut padded, &binary, pad as i64, pad as i64);
    padded
}

#[tauri::command]
pub fn write_ocr_wordlist(app: AppHandle, words: Vec<String>) -> Result<(), String> {
    let state = app.state::<crate::AppState>();
    let mut seen = std::collections::HashSet::new();
    let mut lines = Vec::new();
    for w in &words {
        let trimmed = w.trim().to_string();
        if !trimmed.is_empty() && seen.insert(trimmed.to_lowercase()) { lines.push(trimmed); }
    }
    // Add common non-Prime reward words to the baseline
    for w in &["PRIME", "BLUEPRINT", "SLIVER", "FRAGMENT", "AYATAN", "AMBER", "CYAN", "REQUIEM", "ADAPTER", "FORMA", "EXILUS", "ARCANE"] {
        if seen.insert(w.to_lowercase()) { lines.push(w.to_string()); }
    }
    if lines.is_empty() { return Ok(()); }
    let dir = crate::get_data_root().join("data/user");
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let path = dir.join("ocr_wordlist.txt");
    std::fs::write(&path, lines.join("\n")).map_err(|e| e.to_string())?;
    *state.ocr_wordlist_path.lock().unwrap() = Some(path);
    Ok(())
}

fn get_tesseract_config(app: &AppHandle) -> (PathBuf, Option<PathBuf>) {
    #[cfg(windows)] let bin_name = "tesseract.exe";
    #[cfg(target_os = "macos")] let bin_name = if cfg!(target_arch = "aarch64") { "tesseract-macos-arm64" } else { "tesseract-macos-x64" };
    #[cfg(not(any(windows, target_os = "macos")))] let bin_name = "tesseract";

    if let Some(bundled) = app.path_resolver().resolve_resource(format!("data/bin/{}", bin_name)) {
        if bundled.exists() {
            let tessdata = bundled.parent().map(|p| p.join("tessdata"));
            return (bundled, tessdata);
        }
    }
    #[cfg(not(windows))] {
        let system = PathBuf::from("/usr/bin/tesseract");
        if system.exists() {
            let tessdata = app.path_resolver().resolve_resource("data/bin/tessdata");
            return (system, tessdata);
        }
    }
    (PathBuf::from(bin_name), None)
}

#[tauri::command]
pub async fn save_debug_screenshot(_app: AppHandle) -> Result<String, String> {
    tokio::time::sleep(std::time::Duration::from_secs(5)).await;
    let monitors = Monitor::all().unwrap_or_default();
    if monitors.is_empty() { return Err("No monitors found".to_string()); }
    let Ok(image) = monitors[0].capture_image() else { return Err("Capture failed".to_string()); };
    let dynamic_image = DynamicImage::ImageRgba8(image);
    let (bx, by, bw, bh) = get_base_region(4);
    let crop = dynamic_image.crop_imm((bx * dynamic_image.width() as f64) as u32, (by * dynamic_image.height() as f64) as u32, (bw * dynamic_image.width() as f64) as u32, (bh * dynamic_image.height() as f64) as u32);
    let processed = preprocess_for_ocr(crop);
    let dest_path = crate::get_data_root().join("data/user/debug_crop.png");
    if let Some(parent) = dest_path.parent() { std::fs::create_dir_all(parent).map_err(|e| e.to_string())?; }
    processed.save(&dest_path).map_err(|e| e.to_string())?;
    Ok(dest_path.to_string_lossy().to_string())
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
    if let Some(w) = app.get_window("overlay-relic") { let _ = w.show(); let _ = w.set_always_on_top(true); }
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
    if let Some(w) = app.get_window("overlay-relic") { let _ = w.show(); let _ = w.set_always_on_top(true); }
    std::thread::sleep(std::time::Duration::from_secs(5));
    detect_slot_count_from_icons(app, true);
    Ok(())
}