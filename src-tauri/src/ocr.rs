use xcap::Monitor;
use image::DynamicImage;
use tauri::{AppHandle, Manager};
use serde::Serialize;
use std::process::{Command, Stdio};
use std::io::Write;
use std::path::PathBuf;

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

fn run_ocr_internal(app: AppHandle, squad_size: usize, is_debug: bool, captured_image: Option<DynamicImage>) {
    let app_c = app.clone();
    std::thread::spawn(move || {
        let start_time = std::time::Instant::now();
        let dynamic_image = if let Some(img) = captured_image {
            eprintln!("[OCR] Using provided debug image");
            img
        } else {
            let monitors = Monitor::all().unwrap_or_default();
            if monitors.is_empty() { return; }
            let Ok(image) = monitors[0].capture_image() else { return; };
            DynamicImage::ImageRgba8(image)
        };

        // Wait up to 600ms for overlay (snappier but safe for fade-in)
        let wait_start = std::time::Instant::now();
        while wait_start.elapsed().as_millis() < 600 {
            if let Some(w) = app_c.get_window("overlay-relic") {
                if w.is_visible().unwrap_or(false) { break; }
            }
            std::thread::sleep(std::time::Duration::from_millis(50));
        }
        
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

        let mut handles: Vec<(usize, usize, std::thread::JoinHandle<Option<String>>)> = Vec::new();

        for (i, (x_off, y_off, w, h)) in coords.iter().enumerate() {
            let full_slot_w = (*w * dynamic_image.width() as f64) as u32;
            let full_slot_h = (*h * dynamic_image.height() as f64) as u32;
            let full_slot_x = (*x_off * dynamic_image.width() as f64) as u32;
            let full_slot_y = (*y_off * dynamic_image.height() as f64) as u32;

            if full_slot_x + full_slot_w > dynamic_image.width() || full_slot_y + full_slot_h > dynamic_image.height() { continue; }

            let slot_crop = dynamic_image.crop_imm(full_slot_x, full_slot_y, full_slot_w, full_slot_h);
            
            // ── PREPROCESS ──
            let upscaled = slot_crop.resize(full_slot_w * 4, full_slot_h * 4, image::imageops::FilterType::CatmullRom);
            let mut gray = upscaled.to_luma8();
            for p in gray.pixels_mut() { p[0] = 255 - p[0]; }
            let blurred = image::imageops::blur(&gray, 0.5);

            // --- DYNAMIC OTSU ---
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

            let (uw, uh) = binary.dimensions();
            let midpoint = uh / 2;
            let overlap = (uh as f32 * 0.05) as u32;
            let dyn_binary = image::DynamicImage::ImageLuma8(binary);
            let line1 = dyn_binary.crop_imm(0, 0, uw, midpoint + overlap).to_luma8();
            let line2 = dyn_binary.crop_imm(0, midpoint - overlap, uw, uh - (midpoint - overlap)).to_luma8();

            for (l_idx, line_img) in [(0usize, line1), (1usize, line2)] {
                let bin_path_c = std::sync::Arc::clone(&bin_path_arc);
                let tessdata_path_c = std::sync::Arc::clone(&tessdata_path_arc);
                let wordlist_path_c = std::sync::Arc::clone(&wordlist_path_arc);
                let slot_idx = i;

                handles.push((slot_idx, l_idx, std::thread::spawn(move || {
                    let pad = 30u32;
                    let (lw, lh) = (line_img.width(), line_img.height());
                    let mut padded = image::GrayImage::new(lw + pad * 2, lh + pad * 2);
                    padded.fill(255);
                    image::imageops::overlay(&mut padded, &line_img, pad as i64, pad as i64);

                    let mut buffer = Vec::new();
                    let mut cursor = std::io::Cursor::new(&mut buffer);
                    let _ = padded.write_to(&mut cursor, image::ImageFormat::Pnm);

                    let bin_path_str = bin_path_c.to_string_lossy().replace("\\\\?\\", "");
                    let mut cmd = Command::new(&bin_path_str);
                    cmd.args(["-", "stdout", "--oem", "1", "--psm", "7", "-l", "warframe"]);
                    cmd.args(["-c", "load_system_dawg=0", "-c", "load_freq_dawg=0", "-c", "tessedit_write_images=false"]);

                    if let Some(ref wl) = *wordlist_path_c {
                        if wl.exists() { cmd.args(["--user-words", &wl.to_string_lossy()]); }
                    }
                    if let Some(ref tp) = *tessdata_path_c {
                        let tp_str = tp.to_string_lossy().replace("\\\\?\\", "");
                        cmd.env("TESSDATA_PREFIX", tp_str);
                    }

                    #[cfg(target_os = "linux")]
                    if let Some(bin_dir) = bin_path_c.parent() {
                        let existing_ldpath = std::env::var("LD_LIBRARY_PATH").unwrap_or_default();
                        let new_ldpath = if existing_ldpath.is_empty() { bin_dir.to_string_lossy().to_string() }
                        else { format!("{}:{}", bin_dir.to_string_lossy(), existing_ldpath) };
                        cmd.env("LD_LIBRARY_PATH", new_ldpath);
                    }

                    // No visible console window on Windows.
                    #[cfg(windows)]
                    { use std::os::windows::process::CommandExt; cmd.creation_flags(0x08000000); }

                    let child = cmd.stdin(Stdio::piped()).stdout(Stdio::piped()).stderr(Stdio::piped()).spawn();
                    if let Ok(mut child) = child {
                        if let Some(mut stdin) = child.stdin.take() { let _ = stdin.write_all(&buffer); }
                        if let Ok(output) = child.wait_with_output() {
                            if output.status.success() {
                                let text = String::from_utf8_lossy(&output.stdout).trim().to_uppercase();
                                eprintln!("[OCR] Slot {} Line {}: \"{}\"", slot_idx + 1, l_idx + 1, text);
                                if !text.is_empty() { return Some(text); }
                            } else {
                                let err = String::from_utf8_lossy(&output.stderr);
                                let err_msg = format!("[OCR] Slot {} Line {} FAILED (exit {:?}): {}", slot_idx + 1, l_idx + 1, output.status.code(), err.trim());
                                eprintln!("{}", err_msg);
                                let _ = std::fs::write(crate::get_data_root().join("data/user/ocr_error.log"), &err_msg);
                            }
                        }
                    } else if let Err(e) = child {
                        let err_msg = format!("[OCR] Slot {} Line {} FAILED to spawn tesseract: {}", slot_idx + 1, l_idx + 1, e);
                        eprintln!("{}", err_msg);
                        let _ = std::fs::write(crate::get_data_root().join("data/user/ocr_error.log"), &err_msg);
                    }
                    None
                })));
            }
        }

        let mut slot_lines: std::collections::HashMap<usize, Vec<(usize, String)>> = std::collections::HashMap::new();
        for (slot_idx, l_idx, handle) in handles {
            if let Ok(Some(text)) = handle.join() {
                slot_lines.entry(slot_idx).or_default().push((l_idx, text));
            }
        }

        let mut slot_results = Vec::new();
        let mut sorted_slots: Vec<usize> = slot_lines.keys().cloned().collect();
        sorted_slots.sort();
        for slot_idx in sorted_slots {
            let mut lines = slot_lines.remove(&slot_idx).unwrap();
            lines.sort_by_key(|(l, _)| *l);
            let combined = lines.into_iter().map(|(_, t)| t).collect::<Vec<_>>().join(" ");
            slot_results.push(OcrSlotResult { slot: slot_idx + 1, text: combined });
        }
        let combined_text = slot_results.iter().map(|r| r.text.clone()).collect::<Vec<_>>().join(" | ");
        eprintln!("[OCR] Total pipeline time: {}ms", start_time.elapsed().as_millis());
        let _ = app_c.emit_all("overlay-debug-text", serde_json::json!({ "text": combined_text }));
        app_c.emit_all("fissure-ocr-band", OcrBandResult { text: combined_text, slot_results, is_debug }).unwrap_or_default();
    });
}

/// Core preprocessing logic used by both live OCR and debug screenshots.
/// Performs 4x upscale, inversion, blurring, and dynamic Otsu thresholding.
fn apply_ocr_preprocessing(slot_crop: &DynamicImage) -> image::GrayImage {
    let (full_slot_w, full_slot_h) = (slot_crop.width(), slot_crop.height());
    let upscaled = slot_crop.resize(full_slot_w * 4, full_slot_h * 4, image::imageops::FilterType::CatmullRom);
    let mut gray = upscaled.to_luma8();
    for p in gray.pixels_mut() { p[0] = 255 - p[0]; }
    let blurred = image::imageops::blur(&gray, 0.5);

    // --- DYNAMIC OTSU ---
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

/// Preprocesses a single image for OCR.
/// Now uses the same dynamic Otsu pipeline as the live `run_ocr_internal`.
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
            // Derive tessdata from the binary location — always correct regardless
            // of whether resolve_resource("data/bin/tessdata") returns None.
            let tessdata = bundled.parent().map(|p| p.join("tessdata"));
            return (bundled, tessdata);
        }
    }
    #[cfg(not(windows))] {
        let system = PathBuf::from("/usr/bin/tesseract");
        if system.exists() {
            // For system tesseract, try resolve_resource as fallback for tessdata
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
pub async fn trigger_manual_ocr(app: AppHandle, squad_size: Option<usize>) -> Result<(), String> {
    let size = squad_size.unwrap_or(4);
    eprintln!("[OCR] Manual trigger called (size={})", size);
    
    // Ensure overlay is prepared
    if let Some(w) = app.get_window("overlay-relic") {
        let _ = w.show();
        let _ = w.set_always_on_top(true);
    }
    
    // Emit mock relics event so overlay renders the skeleton
    use crate::log_scanner::{FissureEvent, RelicInfo};
    let mut mock_relics = Vec::new();
    for _ in 0..size {
        mock_relics.push(RelicInfo {
            unique_name: "MANUAL".to_string(),
            tier: "MANUAL".to_string(),
            refinement: "MANUAL".to_string(),
            era: "MANUAL".to_string()
        });
    }
    
    app.emit_all("overlay-update-relics", FissureEvent {
        event_type: "reward_phase".to_string(),
        squad_relics: mock_relics,
        local_reward: None,
        squad_size: size,
        void_tier: None
    }).unwrap_or_default();

    run_ocr_internal(app, size, true, None);
    Ok(())
}

#[tauri::command]
pub async fn start_debug_ocr_session(app: AppHandle, squad_size: usize) -> Result<(), String> {
    use crate::log_scanner::{FissureEvent, RelicInfo};
    let app_c = app.clone();
    std::thread::spawn(move || {
        std::thread::sleep(std::time::Duration::from_secs(4));
        let monitors = Monitor::all().unwrap_or_default();
        if monitors.is_empty() { return; }
        let monitor = &monitors[0];
        let Ok(image) = monitor.capture_image() else { return; };
        let dynamic_image = DynamicImage::ImageRgba8(image);
        if let Some(w) = app_c.get_window("overlay-relic") { let _ = w.show(); let _ = w.set_always_on_top(true); }
        let mut mock_relics = Vec::new();
        for _ in 0..squad_size { mock_relics.push(RelicInfo { unique_name: "DEBUG".to_string(), tier: "DEBUG".to_string(), refinement: "DEBUG".to_string(), era: "DEBUG".to_string() }); }
        app_c.emit_all("overlay-update-relics", FissureEvent { event_type: "reward_phase".to_string(), squad_relics: mock_relics, local_reward: None, squad_size, void_tier: None }).unwrap_or_default();
        run_ocr_internal(app_c, squad_size, true, Some(dynamic_image));
    });
    Ok(())
}