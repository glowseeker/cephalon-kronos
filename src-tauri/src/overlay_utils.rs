use tauri::{AppHandle, Manager};

pub fn show_window_internal(app_handle: &AppHandle, label: &str) -> Result<(), String> {
    crate::logger::log_to_disk(
        app_handle, 
        &format!("[WINDOW ACTION] show_window_internal called for label: {}", label)
    );
    let now = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_millis();
    eprintln!("[{}] [OVERLAY_UTILS] show_window_internal for label: {}", now, label);

    
    let window = app_handle
        .get_window(label)
        .ok_or_else(|| format!("window '{}' not found", label))?;
    
    let monitor = window.primary_monitor()
        .map_err(|e| e.to_string())?
        .ok_or("no primary monitor")?;

    let mon_pos  = monitor.position();
    let screen_w = monitor.size().width;
    let screen_h = monitor.size().height;
    let scale    = monitor.scale_factor();
    let margin   = (16.0 * scale) as i32;

    // Fixed widths for standard overlays (centered internally in JS)
    let log_w = match label {
        "overlay-relic" => 640u32,
        _ => 440u32,
    };
    
    let phys_w = (log_w as f64 * scale) as u32;
    let phys_h = if label == "overlay-relic" { (140.0 * scale) as u32 } else { screen_h };
    let phys_margin = margin;

    let (lx, ly) = match label {
        "overlay-tl"    => (phys_margin, phys_margin),
        "overlay-tc"    => (((screen_w as i32 - phys_w as i32) / 2), phys_margin),
        "overlay-relic" => {
            let relic_w_f = 640.0 * scale;
            let relic_h_f = 140.0 * scale;
            let margin_f  = 40.0 * scale;

            let rx = ((screen_w as f64 - relic_w_f) / 2.0).round() as i32;
            let ry = (screen_h as f64 - relic_h_f - margin_f).round() as i32;
            (rx, ry)
        }
        _ => (screen_w as i32 - phys_w as i32 - phys_margin, phys_margin), // overlay-tr
    };

    let x = mon_pos.x + lx;
    let y = mon_pos.y + ly;

    // For the relic overlay, sizing is managed exclusively by resize_overlay_window
    // (called from the frontend with the correct squad-aware dimensions).
    // We only set size/position here for non-relic overlays.
    if label != "overlay-relic" {
        let _ = window.set_size(tauri::Size::Physical(tauri::PhysicalSize {
            width: phys_w, height: phys_h,
        }));
        let _ = window.set_position(tauri::Position::Physical(
            tauri::PhysicalPosition { x, y }
        ));
    }

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
    


    let _w = window.clone();
    let _is_relic = label == "overlay-relic";
    tauri::async_runtime::spawn(async move {
        // Removed repetitive calls to set_always_on_top here.
        // The initial call after window.show() should be sufficient.
    });

    Ok(())
}
