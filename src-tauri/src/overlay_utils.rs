use std::sync::Mutex;
use std::sync::atomic::{AtomicBool, Ordering};
#[cfg(target_os = "linux")]
use std::time::Duration;
use tauri::{AppHandle, Manager, PhysicalPosition, WebviewWindow, WebviewUrl, WebviewWindowBuilder};

use active_win_pos_rs;

static AOT_KEEPER_INSTALLED: Mutex<Vec<String>> = Mutex::new(Vec::new());
static SHOWN_OVERLAYS: Mutex<Vec<String>> = Mutex::new(Vec::new());
static LAST_OVERLAY_SIZES: Mutex<Vec<(String, f64, f64)>> = Mutex::new(Vec::new());
use std::collections::HashMap;
use std::sync::LazyLock;

/// Cache of overlay WebviewWindow handles.
/// Workaround for Tauri 2 bug: `get_webview_window(label)` returns `None`
/// for ALL windows after any `add_child` call corrupts the internal registry.
static CACHED_OVERLAY_WINDOWS: LazyLock<Mutex<HashMap<String, WebviewWindow>>> =
    LazyLock::new(|| Mutex::new(HashMap::new()));

fn get_or_create_overlay_window(app_handle: &AppHandle, label: &str) -> Result<WebviewWindow, String> {
    // Check cache first  -  bypasses Tauri's corrupted registry.
    {
        let cache = CACHED_OVERLAY_WINDOWS.lock().unwrap();
        if let Some(w) = cache.get(label) {
            return Ok(w.clone());
        }
    }
    let window = match app_handle.get_webview_window(label) {
        Some(w) => w,
        None => create_overlay_window(app_handle, label)?,
    };
    CACHED_OVERLAY_WINDOWS.lock().unwrap().insert(label.to_string(), window.clone());
    Ok(window)
}

/// Find an existing overlay window without creating one.
/// Checks cache first (bypasses Tauri registry corruption), then get_webview_window.
fn find_overlay_window(app_handle: &AppHandle, label: &str) -> Option<WebviewWindow> {
    // Cache bypasses Tauri's corrupted get_webview_window.
    {
        let cache = CACHED_OVERLAY_WINDOWS.lock().unwrap();
        if let Some(w) = cache.get(label) {
            return Some(w.clone());
        }
    }
    // Tauri's own lookup  -  will be None after add_child corruption.
    let w = app_handle.get_webview_window(label)?;
    // Found via Tauri  -  populate cache for next time.
    CACHED_OVERLAY_WINDOWS.lock().unwrap().insert(label.to_string(), w.clone());
    Some(w)
}

pub(crate) fn clear_shown_overlay(label: &str) {
    SHOWN_OVERLAYS.lock().unwrap().retain(|l| l != label);
}

fn get_last_overlay_size(label: &str) -> Option<(f64, f64)> {
    let sizes = LAST_OVERLAY_SIZES.lock().unwrap();
    sizes.iter().find(|(l, _, _)| l == label).map(|(_, w, h)| (*w, *h))
}

fn set_last_overlay_size(label: &str, width: f64, height: f64) {
    let mut sizes = LAST_OVERLAY_SIZES.lock().unwrap();
    if let Some(entry) = sizes.iter_mut().find(|(l, _, _)| l == label) {
        *entry = (label.to_string(), width, height);
    } else {
        sizes.push((label.to_string(), width, height));
    }
}

pub(crate) static SIDEBAR_TOGGLING: AtomicBool = AtomicBool::new(false);
pub(crate) static SIDEBAR_HIDE_ON_FOCUS_LOSS: AtomicBool = AtomicBool::new(true);

/// Background ungrab timer for the sidebar overlay.  Warframe/Wine may
/// re-assert an X pointer grab shortly after we release it; this timer
/// periodically breaks the grab so the sidebar stays interactive.
static SIDEBAR_UNGRAB_ACTIVE: AtomicBool = AtomicBool::new(false);

#[cfg(target_os = "linux")]
fn start_sidebar_ungrab_timer() {
    if SIDEBAR_UNGRAB_ACTIVE.swap(true, Ordering::SeqCst) {
        return;
    }
    std::thread::spawn(|| {
        while SIDEBAR_UNGRAB_ACTIVE.load(Ordering::SeqCst) {
            std::thread::sleep(Duration::from_millis(500));
            let xdisplay = unsafe { gdkx11::ffi::gdk_x11_get_default_xdisplay() };
            if !xdisplay.is_null() {
                const CT: u64 = 0;
                unsafe {
                    XUngrabPointer(xdisplay as *mut std::ffi::c_void, CT);
                    XUngrabKeyboard(xdisplay as *mut std::ffi::c_void, CT);
                    XSync(xdisplay as *mut std::ffi::c_void, 0);
                }
            }
        }
    });
}

#[cfg(not(target_os = "linux"))]
fn start_sidebar_ungrab_timer() {}

fn stop_sidebar_ungrab_timer() {
    SIDEBAR_UNGRAB_ACTIVE.store(false, Ordering::SeqCst);
}

pub fn get_overlay_monitor(app_handle: &AppHandle, label: &str) -> Result<tauri::Monitor, String> {
    let monitors = app_handle
        .available_monitors()
        .map_err(|e| e.to_string())?;

    let is_notification = matches!(label, "overlay-tl" | "overlay-tr" | "overlay-tc");

    if is_notification {
        let state = app_handle.state::<crate::AppState>();
        let target_idx = *state.target_monitor.lock().unwrap();

        if let Some(idx) = target_idx {
            if idx < monitors.len() {
                return Ok(monitors[idx].clone());
            }
        }

        if let Ok(mon) = get_focused_monitor(app_handle) {
            return Ok(mon);
        }
        app_handle
            .primary_monitor()
            .map_err(|e| e.to_string())?
            .ok_or_else(|| "no monitor found".to_string())
    } else {
        // Game overlays always follow Warframe's monitor.
        // If Warframe isn't running (e.g. testing), fall back to the
        // cached main-window monitor, or primary.
        if let Some(mon) = warframe_monitor(app_handle) {
            return Ok(mon);
        }
        // Use cached main window monitor to avoid live get_webview_window("main")
        // calls, which break after child webviews are added.
        let state = app_handle.state::<crate::AppState>();
        let cached = state.main_window_monitor.lock().clone();
        cached
            .or_else(|| app_handle.primary_monitor().ok().flatten())
            .ok_or_else(|| "no monitor found".to_string())
    }
}

fn get_focused_monitor(app_handle: &AppHandle) -> Result<tauri::Monitor, String> {
    if let Ok(active) = active_win_pos_rs::get_active_window() {
        let cx = active.position.x as i32 + active.position.width as i32 / 2;
        let cy = active.position.y as i32 + active.position.height as i32 / 2;

        let monitors = app_handle
            .available_monitors()
            .map_err(|e| e.to_string())?;

        for mon in &monitors {
            let pos = mon.position();
            let size = mon.size();
            if cx >= pos.x && cx < pos.x + size.width as i32 &&
               cy >= pos.y && cy < pos.y + size.height as i32
            {
                return Ok(mon.clone());
            }
        }
    }

    Err("could not determine focused monitor".to_string())
}

fn calculate_position(
    label: &str,
    monitor: &tauri::Monitor,
    width: f64,
    height: f64,
) -> PhysicalPosition<i32> {
    let mon_pos = monitor.position();
    let mon_size = monitor.size();
    let scale = monitor.scale_factor();
    let margin = (16.0 * scale) as i32;
    let phys_w = (width * scale) as i32;

    let (lx, ly) = match label {
        "overlay-tl" => (margin, margin),
        "overlay-tc" => ((mon_size.width as i32 - phys_w) / 2, margin),
        "overlay-relic" => {
            let rx = (mon_size.width as i32 - phys_w) / 2;
            let ry = (mon_size.height as i32 - (420.0 * scale) as i32).max(0);
            (rx, ry)
        }
        "overlay-relic-picker" => {
            let rx = mon_size.width as i32 - phys_w - margin / 2;
            let ry = margin + 75;
            (rx, ry)
        }
        "overlay-riven-current" => (margin, (mon_size.height as i32 - (height * scale) as i32) / 2),
        "overlay-riven-new" => (
            mon_size.width as i32 - phys_w - margin,
            (mon_size.height as i32 - (height * scale) as i32) / 2,
        ),
        _ => (mon_size.width as i32 - phys_w - margin, margin),
    };

    PhysicalPosition {
        x: mon_pos.x + lx,
        y: mon_pos.y + ly,
    }
}

#[allow(unused_variables)]
fn apply_platform_patches(window: &WebviewWindow) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        if let Ok(ns_window) = window.ns_window() {
            let id = ns_window as cocoa::base::id;
            unsafe {
                cocoa::appkit::NSWindow::setLevel_(id, 1000);
                cocoa::appkit::NSWindow::setCollectionBehavior_(
                    id,
                    cocoa::appkit::NSWindowCollectionBehavior::NSWindowCollectionBehaviorCanJoinAllSpaces
                        | cocoa::appkit::NSWindowCollectionBehavior::NSWindowCollectionBehaviorFullScreenAuxiliary,
                );
            }
        }
    }

    #[cfg(target_os = "windows")]
    {
        use std::mem::transmute;
        if let Ok(hwnd) = window.hwnd() {
            let hwnd_ptr: *mut std::ffi::c_void = unsafe { transmute(hwnd) };
            unsafe {
                #[link(name = "user32")]
                extern "system" {
                    fn GetWindowLongW(hWnd: *mut std::ffi::c_void, nIndex: i32) -> i32;
                    fn SetWindowLongW(hWnd: *mut std::ffi::c_void, nIndex: i32, dwNewLong: i32) -> i32;
                }
                const GWL_EXSTYLE: i32 = -20;
                const WS_EX_NOACTIVATE: i32 = 0x08000000;
                let ex_style = GetWindowLongW(hwnd_ptr, GWL_EXSTYLE);
                SetWindowLongW(hwnd_ptr, GWL_EXSTYLE, ex_style | WS_EX_NOACTIVATE);
            }
        }
    }

    Ok(())
}

// ── Linux X11 low-level helpers ───────────────────────────────────────────────

#[cfg(target_os = "linux")]
#[link(name = "X11")]
extern "C" {
    fn XInitThreads() -> i32;
    fn XMoveWindow(display: *mut std::ffi::c_void, w: u64, x: i32, y: i32) -> i32;
    fn XMoveResizeWindow(display: *mut std::ffi::c_void, w: u64, x: i32, y: i32, width: u32, height: u32) -> i32;
    fn XRaiseWindow(display: *mut std::ffi::c_void, w: u64) -> i32;
    fn XFlush(display: *mut std::ffi::c_void) -> i32;
    fn XSync(display: *mut std::ffi::c_void, discard: i32) -> i32;
    fn XUnmapWindow(display: *mut std::ffi::c_void, w: u64) -> i32;
    fn XMapWindow(display: *mut std::ffi::c_void, w: u64) -> i32;
    fn XInternAtom(display: *mut std::ffi::c_void, name: *const i8, only_if_exists: i32) -> u64;
    fn XChangeProperty(
        display: *mut std::ffi::c_void,
        w: u64,
        property: u64,
        typ: u64,
        format: i32,
        mode: i32,
        data: *const u8,
        nelements: i32,
    ) -> i32;
    fn XSetInputFocus(
        display: *mut std::ffi::c_void,
        focus: u64,
        revert_to: i32,
        time: u64,
    ) -> i32;
    #[allow(dead_code)]
    fn XSetErrorHandler(handler: Option<unsafe extern "C" fn(*mut std::ffi::c_void, *mut XErrorEvent) -> i32>) -> Option<unsafe extern "C" fn(*mut std::ffi::c_void, *mut XErrorEvent) -> i32>;
    fn XUngrabPointer(display: *mut std::ffi::c_void, time: u64) -> i32;
    fn XUngrabKeyboard(display: *mut std::ffi::c_void, time: u64) -> i32;
}

#[cfg(target_os = "linux")]
#[allow(dead_code)]
pub fn init_x11_threading() {
    unsafe { XInitThreads(); }
}

#[cfg(target_os = "linux")]
#[allow(dead_code)]
#[repr(C)]
struct XErrorEvent {
    typ: i32,
    display: *mut std::ffi::c_void,
    resourceid: u64,
    serial: u64,
    error_code: u8,
    request_code: u8,
    minor_code: u8,
}

#[cfg(target_os = "linux")]
#[allow(dead_code)]
pub fn install_x_error_handler() {
    unsafe extern "C" fn handler(
        _display: *mut std::ffi::c_void,
        event: *mut XErrorEvent,
    ) -> i32 {
        let ev = &*event;
        elog!(
            "[X11] non-fatal X error: code={} request={} minor={}",
            ev.error_code, ev.request_code, ev.minor_code,
        );
        0
    }
    unsafe {
        XSetErrorHandler(Some(handler));
    }
}

#[cfg(target_os = "linux")]
fn get_x11_ids(window: &WebviewWindow) -> Option<(*mut std::ffi::c_void, u64)> {
    use gtk::prelude::*;
    let gtk_window = window.gtk_window().ok()?;
    gtk_window.realize();
    let gdk_window = gtk_window.window()?;
    let x11_window = gdk_window.downcast::<gdkx11::X11Window>().ok()?;
    let xid = x11_window.xid();
    let xdisplay = unsafe { gdkx11::ffi::gdk_x11_get_default_xdisplay() };
    if xdisplay.is_null() { return None; }
    Some((xdisplay as *mut std::ffi::c_void, xid))
}

/// Apply X11 properties for above-fullscreen overlay rendering on KWin.
///
/// Sets:
///   - `_NET_WM_STATE` = ABOVE | STICKY (above fullscreen, survives Show Desktop)
///   - `_NET_WM_DESKTOP` = 0xFFFFFFFF (visible on all virtual desktops)
///   - `_MOTIF_WM_HINTS` = undecorated (skip "Center New Windows" placement)
///
/// `_NET_WM_WINDOW_TYPE` is intentionally **not** set - despite override_redirect
/// KWin may still re-apply placement policies for NOTIFICATION/DOCK types at
/// remap time, fighting our explicit position.
///
/// If `already_mapped`, does unmap → set props → remap so KWin re-evaluates
/// the layer.  On first show the caller calls this before `win.show()`, so
/// Tauri's `show()` serves as the remap.
#[cfg(target_os = "linux")]
fn apply_x11_overlay_hints(xdisplay: *mut std::ffi::c_void, xid: u64, already_mapped: bool,
    pos: Option<(i32, i32, u32, u32)>) {
    unsafe {
        let xa_atom: u64 = 4;
        let xa_cardinal: u64 = 6;
        let prop_replace: i32 = 0;

        // If already mapped, unmap so KWin re-evaluates the layer on remap
        if already_mapped {
            XUnmapWindow(xdisplay, xid);
        }

        // _NET_WM_WINDOW_TYPE intentionally omitted - despite override_redirect
        // KWin may still apply placement policies for NOTIFICATION/DOCK types
        // at remap time, fighting our position.  override_redirect alone is
        // sufficient for the WM to leave us alone.

        // _NET_WM_STATE: ABOVE + STICKY
        let wm_state = XInternAtom(xdisplay, b"_NET_WM_STATE\0".as_ptr() as *const i8, 0);
        let state_above = XInternAtom(xdisplay, b"_NET_WM_STATE_ABOVE\0".as_ptr() as *const i8, 0);
        let state_sticky = XInternAtom(xdisplay, b"_NET_WM_STATE_STICKY\0".as_ptr() as *const i8, 0);
        let states: [u64; 2] = [state_above, state_sticky];
        XChangeProperty(xdisplay, xid, wm_state, xa_atom, 32, prop_replace,
            states.as_ptr() as *const u8, 2);

        // _NET_WM_DESKTOP = 0xFFFFFFFF: sticky, visible on all virtual desktops.
        // Survives Super+D (Show Desktop) in KWin.
        let wm_desktop = XInternAtom(xdisplay, b"_NET_WM_DESKTOP\0".as_ptr() as *const i8, 0);
        let all_desktops: u64 = 0xFFFFFFFF;
        XChangeProperty(xdisplay, xid, wm_desktop, xa_cardinal, 32, prop_replace,
            &all_desktops as *const u64 as *const u8, 1);

        // _MOTIF_WM_HINTS: tell KWin to skip its "Center New Windows" placement
        // policy by removing decorations (flags=2, decorations=0).
        let motif_hints = XInternAtom(xdisplay, b"_MOTIF_WM_HINTS\0".as_ptr() as *const i8, 0);
        let mwm_hints: [u64; 5] = [2, 0, 0, 0, 0];
        XChangeProperty(xdisplay, xid, motif_hints, motif_hints, 32, prop_replace,
            mwm_hints.as_ptr() as *const u8, 5);

        // Set geometry while still unmapped so the X server maps at our
        // position and the WM never applies its own default placement.
        if let Some((px, py, pw, ph)) = pos {
            XMoveResizeWindow(xdisplay, xid, px, py, pw, ph);
        }

        // Single sync after all property writes + geometry - avoids redundant
        // round-trips that contend with GTK's own X11 access during WM drag.
        XSync(xdisplay, 0);

        if already_mapped {
            XMapWindow(xdisplay, xid);
            XSync(xdisplay, 0);
            // No post-map X11 force-position here - the caller (enter_sidebar_mode)
            // issues Tauri set_min_size + set_size + set_position immediately after,
            // which updates GDK's internal state so GTK doesn't get confused by
            // raw X11 moves performed behind its back.
        }
    }
}

#[cfg(target_os = "linux")]
fn raise_x11(window: &WebviewWindow) {
    let (xdisplay, xid) = match get_x11_ids(window) {
        Some(ids) => ids,
        None => return,
    };
    unsafe {
        XRaiseWindow(xdisplay, xid);
        XFlush(xdisplay);
    }
}

#[cfg(target_os = "linux")]
fn force_position_x11(window: &WebviewWindow, x: i32, y: i32) {
    let (xdisplay, xid) = match get_x11_ids(window) {
        Some(ids) => ids,
        None => return,
    };
    unsafe {
        XMoveWindow(xdisplay, xid, x, y);
        XFlush(xdisplay);
    }
}

#[cfg(target_os = "linux")]
fn install_deiconify_handler(window: &WebviewWindow, label: &str) {
    let guard_key = format!("deiconify-{label}");
    let mut installed = AOT_KEEPER_INSTALLED.lock().unwrap();
    if installed.contains(&guard_key) { return; }
    installed.push(guard_key);

    use gtk::prelude::*;
    let gtk_window = match window.gtk_window() {
        Ok(w) => w,
        Err(_) => return,
    };
    gtk_window.realize();
    gtk_window.connect_window_state_event(|win, event| {
        if event.new_window_state().contains(gtk::gdk::WindowState::ICONIFIED) {
            win.deiconify();
            win.show();
        }
        gtk::glib::Propagation::Proceed
    });
}

#[cfg(target_os = "linux")]
fn set_transient_for(window: &WebviewWindow, parent: &WebviewWindow) {
    use gtk::prelude::*;
    if let (Ok(gtk_window), Ok(gtk_parent)) = (window.gtk_window(), parent.gtk_window()) {
        gtk_window.set_transient_for(Some(&gtk_parent));
    }
}

#[cfg(not(target_os = "linux"))]
fn force_position_tauri(window: &WebviewWindow, x: i32, y: i32) -> Result<(), String> {
    window
        .set_position(tauri::Position::Physical(tauri::PhysicalPosition { x, y }))
        .map_err(|e| format!("set_position({x},{y}) failed: {e}"))
}

// ── Lazy window creation ──────────────────────────────────────────────────────
// Overlays are created on-demand (not eagerly in tauri.conf.json) so WebView2
// processes only spin up when an overlay is actually needed - avoiding 8+
// hidden msedgewebview2.exe instances competing for CPU/GPU at startup.

fn create_overlay_window(app_handle: &AppHandle, label: &str) -> Result<tauri::WebviewWindow, String> {
    let (w, h) = overlay_size(label);

    let builder = WebviewWindowBuilder::new(app_handle, label, WebviewUrl::App("/?overlay=true".into()))
        .inner_size(w, h)
        .decorations(false)
        .always_on_top(true)
        .skip_taskbar(true)
        .resizable(true)
        .visible(false);
    let window = builder.build().map_err(|e| format!("failed to create overlay '{}': {}", label, e))?;

    window.show().map_err(|e| e.to_string())?;
    #[cfg(target_os = "linux")]
    { let _ = crate::ensure_gtk_overlay_wrapper(&window); }
    window.hide().map_err(|e| e.to_string())?;

    Ok(window)
}

// ── Public API ────────────────────────────────────────────────────────────────

pub fn show_window_internal(app_handle: &AppHandle, label: &str) -> Result<(), String> {
    // Sidebar has its own X11-heavy show path (override-redirect, ungrab, focus).
    if label == "overlay-sidebar" {
        let settings = crate::load_settings_sync();
        let side = settings
            .get("sidebar_side")
            .and_then(|v| v.as_str())
            .unwrap_or("left")
            .to_string();
        let width = settings
            .get("sidebar_width")
            .and_then(|v| v.as_u64())
            .map(|w| w as u32)
            .unwrap_or(400);
        return show_sidebar_internal(app_handle, &side, width);
    }

    let window = get_or_create_overlay_window(app_handle, label)?;

    #[cfg_attr(target_os = "linux", allow(unused_variables))]
    let already_visible = window.is_visible().unwrap_or(false);

    // Install AOT keeper once per window
    {
        let mut installed = AOT_KEEPER_INSTALLED.lock().unwrap();
        if !installed.contains(&label.to_string()) {
            let w = window.clone();
            window.on_window_event(move |event| {
                if let tauri::WindowEvent::Focused(focused) = event {
                    if !focused {
                        #[cfg(target_os = "linux")]
                        { let _ = w.set_always_on_top(true); raise_x11(&w); }
                        #[cfg(not(target_os = "linux"))]
                        { let _ = &w; }
                    }
                }
            });
            installed.push(label.to_string());
        }
    }

    // Track that this overlay has been shown (for resurrection on main deiconify).
    {
        let mut shown = SHOWN_OVERLAYS.lock().unwrap();
        if !shown.contains(&label.to_string()) {
            shown.push(label.to_string());
        }
    }

    // Shield: on main-window state change, re-show tracked overlays on the next
    // idle tick - never synchronously inside main's own state transition, which
    // can corrupt KWin's client-list bookkeeping (WithdrawnState vs IconicState).
    #[cfg(target_os = "linux")]
    {
        use gtk::prelude::*;
        let mut installed = AOT_KEEPER_INSTALLED.lock().unwrap();
        if !installed.contains(&"main-win-shield".to_string()) {
            if let Some(main_win) = app_handle.get_webview_window("main") {
                if let Ok(main_gtk) = main_win.gtk_window() {
                    main_gtk.realize();
                    let ah = app_handle.clone();
                    main_gtk.connect_window_state_event(move |_, _| {
                        let ah2 = ah.clone();
                        glib::idle_add_local_once(move || {
                            if !is_warframe_focused() {
                                return;
                            }
                            for lbl in SHOWN_OVERLAYS.lock().unwrap().iter() {
                                if let Some(w) = ah2.get_webview_window(lbl) {
                                    if !w.is_visible().unwrap_or(false) {
                                        let _ = w.show();
                                    }
                                }
                            }
                        });
                        gtk::glib::Propagation::Proceed
                    });
                }
            }
            installed.push("main-win-shield".to_string());
        }
    }

    let monitor = get_overlay_monitor(app_handle, label)?;
    let (w, h) = get_last_overlay_size(label).unwrap_or_else(|| overlay_size(label));
    let pos = calculate_position(label, &monitor, w, h);

    #[cfg(target_os = "linux")]
    #[allow(unused_assignments)]
    let mut main_had_focus = false;

    #[cfg(not(target_os = "linux"))]
    let main_had_focus = false;

    #[cfg(target_os = "linux")]
    {
        let was_visible = window.is_visible().unwrap_or(false);

        // Keep track of which window had focus before we show the overlay
        main_had_focus = app_handle.get_webview_window("main")
            .and_then(|w| w.is_focused().ok())
            .unwrap_or(false);

        // Transient for main window so KWin iconifies the overlay together
        // with the main window - deiconify handler catches the ICONIFIED
        // state and immediately restores it. Without this, KWin may still
        // hide the overlay (app-grouped by PID) but without sending a state
        // event, so the handler never fires.
        let is_notification = matches!(label, "overlay-tl" | "overlay-tr" | "overlay-tc");
        if is_notification {
            if let Some(main_win) = app_handle.get_webview_window("main") {
                set_transient_for(&window, &main_win);
            }
        }

        // --- Override Redirect ---
        // Detach from KWin's placement policy so it cannot center the window.
        use gtk::prelude::*;
        if let Ok(gtk_win) = window.gtk_window() {
            gtk_win.realize();
            if let Some(gdk_win) = gtk_win.window() {
                gdk_win.set_override_redirect(true);
            }
        }

        if let Some((xdisplay, xid)) = get_x11_ids(&window) {
            apply_x11_overlay_hints(xdisplay, xid, was_visible, None);
        }

        // Position is set via single authoritative X11 XMoveWindow call after
        // show/map - no Tauri set_position call here to avoid racing with X11.
        // One positioning path per platform, cfg-gated.

        if !was_visible {
            // First show: Tauri's show() acts as the XMapWindow
            window.show().map_err(|e| format!("show() failed: {e}"))?;
            // Let KWin finish any MapNotify processing before we force the
            // position - the XSync + sleep window ensures our move wins.
            unsafe {
                if let Some((xdisplay, _)) = get_x11_ids(&window) {
                    XSync(xdisplay, 0);
                }
            }
            std::thread::sleep(std::time::Duration::from_millis(50));
        }
        // If was_visible, apply_x11_overlay_hints already did unmap+remap

        // Override position via XMoveWindow (more reliable than GTK for ARGB windows)
        force_position_x11(&window, pos.x, pos.y);
        install_deiconify_handler(&window, label);
    }

    #[cfg(not(target_os = "linux"))]
    {
        let _ = force_position_tauri(&window, pos.x, pos.y);
        if !already_visible {
            window.show().map_err(|e| format!("show() failed: {e}"))?;
        }
    }

    // Force backing-store invalidation: resize to 1x1 then restore to the
    // last known size (or the static default if never resized). WebKit
    // discards its rendering surface on geometry change, which clears any
    // stale content ghosts from prior hide/show cycles.
    // Notification overlays are skipped  -  their height is dynamically managed
    // by the frontend ResizeObserver and clobbering it would collapse the window.
    if !matches!(label, "overlay-tl" | "overlay-tr" | "overlay-tc") {
        let (restore_w, restore_h) = get_last_overlay_size(label).unwrap_or((w, h));
        let _ = window.set_size(tauri::Size::Physical(tauri::PhysicalSize { width: 1, height: 1 }));
        let _ = window.set_size(tauri::Size::Physical(tauri::PhysicalSize { width: restore_w as u32, height: restore_h as u32 }));
    }

    // Raise and set always-on-top AFTER backing-store invalidation so KWin's
    // stacking policy doesn't undo XRaiseWindow on the ConfigureNotify from
    // set_size.  Must stay above the game window at all times.
    #[cfg(target_os = "linux")]
    {
        raise_x11(&window);
        window.set_always_on_top(true)
            .map_err(|e| format!("set_always_on_top failed: {e}"))?;
    }
    // Sidebar overlay must stay interactive (click-through breaks nav/screens).
    if label != "overlay-sidebar" {
        window.set_ignore_cursor_events(true)
            .map_err(|e| format!("set_ignore_cursor_events failed: {e}"))?;
    }
    #[cfg(target_os = "linux")]
    window.set_skip_taskbar(true)
        .map_err(|e| format!("set_skip_taskbar failed: {e}"))?;

    apply_platform_patches(&window)?;

    // Restore main window focus if it was focused before showing overlay
    if main_had_focus {
        if let Some(main_win) = app_handle.get_webview_window("main") {
            let _ = main_win.set_focus();
        }
    }

    Ok(())
}

// ── Sidebar overlay window (dedicated window, never mutates main) ────────────
// Uses a fresh overlay-sidebar window with OSD hints via apply_x11_overlay_hints
// (same path as the working notification overlays).  Main is never touched.

pub fn show_sidebar_internal(
    app_handle: &AppHandle,
    side: &str,
    entry_width: u32,
) -> Result<(), String> {
    let window = get_or_create_overlay_window(app_handle, "overlay-sidebar")?;

    let was_visible = window.is_visible().unwrap_or(false);

    let monitor = get_overlay_monitor(app_handle, "overlay-sidebar")?;
    let mon_x = monitor.position().x;
    let mon_y = monitor.position().y;
    let mon_w = monitor.size().width as i32;
    let mon_h = monitor.size().height;

    let phys_w = entry_width.max(200).min((mon_w as f64 * 0.9) as u32);
    let target_x = match side {
        "right" => mon_x + mon_w - phys_w as i32,
        _       => mon_x,
    };

    // Register in SHOWN_OVERLAYS so the focus watcher can track this window.
    SHOWN_OVERLAYS.lock().unwrap().push("overlay-sidebar".to_string());

    let win = window.clone();
    window.run_on_main_thread(move || {
        #[cfg(target_os = "linux")]
        let x11_ids;

        #[cfg(target_os = "linux")]
        {
            use gtk::prelude::*;
            if let Ok(gtk_win) = win.gtk_window() {
                gtk_win.realize();
                if let Some(gdk_win) = gtk_win.window() {
                    gdk_win.set_override_redirect(true);
                }
            }
            x11_ids = get_x11_ids(&win);
            if let Some((xdisplay, xid)) = x11_ids {
                apply_x11_overlay_hints(xdisplay, xid, was_visible,
                    Some((target_x, mon_y, phys_w, mon_h)));
            }
        }

        let _ = win.set_size(tauri::Size::Physical(tauri::PhysicalSize { width: phys_w, height: mon_h }));
        let _ = win.set_position(tauri::Position::Physical(tauri::PhysicalPosition { x: target_x, y: mon_y }));
        let _ = win.set_always_on_top(true);
        let _ = win.set_skip_taskbar(true);
        if !was_visible {
            if let Err(e) = win.show() {
                elog!("[SIDEBAR] win.show() failed: {}", e);
            }
        }

        #[cfg(target_os = "linux")]
        if let Some((xdisplay, xid)) = x11_ids {
            // Explicit XMapWindow only on first show: GDK's gtk_widget_show()
            // skips the X11 map when override_redirect + raw X11 property
            // mutations were applied before the first map.
            if !was_visible {
                unsafe {
                    XMapWindow(xdisplay, xid);
                    XSync(xdisplay, 0);
                }
            }

            // Warframe/Wine holds an active X grab via DirectInput.  Release
            // it before setting focus so X delivers events to our window.
            // Must run every toggle (Wine may re-grab between shows).
            const CURRENT_TIME: u64 = 0;
            const REVERT_TO_POINTER_ROOT: i32 = 1;
            unsafe {
                XUngrabPointer(xdisplay, CURRENT_TIME);
                XUngrabKeyboard(xdisplay, CURRENT_TIME);
                XSync(xdisplay, 0);
                XSetInputFocus(xdisplay, xid, REVERT_TO_POINTER_ROOT, CURRENT_TIME);
                XSync(xdisplay, 0);
            }
        }
    }).map_err(|e| format!("run_on_main_thread failed: {e}"))?;

    // Background timer: periodically release Wine's X grab so clicks
    // keep reaching the sidebar while it's visible.
    start_sidebar_ungrab_timer();

    Ok(())
}

pub fn hide_sidebar_internal(app_handle: &AppHandle) {
    stop_sidebar_ungrab_timer();
    clear_shown_overlay("overlay-sidebar");
    if let Some(window) = find_overlay_window(app_handle, "overlay-sidebar") {
        let _ = window.hide();
    }
}

fn overlay_size(label: &str) -> (f64, f64) {
    match label {
        "overlay-relic" => (640.0, 140.0),
        "overlay-relic-picker" => (380.0, 220.0),
        "overlay-riven-current" | "overlay-riven-new" => (360.0, 300.0),
        _ => (440.0, 1.0),
    }
}



pub fn resize_overlay_window(
    app_handle: &AppHandle,
    label: &str,
    width: f64,
    height: f64,
) -> Result<(), String> {
    set_last_overlay_size(label, width, height);

    let window = get_or_create_overlay_window(app_handle, label)?;

    if height > 40.0 {
        let monitor = get_overlay_monitor(app_handle, label)?;
        let pos = calculate_position(label, &monitor, width, height);
        let scale = monitor.scale_factor();
        let phys_w = (width * scale) as u32;
        let phys_h = (height * scale) as u32;


        
        #[cfg(target_os = "linux")]
        {
            let was_visible = window.is_visible().unwrap_or(false);
            if let Some((xdisplay, xid)) = get_x11_ids(&window) {
                apply_x11_overlay_hints(xdisplay, xid, was_visible, None);
            }
            if !was_visible {
                window.show().map_err(|e| format!("show failed: {e}"))?;
            }
            force_position_x11(&window, pos.x, pos.y);
        }

        #[cfg(not(target_os = "linux"))]
        {
            let _ = force_position_tauri(&window, pos.x, pos.y);
            window.show().map_err(|e| format!("show failed: {e}"))?;
        }

        // Only force backing-store invalidation (1x1 resize) when the window
        // was hidden  -  incremental resizes on a visible window don't need it
        // and the 1x1 flash is visually jarring.
        if !window.is_visible().unwrap_or(false) {
            let _ = window.set_size(tauri::Size::Physical(tauri::PhysicalSize { width: 1, height: 1 }));
        }
        window
            .set_size(tauri::Size::Physical(tauri::PhysicalSize { width: phys_w, height: phys_h }))
            .map_err(|e| format!("set_size failed: {e}"))?;

        // Raise, AOT, and click-through AFTER size is final so KWin doesn't
        // undo XRaiseWindow on ConfigureNotify from the set_size above.
        #[cfg(target_os = "linux")]
        {
            raise_x11(&window);
            window.set_always_on_top(true)
                .map_err(|e| format!("set_always_on_top failed: {e}"))?;
            window.set_skip_taskbar(true)
                .map_err(|e| format!("set_skip_taskbar failed: {e}"))?;
        }
        window.set_ignore_cursor_events(true)
            .map_err(|e| format!("set_ignore_cursor_events failed: {e}"))?;
    } else {
        clear_shown_overlay(label);
        window.hide().map_err(|e| format!("hide failed: {e}"))?;
    }

    Ok(())
}

// ── Warframe window tracking ────────────────────────────────────────────────
//
// Caches Warframe's window rect and the monitor it occupies.  Updated
// periodically by the focus watcher thread.  Used by get_overlay_monitor
// to place game overlays on the correct monitor, and by the focus watcher
// to hide overlays when the user alt+tabs away.

pub(crate) static WARFRAME_CACHE: Mutex<Option<WarframeRect>> = Mutex::new(None);
static FOCUS_WATCHER_RUNNING: AtomicBool = AtomicBool::new(false);

#[derive(Clone, Copy)]
pub(crate) struct WarframeRect {
    pub(crate) x: i32,
    pub(crate) y: i32,
    pub(crate) w: u32,
    pub(crate) h: u32,
}

#[cfg(target_os = "linux")]
pub fn fetch_warframe_rect_sync() -> Option<(i32, i32, u32, u32)> {
    let out = std::process::Command::new("xdotool")
        .args(["search", "--name", "Warframe", "getwindowgeometry"])
        .output()
        .ok()?;
    if !out.status.success() {
        return None;
    }
    let stdout = String::from_utf8_lossy(&out.stdout);
    let lines: Vec<&str> = stdout.lines().collect();
    let pos_line = lines.iter().find(|l| l.contains("Position:"))?;
    let geom_line = lines.iter().find(|l| l.contains("Geometry:"))?;
    let pos_str = pos_line.trim().strip_prefix("Position: ")?;
    let (px, py) = pos_str.split_once(',')?;
    let geom_str = geom_line.trim().strip_prefix("Geometry: ")?;
    let (w_str, h_str) = geom_str.split_once('x')?;
    Some((
        px.trim().parse().ok()?,
        py.trim().parse().ok()?,
        w_str.trim().parse().ok()?,
        h_str.trim().parse().ok()?,
    ))
}

#[cfg(target_os = "windows")]
pub fn fetch_warframe_rect_sync() -> Option<(i32, i32, u32, u32)> {
    type HANDLE = *mut std::ffi::c_void;
    type DWORD = u32;
    type BOOL = i32;
    type LPARAM = isize;

    #[repr(C)]
    struct RECT {
        left: i32,
        top: i32,
        right: i32,
        bottom: i32,
    }

    extern "system" {
        fn EnumWindows(lpEnumFunc: Option<unsafe extern "system" fn(HANDLE, LPARAM) -> BOOL>, lParam: LPARAM) -> BOOL;
        fn GetWindowThreadProcessId(hWnd: HANDLE, lpdwProcessId: *mut DWORD) -> DWORD;
        fn GetWindowRect(hWnd: HANDLE, lpRect: *mut RECT) -> BOOL;
        fn IsWindowVisible(hWnd: HANDLE) -> BOOL;
    }

    let target_pid = crate::log_scanner::get_warframe_pid()?;
    let result = std::sync::Mutex::new((target_pid, None::<(i32, i32, u32, u32)>));

    unsafe extern "system" fn enum_proc(hwnd: HANDLE, lparam: LPARAM) -> BOOL {
        let ctx = &*(lparam as *const std::sync::Mutex<(u32, Option<(i32, i32, u32, u32)>)>);
        let mut pid: DWORD = 0;
        GetWindowThreadProcessId(hwnd, &mut pid);
        if pid == 0 { return 1; }
        if IsWindowVisible(hwnd) == 0 { return 1; }

        let mut guard = ctx.lock().unwrap();
        if pid != guard.0 { return 1; }

        let mut r = RECT { left: 0, top: 0, right: 0, bottom: 0 };
        if GetWindowRect(hwnd, &mut r) != 0 {
            let w = (r.right - r.left) as u32;
            let h = (r.bottom - r.top) as u32;
            let area = w as u64 * h as u64;
            let at_origin = r.left == 0 && r.top == 0;
            let better = match guard.1 {
                None => true,
                Some((ox, oy, ow, oh)) => {
                    let existing_area = ow as u64 * oh as u64;
                    let existing_at_origin = ox == 0 && oy == 0;
                    area > existing_area || (area == existing_area && existing_at_origin && !at_origin)
                }
            };
            if better {
                guard.1 = Some((r.left, r.top, w, h));
            }
        }
        1
    }

    unsafe {
        EnumWindows(Some(enum_proc), &result as *const _ as isize);
    }
    let guard = result.lock().unwrap();
    let (x, y, w, h) = guard.1?;
    if w == 0 { return None; }
    Some((x, y, w, h))
}

#[cfg(not(any(target_os = "linux", target_os = "windows")))]
pub fn fetch_warframe_rect_sync() -> Option<(i32, i32, u32, u32)> {
    None
}

/// Fallback: use the active window's geometry when its PID matches Warframe.
/// Works on Wayland (via active_win_pos_rs) when the game window is focused,
/// and also on X11 when xdotool is unavailable.
fn fetch_warframe_rect_from_active_window() -> Option<(i32, i32, u32, u32)> {
    let warframe_pid = crate::log_scanner::get_warframe_pid()?;
    let active = active_win_pos_rs::get_active_window().ok()?;
    if active.process_id == warframe_pid as u64 {
        Some((
            active.position.x as i32,
            active.position.y as i32,
            active.position.width as u32,
            active.position.height as u32,
        ))
    } else {
        None
    }
}

/// Force-refresh the Warframe window cache (called from focus watcher thread).
fn update_warframe_cache() {
    let cache = if let Some((x, y, w, h)) = fetch_warframe_rect_sync() {
        Some(WarframeRect { x, y, w, h })
    } else if let Some((x, y, w, h)) = fetch_warframe_rect_from_active_window() {
        Some(WarframeRect { x, y, w, h })
    } else {
        None
    };
    *WARFRAME_CACHE.lock().unwrap() = cache;
}

/// Resolve Warframe's monitor by containment matching against Tauri's own
/// monitor list (same approach as `get_focused_monitor`).  Avoids the
/// xcap-index-crossover bug  -  xcap and GDK/Tauri don't guarantee the same
/// enumeration order, so storing an index from one and using it against
/// the other can land on the wrong display.
fn warframe_monitor(app_handle: &AppHandle) -> Option<tauri::Monitor> {
    let (x, y, w, h) = {
        let cache = WARFRAME_CACHE.lock().ok()?;
        let rect = (*cache)?;
        (rect.x, rect.y, rect.w, rect.h)
    };
    let cx = x + w as i32 / 2;
    let cy = y + h as i32 / 2;

    let monitors = app_handle.available_monitors().ok()?;
    monitors.into_iter().find(|m| {
        let pos = m.position();
        let size = m.size();
        cx >= pos.x && cx < pos.x + size.width as i32 &&
        cy >= pos.y && cy < pos.y + size.height as i32
    })
}

/// Check whether the currently focused window is Warframe's (PID-based).
fn is_warframe_focused() -> bool {
    let warframe_pid = match crate::log_scanner::get_warframe_pid() {
        Some(p) => p,
        None => return false,
    };
    match active_win_pos_rs::get_active_window() {
        Ok(active) => active.process_id == warframe_pid as u64,
        Err(_) => false,
    }
}

/// Start a background thread that monitors Warframe's window position and focus
/// state.  When Warframe loses focus, all non-notification overlays are hidden;
/// when it regains focus, previously-tracked overlays are re-shown.
pub fn spawn_focus_watcher(app_handle: &AppHandle) {
    if FOCUS_WATCHER_RUNNING.swap(true, Ordering::SeqCst) {
        return;
    }
    let ah = app_handle.clone();
    std::thread::spawn(move || {
        let mut had_visible: Vec<String> = Vec::new();
        let mut was_focused = false;

        while FOCUS_WATCHER_RUNNING.load(Ordering::SeqCst) {
            update_warframe_cache();

            let focused_now = is_warframe_focused();

            if focused_now && !was_focused {
                for label in had_visible.drain(..).collect::<Vec<_>>() {
                    // Skip overlays that have been voluntarily closed (e.g. relic
                    // reward timer expired while hidden)  -  they were removed from
                    // SHOWN_OVERLAYS by clear_shown_overlay and should not re-appear.
                    let still_expected = SHOWN_OVERLAYS.lock().unwrap().contains(&label);
                    if !still_expected { continue; }
                    let _ = show_window_internal(&ah, &label);
                }
            } else if !focused_now && was_focused {
                // Don't hide overlays if focus moved to one of our own overlay
                // windows (e.g. user clicked the sidebar)  -  that would trigger a
                // hide-then-re-show loop when focus falls through to Warframe.
                let our_pid = std::process::id() as u64;
                let on_our_overlay = active_win_pos_rs::get_active_window()
                    .map(|w| w.process_id == our_pid)
                    .unwrap_or(false);
                if on_our_overlay {
                    // Treat focus-on-our-overlay as "still focused" so we don't
                    // (a) hide anything now, and (b) later suppress the re-show
                    // branch by leaving was_focused stuck at true.
                    was_focused = true;
                    std::thread::sleep(std::time::Duration::from_millis(500));
                    continue;
                }
                had_visible.clear();
                for label in SHOWN_OVERLAYS.lock().unwrap().iter() {
                    let is_notification = matches!(
                        label.as_str(),
                        "overlay-tl" | "overlay-tr" | "overlay-tc"
                    );
                    let is_sidebar = label.as_str() == "overlay-sidebar";
                    if is_sidebar && !SIDEBAR_HIDE_ON_FOCUS_LOSS.load(Ordering::SeqCst) {
                        continue;
                    }
                    if !is_notification {
                        had_visible.push(label.clone());
                        if let Some(w) = find_overlay_window(&ah, &label) {
                            let _ = w.hide();
                        }
                    }
                }
            }

            was_focused = focused_now;
            std::thread::sleep(std::time::Duration::from_millis(500));
        }
    });
}

pub fn stop_focus_watcher() {
    FOCUS_WATCHER_RUNNING.store(false, Ordering::SeqCst);
}