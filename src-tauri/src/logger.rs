use std::fs::OpenOptions;
use std::io::Write;
use tauri::AppHandle;

pub fn log_to_disk(_app: &AppHandle, message: &str) {
    // Use portable data root next to the exe (same folder as data/)
    let root = crate::get_data_root();
    let mut path = root.join("data/user");
    let _ = std::fs::create_dir_all(&path);
    
    path.push("overlay_debug.log");
    
    // Format with local system time (MS since epoch)
    let now = match std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH) {
        Ok(d) => d.as_millis(),
        Err(_) => 0,
    };

    // Append to file
    if let Ok(mut file) = OpenOptions::new()
        .create(true)
        .append(true)
        .open(&path) 
    {
        let _ = writeln!(file, "[SystemTime: {}ms] {}", now, message);
    }
}