use std::fs::OpenOptions;
use std::io::Write;
use std::sync::OnceLock;
use tauri::AppHandle;
use chrono::Local;

pub(crate) static LOG_PATH: OnceLock<std::path::PathBuf> = OnceLock::new();

pub(crate) fn init_log_path(root: &std::path::Path) {
    let _ = LOG_PATH.set(root.join("data/user/debug.log"));
}

pub fn log_path() -> &'static std::path::PathBuf {
    LOG_PATH.get_or_init(|| {
        let root = crate::get_data_root();
        let dir = root.join("data/user");
        let _ = std::fs::create_dir_all(&dir);
        dir.join("debug.log")
    })
}

pub fn log_to_disk(_app: &AppHandle, message: &str) {
    let wall_time = Local::now().format("%H:%M:%S%.3f").to_string();
    let line = format!("[{}] {}", wall_time, message);

    eprintln!("{line}");

    if let Ok(mut file) = OpenOptions::new()
        .create(true)
        .append(true)
        .open(log_path())
    {
        let _ = writeln!(file, "{line}");
    }
}

/// Log to both stderr and `debug.log` without requiring an AppHandle.
#[macro_export]
macro_rules! elog {
    ($($arg:tt)*) => {{
        let _msg = format!($($arg)*);
        let _ts = chrono::Local::now().format("%H:%M:%S%.3f").to_string();
        let _line = format!("[{}] {}", _ts, _msg);
        eprintln!("{}", _line);
        use std::io::Write;
        if let Ok(mut _f) = std::fs::OpenOptions::new()
            .create(true)
            .append(true)
            .open($crate::logger::log_path())
        {
            let _ = writeln!(_f, "{}", _line);
        }
    }};
}
