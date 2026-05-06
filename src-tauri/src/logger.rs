use std::fs::OpenOptions;
use std::io::Write;
use tauri::AppHandle;
use chrono::Local;

pub fn log_to_disk(_app: &AppHandle, message: &str) {
    let root = crate::get_data_root();
    let mut path = root.join("data/user");
    let _ = std::fs::create_dir_all(&path);
    
    path.push("overlay_debug.log");
    
    let wall_time = Local::now().format("%H:%M:%S%.3f").to_string();

    if let Ok(mut file) = OpenOptions::new()
        .create(true)
        .append(true)
        .open(&path) 
    {
        let _ = writeln!(file, "[{}] {}", wall_time, message);
    }
}